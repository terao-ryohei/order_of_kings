import { describe, it, expect } from "vitest";
import {
  scoreFormation,
  type WarriorForScoring,
  type RecommendationResult,
} from "./formationScorer";

const testWarriors: WarriorForScoring[] = [
  {
    id: 1,
    name: "呂布",
    rarity: 5,
    cost: 7,
    atk: 95,
    intelligence: 30,
    guts: 70,
    pol: 20,
    roles: ["物理攻撃能動"],
    aptitudes: [
      { weapon: "馬", level: "極" },
      { weapon: "槍", level: "優" },
      { weapon: "刀", level: "良" },
      { weapon: "弓", level: "凡" },
    ],
  },
  {
    id: 2,
    name: "張巡",
    rarity: 4,
    cost: 4,
    atk: 60,
    intelligence: 50,
    guts: 80,
    pol: 40,
    roles: ["盾"],
    aptitudes: [
      { weapon: "槍", level: "極" },
      { weapon: "刀", level: "優" },
      { weapon: "馬", level: "良" },
      { weapon: "弓", level: "凡" },
    ],
  },
  {
    id: 3,
    name: "華佗",
    rarity: 4,
    cost: 3,
    atk: 30,
    intelligence: 80,
    guts: 50,
    pol: 60,
    roles: ["回復"],
    aptitudes: [
      { weapon: "弓", level: "優" },
      { weapon: "刀", level: "良" },
      { weapon: "馬", level: "良" },
      { weapon: "槍", level: "凡" },
    ],
  },
  {
    id: 4,
    name: "呂蒙",
    rarity: 5,
    cost: 5,
    atk: 75,
    intelligence: 65,
    guts: 60,
    pol: 45,
    roles: ["物理攻撃能動", "連鎖系"],
    aptitudes: [
      { weapon: "弓", level: "極" },
      { weapon: "刀", level: "優" },
      { weapon: "馬", level: "良" },
      { weapon: "槍", level: "良" },
    ],
  },
  {
    id: 5,
    name: "廉頗",
    rarity: 4,
    cost: 5,
    atk: 55,
    intelligence: 40,
    guts: 85,
    pol: 30,
    roles: ["盾"],
    aptitudes: [
      { weapon: "槍", level: "極" },
      { weapon: "刀", level: "優" },
      { weapon: "馬", level: "優" },
      { weapon: "弓", level: "凡" },
    ],
  },
];

describe("formationScorer", () => {
  it("野戦編成で呂布が物理攻撃スロットに入ること", () => {
    const result = scoreFormation(testWarriors, "野戦", null);
    const atkSlots = result.top3[0].slots.filter(
      (s) => s.roleLabel === "物理攻撃能動",
    );
    const atkWarriorIds = atkSlots.map((s) => s.warriorId);
    expect(atkWarriorIds).toContain(1); // 呂布 id=1
  });

  it("役割カバレッジが満点の編成はスコアが高いこと", () => {
    const result = scoreFormation(testWarriors, "野戦", null);
    const top1 = result.top3[0];
    // 5人で5スロットすべてカバーできるので roleScore は高いはず
    expect(top1.scoreBreakdown.roleScore).toBeGreaterThanOrEqual(80);
    expect(top1.totalScore).toBeGreaterThan(0);
  });

  it("手持ちが3人以下でも結果が返ること", () => {
    const few = testWarriors.slice(0, 3);
    const result = scoreFormation(few, "汎用", null);
    expect(result.top3.length).toBeGreaterThanOrEqual(1);
    expect(result.top3[0].slots.length).toBeGreaterThanOrEqual(1);
    expect(result.top3[0].slots.length).toBeLessThanOrEqual(5);
  });

  it("TOP2はTOP1と異なる主将を含むこと", () => {
    const result = scoreFormation(testWarriors, "野戦", null);
    expect(result.top3.length).toBeGreaterThanOrEqual(2);
    const top1LeaderId = result.top3[0].slots[0].warriorId;
    const top2WarriorIds = result.top3[1].slots.map((s) => s.warriorId);
    expect(top2WarriorIds).not.toContain(top1LeaderId);
  });

  it("TOP3が返ること", () => {
    const result = scoreFormation(testWarriors, "汎用", null);
    expect(result.top3.length).toBe(3);
    expect(result.top3[0].rank).toBe(1);
    expect(result.top3[1].rank).toBe(2);
    expect(result.top3[2].rank).toBe(3);
  });

  it("兵種指定時に適性スコアが反映されること", () => {
    const resultHorse = scoreFormation(testWarriors, "野戦", "馬");
    const resultBow = scoreFormation(testWarriors, "野戦", "弓");
    // 呂布は馬=極、呂蒙は弓=極 → 兵種によってスコア差が出る
    expect(resultHorse.top3[0].scoreBreakdown.aptitudeScore).not.toBe(
      resultBow.top3[0].scoreBreakdown.aptitudeScore,
    );
  });

  it("totalScoreは各軸の加重平均であること", () => {
    const result = scoreFormation(testWarriors, "汎用", null);
    const b = result.top3[0].scoreBreakdown;
    const expected =
      b.roleScore * 0.35 +
      b.aptitudeScore * 0.25 +
      b.statusScore * 0.2 +
      b.rarityScore * 0.1 +
      b.synergyScore * 0.1;
    expect(result.top3[0].totalScore).toBeCloseTo(expected, 0);
  });

  it("missingWarriorsが未所持武将を提案すること", () => {
    const owned = testWarriors.slice(0, 2); // 呂布, 張巡のみ
    const allPool: WarriorForScoring[] = [
      ...testWarriors,
      {
        id: 100,
        name: "諸葛亮",
        rarity: 5,
        cost: 6,
        atk: 40,
        intelligence: 98,
        guts: 45,
        pol: 90,
        roles: ["回復", "知略攻撃能動"],
        aptitudes: [{ weapon: "弓", level: "極" }],
      },
    ];
    const result = scoreFormation(owned, "野戦", null, allPool);
    expect(result.missingWarriors.length).toBeGreaterThanOrEqual(1);
    expect(result.missingWarriors.length).toBeLessThanOrEqual(3);
  });
});
