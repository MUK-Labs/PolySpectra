const { test } = require("node:test");
const assert = require("node:assert/strict");
require("../pitch.js");
require("../workspace.js");
require("../midi.js");
const { Input, Output, encode } = globalThis.AtlasMIDI;
const W = globalThis.PolyWorkspace;
const P = globalThis.AtlasPitch;

test("proxy keys address current partials, preserve velocity and release only the sounding note", () => {
  const src = { id: "cello", f: 65.4, channel: 1 };
  const horn = { id: "horn", f: 43.65, channel: 7, inputChannel: 2, baseKey: 48 };
  const output = new Output(), sent = [];
  output.route({ send: (msg) => sent.push(msg) }, 2);
  const input = new Input((s, n, v) => {
    output.start(s.channel, P.frequency(s, n), v);
    return () => output.release(s.channel);
  });
  const send = (type, key, v) => input.receive([type, key, v], [src, horn], 12);
  const ending = (channel, f, v) => {
    const { note, bend } = encode(f, 2);
    return [[0xe0 + channel - 1, bend & 127, bend >> 7], [0x90 + channel - 1, note, v]];
  };
  send(0x90, 59, 100);
  send(0x90, 72, 100);
  send(0x96, 48, 110);
  assert.deepEqual(sent, []);
  send(0x90, 60, 100);
  assert.deepEqual(sent.slice(-2), ending(1, src.f, 100));
  send(0x91, 50, 75);
  assert.deepEqual(sent.slice(-2), ending(7, 3 * horn.f, 75));
  send(0x90, 66, 124);
  assert.deepEqual(sent.slice(-2), ending(1, 7 * src.f, 124));
  const count = sent.length;
  send(0x80, 60, 10);
  send(0xb1, 1, 0);
  assert.equal(sent.length, count);
  send(0x90, 66, 0);
  assert.deepEqual(sent.slice(-2), [[0x80, encode(7 * src.f, 2).note, 0], [0xe0, 0, 64]]);
  assert.ok(output.active.has(7));
  send(0xb1, 123, 0);
  assert.equal(output.active.size, 0);
  horn.f = 44;
  send(0x91, 50, 31);
  assert.deepEqual(sent.slice(-2), ending(7, 132, 31));
  input.stop();
  assert.equal(output.active.size, 0);
});

test("tempered rows, shared inputs, disabled routes and the MIDI key boundaries", () => {
  const first = { id: "scale", channel: 0, inputChannel: 16, baseKey: 0, f: 442,
    scale: { start: -3, divisions: 19, offset: 27 } };
  const last = { id: "last", channel: 16, baseKey: 127, f: 220 };
  const off = { ...first, id: "off", channel: 16, inputChannel: 0 };
  const calls = [];
  const input = new Input((s, n, v) => {
    calls.push([s.id, n, v, P.frequency(s, n)]);
    return () => calls.push([s.id, "stop"]);
  });
  const send = (msg) => input.receive(msg, [first, last, off], 88);
  send([0xff]); send([0xef, 0, 64]); send([0x9f, 0, 1]); send([0x9f, 87, 100]);
  send([0x9f, 88, 99]); send([0x9f, 127, 127]);
  assert.deepEqual(calls, [
    ["scale", 1, 1, P.frequency(first, 1)], ["scale", "stop"],
    ["scale", 88, 100, P.frequency(first, 88)], ["last", 1, 127, 220],
  ]);
  send([0xbf, 120, 0]);
  assert.deepEqual(calls.slice(-2), [["scale", "stop"], ["last", "stop"]]);
});

test("input mappings round-trip with their sources and old setups follow output", () => {
  const home = "https://example.org/";
  const state = W.fromURL(home + "?example=linked-strings", {});
  const legacy = W.shareURL(state, home);
  assert.equal(new URL(legacy).searchParams.has("input"), false);
  state.sources[0].inputChannel = 16;
  state.sources[0].baseKey = 0;
  state.sources[1].inputChannel = 0;
  state.sources[2].baseKey = 127;
  state.sources.reverse();
  const url = W.shareURL(state, home);
  const loaded = W.fromURL(url, {});
  assert.equal(W.shareURL(loaded, home), url);
  assert.deepEqual(loaded.sources.slice(-3).map(s => [s.inputChannel, s.baseKey]),
    [[null, 127], [0, 60], [16, 0]]);
  for (const bad of ["1.17.60", "1.1.128", "0.1.60", "1.auto.-1", "3.1", "6.3.50"])
    assert.throws(() => W.fromURL(url + "&input=" + bad, {}));
});
