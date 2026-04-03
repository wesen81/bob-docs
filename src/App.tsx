import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FileTree from './components/FileTree';
import { FileContent } from './components/FileContent';
import { Breadcrumb } from './components/Breadcrumb';
import { SearchBar } from './components/SearchBar';
import { useManifest } from './hooks/useManifest';
import { SearchService, SearchResult } from './services/searchService';
import { useFileWatcher } from './hooks/useFileWatcher';

function App() {
  const { manifest, loading, error } = useManifest();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightLine, setHighlightLine] = useState<number | undefined>(undefined);
  const searchServiceRef = useRef(new SearchService());
  const searchTimeoutRef = useRef<number>();

  // Sync URL with selected file path
  useEffect(() => {
    // Remove leading slash from pathname to get the file path
    const pathFromUrl = location.pathname.slice(1); // Remove leading '/'

    if (pathFromUrl && pathFromUrl !== selectedPath) {
      setSelectedPath(pathFromUrl);
      setHighlightLine(undefined);
    } else if (!pathFromUrl && selectedPath) {
      // URL is root but we have a selected path - this means user navigated to home
      setSelectedPath(null);
      setHighlightLine(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Auto-collapse sidebar on mobile, auto-open on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleFileSelect = (path: string) => {
    setSelectedPath(path);
    setHighlightLine(undefined);
    // Update URL to reflect the selected file
    navigate(`/${path}`, { replace: false });
    // Auto-close sidebar on mobile after file selection
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleBreadcrumbNavigate = (path: string) => {
    // Clear selection when navigating to a folder via breadcrumb
    setSelectedPath(path || null);
    setHighlightLine(undefined);
    // Update URL
    navigate(path ? `/${path}` : '/', { replace: false });
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSearch = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    searchTimeoutRef.current = window.setTimeout(async () => {
      if (manifest) {
        try {
          const results = await searchServiceRef.current.search(manifest.root, query);
          setSearchResults(results);
        } catch (err) {
          console.error('Search error:', err);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }
    }, 300);
  }, [manifest]);

  useFileWatcher({
    onFileChanged: useCallback((changedPath: string) => {
      searchServiceRef.current.invalidateFile(changedPath);
    }, []),
    onManifestChanged: useCallback(() => {
      searchServiceRef.current.clearCache();
    }, []),
  });

  const handleClearSearch = useCallback(() => {
    setSearchResults([]);
    setIsSearching(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);

  const handleSearchResultClick = useCallback((result: SearchResult) => {
    setSelectedPath(result.path);
    setHighlightLine(result.lineNumber);
    // Update URL to reflect the selected file
    navigate(`/${result.path}`, { replace: false });
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow relative z-10">
        <div className="mx-auto py-4 px-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors touch-manipulation"
              aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              aria-expanded={isSidebarOpen}
              title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              <svg
                className="w-6 h-6 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isSidebarOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Documentation Viewer
            </h1>
          </div>
          <div className="flex-1 min-w-0 lg:max-w-md">
            <SearchBar
              onSearch={handleSearch}
              onClear={handleClearSearch}
              results={searchResults}
              onResultClick={handleSearchResultClick}
              isSearching={isSearching}
            />
          </div>
        </div>
      </header>
      <main className="flex-1 flex overflow-hidden relative">
        {/* Overlay for mobile when sidebar is open */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={toggleSidebar}
            aria-hidden="true"
          />
        )}

        <aside
          className={`
            bg-white border-r border-gray-200 overflow-y-auto
            fixed lg:static inset-y-0 left-0 z-30
            transition-transform duration-300 ease-in-out
            w-64 lg:w-64
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            ${!isSidebarOpen && 'lg:w-0 lg:border-r-0'}
          `}
          aria-label="File navigation"
        >
          {loading && (
            <div className="p-4 text-gray-500">Loading...</div>
          )}
          {error && (
            <div className="p-4 text-red-500">Error: {error}</div>
          )}
          {manifest && (
            <FileTree
              entries={manifest.root}
              onFileSelect={handleFileSelect}
              selectedPath={selectedPath}
            />
          )}
        </aside>

        <section className={`
          flex-1 overflow-y-auto bg-white flex flex-col
          transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'lg:ml-0' : 'lg:ml-0'}
        `}>
          {selectedPath && (
            <Breadcrumb
              path={selectedPath}
              onNavigate={handleBreadcrumbNavigate}
            />
          )}
          <div className="flex-1 p-4 sm:p-6">
            {selectedPath ? (
              <FileContent
                filePath={selectedPath}
                highlightLine={highlightLine}
              />
            ) : (
              <div className="flex items-center justify-center h-96">
                <p className="text-gray-500 text-center px-4">Select a file from the sidebar to view its content.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
