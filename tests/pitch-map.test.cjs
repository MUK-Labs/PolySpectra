const { test } = require("node:test");
const assert = require("node:assert/strict");
require("../pitch.js");
require("../pitch-map.js");
const M = globalThis.PitchMap,
  P = globalThis.AtlasPitch;
const sources = [
  { f: 65.406391325 },
  { f: 43.653528929 },
  { f: 195.997717991 },
];
const close = (actual, expected, tol = 1e-8) =>
  assert.ok(Math.abs(actual - expected) < tol, `${actual} vs ${expected}`);
test("equal intervals have equal height in cents; equal frequency gaps have equal height in Hz", () => {
  for (const [unit, fs] of [
    ["cents", [110, 220, 440]],
    ["hz", [110, 220, 330]],
  ]) {
    const camera = M.extent(sources, 12, unit),
      ys = fs.map((f) => M.y(M.coordinate(f, unit), camera));
    assert.ok(ys[0] > ys[1]);
    close(ys[0] - ys[1], ys[1] - ys[2]);
  }
});
test("framing cello P03 and violin P01 preserves their exact separation and equal edge margins", () => {
  for (const unit of ["hz", "cents"]) {
    const a = sources[0].f * 3,
      b = sources[2].f,
      full = M.extent(sources, 12, unit);
    const pair = M.frame(a, b, full, unit);
    const high = M.y(M.coordinate(a, unit), pair),
      low = M.y(M.coordinate(b, unit), pair);
    close(low - high, 1 / 2.4);
    close(low + high, 1);
    assert.ok(high > 0 && low < 1);
    assert.ok(M.frame(a, a, full, unit).span > 0);
  }
});
test("maximum zoom retains pointer anchor, sub-cent detail and bounded tick counts", () => {
  for (const unit of ["hz", "cents"]) {
    const full = M.extent(sources, 32, unit),
      anchor = M.coordinate(196, unit);
    const cam = M.zoom(full, 0, anchor, 0.32, full, unit);
    close(cam.span, M.minSpan(unit));
    close(M.y(anchor, cam), 0.32, 1e-6);
    const ticks = M.ticks(cam, unit, 440, 196, 420);
    assert.ok(ticks.length >= 2 && ticks.length <= 12);
    assert.equal(new Set(ticks.map((t) => t.label)).size, ticks.length);
    const fit = M.constrain(anchor, 1e12, full, unit);
    close(fit.center, full.center);
    close(fit.span, full.span);
  }
});
test("reference markers use the same coordinates as partials, including exact unisons", () => {
  for (const unit of ["cents", "hz"]) {
    const full = M.extent(sources, 12, unit);
    const c = M.zoom(
      full,
      M.minSpan(unit),
      M.coordinate(440, unit),
      0.5,
      full,
      unit,
    );
    for (const k of Object.keys(P.systems)) {
      const refs = M.referenceMarks(k, c, unit, 440);
      assert.equal(refs.length, 1);
      close(refs[0].position, 0.5);
      close(refs[0].f, 440);
    }
  }
});
