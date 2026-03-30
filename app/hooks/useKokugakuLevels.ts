import { useCallback, useSyncExternalStore } from "react";
import {
  calcKokugakuBonuses,
  createDefaultKokugakuLevels,
  KOKUGAKU_STORAGE_KEY,
  normalizeKokugakuLevels,
  type KokugakuLevels,
} from "../lib/kokugaku";

type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: Listener) {
  listeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === KOKUGAKU_STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function getSnapshot(): string {
  return localStorage.getItem(KOKUGAKU_STORAGE_KEY) ?? "{}";
}

function getServerSnapshot(): string {
  return "{}";
}

export function readKokugakuLevels(): KokugakuLevels {
  try {
    const raw = localStorage.getItem(KOKUGAKU_STORAGE_KEY);
    if (!raw) {
      return createDefaultKokugakuLevels();
    }

    return normalizeKokugakuLevels(JSON.parse(raw));
  } catch {
    return createDefaultKokugakuLevels();
  }
}

function writeKokugakuLevels(levels: KokugakuLevels) {
  localStorage.setItem(KOKUGAKU_STORAGE_KEY, JSON.stringify(levels));
  notifyListeners();
}

export function useKokugakuLevels() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const levels = (() => {
    try {
      return normalizeKokugakuLevels(JSON.parse(raw));
    } catch {
      return createDefaultKokugakuLevels();
    }
  })();
  const bonuses = calcKokugakuBonuses(levels);

  const setLevel = useCallback((entryId: string, nextLevel: number) => {
    const current = readKokugakuLevels();
    writeKokugakuLevels({
      ...current,
      [entryId]: nextLevel,
    });
  }, []);

  return {
    levels,
    bonuses,
    setLevel,
  } as const;
}
