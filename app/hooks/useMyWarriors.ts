import { useEffect, useState } from "react";

const STORAGE_KEY = "imperial_my_warriors";

type WarriorCounts = Record<number, number>;

function migrateLegacy(raw: string): WarriorCounts | null {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    const counts: WarriorCounts = {};
    for (const id of parsed) {
      const n = Number(id);
      if (Number.isInteger(n) && n > 0) {
        counts[n] = (counts[n] ?? 0) + 1;
      }
    }
    return counts;
  }
  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
    const counts: WarriorCounts = {};
    for (const [k, v] of Object.entries(parsed)) {
      const id = Number(k);
      const count = Number(v);
      if (Number.isInteger(id) && id > 0 && Number.isInteger(count) && count > 0) {
        counts[id] = count;
      }
    }
    return counts;
  }
  return null;
}

export function useMyWarriors() {
  const [warriorCounts, setWarriorCounts] = useState<WarriorCounts>({});
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const counts = migrateLegacy(raw);
        if (counts) setWarriorCounts(counts);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(warriorCounts));
  }, [isHydrated, warriorCounts]);

  const toggle = (id: number) => {
    setWarriorCounts((current) => {
      if (current[id]) {
        const { [id]: _, ...rest } = current;
        return rest;
      }
      return { ...current, [id]: 1 };
    });
  };

  const increment = (id: number) => {
    setWarriorCounts((current) => ({
      ...current,
      [id]: (current[id] ?? 0) + 1,
    }));
  };

  const decrement = (id: number) => {
    setWarriorCounts((current) => {
      const count = current[id] ?? 0;
      if (count <= 1) {
        const { [id]: _, ...rest } = current;
        return rest;
      }
      return { ...current, [id]: count - 1 };
    });
  };

  const has = (id: number) => (warriorCounts[id] ?? 0) > 0;

  const getCount = (id: number) => warriorCounts[id] ?? 0;

  const setAll = (ids: number[]) => {
    const counts: WarriorCounts = {};
    for (const id of ids) {
      if (Number.isInteger(id) && id > 0) {
        counts[id] = (counts[id] ?? 0) + 1;
      }
    }
    setWarriorCounts(counts);
  };

  const clear = () => {
    setWarriorCounts({});
  };

  const totalCount = Object.values(warriorCounts).reduce((sum, c) => sum + c, 0);
  const uniqueCount = Object.keys(warriorCounts).length;

  return {
    myWarriorIds: Object.keys(warriorCounts).map(Number),
    warriorCounts,
    isHydrated,
    toggle,
    increment,
    decrement,
    has,
    getCount,
    count: uniqueCount,
    totalCount,
    setAll,
    clear,
  };
}
