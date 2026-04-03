import { useEffect, useState, useRef, useCallback } from 'react';
import { MarkdownViewer } from './MarkdownViewer';
import { MermaidDiagram } from './MermaidDiagram';
import { JsonViewer } from './JsonViewer';
import { CsvViewer } from './CsvViewer';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { useFileWatcher } from '../hooks/useFileWatcher';

interface FileContentProps {
  filePath: string;
  highlightLine?: number;
}

type ErrorType = 'fetch' | 'parse' | 'unsupported';

interface FileError {
  type: ErrorType;
  message: string;
  details?: string;
}

export function FileContent({ filePath, highlightLine }: FileContentProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FileError | null>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const fetchFile = useCallback((isReload = false) => {
    if (!isReload) {
      setLoading(true);
      setError(null);
      setContent('');
    }

    const fileUrl = `/docs/${filePath}`;

    fetch(fileUrl)
      .then((response) => {
        if (!response.ok) {
          const errorMessage = response.status === 404
            ? 'File not found'
            : `Server error: ${response.statusText}`;

          console.error(`[FileContent] Failed to fetch file "${filePath}":`, {
            status: response.status,
            statusText: response.statusText,
            url: fileUrl
          });

          throw new Error(errorMessage);
        }
        return response.text();
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((err) => {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';

        console.error(`[FileContent] Error loading file "${filePath}":`, err);

        setError({
          type: 'fetch',
          message: errorMessage,
          details: `File: ${filePath}\nURL: ${fileUrl}\nError: ${err instanceof Error ? err.stack : String(err)}`
        });
        setLoading(false);
      });
  }, [filePath]);

  useEffect(() => {
    fetchFile(false);
  }, [fetchFile]);

  useFileWatcher({
    onFileChanged: useCallback((changedPath: string) => {
      if (changedPath === filePath) {
        fetchFile(true);
      }
    }, [filePath, fetchFile]),
  });

  useEffect(() => {
    if (highlightLine && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [highlightLine, content]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner message="Loading file..." />
      </div>
    );
  }

  if (error) {
    const errorTitles: Record<ErrorType, string> = {
      fetch: 'Failed to Load File',
      parse: 'Failed to Parse File',
      unsupported: 'Unsupported File Type'
    };

    return (
      <div className="flex items-center justify-center min-h-96 p-4">
        <div className="max-w-2xl w-full">
          <ErrorDisplay
            title={errorTitles[error.type]}
            message={error.message}
            details={error.details}
          />
        </div>
      </div>
    );
  }

  // Determine the file type
  const fileExtension = filePath.split('.').pop()?.toLowerCase() || '';
  const isMarkdown = filePath.endsWith('.md') || filePath.endsWith('.markdown');
  const isMermaid = filePath.endsWith('.mmd');
  const isJson = filePath.endsWith('.json');
  const isCsv = filePath.endsWith('.csv');

  // List of supported file extensions
  const supportedExtensions = ['md', 'markdown', 'mmd', 'json', 'csv', 'txt', 'log', 'yaml', 'yml', 'xml', 'html', 'css', 'js', 'ts', 'tsx', 'jsx', 'py', 'java', 'c', 'cpp', 'h', 'sh', 'bash'];
  const isTextFile = supportedExtensions.includes(fileExtension) || content.length < 100000;

  if (isMarkdown) {
    return <MarkdownViewer content={content} currentFilePath={filePath} />;
  }

  if (isMermaid) {
    return (
      <div className="flex justify-center items-start min-h-96 p-6">
        <MermaidDiagram chart={content} />
      </div>
    );
  }

  if (isJson) {
    return <JsonViewer content={content} />;
  }

  if (isCsv) {
    return <CsvViewer content={content} />;
  }

  // Check if file type is likely binary or unsupported
  if (!isTextFile) {
    console.warn(`[FileContent] Unsupported or binary file type: "${fileExtension}" for file "${filePath}"`);

    return (
      <div className="flex items-center justify-center min-h-96 p-4">
        <div className="max-w-2xl w-full">
          <ErrorDisplay
            type="warning"
            title="Unsupported File Type"
            message={`Cannot display files with extension ".${fileExtension}". This file type is not supported for preview.`}
            details={`File: ${filePath}\nExtension: .${fileExtension}\nSupported text formats: ${supportedExtensions.join(', ')}`}
          />
        </div>
      </div>
    );
  }

  // For other text files, display as plain text with line numbers and highlighting
  const lines = content.split('\n');

  return (
    <div className="font-mono text-sm">
      <div className="bg-gray-50 p-4 rounded overflow-x-auto">
        {lines.map((line, index) => {
          const lineNumber = index + 1;
          const isHighlighted = highlightLine === lineNumber;

          return (
            <div
              key={lineNumber}
              ref={isHighlighted ? highlightRef : null}
              className={`flex ${isHighlighted ? 'bg-yellow-100' : ''}`}
            >
              <span className="text-gray-400 select-none pr-4 text-right" style={{ minWidth: '3em' }}>
                {lineNumber}
              </span>
              <pre className="flex-1 whitespace-pre-wrap break-all">{line}</pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}
