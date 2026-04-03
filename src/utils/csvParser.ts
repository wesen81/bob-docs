/**
 * Simple CSV parser that handles quoted fields and escaped quotes
 */
export function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    const row: string[] = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote mode
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // Field delimiter
        row.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }

    // Add the last field
    row.push(currentField);
    rows.push(row);
  }

  return rows;
}
