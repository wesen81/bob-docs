import { useEffect, useRef, useCallback } from 'react';

interface FileWatcherCallbacks {
  onFileChanged?: (path: string) => void;
  onManifestChanged?: () => void;
}

export function useFileWatcher({ onFileChanged, onManifestChanged }: FileWatcherCallbacks) {
  const onFileChangedRef = useRef(onFileChanged);
  const onManifestChangedRef = useRef(onManifestChanged);

  onFileChangedRef.current = onFileChanged;
  onManifestChangedRef.current = onManifestChanged;

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    function connect() {
      if (disposed) return;

      eventSource = new EventSource('/api/events');

      eventSource.addEventListener('file-changed', (e) => {
        try {
          const data = JSON.parse(e.data);
          onFileChangedRef.current?.(data.path);
        } catch {
          // ignore parse errors
        }
      });

      eventSource.addEventListener('manifest-changed', () => {
        onManifestChangedRef.current?.();
      });

      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        if (!disposed) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      eventSource?.close();
    };
  }, []);
}

export function useFileChangedCallback(filePath: string, callback: () => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const onFileChanged = useCallback(
    (changedPath: string) => {
      if (changedPath === filePath) {
        callbackRef.current();
      }
    },
    [filePath]
  );

  useFileWatcher({ onFileChanged });
}
