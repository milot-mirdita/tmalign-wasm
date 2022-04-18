all: tmalign-wasm.js tmalign-wasm.wasm

SMALL:=-Oz -flto -s EVAL_CTORS=1

tmalign-wasm.js tmalign-wasm.wasm: TMalign.cpp
	emcc TMalign.cpp -std=c++11 ${SMALL} -fno-rtti -s EXPORTED_RUNTIME_METHODS=callMain,FS -s INVOKE_RUN=0 -s FILESYSTEM=1 -s ALLOW_MEMORY_GROWTH=1 -s TOTAL_MEMORY=256MB -s ENVIRONMENT=web -s MODULARIZE=1 -s EXPORT_ES6=1 -s 'EXPORT_NAME="createTmalign"' -s SINGLE_FILE=0 -s ASSERTIONS=0 -o tmalign-wasm.js

clean:
	rm -f tmalign-wasm.js tmalign-wasm.wasm
