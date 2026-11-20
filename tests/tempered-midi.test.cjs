const { test } = require("node:test");
const assert = require("node:assert/strict");
require("../pitch.js");
require("../pitch-map.js");
require("../workspace.js");
require("../midi.js");
const P = globalThis.AtlasPitch,
  M = globalThis.AtlasMIDI,
  W = globalThis.PolyWorkspace;
const home = "https://example.org/";
const defaults = {
  a: 440,
  view: "map",
  mapUnit: "cents",
  refColumns: true,
  systems: ["12"],
  links: [],
  sources: [],
};
const pair = () => W.fromURL(home + "?example=quarter-tone-pianos", defaults);
const near = (a, b, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, a + " vs " + b);
test("the same written key on the two pianos differs by 50 cents, with two closest matches", () => {
  const [a, b] = pair().sources;
  assert.equal(P.degree(a, 10), "A4");
  assert.equal(P.degree(b, 10), "A4");
  near(P.frequency(a, 10), 440);
  near(P.frequency(b, 10), 452.8929841231365);
  const matches = P.matches(440, b, 24);
  assert.deepEqual(
    matches.map((m) => m.n),
    [9, 10],
  );
  near(matches[0].delta, -50);
  near(matches[1].delta, 50);
  near(P.frequency(b, 22) / P.frequency(b, 10), 2);
  assert.equal(P.frequency(a, 22), 880);
  for (const unit of ["hz", "cents"]) {
    const map = globalThis.PitchMap,
      full = map.extent([a, b], 24, unit);
    for (const s of [a, b])
      for (const n of [1, 24]) {
        const y = map.y(map.coordinate(P.frequency(s, n), unit), full);
        assert.ok(y > 0 && y < 1);
      }
  }
});
test("non-12 EDO and custom octaves work across negative steps and chained harmonic links", () => {
  const [a, b] = pair().sources;
  a.scale = { divisions: 19, start: -1, offset: -17 };
  b.scale = { divisions: 3, cents: [0, 240, 680], start: -1, offset: 7 };
  near(P.frequency(a, 20) / P.frequency(a, 1), 2);
  near(P.cents(P.frequency(b, 2), P.frequency(b, 1)), 520);
  const c = { ...a, id: "harmonic", scale: undefined };
  const links = [
    { from: a.id, to: c.id, fromN: 12, toN: 4 },
    { from: c.id, to: b.id, fromN: 3, toN: 7 },
  ];
  const resolved = W.resolve([a, b, c], links);
  near(P.frequency(resolved[0], 12), P.frequency(resolved[2], 4));
  near(P.frequency(resolved[2], 3), P.frequency(resolved[1], 7));
  assert.throws(() =>
    W.resolve([{ ...a, scale: { ...b.scale, cents: [0, 0, 700] } }], []),
  );
});
test("shared scale, links and nonsequential MIDI channels survive reordering and URL restoration", () => {
  const s = pair();
  s.sources.reverse();
  s.bendRange = 12;
  s.sources[0].channel = 7;
  s.sources[1].channel = 0;
  s.sources[0].scale = {
    divisions: 3,
    cents: [0, 400, 700],
    start: -4,
    offset: 35,
  };
  s.links = [{ from: s.sources[1].id, to: s.sources[0].id, fromN: 5, toN: 5 }];
  s.sources = W.resolve(s.sources, s.links);
  const url = W.shareURL(s, home);
  const loaded = W.fromURL(url, defaults);
  assert.deepEqual(
    loaded.sources.map((x) => x.scale),
    s.sources.map((x) => x.scale),
  );
  assert.deepEqual(
    loaded.sources.map((x) => x.channel),
    [7, 0],
  );
  assert.equal(loaded.bendRange, 12);
  assert.equal(W.shareURL(loaded, home), url);
  const bad = new URL(url);
  bad.searchParams.set("channels", "2,2");
  assert.throws(() => W.fromURL(bad, defaults));
});
test("MIDI encoding reproduces sounding Hz for quarter tones, arbitrary tunings and edge notes", () => {
  const haz = (key) => 440 * 2 ** ((key - 69) / 12);
  assert.deepEqual(M.encode(440, 2), { note: 69, bend: 8192 });
  assert.deepEqual(M.encode(haz(69.5), 2), { note: 69, bend: 10240 });
  for (const range of [1, 2, 12, 48])
    for (const k of [-0.9, 0.7, 60.72, 69.5, 73.19, 126.91, 127.9]) {
      const { note, bend } = M.encode(haz(k), range);
      const key = note + ((bend - 8192) / (bend < 8192 ? 8192 : 8191)) * range;
      near(key, k, range / 8191);
    }
  assert.equal(M.encode(haz(132), 2), null);
  assert.equal(M.encode(0, 2), null);
});
test("independent source bends precede note-on and every sounding channel receives a release and centered bend", () => {
  const sent = [],
    out = new M.Output();
  out.route({ send: (msg) => sent.push(msg) }, 2);
  assert.ok(out.start(1, 440));
  assert.ok(out.start(2, 440 * 2 ** (50 / 1200)));
  assert.deepEqual(sent.slice(0, 8), [
    [176, 101, 0],
    [176, 100, 0],
    [176, 6, 2],
    [176, 38, 0],
    [176, 101, 127],
    [176, 100, 127],
    [224, 0, 64],
    [144, 69, 88],
  ]);
  assert.deepEqual(sent.slice(-2), [
    [225, 0, 80],
    [145, 69, 88],
  ]);
  out.start(1, 220);
  assert.deepEqual(sent.slice(-4), [
    [128, 69, 0],
    [224, 0, 64],
    [224, 0, 64],
    [144, 57, 88],
  ]);
  out.route(null, 12);
  assert.deepEqual(sent.slice(-4), [
    [129, 69, 0],
    [225, 0, 64],
    [128, 57, 0],
    [224, 0, 64],
  ]);
  assert.equal(out.start(1, 220), false);
  assert.equal(out.active.size, 0);
});
