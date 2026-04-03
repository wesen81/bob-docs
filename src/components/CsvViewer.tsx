import { useState, useMemo } from 'react';
import { parseCSV } from '../utils/csvParser';

interface CsvViewerProps {
  content: string;
}

export function CsvViewer({ content }: CsvViewerProps) {
  const [viewMode, setViewMode] = useState<'table' | 'raw'>('table');

  const { rows, error, stats } = useMemo(() => {
    try {
      const parsedRows = parseCSV(content);

      // Calculate stats
      const rowCount = parsedRows.length;
      const columnCount = parsedRows.length > 0 ? parsedRows[0].length : 0;
      const hasHeader = rowCount > 0;

      return {
        rows: parsedRows,
        error: null,
        stats: { rowCount, columnCount, hasHeader }
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse CSV';

      console.error('[CsvViewer] CSV parsing failed:', {
        error: err,
        contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : '')
      });

      return {
        rows: [],
        error: errorMessage,
        stats: null
      };
    }
  }, [content]);

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-red-800 font-semibold mb-1">CSV Parsing Error</h3>
              <p className="text-red-700 text-sm font-mono">{error}</p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-gray-700 font-semibold mb-2">Raw Content:</h4>
          <pre className="bg-gray-50 border border-gray-200 rounded p-4 overflow-x-auto text-sm font-mono whitespace-pre">
            {content}
          </pre>
        </div>
      </div>
    );
  }

  const headers = rows.length > 0 ? rows[0] : [];
  const dataRows = rows.slice(1);

  return (
    <div className="flex flex-col h-full">
      {/* Header with stats and toggle */}
      {stats && (
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="font-semibold">Rows:</span>
              <span>{stats.rowCount - (stats.hasHeader ? 1 : 0)}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4H5a2 2 0 00-2 2v14a2 2 0 002 2h4m0-18v18m0-18l7 7m-7-7l-7 7" />
              </svg>
              <span className="font-semibold">Columns:</span>
              <span>{stats.columnCount}</span>
            </div>
          </div>

          {/* Toggle button */}
          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'raw' : 'table')}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
          >
            {viewMode === 'table' ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Show Raw
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Show Table
              </>
            )}
          </button>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-auto p-4 bg-white">
        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              {headers.length > 0 && (
                <thead className="bg-gray-100">
                  <tr className="border-b border-gray-300">
                    {headers.map((header, index) => (
                      <th
                        key={index}
                        className="px-4 py-2 text-left font-semibold text-gray-900 border-r border-gray-300 last:border-r-0 whitespace-nowrap"
                      >
                        {header || `Column ${index + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {dataRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-gray-300 hover:bg-gray-50">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-4 py-2 text-gray-700 border-r border-gray-300 last:border-r-0"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <pre className="bg-gray-50 border border-gray-200 rounded p-4 overflow-x-auto text-sm font-mono whitespace-pre">
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}
