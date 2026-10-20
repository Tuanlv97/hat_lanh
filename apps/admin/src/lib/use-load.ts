import { useCallback, useEffect, useState } from 'react';
import { ApiError } from './api';

export function errorText(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Chưa kết nối được máy chủ. Bạn thử lại sau nhé.';
}

/** Loads data on mount and whenever `deps` change; `reload()` refetches. */
export function useLoad<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller owns the dependency list
  const run = useCallback(fetcher, deps);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await run());
      setError('');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [run]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}
