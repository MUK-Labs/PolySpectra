const { test } = require("node:test");
const assert = require("node:assert/strict");
require("../pitch.js");
require("../workspace.js");
const { resolve, shareURL, fromURL } = globalThis.PolyWorkspace;
const src = (id, name, f) => ({
  id,
  name,
  f,
  group: "Strings & reeds",
  kind: "source",
  color: "#aa4333",
});
const sources = [
  src("a", "Violin 🎻", 196),
  src("b", "Thérémine", 220),
  src("c", "Horn", 100),
  src("d", "Viola", 110),
];
const first = { from: "a", fromN: 3, to: "b", toN: 2 },
  second = { from: "b", fromN: 5, to: "c", toN: 4 },
  branch = { from: "a", fromN: 2, to: "d", toN: 3 };
const defaults = {
  sources,
  a: 440,
  selected: { id: "a", n: 3 },
  view: "map",
  mapRefs: false,
  refColumns: true,
  grouped: false,
  muted: false,
  mapUnit: "cents",
  mapCamera: null,
  limit: 12,
  systems: ["12", "31"],
  fullscreen: false,
  links: [],
};
test("links propagate in dependency order with branching; removing a link holds its last tuning", () => {
  const links = [second, branch, first];
  const t = resolve(sources, links);
  assert.equal(t[1].f, 294);
  assert.equal(t[2].f, 367.5);
  assert.equal(t[3].f, (196 * 2) / 3);
  assert.equal(sources[1].f, 220);
  t[0].f = 200;
  const r = resolve(t, links);
  assert.equal(r[1].f, 300);
  assert.equal(r[2].f, 375);
  r[0].f = 210;
  const cut = resolve(r, [second, branch]);
  assert.equal(cut[1].f, 300);
  assert.equal(cut[2].f, 375);
});
test("invalid links and tuning beyond a descendant's supported range reject the whole edit", () => {
  for (const links of [
    [first, { ...first, from: "c" }],
    [first, { from: "b", fromN: 1, to: "a", toN: 1 }],
    [{ ...first, to: "a" }],
    [{ ...first, fromN: 0 }],
    [{ ...first, to: "missing" }],
    [first, { ...second, fromN: 32, toN: 1 }],
  ])
    assert.throws(() => resolve(sources, links));
  assert.equal(sources[1].f, 220);
});
test("shared setups restore order, Unicode, directed links, selection, precision and full-window mode", () => {
  const links = [first, second],
    live = resolve(sources, links);
  const state = {
    ...defaults,
    sources: [live[2], live[1], live[0], live[3]],
    links,
    a: 442,
    fullscreen: true,
    collapsedOverlay: true,
    muted: true,
    grouped: true,
    mapRefs: true,
    refColumns: false,
    mapUnit: "hz",
    mapCamera: { center: 294.0000004, span: 0.00001 },
    systems: ["just", "19"],
    selected: { id: "b", n: 2 },
  };
  const url = shareURL(
    state,
    "https://example.org/PolySpectra/?old=1#by-partial",
  );
  const loaded = fromURL(url, defaults);
  assert.deepEqual(
    loaded.sources.map((x) => [x.name, x.f, x.group, x.color, x.kind]),
    state.sources.map((x) => [x.name, x.f, x.group, x.color, x.kind]),
  );
  assert.equal(loaded.selected.id, loaded.sources[1].id);
  assert.equal(loaded.links[0].from, loaded.sources[2].id);
  assert.equal(loaded.links[1].to, loaded.sources[0].id);
  for (const key of [
    "a",
    "fullscreen",
    "collapsedOverlay",
    "muted",
    "grouped",
    "mapRefs",
    "refColumns",
    "mapUnit",
    "mapCamera",
    "systems",
    "view",
    "limit",
  ])
    assert.deepEqual(loaded[key], state[key]);
  assert.equal(shareURL(loaded, url), url);
  assert.equal(new URL(url).searchParams.has("old"), false);
});
test("basic pitch and fullscreen can be set directly; invalid shared input never mutates the defaults", () => {
  const base = "https://example.org/";
  assert.equal(fromURL(base + "#pitch-map", defaults), null);
  const s = fromURL(base + "?a4=415&fullscreen=1", defaults);
  assert.equal(s.a, 415);
  assert.equal(s.fullscreen, true);
  for (const query of [
    "?setup=8",
    "?a4=oops",
    "?src=%5B1%5D",
    "?setup=1&link=1.1-6.2",
    "?setup=1&selected=1.99",
    "?setup=1&camera=NaN,0",
  ])
    assert.throws(() => fromURL(base + query, defaults));
  assert.equal(defaults.a, 440);
  assert.equal(defaults.sources[1].f, 220);
});

test("the linked ensemble preserves its six sources, directed unisons, routing and saved view", () => {
  const url = "https://example.org/PolySpectra/?example=linked-strings";
  const s = fromURL(url, defaults);
  assert.deepEqual(
    s.sources.map((x) => x.name),
    [
      "String IV",
      "String III",
      "String II",
      "String I",
      "Keyboard",
      "Horn in F",
    ],
  );
  assert.deepEqual(
    s.sources.map((x) => x.channel),
    [1, 2, 3, 4, 7, 5],
  );
  assert.deepEqual(s.sources[4].scale, { offset: 0, start: 0, divisions: 12 });
  assert.equal(s.limit, 32);
  assert.equal(s.fullscreen, true);
  assert.equal(s.mapRefs, true);
  assert.deepEqual(s.systems, ["31"]);
  assert.deepEqual(s.selected, { id: s.sources[4].id, n: 1 });
  assert.deepEqual(s.mapCamera, {
    center: 10242.457097218572,
    span: 6359.1640720280375,
  });
  const shared = shareURL(s, url),
    query = new URL(shared).searchParams;
  assert.deepEqual(query.getAll("link"), [
    "4.2-3.3",
    "3.2-2.3",
    "2.2-1.3",
    "5.1-4.2",
    "1.2-6.3",
  ]);
  assert.deepEqual(fromURL(shared, defaults), s);
  s.sources[4].f = 442;
  const tuned = resolve(s.sources, s.links);
  assert.equal(tuned[3].f, 221);
  for (const l of s.links) {
    const origin = tuned.find((x) => x.id === l.from),
      dest = tuned.find((x) => x.id === l.to);
    assert.ok(
      Math.abs(
        AtlasPitch.frequency(origin, l.fromN) -
          AtlasPitch.frequency(dest, l.toN),
      ) < 1e-10,
    );
  }
});
