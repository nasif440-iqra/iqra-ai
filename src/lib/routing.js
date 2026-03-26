/**
 * Lightweight route model for hash-based navigation.
 *
 * Route shapes:
 *   { screen: "home" }
 *   { screen: "progress" }
 *   { screen: "lesson", lessonId: 3 }
 *   { screen: "lesson", lessonId: "review" }
 *
 * Transient screens (phaseComplete, wirdIntroduction, etc.) are NOT encoded
 * in the hash — they set the screen state but leave the URL unchanged.
 */

/** Parse a window.location.hash string into a route object. */
export function parseRoute(hash) {
  const raw = (hash || "").replace(/^#/, "").trim();

  if (!raw || raw === "home") return { screen: "home" };
  if (raw === "progress") return { screen: "progress" };

  if (raw.startsWith("lesson/")) {
    const param = raw.slice(7);
    if (param === "review") return { screen: "lesson", lessonId: "review" };
    const id = parseInt(param, 10);
    if (!isNaN(id) && id > 0) return { screen: "lesson", lessonId: id };
    // Invalid lesson param — fall through to home
  }

  // Bare "#lesson" without an id, or any unknown hash
  return { screen: "home" };
}

/** Serialize a route object into a hash string (without the leading #). */
export function serializeRoute(route) {
  if (!route || route.screen === "home") return "";
  if (route.screen === "progress") return "progress";
  if (route.screen === "lesson" && route.lessonId != null) {
    return `lesson/${route.lessonId}`;
  }
  return "";
}

/** Screens that persist in the URL hash and survive back/forward navigation. */
export function isRoutableScreen(screen) {
  return screen === "home" || screen === "progress" || screen === "lesson";
}

/** Screens that are transient overlays — never touch the hash. */
export function isTransientScreen(screen) {
  return !isRoutableScreen(screen);
}
