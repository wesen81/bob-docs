interface ErrorDisplayProps {
  title: string;
  message: string;
  details?: string;
  type?: 'error' | 'warning';
}

export function ErrorDisplay({
  title,
  message,
  details,
  type = 'error'
}: ErrorDisplayProps) {
  const isError = type === 'error';

  const colorClasses = {
    container: isError ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200',
    icon: isError ? 'text-red-500' : 'text-yellow-500',
    title: isError ? 'text-red-800' : 'text-yellow-800',
    message: isError ? 'text-red-700' : 'text-yellow-700',
  };

  return (
    <div className={`border rounded-lg p-4 ${colorClasses.container}`}>
      <div className="flex items-start">
        <svg
          className={`w-5 h-5 mr-2 mt-0.5 flex-shrink-0 ${colorClasses.icon}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          {isError ? (
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          ) : (
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          )}
        </svg>
        <div className="flex-1">
          <h3 className={`font-semibold mb-1 ${colorClasses.title}`}>
            {title}
          </h3>
          <p className={`text-sm font-mono break-words ${colorClasses.message}`}>
            {message}
          </p>
          {details && (
            <details className="mt-3">
              <summary className={`cursor-pointer text-sm font-semibold ${colorClasses.title}`}>
                View Details
              </summary>
              <pre className="mt-2 bg-white border border-gray-200 rounded p-3 overflow-x-auto text-xs font-mono text-gray-700">
                {details}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
