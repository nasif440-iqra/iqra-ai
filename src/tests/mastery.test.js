import { describe, it, expect } from "vitest";
import {
  normalizeEntityKey,
  parseEntityKey,
  deriveSkillKeysFromQuestion,
  recordEntityAttempt,
  recordSkillAttempt,
  recordConfusion,
  deriveConfusionKey,
  updateEntitySRS,
  mergeQuizResultsIntoMastery,
} from "../lib/mastery.js";
import {
  migrateFlatProgressToEntities,
  buildLegacyProgressView,
  emptyMastery,
} from "../lib/progress.js";
import {
  getDueEntityKeys,
  getWeakEntityKeys,
  getTopConfusions,
  planReviewSession,
} from "../lib/selectors.js";

// ── Entity key normalization ──

describe("normalizeEntityKey", () => {
  it("normalizes numeric targetId to letter key", () => {
    expect(normalizeEntityKey(2, {})).toBe("letter:2");
  });

  it("normalizes harakat string to combo key", () => {
    expect(normalizeEntityKey("ba-fatha", { isHarakat: true })).toBe("combo:ba-fatha");
  });

  it("normalizes combo-like string without isHarakat flag", () => {
    expect(normalizeEntityKey("ba-fatha", {})).toBe("combo:ba-fatha");
  });

  it("normalizes bare harakat mark to combo key", () => {
    expect(normalizeEntityKey("fatha", {})).toBe("combo:fatha");
  });

  it("returns unknown for unrecognized strings", () => {
    expect(normalizeEntityKey("weirdthing", {})).toBe("unknown:weirdthing");
  });
});

describe("parseEntityKey", () => {
  it("parses letter key", () => {
    const { type, rawId } = parseEntityKey("letter:2");
    expect(type).toBe("letter");
    expect(rawId).toBe(2);
  });

  it("parses combo key", () => {
    const { type, rawId } = parseEntityKey("combo:ba-fatha");
    expect(type).toBe("combo");
    expect(rawId).toBe("ba-fatha");
  });

  it("handles key without colon", () => {
    const { type, rawId } = parseEntityKey("nocolon");
    expect(type).toBe("unknown");
    expect(rawId).toBe("nocolon");
  });
});

// ── Skill key derivation ──

describe("deriveSkillKeysFromQuestion", () => {
  it("returns visual skill for tap question", () => {
    const keys = deriveSkillKeysFromQuestion({ targetId: 2, type: "tap" });
    expect(keys).toContain("visual:2");
  });

  it("returns sound skill for audio question", () => {
    const keys = deriveSkillKeysFromQuestion({ targetId: 2, type: "tap", hasAudio: true });
    expect(keys).toContain("sound:2");
  });

  it("returns contrast skill for contrast mode", () => {
    const keys = deriveSkillKeysFromQuestion({
      targetId: 2, type: "tap", lessonMode: "contrast",
      options: [{ id: 2 }, { id: 3 }],
    });
    expect(keys).toContain("contrast:2-3");
  });

  it("returns harakat skill for harakat question", () => {
    const keys = deriveSkillKeysFromQuestion({
      targetId: "ba-fatha", isHarakat: true,
      options: [{ id: "ba-fatha" }, { id: "ba-kasra" }],
    });
    expect(keys.length).toBeGreaterThan(0);
    expect(keys[0]).toMatch(/^harakat:/);
  });

  it("returns empty for null question", () => {
    expect(deriveSkillKeysFromQuestion(null)).toEqual([]);
  });
});

// ── Entity and skill recording ──

describe("recordEntityAttempt", () => {
  it("increments attempts and correct on correct answer", () => {
    const result = recordEntityAttempt(null, { correct: true }, "2026-03-25");
    expect(result.attempts).toBe(1);
    expect(result.correct).toBe(1);
    expect(result.lastSeen).toBe("2026-03-25");
  });

  it("increments attempts but not correct on wrong answer", () => {
    const result = recordEntityAttempt(null, { correct: false }, "2026-03-25");
    expect(result.attempts).toBe(1);
    expect(result.correct).toBe(0);
  });

  it("accumulates from existing entry", () => {
    const existing = { correct: 3, attempts: 5, lastSeen: "2026-03-24" };
    const result = recordEntityAttempt(existing, { correct: true }, "2026-03-25");
    expect(result.correct).toBe(4);
    expect(result.attempts).toBe(6);
  });

  it("tracks latency when provided", () => {
    const result = recordEntityAttempt(null, { correct: true, latencyMs: 1200 }, "2026-03-25");
    expect(result.lastLatencyMs).toBe(1200);
  });
});

describe("recordSkillAttempt", () => {
  it("increments skill attempts", () => {
    const result = recordSkillAttempt(null, { correct: true }, "2026-03-25");
    expect(result.attempts).toBe(1);
    expect(result.correct).toBe(1);
  });
});

// ── Confusion tracking ──

describe("deriveConfusionKey", () => {
  it("returns null for correct answers", () => {
    expect(deriveConfusionKey({ correct: true })).toBeNull();
  });

  it("returns recognition confusion key", () => {
    const key = deriveConfusionKey({
      correct: false,
      targetKey: "letter:2",
      selectedKey: "letter:3",
    });
    expect(key).toBe("recognition:2->3");
  });

  it("returns sound confusion key", () => {
    const key = deriveConfusionKey({
      correct: false,
      targetKey: "letter:2",
      selectedKey: "letter:3",
      hasAudio: true,
    });
    expect(key).toBe("sound:2->3");
  });

  it("returns harakat confusion key", () => {
    const key = deriveConfusionKey({
      correct: false,
      targetKey: "combo:ba-fatha",
      selectedKey: "combo:ba-kasra",
      isHarakat: true,
    });
    expect(key).toBe("harakat:ba-fatha->ba-kasra");
  });
});

describe("recordConfusion", () => {
  it("creates new confusion entry", () => {
    const result = recordConfusion({}, "recognition:2->3", "2026-03-25");
    expect(result["recognition:2->3"].count).toBe(1);
    expect(result["recognition:2->3"].lastSeen).toBe("2026-03-25");
  });

  it("increments existing confusion count", () => {
    const existing = { "recognition:2->3": { count: 2, lastSeen: "2026-03-24" } };
    const result = recordConfusion(existing, "recognition:2->3", "2026-03-25");
    expect(result["recognition:2->3"].count).toBe(3);
  });
});

// ── SRS scheduling ──

describe("updateEntitySRS", () => {
  it("increments sessionStreak on correct", () => {
    const entry = { sessionStreak: 1, intervalDays: 1 };
    const result = updateEntitySRS(entry, true, "2026-03-25");
    expect(result.sessionStreak).toBe(2);
    expect(result.intervalDays).toBe(3);
    expect(result.nextReview).toBe("2026-03-28");
  });

  it("resets sessionStreak on incorrect", () => {
    const entry = { sessionStreak: 3, intervalDays: 7 };
    const result = updateEntitySRS(entry, false, "2026-03-25");
    expect(result.sessionStreak).toBe(0);
    expect(result.intervalDays).toBe(1);
    expect(result.nextReview).toBe("2026-03-25");
  });
});

// ── Batch merge ──

describe("mergeQuizResultsIntoMastery", () => {
  it("merges quiz results into empty mastery", () => {
    const mastery = emptyMastery();
    const results = [
      { targetId: 2, correct: true, targetKey: "letter:2", selectedKey: "letter:2", skillKeys: ["visual:2"] },
      { targetId: 2, correct: false, targetKey: "letter:2", selectedKey: "letter:3", selectedId: 3, skillKeys: ["visual:2"], isHarakat: false, hasAudio: false },
    ];
    const merged = mergeQuizResultsIntoMastery(mastery, results, "2026-03-25");

    expect(merged.entities["letter:2"]).toBeDefined();
    expect(merged.entities["letter:2"].attempts).toBe(2);
    expect(merged.entities["letter:2"].correct).toBe(1);
    expect(merged.skills["visual:2"]).toBeDefined();
    expect(merged.skills["visual:2"].attempts).toBe(2);
  });

  it("records confusions for wrong answers", () => {
    const mastery = emptyMastery();
    const results = [
      { targetId: 2, correct: false, targetKey: "letter:2", selectedKey: "letter:3" },
    ];
    const merged = mergeQuizResultsIntoMastery(mastery, results, "2026-03-25");
    expect(Object.keys(merged.confusions).length).toBeGreaterThan(0);
  });

  it("applies SRS scheduling after merge", () => {
    const mastery = emptyMastery();
    const results = [
      { targetId: 5, correct: true, targetKey: "letter:5", selectedKey: "letter:5", skillKeys: [] },
    ];
    const merged = mergeQuizResultsIntoMastery(mastery, results, "2026-03-25");
    expect(merged.entities["letter:5"].nextReview).toBeDefined();
    expect(merged.entities["letter:5"].sessionStreak).toBe(1);
  });
});

// ── Migration ──

describe("migrateFlatProgressToEntities", () => {
  it("converts numeric keys to letter entities", () => {
    const flat = { 2: { correct: 3, attempts: 5 }, 3: { correct: 1, attempts: 2 } };
    const entities = migrateFlatProgressToEntities(flat);
    expect(entities["letter:2"]).toEqual({ correct: 3, attempts: 5 });
    expect(entities["letter:3"]).toEqual({ correct: 1, attempts: 2 });
  });

  it("converts combo-like keys to combo entities", () => {
    const flat = { "ba-fatha": { correct: 2, attempts: 3 } };
    const entities = migrateFlatProgressToEntities(flat);
    expect(entities["combo:ba-fatha"]).toEqual({ correct: 2, attempts: 3 });
  });

  it("handles null/empty input", () => {
    expect(migrateFlatProgressToEntities(null)).toEqual({});
    expect(migrateFlatProgressToEntities({})).toEqual({});
  });
});

describe("buildLegacyProgressView", () => {
  it("strips letter: prefix back to numeric keys", () => {
    const entities = { "letter:2": { correct: 3 }, "letter:5": { correct: 1 }, "combo:ba-fatha": { correct: 2 } };
    const flat = buildLegacyProgressView(entities);
    expect(flat[2]).toEqual({ correct: 3 });
    expect(flat[5]).toEqual({ correct: 1 });
    // combo entries not in flat view
    expect(flat["ba-fatha"]).toBeUndefined();
  });
});

// ── Review planner ──

describe("getDueEntityKeys", () => {
  it("returns empty for empty entities", () => {
    expect(getDueEntityKeys({}, "2026-03-25")).toEqual([]);
  });

  it("returns entities whose nextReview is today or earlier", () => {
    const entities = {
      "letter:2": { lastSeen: "2026-03-24", nextReview: "2026-03-25" },
      "letter:3": { lastSeen: "2026-03-20", nextReview: "2026-03-22" },
      "letter:4": { lastSeen: "2026-03-25", nextReview: "2026-04-01" },
    };
    const due = getDueEntityKeys(entities, "2026-03-25");
    expect(due).toContain("letter:2");
    expect(due).toContain("letter:3");
    expect(due).not.toContain("letter:4");
  });
});

describe("getWeakEntityKeys", () => {
  it("returns entities below accuracy threshold", () => {
    const entities = {
      "letter:2": { correct: 1, attempts: 5 }, // 20% accuracy
      "letter:3": { correct: 4, attempts: 5 }, // 80% accuracy
      "letter:4": { correct: 0, attempts: 1 }, // below min attempts
    };
    const weak = getWeakEntityKeys(entities);
    expect(weak).toContain("letter:2");
    expect(weak).not.toContain("letter:3");
    expect(weak).not.toContain("letter:4"); // not enough attempts
  });
});

describe("getTopConfusions", () => {
  it("returns top confusions sorted by count", () => {
    const confusions = {
      "recognition:2->3": { count: 5, lastSeen: "2026-03-25" },
      "sound:7->8": { count: 2, lastSeen: "2026-03-24" },
      "recognition:4->5": { count: 8, lastSeen: "2026-03-25" },
    };
    const top = getTopConfusions(confusions, 2);
    expect(top.length).toBe(2);
    expect(top[0].key).toBe("recognition:4->5");
    expect(top[1].key).toBe("recognition:2->3");
  });
});

describe("planReviewSession", () => {
  it("returns empty plan for fresh mastery", () => {
    const plan = planReviewSession(emptyMastery(), "2026-03-25");
    expect(plan.hasReviewWork).toBe(false);
    expect(plan.totalItems).toBe(0);
  });

  it("includes due items in plan", () => {
    const mastery = {
      entities: {
        "letter:2": { lastSeen: "2026-03-24", nextReview: "2026-03-25", correct: 3, attempts: 3 },
      },
      skills: {},
      confusions: {},
    };
    const plan = planReviewSession(mastery, "2026-03-25");
    expect(plan.hasReviewWork).toBe(true);
    expect(plan.items).toContain("letter:2");
  });

  it("includes weak items in plan", () => {
    const mastery = {
      entities: {
        "letter:5": { correct: 1, attempts: 5, lastSeen: "2026-03-25", nextReview: "2026-04-01" },
      },
      skills: {},
      confusions: {},
    };
    const plan = planReviewSession(mastery, "2026-03-25");
    expect(plan.hasReviewWork).toBe(true);
    expect(plan.items).toContain("letter:5");
  });

  it("deduplicates items from due and weak", () => {
    const mastery = {
      entities: {
        "letter:2": { correct: 1, attempts: 5, lastSeen: "2026-03-24", nextReview: "2026-03-25" },
      },
      skills: {},
      confusions: {},
    };
    const plan = planReviewSession(mastery, "2026-03-25");
    // letter:2 is both due and weak — should appear once
    const count = plan.items.filter(k => k === "letter:2").length;
    expect(count).toBe(1);
  });

  it("respects maxItems limit", () => {
    const entities = {};
    for (let i = 1; i <= 20; i++) {
      entities[`letter:${i}`] = { lastSeen: "2026-03-24", nextReview: "2026-03-25", correct: 3, attempts: 3 };
    }
    const plan = planReviewSession({ entities, skills: {}, confusions: {} }, "2026-03-25", { maxItems: 5 });
    expect(plan.items.length).toBeLessThanOrEqual(5);
  });
});
