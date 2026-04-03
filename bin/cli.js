#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as os from 'os';
import * as readline from 'readline';
import { fileURLToPath } from 'url';
import { watch } from 'chokidar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inlined from scripts/generate-manifest.ts
function scanDirectory(dirPath, relativePath = '') {
  const entries = [];
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const itemRelativePath = relativePath ? `${relativePath}/${item}` : item;
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      const children = scanDirectory(fullPath, itemRelativePath);
      entries.push({
        name: item,
        path: itemRelativePath,
        type: 'directory',
        children,
      });
    } else if (stats.isFile()) {
      const extension = path.extname(item);
      entries.push({
        name: item,
        path: itemRelativePath,
        type: 'file',
        extension,
        size: stats.size,
      });
    }
  }

  return entries.sort((a, b) => {
    // Directories first, then files
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

function generateManifest(docsPath, outputPath) {
  if (!fs.existsSync(docsPath)) {
    throw new Error(`Docs folder not found at ${docsPath}`);
  }

  const manifest = {
    generated: new Date().toISOString(),
    root: scanDirectory(docsPath),
  };

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
}

// Configuration defaults
const DEFAULT_CONFIG = {
  docsPath: './docs',
  port: 3000,
  host: '0.0.0.0'
};

/**
 * Find the host project root by walking up from the current directory
 * to find a package.json file. This is the project that installed bob-docs.
 *
 * @returns {string} Absolute path to the host project root
 */
function findHostProjectRoot() {
  let currentDir = process.cwd();

  // Walk up the directory tree looking for package.json
  while (currentDir !== path.dirname(currentDir)) { // Stop at filesystem root
    const packageJsonPath = path.join(currentDir, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      return currentDir;
    }

    currentDir = path.dirname(currentDir);
  }

  // If no package.json found, use current working directory
  return process.cwd();
}

// Parse command line arguments
function parseArgs() {
  const args = {
    config: null,
    docsPath: null,
    port: null,
    host: null,
    help: false,
    version: false,
    init: false
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    const nextArg = process.argv[i + 1];

    switch (arg) {
      case '--help':
      case '-h':
        args.help = true;
        break;
      case '--version':
      case '-v':
        args.version = true;
        break;
      case 'init':
        args.init = true;
        break;
      case '--config':
      case '-c':
        args.config = nextArg;
        i++;
        break;
      case '--docs-path':
      case '-d':
        args.docsPath = nextArg;
        i++;
        break;
      case '--port':
      case '-p':
        args.port = parseInt(nextArg, 10);
        i++;
        break;
      case '--host':
        args.host = nextArg;
        i++;
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        process.exit(1);
    }
  }

  return args;
}

// Display help text
function showHelp() {
  console.log(`
bob-docs - Documentation viewer

Usage:
  bob-docs [options]
  bob-docs init

Commands:
  init                    Initialize configuration interactively

Options:
  -h, --help              Show this help message
  -v, --version           Show version number
  -c, --config <path>     Path to configuration file (default: .bob-docs.json)
  -d, --docs-path <path>  Path to documentation folder (default: ./docs)
  -p, --port <number>     Port to run server on (default: 3000)
  --host <host>           Host to bind server to (default: 0.0.0.0)

Configuration File:
  Create a .bob-docs.json file in your project root:
  {
    "docsPath": "./docs",
    "port": 3000,
    "host": "0.0.0.0"
  }

  Or run "bob-docs init" to create it interactively.

  CLI arguments override configuration file settings.

Examples:
  bob-docs init
  bob-docs
  bob-docs --port 8080
  bob-docs --config my-config.json
  bob-docs --docs-path ./documentation --port 8080
`);
}

// Get version from package.json
function getVersion() {
  try {
    const packageJsonPath = path.resolve(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    return 'unknown';
  }
}

// Validate configuration object
function validateConfig(config, configPath) {
  const errors = [];

  // Validate docsPath
  if (config.docsPath !== undefined) {
    if (typeof config.docsPath !== 'string') {
      errors.push(`"docsPath" must be a string, got ${typeof config.docsPath}`);
    } else if (config.docsPath.trim() === '') {
      errors.push('"docsPath" cannot be an empty string');
    }
  }

  // Validate port
  if (config.port !== undefined) {
    if (typeof config.port !== 'number') {
      errors.push(`"port" must be a number, got ${typeof config.port}`);
    } else if (!Number.isInteger(config.port)) {
      errors.push(`"port" must be an integer, got ${config.port}`);
    } else if (config.port < 1 || config.port > 65535) {
      errors.push(`"port" must be between 1 and 65535, got ${config.port}`);
    }
  }

  // Validate host
  if (config.host !== undefined) {
    if (typeof config.host !== 'string') {
      errors.push(`"host" must be a string, got ${typeof config.host}`);
    } else if (config.host.trim() === '') {
      errors.push('"host" cannot be an empty string');
    }
  }

  // Check for unknown properties
  const validKeys = ['docsPath', 'port', 'host'];
  const configKeys = Object.keys(config);
  const unknownKeys = configKeys.filter(key => !validKeys.includes(key));
  if (unknownKeys.length > 0) {
    errors.push(`Unknown configuration properties: ${unknownKeys.join(', ')}`);
  }

  if (errors.length > 0) {
    console.error(`\nConfiguration validation failed for ${configPath}:`);
    errors.forEach(error => console.error(`  ✗ ${error}`));
    console.error('\nValid configuration format:');
    console.error('  {');
    console.error('    "docsPath": "./docs",  // string, path to documentation folder');
    console.error('    "port": 3000,          // number, 1-65535');
    console.error('    "host": "0.0.0.0"     // string, hostname or IP');
    console.error('  }');
    console.error('');
    process.exit(1);
  }
}

// Load configuration from file
function loadConfig(configPath) {
  try {
    const fullPath = path.resolve(process.cwd(), configPath);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    const configContent = fs.readFileSync(fullPath, 'utf8');
    const config = JSON.parse(configContent);

    // Validate the loaded configuration
    validateConfig(config, configPath);

    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`\nError: Invalid JSON in config file ${configPath}`);
      console.error(`  ${error.message}`);
      console.error('');
      process.exit(1);
    }
    console.error(`Error loading config file: ${error.message}`);
    process.exit(1);
  }
}

// Merge configuration from multiple sources
function buildConfig(args) {
  // Start with defaults
  const config = { ...DEFAULT_CONFIG };

  // Find the host project root
  const projectRoot = findHostProjectRoot();

  // Try to load config file (look in project root)
  const configPath = args.config || '.bob-docs.json';
  const fileConfig = loadConfig(configPath);
  if (fileConfig) {
    Object.assign(config, fileConfig);
  }

  // CLI arguments override config file
  if (args.docsPath !== null) config.docsPath = args.docsPath;
  if (args.port !== null) config.port = args.port;
  if (args.host !== null) config.host = args.host;


  // Store the project root for path resolution
  config.projectRoot = projectRoot;

  return config;
}

// Get MIME type based on file extension
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.md': 'text/markdown',
    '.csv': 'text/csv'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Start HTTP server
function startServer(config) {
  const distPath = path.resolve(__dirname, '../dist');

  // Resolve docs path relative to project root (converts relative to absolute)
  const docsPath = path.isAbsolute(config.docsPath)
    ? config.docsPath
    : path.resolve(config.projectRoot, config.docsPath);

  // Verify dist folder exists
  if (!fs.existsSync(distPath)) {
    console.error('Error: Built files not found. Please run "npm run build" first.');
    process.exit(1);
  }

  // Verify docs folder exists with clear error message
  if (!fs.existsSync(docsPath)) {
    console.error(`\nError: Documentation folder not found`);
    console.error(`  Expected location: ${docsPath}`);
    console.error(`  Project root:      ${config.projectRoot}`);
    console.error(`\nTo fix this issue:`);
    console.error(`  1. Create the docs folder: mkdir -p "${docsPath}"`);
    console.error(`  2. Or specify a different path: bob-docs --docs-path <path>`);
    console.error(`  3. Or update .bob-docs.json with the correct "docsPath"\n`);
    process.exit(1);
  }

  // Generate manifest.json dynamically from the configured docs path
  // Store in a temp directory to avoid conflicts
  const tempDir = path.join(os.tmpdir(), `bob-docs-${process.pid}`);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const manifestPath = path.join(tempDir, 'manifest.json');

  try {
    generateManifest(docsPath, manifestPath);
    console.log(`Generated manifest from: ${docsPath}`);
  } catch (error) {
    console.error(`\nError: Failed to generate manifest`);
    console.error(`  ${error.message}`);
    process.exit(1);
  }

  // Store manifest path in config for server to use
  config.manifestPath = manifestPath;

  // SSE clients
  const sseClients = new Set();

  function broadcastSSE(event, data) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of sseClients) {
      res.write(message);
    }
  }

  // Debounced manifest regeneration
  let manifestDebounceTimer = null;
  function debouncedManifestRegenerate() {
    if (manifestDebounceTimer) clearTimeout(manifestDebounceTimer);
    manifestDebounceTimer = setTimeout(() => {
      try {
        generateManifest(docsPath, manifestPath);
        console.log('Manifest regenerated');
        broadcastSSE('manifest-changed', {});
      } catch (error) {
        console.error('Failed to regenerate manifest:', error.message);
      }
    }, 300);
  }

  // File watcher
  const watcher = watch(docsPath, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
  });

  const structureEvents = ['add', 'unlink', 'addDir', 'unlinkDir'];
  for (const evt of structureEvents) {
    watcher.on(evt, (filePath) => {
      const relativePath = path.relative(docsPath, filePath).split(path.sep).join('/');
      console.log(`[watcher] ${evt}: ${relativePath}`);
      if (evt === 'add' || evt === 'unlink') {
        broadcastSSE('file-changed', { path: relativePath });
      }
      debouncedManifestRegenerate();
    });
  }

  watcher.on('change', (filePath) => {
    const relativePath = path.relative(docsPath, filePath).split(path.sep).join('/');
    console.log(`[watcher] change: ${relativePath}`);
    broadcastSSE('file-changed', { path: relativePath });
  });

  // Heartbeat interval
  const heartbeatInterval = setInterval(() => {
    for (const res of sseClients) {
      res.write(': heartbeat\n\n');
    }
  }, 30000);

  const server = http.createServer((req, res) => {
    // SSE endpoint
    if (req.url === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      res.write(': connected\n\n');
      sseClients.add(res);

      req.on('close', () => {
        sseClients.delete(res);
      });
      return;
    }

    let filePath;

    // Serve manifest.json from temp location
    if (req.url === '/manifest.json' || req.url.startsWith('/manifest.json?')) {
      filePath = config.manifestPath;
    }
    // Serve docs files
    else if (req.url.startsWith('/docs/')) {
      const docPath = req.url.slice(6); // Remove '/docs/' prefix
      filePath = path.join(docsPath, docPath);

      // Prevent directory traversal
      const normalizedFilePath = path.normalize(filePath);
      const normalizedDocsPath = path.normalize(docsPath);
      if (!normalizedFilePath.startsWith(normalizedDocsPath)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
      }
    } else {
      // Serve static files from dist
      let urlPath = req.url === '/' ? '/index.html' : req.url;

      // Remove query string
      const queryIndex = urlPath.indexOf('?');
      if (queryIndex !== -1) {
        urlPath = urlPath.slice(0, queryIndex);
      }

      filePath = path.join(distPath, urlPath);

      // Prevent directory traversal
      const normalizedFilePath = path.normalize(filePath);
      const normalizedDistPath = path.normalize(distPath);
      if (!normalizedFilePath.startsWith(normalizedDistPath)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
      }
    }

    // Check if file exists
    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // If file not found and not an API route, serve index.html for client-side routing
        if (!req.url.startsWith('/docs/') && !req.url.startsWith('/api/')) {
          const indexPath = path.join(distPath, 'index.html');
          fs.readFile(indexPath, (err, data) => {
            if (err) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end('Internal Server Error');
              return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
          });
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        }
        return;
      }

      // Read and serve file
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
          return;
        }

        const mimeType = getMimeType(filePath);
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(data);
      });
    });
  });

  server.listen(config.port, config.host, () => {
    console.log(`\n✓ bob-docs server running`);
    console.log(`  Local:   http://${config.host}:${config.port}`);
    console.log(`  Docs:    ${docsPath}`);
    console.log(`  Watch:   enabled (auto-reload)`);
    console.log(`\nPress Ctrl+C to stop\n`);
  });

  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Error: Port ${config.port} is already in use.`);
      console.error('Please try a different port with --port <number>');
    } else {
      console.error(`Server error: ${error.message}`);
    }
    cleanupTempFiles(tempDir);
    process.exit(1);
  });

  // Cleanup on exit
  const cleanup = () => {
    clearInterval(heartbeatInterval);
    watcher.close();
    for (const res of sseClients) {
      res.end();
    }
    cleanupTempFiles(tempDir);
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

// Cleanup temporary files
function cleanupTempFiles(tempDir) {
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Interactive prompt helper
function prompt(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Initialize configuration interactively
async function initConfig() {
  const configPath = path.resolve(process.cwd(), '.bob-docs.json');

  if (fs.existsSync(configPath)) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const overwrite = await prompt(rl, '\n.bob-docs.json already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Aborted.');
      rl.close();
      process.exit(0);
    }
    rl.close();
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('\nbob-docs configuration\n');
  console.log('Press Enter to accept the default value shown in brackets.\n');

  // 1. docsPath
  const docsPath = (await prompt(rl, `Documentation folder path [./docs]: `)) || './docs';

  // 2. port
  let port = 3000;
  const portInput = await prompt(rl, `Server port [3000]: `);
  if (portInput) {
    const parsed = parseInt(portInput, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
      console.error('Invalid port number. Using default 3000.');
    } else {
      port = parsed;
    }
  }

  // 3. host
  console.log('\n  0.0.0.0   = accessible from other machines (LAN/VPN)');
  console.log('  localhost = only accessible on this machine');
  const host = (await prompt(rl, `Host to bind to [0.0.0.0]: `)) || '0.0.0.0';

  rl.close();

  const config = { docsPath, port, host };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');

  console.log(`\nConfiguration saved to .bob-docs.json:\n`);
  console.log(JSON.stringify(config, null, 2));

  // Create docs folder if it doesn't exist
  const resolvedDocsPath = path.resolve(process.cwd(), docsPath);
  if (!fs.existsSync(resolvedDocsPath)) {
    fs.mkdirSync(resolvedDocsPath, { recursive: true });
    console.log(`\nCreated documentation folder: ${resolvedDocsPath}`);
  }

  console.log('\nRun "bob-docs" to start the server.\n');
}

// Main function
async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (args.version) {
    console.log(`bob-docs v${getVersion()}`);
    process.exit(0);
  }

  if (args.init) {
    await initConfig();
    process.exit(0);
  }

  const config = buildConfig(args);
  startServer(config);
}

main();
