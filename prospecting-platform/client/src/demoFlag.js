// Demo-mode flag. When on, the client serves bundled sample data + deterministic
// AI stand-ins entirely client-side (no API key needed). When off, AI features
// hit the live /api/* endpoints. Seed from ?demo=1 or a forced build flag.
let _enabled = false;

export const demo = {
  get enabled() { return _enabled; },
  set(v) { _enabled = Boolean(v); },
};

export function initialDemoFromUrl() {
  try {
    if (window.__M1_FORCE_DEMO__) return true;
    return new URLSearchParams(window.location.search).has('demo');
  } catch {
    return false;
  }
}
