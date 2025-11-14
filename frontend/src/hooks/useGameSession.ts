import { useCallback, useEffect, useMemo, useState } from 'react';
import { createSession, updateSession } from '../lib/api';

const STORAGE_KEY = 'sonsuz-turkiye-session';

interface StoredSession {
  sessionId: string;
  safetyOverride?: boolean;
}

export function useGameSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [safetyOverride, setSafetyOverride] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as StoredSession;
      setSessionId(parsed.sessionId);
      setSafetyOverride(Boolean(parsed.safetyOverride));
      setIsLoading(false);
    } else {
      void bootstrapSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistSession = useCallback((id: string, override: boolean) => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sessionId: id, safetyOverride: override })
    );
  }, []);

  const bootstrapSession = useCallback(async () => {
    setIsLoading(true);
    const response = await createSession({ safetyOverride });
    setSessionId(response.sessionId);
    persistSession(response.sessionId, safetyOverride);
    setIsLoading(false);
  }, [persistSession, safetyOverride]);

  const toggleSafetyOverride = useCallback(
    async (nextValue: boolean) => {
      if (!sessionId) {
        return;
      }
      setSafetyOverride(nextValue);
      persistSession(sessionId, nextValue);
      await updateSession(sessionId, nextValue);
    },
    [sessionId, persistSession]
  );

  const value = useMemo(
    () => ({ sessionId, safetyOverride, isLoading, setSafetyOverride: toggleSafetyOverride, bootstrapSession }),
    [sessionId, safetyOverride, isLoading, toggleSafetyOverride, bootstrapSession]
  );

  return value;
}
