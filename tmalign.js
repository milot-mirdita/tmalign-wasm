import { default as createTmalign } from './tmalign-wasm.js'
import tmalignWasm from './tmalign-wasm.wasm'

function tmalign(pdb1, pdb2) {
    return new Promise((resolve, reject) => {
        let buffer = "";
        createTmalign({
            locateFile: () => tmalignWasm,
            print: (msg) => buffer += msg + "\n"
        }).then((instance) => {
            instance.FS.writeFile('/pdb1.pdb', pdb1);
            instance.FS.writeFile('/pdb2.pdb', pdb2);
            const err = instance.callMain([
                "/pdb1.pdb",
                "/pdb2.pdb",
            ]);
            if (err == 0) {
                resolve(buffer)
            } else {
                reject(err)
            }
        });
    })
}

export { tmalign };

