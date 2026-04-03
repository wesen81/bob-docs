import { useState, useEffect, useCallback } from 'react';
import type { Manifest } from '../types';
import { useFileWatcher } from './useFileWatcher';

export function useManifest() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchManifest = useCallback(() => {
    fetch(`/manifest.json?t=${Date.now()}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load manifest');
        }
        return response.json();
      })
      .then((data) => {
        setManifest(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchManifest();
  }, [fetchManifest]);

  useFileWatcher({
    onManifestChanged: fetchManifest,
  });

  return { manifest, loading, error };
}
