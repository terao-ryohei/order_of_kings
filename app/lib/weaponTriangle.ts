// 兵種三すくみ: 刀→騎(馬)→槍→刀

const TRIANGLE: Record<string, string> = {
  刀: "馬",
  馬: "槍",
  槍: "刀",
};

export function weaponTriangleBonus(
  unitWeapon: string | null,
  enemyWeapon: string | null,
): number {
  if (!unitWeapon || !enemyWeapon) return 1.0;
  if (TRIANGLE[unitWeapon] === enemyWeapon) return 1.15; // 有利
  if (TRIANGLE[enemyWeapon] === unitWeapon) return 0.85; // 不利
  return 1.0;
}
