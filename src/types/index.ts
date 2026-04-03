export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension?: string;
  size?: number;
  children?: FileEntry[];
}

export interface Manifest {
  generated: string;
  root: FileEntry[];
}

export interface ZinniaDocConfig {
  docsPath: string;
  port: number;
  host: string;
}
