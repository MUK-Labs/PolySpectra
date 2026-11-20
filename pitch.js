"use strict";
globalThis.AtlasPitch = (() => {
  const names = [
    "C",
    "C♯",
    "D",
    "E♭",
    "E",
    "F",
    "F♯",
    "G",
    "A♭",
    "A",
    "B♭",
    "B",
  ];
  const just = [
    1,
    16 / 15,
    9 / 8,
    6 / 5,
    5 / 4,
    4 / 3,
    45 / 32,
    3 / 2,
    8 / 5,
    5 / 3,
    9 / 5,
    15 / 8,
  ];
  const systems = {
    12: "12-EDO",
    19: "19-EDO",
    24: "24-EDO",
    31: "31-EDO",
    53: "53-EDO",
    just: "5-limit just",
  };
  const cents = (f, ref) => 1200 * Math.log2(f / ref);
  const mod = (v, n) => ((v % n) + n) % n;
  const note = (midi) => names[mod(midi, 12)] + (Math.floor(midi / 12) - 1);
  const pitch = (f, a) => Math.round(69 + 12 * Math.log2(f / a));
  const edoHz = (step, divisions, a) => a * 2 ** (step / divisions);
  function reference(system, step, a) {
    if (system === "just") {
      const degree = mod(step, 12);
      return {
        step,
        f: a * 2 ** Math.floor(step / 12) * just[degree],
        label: note(step + 69),
      };
    }
    const divisions = Number(system);
    const label =
      divisions === 12
        ? note(step + 69)
        : "step " + (step < 0 ? "−" : step > 0 ? "+" : "") + Math.abs(step);
    return { step, f: edoHz(step, divisions, a), label };
  }
  function nearest(system, f, a) {
    const n = system === "just" ? 12 : Number(system);
    const middle = Math.round(n * Math.log2(f / a));
    const candidates = [-1, 0, 1].map((d) => reference(system, middle + d, a));
    return candidates.reduce((best, r) =>
      Math.abs(cents(f, r.f)) < Math.abs(cents(f, best.f)) ? r : best,
    );
  }
  function tonesInBand(system, midi, a) {
    const n = system === "just" ? 12 : Number(system);
    const mid = ((midi - 69) * n) / 12,
      radius = Math.ceil(n / 24) + 2,
      values = [];
    for (
      let step = Math.floor(mid) - radius;
      step <= Math.ceil(mid) + radius;
      step++
    ) {
      const r = reference(system, step, a);
      if (pitch(r.f, a) === midi) values.push(r);
    }
    return values;
  }
  function closest(f, source, count) {
    const lower = Math.floor(f / source.f);
    const ns = [lower, lower + 1].map((n) => Math.max(1, Math.min(count, n)));
    const n =
      Math.abs(cents(ns[0] * source.f, f)) <=
      Math.abs(cents(ns[1] * source.f, f))
        ? ns[0]
        : ns[1];
    return { id: source.id, n, f: source.f * n, delta: cents(source.f * n, f) };
  }
  return { systems, cents, note, pitch, nearest, tonesInBand, closest, edoHz };
})();
