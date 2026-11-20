"use strict";
// A camera represents only the visible interval, even at microscopic zoom.
globalThis.PitchMap = (() => {
  const P = globalThis.AtlasPitch;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const coordinate = (f, unit) => (unit === "hz" ? f : 1200 * Math.log2(f));
  const frequency = (v, unit) => (unit === "hz" ? v : 2 ** (v / 1200));
  const minSpan = (unit) => (unit === "hz" ? 0.00001 : 0.01);
  function extent(sources, limit, unit) {
    const first = coordinate(
      Math.min(...sources.map((s) => P.frequency(s, 1))),
      unit,
    );
    const last = coordinate(
      Math.max(...sources.map((s) => P.frequency(s, limit))),
      unit,
    );
    const pad = (last - first) * 0.055;
    const lo = unit === "hz" ? Math.max(0, first - pad) : first - pad;
    const hi = Math.max(last + pad, lo + minSpan(unit));
    return { center: (hi + lo) / 2, span: hi - lo };
  }
  function constrain(center, span, full, unit) {
    span = clamp(span, minSpan(unit), full.span);
    const travel = (full.span - span) / 2;
    return {
      center: clamp(center, full.center - travel, full.center + travel),
      span,
    };
  }
  const y = (v, camera) => 0.5 + (camera.center - v) / camera.span;
  const at = (location, camera) =>
    camera.center + (0.5 - location) * camera.span;
  function zoom(camera, newSpan, anchor, location, full, unit) {
    const span = clamp(newSpan, minSpan(unit), full.span);
    return constrain(anchor + (location - 0.5) * span, span, full, unit);
  }
  function frame(a, b, full, unit) {
    const va = coordinate(a, unit),
      vb = coordinate(b, unit);
    // Exact unisons stay aligned; leave a small, readable context around them.
    const fallback = unit === "hz" ? a * Math.expm1(Math.LN2 / 1200) : 1;
    return constrain(
      (va + vb) / 2,
      va === vb ? fallback : 2.4 * Math.abs(va - vb),
      full,
      unit,
    );
  }
  function niceStep(target) {
    const base = 10 ** Math.floor(Math.log10(target));
    return ([1, 2, 5, 10].find((n) => n * base >= target) || 10) * base;
  }
  function ticks(camera, unit, a, selected, height) {
    const target = Math.max(
      camera.span / Math.max(3, Math.floor(height / 46)),
      Math.abs(camera.center) * Number.EPSILON * 2,
    );
    const named = unit === "cents" && target >= 50;
    const noteSteps = [100, 200, 300, 600, 1200, 2400, 4800];
    const step = named
      ? noteSteps.find((s) => s >= target) || 9600
      : niceStep(target);
    // Wide views label notes starting on C; close views measure from the selection.
    const origin =
      unit === "hz"
        ? 0
        : named
          ? coordinate(a, unit) - 900
          : coordinate(selected, unit);
    const lo = at(1, camera),
      hi = at(0, camera);
    const out = [];
    for (
      let i = Math.ceil((lo - origin) / step);
      i <= Math.floor((hi - origin) / step);
      i++
    ) {
      const value = origin + i * step,
        position = y(value, camera);
      if (position < 0.016 || position > 0.984) continue;
      let label;
      if (named) label = P.note(P.pitch(frequency(value, unit), a));
      else {
        const number = unit === "hz" ? value : i * step;
        const digits = clamp(-Math.floor(Math.log10(step)), 0, 9);
        label =
          (unit === "cents" && number > 0 ? "+" : "") +
          number.toFixed(digits) +
          (unit === "cents" ? "¢" : "");
      }
      out.push({ position, label });
    }
    return out;
  }
  function referenceMarks(system, camera, unit, a) {
    const lo = Math.max(1, frequency(at(1, camera), unit)),
      hi = frequency(at(0, camera), unit);
    if (hi < lo) return [];
    const start = P.nearest(system, lo, a).step - 1,
      end = P.nearest(system, hi, a).step + 1;
    const out = [];
    for (let step = start; step <= end; step++) {
      const r = P.reference(system, step, a),
        position = y(coordinate(r.f, unit), camera);
      if (position >= 0 && position <= 1) out.push({ ...r, position });
    }
    return out;
  }
  return {
    coordinate,
    frequency,
    minSpan,
    extent,
    constrain,
    y,
    at,
    zoom,
    frame,
    ticks,
    referenceMarks,
  };
})();
