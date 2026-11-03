import {
  useCallback,
  useMemo,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction
} from "react";

type Listener = () => void;

const listenersByKey = new Map<string, Set<Listener>>();
const fallbackStorage = new Map<string, string>();

function readSnapshot(key: string): string | null {
  if (typeof window === "undefined") return null;

  const fallbackValue = fallbackStorage.get(key);
  if (fallbackValue !== undefined) return fallbackValue;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function notifySubscribers(key: string) {
  listenersByKey.get(key)?.forEach((listener) => listener());
}

function subscribeToKey(key: string, listener: Listener) {
  if (typeof window === "undefined") return () => undefined;

  let listeners = listenersByKey.get(key);
  if (!listeners) {
    listeners = new Set();
    listenersByKey.set(key, listeners);
  }
  listeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) listener();
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    listeners?.delete(listener);
    if (listeners?.size === 0) listenersByKey.delete(key);
  };
}

function parseSnapshot<T>(raw: string | null, fallback: T): T {
  if (raw === null) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Local storage state with an SSR-safe snapshot and same-tab notifications.
 * Mutations are persisted only when an interaction explicitly updates the value.
 */
export function useLocalStorageState<T>(
  key: string,
  fallback: T
): [T, Dispatch<SetStateAction<T>>] {
  const subscribe = useCallback(
    (listener: Listener) => subscribeToKey(key, listener),
    [key]
  );
  const getSnapshot = useCallback(() => readSnapshot(key), [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const value = useMemo(() => parseSnapshot(raw, fallback), [raw, fallback]);

  const setValue = useCallback<Dispatch<SetStateAction<T>>>((update) => {
    const current = parseSnapshot(readSnapshot(key), fallback);
    const next = typeof update === "function"
      ? (update as (previous: T) => T)(current)
      : update;
    const serialized = JSON.stringify(next);
    if (typeof serialized !== "string") return;

    try {
      window.localStorage.setItem(key, serialized);
      fallbackStorage.delete(key);
    } catch {
      fallbackStorage.set(key, serialized);
    }
    notifySubscribers(key);
  }, [fallback, key]);

  return [value, setValue];
}
