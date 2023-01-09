import { default as createTmalign } from './tmalign-wasm.js'
import tmalignWasm from './tmalign-wasm.wasm'

function tmalign(pdb1, pdb2, alignment = null) {
    return new Promise((resolve, reject) => {
        let buffer = "";
        createTmalign({
            locateFile: () => tmalignWasm,
            print: (msg) => buffer += msg + "\n"
        }).then((instance) => {
            const cmd = ['/pdb1.pdb', '/pdb2.pdb', '-m', '/matrix.txt'];
            instance.FS.writeFile('/pdb1.pdb', pdb1);
            instance.FS.writeFile('/pdb2.pdb', pdb2);
            if (alignment) {
                cmd.push('-I', '/aln.fa');
                instance.FS.writeFile('/aln.fa', alignment);
            }
            const err = instance.callMain(cmd);
            if (err == 0) {
                const matrix = instance.FS.readFile('/matrix.txt', { encoding: 'utf8' });
                resolve({ output: buffer, matrix: matrix })
            } else {
                reject(err)
            }
        });
    })
}

function getCigar(seq1, seq2) {
    var op = "";
    var length = 0;
    var cigar = "";
    var seq1Pos = 0;
    var seq2Pos = 0;
    var seq1StartPos = 0;
    var seq2StartPos = 0;
    var firstM = true;
    var queryAligned = "";
    var targetAligned = "";
    for (let i = 0; i < seq1.length; i++) {
        if (seq1[i] != "-" && seq2[i] != "-") {
            if (op != "M" && length != 0) {
                cigar += length + op;
                length = 0;
            }
            op = "M";
            length += 1;
            if (firstM) {
                seq1StartPos = seq1Pos;
                seq2StartPos = seq2Pos;
                queryAligned = "";
                targetAligned = "";
                firstM = false;
                cigar = "";
            }
            queryAligned += seq1[i];
            targetAligned += seq2[i];
            seq1Pos += 1;
            seq2Pos += 1;
        } else {
            if (seq1[i] == "-") {
                if (op != "D" && length != 0) {
                    cigar += length + op;
                    length = 0;
                }
                op = "D";
                queryAligned += "-";
                targetAligned += seq2[i];
                length += 1;
                seq2Pos += 1;
            } else if (seq2[i] == "-") {
                if (op != "I" && length != 0) {
                    cigar += length + op;
                    length = 0;
                }
                op = "I";
                queryAligned += seq1[i];
                targetAligned += "-";
                length += 1;
                seq1Pos += 1;
            }
        }
    }
    if (length != 0) {
        cigar += length + op;
    }
    return { cigar, seq1StartPos, seq2StartPos, queryAligned, targetAligned };
}

function parse(output) {
    const lines = output.split('\n');
    var chain1, chain2, tmScore, rmsd;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('Aligned length=')) {
            rmsd = parseFloat(line.match(/RMSD=\s*(\d*\.\d*),/)[1])
        }
        if (line.startsWith("Name of Chain_1:")) {
            chain1 = line.split(" ")[3].replace(/^\s+|\s+$/g, '');
        }
        if (line.startsWith("Name of Chain_2:")) {
            chain2 = line.split(" ")[3].replace(/^\s+|\s+$/g, '');
        }
        if (line.startsWith('TM-score=') && line.includes("Chain_1")) {
            tmScore = parseFloat(line.split(" ")[1]);
        }
        if (line.startsWith('(":" denotes')) {
            const { cigar, seq1StartPos, seq2StartPos, queryAligned, targetAligned } 
                = getCigar(lines[i + 1].replace(/^\s+|\s+$/g, ''), lines[i + 3].replace(/^\s+|\s+$/g, ''));
            // iterate over queryAligned and targetAligned at the same time
            let lastMatchIndex = 0;
            let seq1End = 0;
            let seq2End = 0;
            for (let j = 0; j < queryAligned.length; j++) {
                if (queryAligned[j] != '-') {
                    seq1End += 1;
                }
                if (queryAligned[j] != '-') {
                    seq2End += 1;
                }
                if (queryAligned[j] != '-' && targetAligned[j] != '-') {
                    lastMatchIndex = j;
                }
            }

            // find last M in cigar and remove remaining string
            const lastM = cigar.lastIndexOf("M");

            return {
                query: chain1,
                target: chain2,
                qEnd: seq1StartPos + 1,
                qEndPos: seq1StartPos + seq1End + 1,
                dbStartPos: seq2StartPos + 1,
                dbEndPos: seq2StartPos + seq2End + 1,
                cigar: cigar.substring(0, lastM + 1),
                tmScore,
                rmsd,
                qAln: queryAligned.substring(0, lastMatchIndex + 1),
                tAln: targetAligned.substring(0, lastMatchIndex + 1)
            };
        }
    }

    return null;
}

// Parse rotation matrix generated by -m
function parseMatrix(matrix) {
    let rows = matrix.split('\n').slice(2, 5).map(line => {
        return line.split(/\s+/).slice(1).map(num => parseFloat(num));
    });
    return {
        t: [rows[0][0], rows[1][0], rows[2][0]],
        u: [rows[0].slice(1), rows[1].slice(1), rows[2].slice(1)]
    }
}

export { tmalign, parse, parseMatrix };
