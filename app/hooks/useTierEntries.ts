import { useCallback, useEffect, useState } from "react";
import { safeGetItem, safeSetItem } from "../lib/storage";
import type { TierEntry, TierStorage } from "../lib/tier-types";

const STORAGE_KEY = "tier_entries";

type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  for (const l of listeners) l();
}

function readStorage(): TierStorage {
  try {
    const raw = safeGetItem(STORAGE_KEY);
    if (!raw) return { version: 1, entries: [] };
    const parsed = JSON.parse(raw) as TierStorage;
    if (parsed.version !== 1) return { version: 1, entries: [] };
    return parsed;
  } catch {
    return { version: 1, entries: [] };
  }
}

function writeStorage(storage: TierStorage) {
  safeSetItem(STORAGE_KEY, JSON.stringify(storage));
  notifyListeners();
}

export function useTierEntries(): {
  entries: TierEntry[];
  addEntry: (entry: Omit<TierEntry, "id" | "created_at" | "updated_at">) => void;
  deleteEntry: (id: string) => void;
} {
  const [entries, setEntries] = useState<TierEntry[]>([]);

  useEffect(() => {
    setEntries(readStorage().entries);

    const listener = () => setEntries(readStorage().entries);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const addEntry = useCallback(
    (entry: Omit<TierEntry, "id" | "created_at" | "updated_at">) => {
      const storage = readStorage();
      const now = new Date().toISOString();
      const newEntry: TierEntry = {
        ...entry,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
      };
      writeStorage({
        ...storage,
        entries: [newEntry, ...storage.entries],
      });
    },
    [],
  );

  const deleteEntry = useCallback((id: string) => {
    const storage = readStorage();
    writeStorage({
      ...storage,
      entries: storage.entries.filter((e) => e.id !== id),
    });
  }, []);

  return { entries, addEntry, deleteEntry };
}
