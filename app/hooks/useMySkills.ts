import { useEffect, useState } from "react";

const STORAGE_KEY = "imperial_my_skills";

type SkillCounts = Record<number, number>;

export function useMySkills() {
  const [skillCounts, setSkillCounts] = useState<SkillCounts>({});
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
          const counts: SkillCounts = {};
          for (const [k, v] of Object.entries(parsed)) {
            const id = Number(k);
            const count = Number(v);
            if (Number.isInteger(id) && id > 0 && Number.isInteger(count) && count > 0) {
              counts[id] = count;
            }
          }
          setSkillCounts(counts);
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(skillCounts));
  }, [isHydrated, skillCounts]);

  const increment = (id: number) => {
    setSkillCounts((current) => ({
      ...current,
      [id]: (current[id] ?? 0) + 1,
    }));
  };

  const decrement = (id: number) => {
    setSkillCounts((current) => {
      const count = current[id] ?? 0;
      if (count <= 1) {
        const { [id]: _, ...rest } = current;
        return rest;
      }
      return { ...current, [id]: count - 1 };
    });
  };

  const has = (id: number) => (skillCounts[id] ?? 0) > 0;

  const getCount = (id: number) => skillCounts[id] ?? 0;

  const clear = () => {
    setSkillCounts({});
  };

  const totalCount = Object.values(skillCounts).reduce((sum, c) => sum + c, 0);
  const uniqueCount = Object.keys(skillCounts).length;

  return {
    mySkillIds: Object.keys(skillCounts).map(Number),
    skillCounts,
    isHydrated,
    increment,
    decrement,
    has,
    getCount,
    count: uniqueCount,
    totalCount,
    clear,
  };
}
