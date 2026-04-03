interface BreadcrumbProps {
  path: string;
  onNavigate: (path: string) => void;
}

export function Breadcrumb({ path, onNavigate }: BreadcrumbProps) {
  // Split path into segments
  const segments = path.split('/').filter(Boolean);

  // Build breadcrumb items with accumulated paths
  const breadcrumbItems = segments.map((segment, index) => {
    const accumulatedPath = segments.slice(0, index + 1).join('/');
    const isLast = index === segments.length - 1;

    return {
      name: segment,
      path: accumulatedPath,
      isLast
    };
  });

  return (
    <nav className="flex items-center flex-wrap gap-x-1 gap-y-2 text-sm text-gray-600 py-3 px-4 sm:px-6 bg-gray-50 border-b border-gray-200">
      {/* Root/Home */}
      <button
        onClick={() => onNavigate('')}
        className="hover:text-gray-900 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-2 py-1 touch-manipulation min-h-[44px] flex items-center transition-colors"
        aria-label="Navigate to root"
      >
        📁 Root
      </button>

      {breadcrumbItems.map((item) => (
        <div key={item.path} className="flex items-center gap-x-1">
          {/* Separator */}
          <span className="text-gray-400">/</span>

          {/* Breadcrumb segment */}
          {item.isLast ? (
            <span className="text-gray-900 font-medium px-2 py-1 min-h-[44px] flex items-center">
              {item.name}
            </span>
          ) : (
            <button
              onClick={() => onNavigate(item.path)}
              className="hover:text-gray-900 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-2 py-1 touch-manipulation min-h-[44px] flex items-center transition-colors"
              aria-label={`Navigate to ${item.name}`}
            >
              {item.name}
            </button>
          )}
        </div>
      ))}
    </nav>
  );
}
