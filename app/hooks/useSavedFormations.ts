import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "saved_formations";
const MAX_SAVED = 10;

export type BonusAlloc = { atk: number; int: number; guts: number; pol: number };
export type EquipmentSlot = { atk: number; int: number; guts: number };
export type Equipment = {
  weapon: EquipmentSlot;
  armor: EquipmentSlot;
  accessory: EquipmentSlot;
  mount: EquipmentSlot;
};

export type SavedFormationSlot = {
  warrior_id: number;
  role_label: string;
  skill_ids?: number[];
  warrior_level?: number;
  skill_levels?: number[];
  bonus_points?: BonusAlloc;
  equipment?: Equipment;
};

export type SavedFormation = {
  id: string;
  name: string;
  slots: SavedFormationSlot[];
  total_score: { atk: number; int: number; guts: number };
  weapon_type?: string | null;
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
      slots: Array<{
        warrior_id: number;
        role_label: string;
        bonus_points?: BonusAlloc;
        equipment?: Equipment;
      }>,
      totalScore: { atk: number; int: number; guts: number },
      weaponType?: string | null,
    ): { ok: boolean; overflowId?: string } => {
      const current = readFormations();
      const newEntry: SavedFormation = {
        id: crypto.randomUUID(),
        name,
        slots,
        total_score: totalScore,
        weapon_type: weaponType ?? null,
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
      slots: Array<{
        warrior_id: number;
        role_label: string;
        bonus_points?: BonusAlloc;
        equipment?: Equipment;
      }>,
      totalScore: { atk: number; int: number; guts: number },
      deleteId: string,
      weaponType?: string | null,
    ) => {
      const current = readFormations().filter((f) => f.id !== deleteId);
      const newEntry: SavedFormation = {
        id: crypto.randomUUID(),
        name,
        slots,
        total_score: totalScore,
        weapon_type: weaponType ?? null,
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
