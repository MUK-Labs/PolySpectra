const { test } = require("node:test");
const assert = require("node:assert/strict");
require("../pitch.js");
const { cents, edoHz, nearest, tonesInBand, closest, pitch } =
  globalThis.AtlasPitch;

test("the third partial of cello C2 lies almost two cents above open violin G3", () => {
  const cello = edoHz(-33, 12, 440);
  const violin = edoHz(-14, 12, 440);
  const match = closest(3 * cello, { id: "violin", f: violin }, 12);
  assert.equal(match.n, 1);
  assert.ok(Math.abs(match.delta + 1.955000865) < 1e-6);
  assert.equal(nearest("12", 3 * cello, 440).label, "G3");
  assert.ok(Math.abs(cents(3 * cello, violin) + match.delta) < 1e-9);
});

test("EDO and just reference notes map back to themselves above and below A4", () => {
  for (const system of ["12", "19", "24", "31", "53", "just"]) {
    for (const a of [415, 440, 442]) {
      for (let midi = 20; midi < 101; midi++) {
        for (const ref of tonesInBand(system, midi, a)) {
          assert.equal(pitch(ref.f, a), midi);
          assert.equal(nearest(system, ref.f, a).step, ref.step);
        }
      }
      assert.ok(Math.abs(nearest(system, a / 4, a).f - a / 4) < 1e-9);
      assert.ok(Math.abs(nearest(system, a * 4, a).f - a * 4) < 1e-9);
    }
  }
  assert.equal(nearest("just", 550, 440).f, 550);
});

test("nearest partial uses a logarithmic distance and stays within the visible series", () => {
  const s = { id: "test", f: 100 };
  assert.equal(closest(50, s, 8).n, 1);
  assert.equal(closest(145, s, 8).n, 2);
  assert.equal(closest(1600, s, 8).n, 8);
});
