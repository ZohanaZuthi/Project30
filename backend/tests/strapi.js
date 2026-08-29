try {
  require('ts-node/register/transpile-only');
} catch {
  require('./ts-runtime');
}

const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');
const knexFactory = require('knex');
const databaseConnection = require('@strapi/database/dist/connection.js');
const { compilerOptions } = require('./ts-compiler-options');

const coreRoot = path.dirname(require.resolve('@strapi/core/package.json'));
const loadConfigPath = path.join(coreRoot, 'dist', 'utils', 'load-config-file.js');
const loadConfigModule = require(loadConfigPath);

if (!loadConfigModule.loadConfigFile.__lmsTypeScriptPatched) {
  const { env } = require('@strapi/utils');
  const originalLoadConfigFile = loadConfigModule.loadConfigFile;

  function loadTypeScriptConfig(filename) {
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { ...compilerOptions, module: ts.ModuleKind.CommonJS },
      fileName: filename,
      reportDiagnostics: false,
    });
    const loadedModule = new Module(filename);
    loadedModule.filename = filename;
    loadedModule.paths = Module._nodeModulePaths(path.dirname(filename));
    loadedModule._compile(output.outputText, filename);
    const exported = loadedModule.exports;
    const resolved = exported?.__esModule ? exported.default : exported;
    return typeof resolved === 'function' ? resolved({ env }) : resolved;
  }

  const patchedLoadConfigFile = (filename) =>
    ['.ts', '.cts', '.mts'].includes(path.extname(filename).toLowerCase())
      ? loadTypeScriptConfig(filename)
      : originalLoadConfigFile(filename);
  patchedLoadConfigFile.__lmsTypeScriptPatched = true;
  loadConfigModule.loadConfigFile = patchedLoadConfigFile;
  require.cache[loadConfigPath].exports = loadConfigModule;
}

const configLoaderPath = path.join(coreRoot, 'dist', 'configuration', 'config-loader.js');
const originalLoadConfigDir = require(configLoaderPath);

if (!originalLoadConfigDir.__lmsTypeScriptPatched) {
  const extensions = new Set(['.js', '.json', '.ts', '.cts', '.mts']);
  const patchedLoadConfigDir = (directory) => {
    if (!fs.existsSync(directory)) return {};
    return fs
      .readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && extensions.has(path.extname(entry.name)))
      .reduce((config, entry) => {
        const extension = path.extname(entry.name);
        const key = path.basename(entry.name, extension);
        config[key] = loadConfigModule.loadConfigFile(
          path.resolve(directory, entry.name)
        );
        return config;
      }, {});
  };
  patchedLoadConfigDir.__lmsTypeScriptPatched = true;
  require.cache[configLoaderPath].exports = patchedLoadConfigDir;
}

databaseConnection.createConnection = (userConfig, strapiConfig) => {
  const clientMap = { sqlite: 'sqlite3', mysql: 'mysql2', postgres: 'pg' };
  if (!clientMap[userConfig.client]) {
    throw new Error(`Unsupported test database client ${userConfig.client}.`);
  }
  const knexConfig = { ...userConfig, client: clientMap[userConfig.client] };
  if (strapiConfig?.pool?.afterCreate) {
    knexConfig.pool ??= {};
    const userAfterCreate = knexConfig.pool.afterCreate;
    knexConfig.pool.afterCreate = (connection, done) => {
      strapiConfig.pool.afterCreate(connection, (error, nativeConnection) => {
        if (error || !userAfterCreate) return done(error, nativeConnection);
        return userAfterCreate(nativeConnection, done);
      });
    };
  }
  return knexFactory(knexConfig);
};

process.env.NODE_ENV = 'test';
process.env.APP_KEYS ||= 'testKeyOne,testKeyTwo';
process.env.API_TOKEN_SALT ||= 'test-api-token-salt';
process.env.ADMIN_JWT_SECRET ||= 'test-admin-jwt-secret';
process.env.TRANSFER_TOKEN_SALT ||= 'test-transfer-token-salt';
process.env.ENCRYPTION_KEY ||= '0123456789abcdef0123456789abcdef';
process.env.JWT_SECRET ||= 'test-jwt-secret';
process.env.DATABASE_CLIENT = 'sqlite';
process.env.DATABASE_FILENAME = '.tmp/lms-api-test.db';
process.env.STRAPI_DISABLE_CRON = 'true';
process.env.PORT = '0';
require('sqlite3');

const { createStrapi } = require('@strapi/strapi');
let instance;

async function setupStrapi() {
  if (!instance) {
    instance = await createStrapi({
      appDir: path.resolve(__dirname, '..'),
      distDir: path.resolve(__dirname, '..', 'dist'),
    }).load();
    // Jest's VM serializes Date objects passed through Strapi's SQLite session
    // content type as null. Keep the broad LMS suite on legacy access tokens;
    // tests/session.api.js runs refresh mode in a normal Node process.
    if (process.env.LMS_TEST_REFRESH !== 'true') {
      instance.config.set(
        'plugin::users-permissions.jwtManagement',
        'legacy-support'
      );
    }
    await instance.start();
    global.strapi = instance;
  }
  return instance;
}

async function cleanupStrapi() {
  if (!instance) return;
  await instance.server.httpServer.close();
  await instance.db.connection.destroy();
  await instance.destroy();
  const databaseFile = path.resolve(__dirname, '..', '.tmp', 'lms-api-test.db');
  if (fs.existsSync(databaseFile)) fs.unlinkSync(databaseFile);
  global.strapi = undefined;
  instance = undefined;
}

module.exports = { setupStrapi, cleanupStrapi };
