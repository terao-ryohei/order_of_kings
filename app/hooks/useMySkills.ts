import { useEffect, useState } from "react";

const STORAGE_KEY = "imperial_my_skills";

export function useMySkills() {
  const [skillIds, setSkillIds] = useState<number[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const ids = parsed
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0);
          setSkillIds([...new Set(ids)]);
        } else if (typeof parsed === "object" && parsed !== null) {
          // migrate from old Record<number, number> format
          const ids = Object.keys(parsed)
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0);
          setSkillIds(ids);
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(skillIds));
  }, [isHydrated, skillIds]);

  const add = (id: number) => {
    setSkillIds((current) =>
      current.includes(id) ? current : [...current, id]
    );
  };

  const remove = (id: number) => {
    setSkillIds((current) => current.filter((x) => x !== id));
  };

  const toggle = (id: number) => {
    setSkillIds((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    );
  };

  const has = (id: number) => skillIds.includes(id);

  const clear = () => {
    setSkillIds([]);
  };

  return {
    mySkillIds: skillIds,
    isHydrated,
    add,
    remove,
    toggle,
    has,
    count: skillIds.length,
    clear,
  };
}
