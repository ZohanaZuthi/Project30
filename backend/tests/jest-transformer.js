const ts = require('typescript');

module.exports = {
  process(source, filename) {
    return {
      code: ts.transpileModule(source, {
        fileName: filename,
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2019,
          moduleResolution: ts.ModuleResolutionKind.NodeJs,
          esModuleInterop: true,
        },
      }).outputText,
    };
  },
};
