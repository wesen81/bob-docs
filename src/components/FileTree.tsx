import { useState, useEffect } from 'react';
import type { FileEntry } from '../types';

interface FileTreeProps {
  entries: FileEntry[];
  onFileSelect: (path: string) => void;
  selectedPath: string | null;
}

interface FileTreeItemProps {
  entry: FileEntry;
  level: number;
  onFileSelect: (path: string) => void;
  selectedPath: string | null;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
}

function getFileIcon(extension: string | undefined): string {
  if (!extension) return '📄';

  switch (extension) {
    case '.md':
      return '📝';
    case '.mmd':
      return '📊';
    case '.json':
      return '📋';
    case '.csv':
      return '📈';
    case '.svg':
      return '🖼️';
    case '.txt':
      return '📄';
    default:
      return '📄';
  }
}

function FileTreeItem({
  entry,
  level,
  onFileSelect,
  selectedPath,
  expandedFolders,
  onToggleFolder
}: FileTreeItemProps) {
  const isDirectory = entry.type === 'directory';
  const isExpanded = expandedFolders.has(entry.path);
  const isSelected = selectedPath === entry.path;
  const paddingLeft = `${level * 1.25}rem`;

  const handleClick = () => {
    if (isDirectory) {
      onToggleFolder(entry.path);
    } else {
      onFileSelect(entry.path);
    }
  };

  return (
    <div>
      <div
        className={`
          flex items-center py-2.5 px-2 cursor-pointer hover:bg-gray-100
          transition-colors duration-150
          touch-manipulation
          min-h-[44px]
          ${isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}
        `}
        style={{ paddingLeft }}
        onClick={handleClick}
        role={isDirectory ? 'button' : 'link'}
        aria-label={isDirectory ? `${isExpanded ? 'Collapse' : 'Expand'} ${entry.name}` : `Open ${entry.name}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {isDirectory && (
          <span className="mr-1.5 text-sm flex-shrink-0 w-4">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        <span className="mr-2 text-lg flex-shrink-0">
          {isDirectory ? '📁' : getFileIcon(entry.extension)}
        </span>
        <span className="text-sm truncate">
          {entry.name}
        </span>
      </div>

      {isDirectory && isExpanded && entry.children && (
        <div>
          {entry.children.map((child) => (
            <FileTreeItem
              key={child.path}
              entry={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              selectedPath={selectedPath}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree({ entries, onFileSelect, selectedPath }: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    const stored = sessionStorage.getItem('expandedFolders');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  useEffect(() => {
    sessionStorage.setItem('expandedFolders', JSON.stringify(Array.from(expandedFolders)));
  }, [expandedFolders]);

  const handleToggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  return (
    <div className="h-full overflow-y-auto bg-white border-r border-gray-200">
      <div className="py-2">
        {entries.map((entry) => (
          <FileTreeItem
            key={entry.path}
            entry={entry}
            level={0}
            onFileSelect={onFileSelect}
            selectedPath={selectedPath}
            expandedFolders={expandedFolders}
            onToggleFolder={handleToggleFolder}
          />
        ))}
      </div>
    </div>
  );
}
