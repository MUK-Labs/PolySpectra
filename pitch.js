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
  const pitch = (f, a) => Math.ceil(69 + 12 * Math.log2(f / a) - 0.5 - 1e-10);
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
    if (system === "12") return reference(system, pitch(f, a) - 69, a);
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
  // Tempered scales repeat every octave. Index 1 is the first displayed step.
  function validScale(t) {
    return (
      t &&
      Number.isInteger(t.divisions) &&
      t.divisions >= 1 &&
      t.divisions <= 120 &&
      Number.isInteger(t.start) &&
      Math.abs(t.start) <= 96 &&
      Number.isFinite(t.offset) &&
      Math.abs(t.offset) <= 2400 &&
      (t.cents === undefined ||
        (Array.isArray(t.cents) &&
          t.cents.length === t.divisions &&
          t.cents[0] === 0 &&
          t.cents.every(
            (v, i, a) =>
              Number.isFinite(v) && v < 1200 && (i === 0 || v > a[i - 1]),
          )))
    );
  }
  function ratio(source, n) {
    const t = source.scale;
    if (!t) return n;
    const step = t.start + n - 1;
    const octaves = t.cents
      ? Math.floor(step / t.divisions) + t.cents[mod(step, t.divisions)] / 1200
      : step / t.divisions;
    return 2 ** (octaves + t.offset / 1200);
  }
  const frequency = (source, n) => source.f * ratio(source, n);
  function degree(source, n) {
    if (!source.scale) return "P" + String(n).padStart(2, "0");
    const t = source.scale,
      step = t.start + n - 1;
    return t.divisions === 12 && !t.cents ? note(69 + step) : "Step " + step;
  }
  function matches(f, source, count) {
    let lo = 1,
      hi = count;
    while (lo < hi) {
      const n = Math.floor((lo + hi) / 2);
      if (frequency(source, n) < f) lo = n + 1;
      else hi = n;
    }
    const candidates = (lo === 1 ? [lo] : [lo - 1, lo]).map((n) => {
      const hz = frequency(source, n);
      return { id: source.id, n, f: hz, delta: cents(hz, f) };
    });
    const best = Math.min(...candidates.map((m) => Math.abs(m.delta)));
    return candidates.filter((m) => Math.abs(m.delta) <= best + 1e-8);
  }
  const closest = (f, source, count) => matches(f, source, count)[0];
  return {
    systems,
    cents,
    note,
    pitch,
    reference,
    nearest,
    tonesInBand,
    closest,
    matches,
    edoHz,
    validScale,
    ratio,
    frequency,
    degree,
  };
})();
