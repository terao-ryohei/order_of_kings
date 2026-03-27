import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "saved_formations";
const MAX_SAVED = 10;

export type SavedFormationSlot = {
  warrior_id: number;
  role_label: string;
  skill_ids?: number[];
  warrior_level?: number;
  skill_levels?: number[];
};

export type SavedFormation = {
  id: string;
  name: string;
  slots: SavedFormationSlot[];
  total_score: { atk: number; int: number; guts: number };
  created_at: string;
};

type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  for (const l of listeners) l();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "[]";
}

function getServerSnapshot(): string {
  return "[]";
}

function readFormations(): SavedFormation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedFormation[];
  } catch {
    return [];
  }
}

function writeFormations(formations: SavedFormation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(formations));
  notifyListeners();
}

export function useSavedFormations() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const savedFormations: SavedFormation[] = (() => {
    try {
      return JSON.parse(raw) as SavedFormation[];
    } catch {
      return [];
    }
  })();

  const saveFormation = useCallback(
    (
      name: string,
      slots: Array<{ warrior_id: number; role_label: string }>,
      totalScore: { atk: number; int: number; guts: number },
    ): { ok: boolean; overflowId?: string } => {
      const current = readFormations();
      const newEntry: SavedFormation = {
        id: crypto.randomUUID(),
        name,
        slots,
        total_score: totalScore,
        created_at: new Date().toISOString(),
      };

      if (current.length >= MAX_SAVED) {
        return { ok: false, overflowId: current[current.length - 1].id };
      }

      writeFormations([newEntry, ...current]);
      return { ok: true };
    },
    [],
  );

  const saveFormationForce = useCallback(
    (
      name: string,
      slots: Array<{ warrior_id: number; role_label: string }>,
      totalScore: { atk: number; int: number; guts: number },
      deleteId: string,
    ) => {
      const current = readFormations().filter((f) => f.id !== deleteId);
      const newEntry: SavedFormation = {
        id: crypto.randomUUID(),
        name,
        slots,
        total_score: totalScore,
        created_at: new Date().toISOString(),
      };
      writeFormations([newEntry, ...current]);
    },
    [],
  );

  const deleteFormation = useCallback((id: string) => {
    writeFormations(readFormations().filter((f) => f.id !== id));
  }, []);

  return {
    savedFormations,
    isFull: savedFormations.length >= MAX_SAVED,
    saveFormation,
    saveFormationForce,
    deleteFormation,
  } as const;
}
