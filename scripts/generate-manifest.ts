import * as fs from 'fs';
import * as path from 'path';

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension?: string;
  size?: number;
  children?: FileEntry[];
}

function scanDirectory(dirPath: string, relativePath: string = ''): FileEntry[] {
  const entries: FileEntry[] = [];
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

/**
 * Generate a manifest.json file from a docs directory
 * @param docsPath - Absolute path to the docs directory
 * @param outputPath - Absolute path where manifest.json should be written
 */
export function generateManifest(docsPath: string, outputPath: string): void {
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

function main() {
  // Default behavior for CLI usage (build scripts)
  const docsPath = path.resolve(process.cwd(), 'docs');

  if (!fs.existsSync(docsPath)) {
    console.error('Error: docs folder not found at', docsPath);
    process.exit(1);
  }

  console.log('Generating manifest from:', docsPath);

  const publicDir = path.resolve(process.cwd(), 'public');
  const manifestPath = path.join(publicDir, 'manifest.json');

  try {
    generateManifest(docsPath, manifestPath);
    console.log('Manifest generated successfully at:', manifestPath);

    // Read back to count entries
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log('Total entries:', countEntries(manifest.root));
  } catch (error) {
    console.error('Error generating manifest:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function countEntries(entries: FileEntry[]): number {
  let count = entries.length;
  for (const entry of entries) {
    if (entry.children) {
      count += countEntries(entry.children);
    }
  }
  return count;
}

main();
