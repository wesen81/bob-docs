import type { FileEntry } from '../types';

export interface SearchResult {
  path: string;
  name: string;
  type: 'name' | 'content';
  snippet?: string;
  lineNumber?: number;
}

export class SearchService {
  private fileCache: Map<string, string> = new Map();

  /**
   * Search for files by name (case-insensitive, partial match)
   */
  searchByName(entries: FileEntry[], query: string): SearchResult[] {
    if (!query.trim()) return [];

    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    const traverse = (items: FileEntry[]) => {
      for (const entry of items) {
        if (entry.type === 'file' && entry.name.toLowerCase().includes(lowerQuery)) {
          results.push({
            path: entry.path,
            name: entry.name,
            type: 'name',
          });
        }
        if (entry.children) {
          traverse(entry.children);
        }
      }
    };

    traverse(entries);
    return results;
  }

  /**
   * Search for content within searchable file types
   */
  async searchByContent(entries: FileEntry[], query: string): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    const searchableExtensions = ['.md', '.json', '.csv', '.mmd', '.txt'];
    const results: SearchResult[] = [];
    const files = this.collectSearchableFiles(entries, searchableExtensions);

    await Promise.all(
      files.map(async (file) => {
        try {
          const content = await this.getFileContent(file.path);
          const matches = this.findMatches(content, query);

          matches.forEach((match) => {
            results.push({
              path: file.path,
              name: file.name,
              type: 'content',
              snippet: match.snippet,
              lineNumber: match.lineNumber,
            });
          });
        } catch (error) {
          console.error(`Failed to search in ${file.path}:`, error);
        }
      })
    );

    return results;
  }

  /**
   * Combined search: search by name and content
   */
  async search(entries: FileEntry[], query: string): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    const [nameResults, contentResults] = await Promise.all([
      Promise.resolve(this.searchByName(entries, query)),
      this.searchByContent(entries, query),
    ]);

    // Deduplicate: prefer content matches over name matches
    const resultMap = new Map<string, SearchResult>();

    nameResults.forEach((result) => {
      resultMap.set(result.path, result);
    });

    contentResults.forEach((result) => {
      const key = `${result.path}:${result.lineNumber || 0}`;
      resultMap.set(key, result);
    });

    return Array.from(resultMap.values());
  }

  /**
   * Collect all files with searchable extensions
   */
  private collectSearchableFiles(entries: FileEntry[], extensions: string[]): FileEntry[] {
    const files: FileEntry[] = [];

    const traverse = (items: FileEntry[]) => {
      for (const entry of items) {
        if (entry.type === 'file' && entry.extension && extensions.includes(entry.extension)) {
          files.push(entry);
        }
        if (entry.children) {
          traverse(entry.children);
        }
      }
    };

    traverse(entries);
    return files;
  }

  /**
   * Get file content (with caching)
   */
  private async getFileContent(path: string): Promise<string> {
    if (this.fileCache.has(path)) {
      return this.fileCache.get(path)!;
    }

    // Construct the URL to fetch the file from the docs endpoint
    const fileUrl = `/docs/${path}`;
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to load ${path}`);
    }

    const content = await response.text();
    this.fileCache.set(path, content);
    return content;
  }

  /**
   * Find matches in content and extract snippets
   */
  private findMatches(
    content: string,
    query: string
  ): Array<{ snippet: string; lineNumber: number }> {
    const lines = content.split('\n');
    const lowerQuery = query.toLowerCase();
    const matches: Array<{ snippet: string; lineNumber: number }> = [];
    const maxSnippetLength = 150;

    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase();
      const matchIndex = lowerLine.indexOf(lowerQuery);

      if (matchIndex !== -1) {
        // Extract snippet around the match
        let snippet = line;
        if (line.length > maxSnippetLength) {
          const start = Math.max(0, matchIndex - 50);
          const end = Math.min(line.length, matchIndex + query.length + 100);
          snippet = (start > 0 ? '...' : '') + line.slice(start, end) + (end < line.length ? '...' : '');
        }

        matches.push({
          snippet: snippet.trim(),
          lineNumber: index + 1,
        });
      }
    });

    return matches;
  }

  /**
   * Clear the file cache
   */
  clearCache() {
    this.fileCache.clear();
  }

  /**
   * Invalidate a single file from the cache
   */
  invalidateFile(path: string) {
    this.fileCache.delete(path);
  }
}
