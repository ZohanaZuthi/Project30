const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json');
const defaults = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2019,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  esModuleInterop: true,
  jsx: ts.JsxEmit.React,
};

function loadCompilerOptions() {
  if (!fs.existsSync(tsconfigPath)) return defaults;
  try {
    const source = fs.readFileSync(tsconfigPath, 'utf8');
    const parsed = ts.parseConfigFileTextToJson(tsconfigPath, source);
    return {
      ...defaults,
      ...(parsed.config?.compilerOptions ?? {}),
      module: ts.ModuleKind.CommonJS,
    };
  } catch {
    return defaults;
  }
}

module.exports = { compilerOptions: loadCompilerOptions(), loadCompilerOptions };
