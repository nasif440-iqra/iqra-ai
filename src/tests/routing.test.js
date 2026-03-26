import { describe, it, expect } from "vitest";
import { parseRoute, serializeRoute, isRoutableScreen, isTransientScreen } from "../lib/routing.js";

describe("parseRoute", () => {
  it("parses empty hash to home", () => {
    expect(parseRoute("")).toEqual({ screen: "home" });
    expect(parseRoute("#")).toEqual({ screen: "home" });
  });

  it("parses #home to home", () => {
    expect(parseRoute("#home")).toEqual({ screen: "home" });
    expect(parseRoute("home")).toEqual({ screen: "home" });
  });

  it("parses #progress to progress", () => {
    expect(parseRoute("#progress")).toEqual({ screen: "progress" });
  });

  it("parses #lesson/3 to lesson with id", () => {
    expect(parseRoute("#lesson/3")).toEqual({ screen: "lesson", lessonId: 3 });
  });

  it("parses #lesson/review to review", () => {
    expect(parseRoute("#lesson/review")).toEqual({ screen: "lesson", lessonId: "review" });
  });

  it("parses large lesson IDs", () => {
    expect(parseRoute("#lesson/84")).toEqual({ screen: "lesson", lessonId: 84 });
  });

  it("fails safely on bare #lesson", () => {
    expect(parseRoute("#lesson")).toEqual({ screen: "home" });
  });

  it("fails safely on invalid lesson param", () => {
    expect(parseRoute("#lesson/abc")).toEqual({ screen: "home" });
    expect(parseRoute("#lesson/-1")).toEqual({ screen: "home" });
    expect(parseRoute("#lesson/0")).toEqual({ screen: "home" });
  });

  it("truncates fractional lesson IDs to integer", () => {
    expect(parseRoute("#lesson/1.5")).toEqual({ screen: "lesson", lessonId: 1 });
    expect(parseRoute("#lesson/42.99")).toEqual({ screen: "lesson", lessonId: 42 });
  });

  it("handles trailing slash", () => {
    expect(parseRoute("#lesson/")).toEqual({ screen: "home" });
  });

  it("trims whitespace in hash", () => {
    expect(parseRoute("#  lesson/3  ")).toEqual({ screen: "lesson", lessonId: 3 });
    expect(parseRoute("# home ")).toEqual({ screen: "home" });
    expect(parseRoute("#  progress  ")).toEqual({ screen: "progress" });
  });

  it("fails safely on unknown hash", () => {
    expect(parseRoute("#foobar")).toEqual({ screen: "home" });
    expect(parseRoute("#phaseComplete")).toEqual({ screen: "home" });
    expect(parseRoute("#wirdIntroduction")).toEqual({ screen: "home" });
    expect(parseRoute("#postLessonOnboarding")).toEqual({ screen: "home" });
    expect(parseRoute("#returnHadith")).toEqual({ screen: "home" });
  });

  it("handles null/undefined", () => {
    expect(parseRoute(null)).toEqual({ screen: "home" });
    expect(parseRoute(undefined)).toEqual({ screen: "home" });
  });

  it("rejects non-existent but syntactically valid lesson IDs", () => {
    // parseRoute doesn't validate lesson existence — that's LessonScreen's job
    expect(parseRoute("#lesson/999")).toEqual({ screen: "lesson", lessonId: 999 });
  });
});

describe("serializeRoute", () => {
  it("serializes home to empty string", () => {
    expect(serializeRoute({ screen: "home" })).toBe("");
  });

  it("serializes progress", () => {
    expect(serializeRoute({ screen: "progress" })).toBe("progress");
  });

  it("serializes lesson with id", () => {
    expect(serializeRoute({ screen: "lesson", lessonId: 3 })).toBe("lesson/3");
  });

  it("serializes review lesson", () => {
    expect(serializeRoute({ screen: "lesson", lessonId: "review" })).toBe("lesson/review");
  });

  it("serializes unknown screen to empty", () => {
    expect(serializeRoute({ screen: "phaseComplete" })).toBe("");
  });

  it("handles null/undefined", () => {
    expect(serializeRoute(null)).toBe("");
    expect(serializeRoute(undefined)).toBe("");
  });

  it("lesson without id serializes to empty", () => {
    expect(serializeRoute({ screen: "lesson" })).toBe("");
  });

  it("lesson with null id serializes to empty", () => {
    expect(serializeRoute({ screen: "lesson", lessonId: null })).toBe("");
  });

  it("lesson with 0 id serializes (0 is falsy but valid lessonId is non-null)", () => {
    // 0 is not a valid lesson ID per parseRoute (rejects id <= 0), but serializeRoute doesn't validate
    expect(serializeRoute({ screen: "lesson", lessonId: 0 })).toBe("lesson/0");
  });
});

describe("roundtrip", () => {
  it("home roundtrips", () => {
    const route = { screen: "home" };
    expect(parseRoute("#" + serializeRoute(route))).toEqual(route);
  });

  it("progress roundtrips", () => {
    const route = { screen: "progress" };
    expect(parseRoute("#" + serializeRoute(route))).toEqual(route);
  });

  it("lesson roundtrips", () => {
    const route = { screen: "lesson", lessonId: 42 };
    expect(parseRoute("#" + serializeRoute(route))).toEqual(route);
  });

  it("review roundtrips", () => {
    const route = { screen: "lesson", lessonId: "review" };
    expect(parseRoute("#" + serializeRoute(route))).toEqual(route);
  });
});

describe("isRoutableScreen", () => {
  it("home, progress, lesson are routable", () => {
    expect(isRoutableScreen("home")).toBe(true);
    expect(isRoutableScreen("progress")).toBe(true);
    expect(isRoutableScreen("lesson")).toBe(true);
  });

  it("transient screens are not routable", () => {
    expect(isRoutableScreen("phaseComplete")).toBe(false);
    expect(isRoutableScreen("wirdIntroduction")).toBe(false);
    expect(isRoutableScreen("postLessonOnboarding")).toBe(false);
    expect(isRoutableScreen("returnHadith")).toBe(false);
  });
});

describe("isTransientScreen", () => {
  it("is the inverse of isRoutableScreen", () => {
    expect(isTransientScreen("home")).toBe(false);
    expect(isTransientScreen("phaseComplete")).toBe(true);
    expect(isTransientScreen("returnHadith")).toBe(true);
  });
});

describe("transient-screen back behavior contract", () => {
  // Documents the fix: when entering a transient screen (phaseComplete, etc.),
  // App.jsx replaces the current hash with "" via replaceState. This ensures
  // browser-back from a transient screen goes home, not back into the lesson.

  it("transient screens serialize to empty hash (they share home's hash)", () => {
    // App.jsx replaceState's the hash to "" when screen becomes transient.
    // If back is pressed after that, parseRoute("") returns home.
    expect(serializeRoute({ screen: "phaseComplete" })).toBe("");
    expect(serializeRoute({ screen: "wirdIntroduction" })).toBe("");
    expect(serializeRoute({ screen: "postLessonOnboarding" })).toBe("");
    expect(serializeRoute({ screen: "returnHadith" })).toBe("");
  });

  it("after replaceState(''), back navigation resolves to home", () => {
    // Simulates: hash was "#lesson/3", replaceState set it to "",
    // then popstate fires with ""
    expect(parseRoute("")).toEqual({ screen: "home" });
    expect(parseRoute("#")).toEqual({ screen: "home" });
  });

  it("all known transient screens are classified correctly", () => {
    const transients = ["phaseComplete", "postLessonOnboarding", "wirdIntroduction", "returnHadith"];
    for (const s of transients) {
      expect(isTransientScreen(s)).toBe(true);
      expect(isRoutableScreen(s)).toBe(false);
    }
  });
});
