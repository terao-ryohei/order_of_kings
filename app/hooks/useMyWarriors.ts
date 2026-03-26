import { useEffect, useState } from "react";

const STORAGE_KEY = "imperial_my_warriors";

function normalizeIds(ids: number[]) {
  return Array.from(new Set(ids.filter((id) => Number.isInteger(id) && id > 0))).sort(
    (a, b) => a - b,
  );
}

export function useMyWarriors() {
  const [myWarriorIds, setMyWarriorIds] = useState<number[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setMyWarriorIds(normalizeIds(parsed.map((id) => Number(id))));
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(myWarriorIds));
  }, [isHydrated, myWarriorIds]);

  const toggle = (id: number) => {
    setMyWarriorIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : normalizeIds([...current, id]),
    );
  };

  const has = (id: number) => myWarriorIds.includes(id);

  const setAll = (ids: number[]) => {
    setMyWarriorIds(normalizeIds(ids));
  };

  const clear = () => {
    setMyWarriorIds([]);
  };

  return {
    myWarriorIds,
    isHydrated,
    toggle,
    has,
    count: myWarriorIds.length,
    setAll,
    clear,
  };
}
