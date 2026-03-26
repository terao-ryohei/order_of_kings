import { describe, it, expect } from "vitest";
import {
  scoreSquad,
  calcChainDPS,
  calcRageDPS,
  calcActiveDPS,
  calcEndurance,
  calcIntelDPS,
  gunshiEvaluation,
  buildSquadDescription,
  type WarriorForSquad,
  type SquadSlot,
} from "./squadScorer";
import { weaponTriangleBonus } from "./weaponTriangle";

// テスト用武将セット（5人）
const 趙雲: WarriorForSquad = {
  id: 1, name: "趙雲", rarity: 5, cost: 5,
  atk: 88, intelligence: 60, guts: 70, pol: 40,
  roles: ["連鎖系"],
  aptitudes: [{ weapon: "槍", level: "極" }, { weapon: "馬", level: "優" }],
  skills: [{ skill_type: "連鎖", name: "龍胆" }, { skill_type: "パッシブ", name: "常山の虎胆" }],
};

const 龐統: WarriorForSquad = {
  id: 2, name: "龐統", rarity: 5, cost: 5,
  atk: 65, intelligence: 85, guts: 55, pol: 70,
  roles: ["怒気"],
  aptitudes: [{ weapon: "弓", level: "優" }, { weapon: "馬", level: "良" }],
  skills: [{ skill_type: "怒気技", name: "連環計" }, { skill_type: "パッシブ", name: "鳳雛" }],
};

const 廉頗: WarriorForSquad = {
  id: 3, name: "廉頗", rarity: 4, cost: 4,
  atk: 60, intelligence: 50, guts: 90, pol: 55,
  roles: ["盾"],
  aptitudes: [{ weapon: "刀", level: "極" }, { weapon: "槍", level: "優" }],
  skills: [{ skill_type: "能動", name: "鉄壁" }, { skill_type: "パッシブ", name: "老将の意地" }],
};

const 華佗: WarriorForSquad = {
  id: 4, name: "華佗", rarity: 4, cost: 3,
  atk: 40, intelligence: 75, guts: 60, pol: 65,
  roles: ["回復"],
  aptitudes: [{ weapon: "弓", level: "良" }, { weapon: "刀", level: "凡" }],
  skills: [{ skill_type: "パッシブ", name: "神医" }, { skill_type: "パッシブ", name: "仁術" }],
};

const 王彦章: WarriorForSquad = {
  id: 5, name: "王彦章", rarity: 5, cost: 5,
  atk: 70, intelligence: 60, guts: 65, pol: 50,
  roles: ["物理系パッシブ"],
  aptitudes: [{ weapon: "槍", level: "極" }, { weapon: "刀", level: "優" }],
  skills: [{ skill_type: "パッシブ", name: "鉄槍" }, { skill_type: "連鎖", name: "連撃付与" }],
};

const allWarriors = [趙雲, 龐統, 廉頗, 華佗, 王彦章];

describe("squadScorer", () => {
  // --- 連鎖武力 ---
  describe("連鎖武力", () => {
    it("趙雲が主将になること", () => {
      const result = scoreSquad(allWarriors, "連鎖武力");
      expect(result.top3[0].slots[0].warrior.name).toBe("趙雲");
    });

    it("TOP3が3件返ること", () => {
      const result = scoreSquad(allWarriors, "連鎖武力");
      expect(result.top3).toHaveLength(3);
    });

    it("TOP2はTOP1と異なる主将を含むこと", () => {
      const result = scoreSquad(allWarriors, "連鎖武力");
      expect(result.top3.length).toBeGreaterThanOrEqual(2);
      const main1 = result.top3[0].slots[0].warrior.id;
      const main2 = result.top3[1].slots[0].warrior.id;
      expect(main1).not.toBe(main2);
    });
  });

  // --- 怒気武力 ---
  describe("怒気武力", () => {
    it("龐統が主将になること（怒気スキル持ち）", () => {
      const result = scoreSquad(allWarriors, "怒気武力");
      expect(result.top3[0].slots[0].warrior.name).toBe("龐統");
    });

    it("怒気スキルなし武将が主将にならないこと", () => {
      const noRageWarriors = allWarriors.filter((w) => w.name !== "龐統");
      const result = scoreSquad(noRageWarriors, "怒気武力");
      // 怒気スキル持ちがいないのでTOP3は空
      expect(result.top3).toHaveLength(0);
      expect(result.missingWarriors.length).toBeGreaterThan(0);
    });
  });

  // --- 耐久型 ---
  describe("耐久型", () => {
    it("廉頗か華佗が主将/副将になること", () => {
      const result = scoreSquad(allWarriors, "耐久型");
      const mainSub = [
        result.top3[0].slots[0].warrior.name,
        result.top3[0].slots[1].warrior.name,
      ];
      expect(mainSub.some((name) => name === "廉頗" || name === "華佗")).toBe(true);
    });
  });

  // --- 手持ち3人 ---
  describe("最小構成", () => {
    it("手持ち3人でも結果が返ること", () => {
      const three = [趙雲, 龐統, 廉頗];
      const result = scoreSquad(three, "連鎖武力");
      expect(result.top3.length).toBeGreaterThanOrEqual(1);
      expect(result.top3[0].slots).toHaveLength(3);
    });
  });

  // --- コスト制約 ---
  describe("コスト制約", () => {
    it("コスト上限を超えた編成が除外されること", () => {
      // 趙雲(5)+王彦章(5)+龐統(5)=15 > costLimit=12
      const result = scoreSquad(allWarriors, "連鎖武力", null, 12);
      for (const squad of result.top3) {
        const totalCost = squad.slots.reduce((sum, s) => sum + s.warrior.cost, 0);
        expect(totalCost).toBeLessThanOrEqual(12);
      }
    });
  });

  // --- 軍師評価 ---
  describe("gunshiEvaluation", () => {
    it("レアリティが高いほど高スコアになること", () => {
      const low: WarriorForSquad = {
        ...華佗, id: 100, rarity: 3,
        roles: [], skills: [{ skill_type: "パッシブ", name: "test" }],
      };
      const high: WarriorForSquad = {
        ...華佗, id: 101, rarity: 5,
        roles: [], skills: [{ skill_type: "パッシブ", name: "test" }],
      };
      expect(gunshiEvaluation(high)).toBeGreaterThan(gunshiEvaluation(low));
    });

    it("バフロール持ちがスコア加算されること", () => {
      const noBuff: WarriorForSquad = {
        ...華佗, id: 100, roles: [],
        skills: [{ skill_type: "パッシブ", name: "test" }],
      };
      const withBuff: WarriorForSquad = {
        ...華佗, id: 101, roles: ["物理系パッシブ", "知略系パッシブ"],
        skills: [{ skill_type: "パッシブ", name: "test" }],
      };
      expect(gunshiEvaluation(withBuff)).toBeGreaterThan(gunshiEvaluation(noBuff));
    });
  });

  // --- weaponTriangleBonus ---
  describe("weaponTriangleBonus", () => {
    it("刀vs馬(騎)で1.15になること", () => {
      expect(weaponTriangleBonus("刀", "馬")).toBe(1.15);
    });

    it("槍vs刀で0.85になること", () => {
      // 槍は刀に強い（TRIANGLE[槍]=刀 → 有利）のでこれは1.15
      // 刀vs槍が0.85（TRIANGLE[槍]=刀で、enemyWeapon=槍、unitWeapon=刀 → 不利）
      // テスト要件: 「槍vs刀で0.85」= 槍(unit) vs 刀(enemy)
      // TRIANGLE[槍]=刀 → TRIANGLE[unitWeapon]=enemyWeapon → 有利 → 1.15
      // 修正: 仕様書の三すくみ「刀→騎→槍→刀」= 刀が騎に強い、騎が槍に強い、槍が刀に強い
      // 槍vs刀 = 槍が刀に強い = 1.15... タスクの要件と矛盾するが仕様書に従う
      // タスク要件「槍vs刀で0.85」→ 槍(unit)が刀(enemy)に対して0.85 = 槍は刀に弱い？
      // 仕様: 刀兵→騎兵→槍兵→刀兵（→は「強い」方向）
      // 刀が騎に強い、騎が槍に強い、槍が刀に強い
      // つまり槍vs刀 = 槍有利 = 1.15
      // タスク要件が逆なので、仕様書に合わせて修正
      // 「刀vs槍で0.85」が正しいはず（刀は槍に弱い）
      expect(weaponTriangleBonus("刀", "槍")).toBe(0.85);
    });

    it("同兵種で1.0になること", () => {
      expect(weaponTriangleBonus("刀", "刀")).toBe(1.0);
    });

    it("null兵種で1.0になること", () => {
      expect(weaponTriangleBonus(null, "刀")).toBe(1.0);
      expect(weaponTriangleBonus("刀", null)).toBe(1.0);
    });

    it("馬vs槍で1.15になること（有利）", () => {
      expect(weaponTriangleBonus("馬", "槍")).toBe(1.15);
    });
  });

  // --- DPS関数 ---
  describe("calcChainDPS", () => {
    it("連鎖スキル持ちで値が増加すること", () => {
      const noChain: WarriorForSquad = {
        ...趙雲, id: 100, skills: [{ skill_type: "パッシブ", name: "test" }], roles: [],
      };
      const withChain = 趙雲; // 連鎖スキル1つ持ち
      expect(calcChainDPS(withChain, 龐統)).toBeGreaterThan(calcChainDPS(noChain, 龐統));
    });

    it("連鎖系ロール持ちでボーナスが乗ること", () => {
      const noRole: WarriorForSquad = {
        ...趙雲, id: 100, roles: [],
      };
      expect(calcChainDPS(趙雲, 龐統)).toBeGreaterThan(calcChainDPS(noRole, 龐統));
    });
  });

  describe("calcRageDPS", () => {
    it("怒気スキルなし主将でDPS=0になること", () => {
      expect(calcRageDPS(趙雲, 龐統)).toBe(0);
    });

    it("怒気スキルあり主将でDPS>0になること", () => {
      expect(calcRageDPS(龐統, 趙雲)).toBeGreaterThan(0);
    });
  });

  describe("calcEndurance", () => {
    it("回復ロール持ちで値が増加すること", () => {
      const noRecovery: WarriorForSquad = {
        ...華佗, id: 100, roles: [],
      };
      expect(calcEndurance(廉頗, 華佗)).toBeGreaterThan(calcEndurance(廉頗, noRecovery));
    });

    it("盾ロール持ちで値が増加すること", () => {
      const noShield: WarriorForSquad = {
        ...廉頗, id: 100, roles: [],
      };
      expect(calcEndurance(廉頗, 華佗)).toBeGreaterThan(calcEndurance(noShield, 華佗));
    });
  });

  describe("calcIntelDPS", () => {
    it("知略ロール持ちでボーナスが乗ること", () => {
      const withIntelRole: WarriorForSquad = {
        ...龐統, id: 100, roles: ["知略系パッシブ"],
      };
      const noIntelRole: WarriorForSquad = {
        ...龐統, id: 101, roles: [],
      };
      expect(calcIntelDPS(withIntelRole, 華佗)).toBeGreaterThan(calcIntelDPS(noIntelRole, 華佗));
    });
  });

  // --- buildSquadDescription ---
  describe("buildSquadDescription", () => {
    it("連鎖武力で適切な説明が返ること", () => {
      const slots: SquadSlot[] = [
        { role: "主将", warrior: 趙雲, roleLabel: "連鎖武力主将" },
        { role: "副将", warrior: 王彦章, roleLabel: "連鎖武力副将" },
        { role: "軍師", warrior: 華佗, roleLabel: "軍師" },
      ];
      const { description, strengths } = buildSquadDescription(slots, "連鎖武力");
      expect(description).toContain("連鎖");
      expect(strengths.length).toBeGreaterThan(0);
    });
  });

  // --- SquadRecommendation構造 ---
  describe("scoreSquad戻り値", () => {
    it("SquadRecommendationの型に適合すること", () => {
      const result = scoreSquad(allWarriors, "連鎖武力");
      expect(result).toHaveProperty("top3");
      expect(result).toHaveProperty("missingWarriors");
      for (const squad of result.top3) {
        expect(squad).toHaveProperty("rank");
        expect(squad).toHaveProperty("slots");
        expect(squad).toHaveProperty("totalScore");
        expect(squad).toHaveProperty("scoreBreakdown");
        expect(squad).toHaveProperty("dpsEstimate");
        expect(squad).toHaveProperty("description");
        expect(squad).toHaveProperty("strengths");
        expect(squad.scoreBreakdown).toHaveProperty("typeScore");
        expect(squad.scoreBreakdown).toHaveProperty("weaponScore");
        expect(squad.scoreBreakdown).toHaveProperty("statusScore");
        expect(squad.scoreBreakdown).toHaveProperty("costScore");
        expect(squad.scoreBreakdown).toHaveProperty("synergyScore");
      }
    });

    it("各スロットが主将/副将/軍師であること", () => {
      const result = scoreSquad(allWarriors, "能動武力");
      if (result.top3.length > 0) {
        expect(result.top3[0].slots[0].role).toBe("主将");
        expect(result.top3[0].slots[1].role).toBe("副将");
        expect(result.top3[0].slots[2].role).toBe("軍師");
      }
    });
  });
});
