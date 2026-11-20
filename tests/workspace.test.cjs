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
