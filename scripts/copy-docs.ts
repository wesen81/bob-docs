import * as fs from 'fs';
import * as path from 'path';

interface DocsViewerConfig {
  docsPath?: string;
}

function loadConfig(): DocsViewerConfig {
  const configPath = path.resolve(process.cwd(), 'docs-viewer.config.json');

  if (fs.existsSync(configPath)) {
    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(configContent);
    } catch {
      console.warn('Warning: Failed to parse docs-viewer.config.json, using defaults');
      return {};
    }
  }

  return {};
}

function copyRecursive(src: string, dest: string) {
  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else if (stats.isFile()) {
    fs.copyFileSync(src, dest);
  }
}

function main() {
  const config = loadConfig();
  const configuredPath = config.docsPath || './docs';
  const docsPath = path.resolve(process.cwd(), configuredPath);
  const distPath = path.resolve(process.cwd(), 'dist', 'docs');

  if (!fs.existsSync(docsPath)) {
    console.error('Error: docs folder not found at', docsPath);
    console.error('Configure the path in docs-viewer.config.json or ensure ./docs exists');
    process.exit(1);
  }

  console.log('Using docs path from config:', configuredPath);
  console.log('Copying docs from:', docsPath);
  console.log('Copying docs to:', distPath);

  // Remove existing dist/docs if it exists
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
  }

  // Create dist directory if it doesn't exist
  const dist = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(dist)) {
    fs.mkdirSync(dist, { recursive: true });
  }

  copyRecursive(docsPath, distPath);

  console.log('Docs copied successfully');
}

main();
