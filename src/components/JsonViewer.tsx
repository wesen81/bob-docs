import { useState, useMemo } from 'react';

interface JsonViewerProps {
  content: string;
}

interface JsonNodeProps {
  data: unknown;
  keyName?: string;
  level?: number;
  path?: string;
}

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

function getDataType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function JsonNode({ data, keyName, level = 0, path = '' }: JsonNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels
  const dataType = getDataType(data);
  const isExpandable = dataType === 'object' || dataType === 'array';
  const currentPath = path ? `${path}.${keyName}` : keyName || '';

  const renderValue = (value: unknown): JSX.Element => {
    const type = getDataType(value);

    switch (type) {
      case 'string':
        return <span className="text-green-600">"{String(value)}"</span>;
      case 'number':
        return <span className="text-blue-600">{String(value)}</span>;
      case 'boolean':
        return <span className="text-purple-600">{String(value)}</span>;
      case 'null':
        return <span className="text-gray-500">null</span>;
      default:
        return <span>{String(value)}</span>;
    }
  };

  const getItemCount = (value: unknown): string => {
    if (Array.isArray(value)) {
      return `${value.length} ${value.length === 1 ? 'item' : 'items'}`;
    }
    if (typeof value === 'object' && value !== null) {
      const keys = Object.keys(value);
      return `${keys.length} ${keys.length === 1 ? 'key' : 'keys'}`;
    }
    return '';
  };

  const renderExpandableContent = () => {
    if (!isExpandable) return null;

    if (Array.isArray(data)) {
      return (
        <div className="ml-4 border-l-2 border-gray-200">
          {data.map((item, index) => (
            <JsonNode
              key={index}
              data={item}
              keyName={String(index)}
              level={level + 1}
              path={currentPath}
            />
          ))}
        </div>
      );
    }

    if (typeof data === 'object' && data !== null) {
      const entries = Object.entries(data);
      return (
        <div className="ml-4 border-l-2 border-gray-200">
          {entries.map(([key, value]) => (
            <JsonNode
              key={key}
              data={value}
              keyName={key}
              level={level + 1}
              path={currentPath}
            />
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="font-mono text-sm leading-relaxed">
      <div className="flex items-start hover:bg-gray-50 py-0.5 px-2 rounded group">
        <div className="flex items-center min-w-0 flex-1">
          {isExpandable && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mr-1 text-gray-500 hover:text-gray-700 focus:outline-none flex-shrink-0"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
          {!isExpandable && <span className="w-5 flex-shrink-0" />}

          {keyName !== undefined && (
            <span className="text-blue-700 font-semibold mr-2 flex-shrink-0">
              {dataType === 'array' ? `[${keyName}]` : keyName}:
            </span>
          )}

          <div className="flex items-center min-w-0 flex-1">
            {isExpandable ? (
              <span className="text-gray-600 flex items-center gap-2">
                <span className="font-bold">{dataType === 'array' ? '[' : '{'}</span>
                {!isExpanded && (
                  <>
                    <span className="text-xs text-gray-500 italic">
                      {getItemCount(data)}
                    </span>
                    <span className="font-bold">{dataType === 'array' ? ']' : '}'}</span>
                  </>
                )}
              </span>
            ) : (
              renderValue(data)
            )}

            <span className="ml-2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
              {dataType}
            </span>
          </div>
        </div>

        {currentPath && (
          <span className="ml-2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {currentPath}
          </span>
        )}
      </div>

      {isExpandable && isExpanded && (
        <>
          {renderExpandableContent()}
          <div className="ml-4 pl-2 py-0.5 text-gray-600 font-bold">
            {dataType === 'array' ? ']' : '}'}
          </div>
        </>
      )}
    </div>
  );
}

export function JsonViewer({ content }: JsonViewerProps) {
  const { parsedData, error, stats } = useMemo(() => {
    try {
      const parsed = JSON.parse(content);

      // Calculate stats
      const calculateStats = (obj: unknown): { keys: number; depth: number; size: number } => {
        const jsonString = JSON.stringify(obj);
        const size = new Blob([jsonString]).size;

        let maxDepth = 0;
        let totalKeys = 0;

        const traverse = (value: unknown, depth: number) => {
          maxDepth = Math.max(maxDepth, depth);

          if (Array.isArray(value)) {
            totalKeys += value.length;
            value.forEach(item => traverse(item, depth + 1));
          } else if (typeof value === 'object' && value !== null) {
            const keys = Object.keys(value);
            totalKeys += keys.length;
            keys.forEach(key => traverse((value as JsonObject)[key], depth + 1));
          }
        };

        traverse(obj, 0);

        return { keys: totalKeys, depth: maxDepth, size };
      };

      const stats = calculateStats(parsed);

      return { parsedData: parsed, error: null, stats };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid JSON';

      console.error('[JsonViewer] JSON parsing failed:', {
        error: err,
        contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : '')
      });

      return {
        parsedData: null,
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
              <h3 className="text-red-800 font-semibold mb-1">Invalid JSON</h3>
              <p className="text-red-700 text-sm font-mono">{error}</p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-gray-700 font-semibold mb-2">Raw Content:</h4>
          <pre className="bg-gray-50 border border-gray-200 rounded p-4 overflow-x-auto text-sm font-mono">
            {content}
          </pre>
        </div>
      </div>
    );
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-full">
      {stats && (
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-6 text-sm text-gray-600 flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span className="font-semibold">Size:</span>
            <span>{formatBytes(stats.size)}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
            <span className="font-semibold">Keys:</span>
            <span>{stats.keys}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="font-semibold">Max Depth:</span>
            <span>{stats.depth}</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 bg-white">
        <JsonNode data={parsedData} />
      </div>
    </div>
  );
}
