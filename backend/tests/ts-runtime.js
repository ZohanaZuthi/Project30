const fs = require('fs');
const Module = require('module');
const ts = require('typescript');
const { compilerOptions } = require('./ts-compiler-options');

if (!Module._extensions['.ts']) {
  Module._extensions['.ts'] = function compileTypeScript(module, filename) {
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions,
      fileName: filename,
      reportDiagnostics: false,
    });
    return module._compile(output.outputText, filename);
  };
}

Module._extensions['.tsx'] ??= Module._extensions['.ts'];
