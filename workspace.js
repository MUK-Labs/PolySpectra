"use strict";
globalThis.PolyWorkspace = (() => {
  const partial = (n) => Number.isInteger(n) && n >= 1 && n <= 32;
  const validHz = (f) => Number.isFinite(f) && f >= 8 && f <= 4000;
  // Each follower has one independent tuning constraint. Resolve roots first so a
  // branch or chain is computed from full-precision fundamentals in one pass.
  function resolve(sources, links) {
    const byId = new Map(sources.map((s) => [s.id, s]));
    const incoming = new Set(),
      children = new Map(),
      frequencies = new Map();
    for (const { from, to, fromN, toN } of links) {
      if (!byId.has(from) || !byId.has(to) || !partial(fromN) || !partial(toN))
        throw Error("Choose two existing sources and partials.");
      if (from === to) throw Error("Choose a destination on another source.");
      if (incoming.has(to))
        throw Error(
          byId.get(to).name +
            " already follows a partial. Remove its existing link first.",
        );
      incoming.add(to);
      if (!children.has(from)) children.set(from, []);
      children.get(from).push({ to, fromN, toN });
    }
    const queue = sources.filter((s) => !incoming.has(s.id)).map((s) => s.id);
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i],
        src = byId.get(id),
        f = frequencies.get(id) ?? src.f;
      if (!validHz(f))
        throw Error(
          src.name +
            " would have a fundamental outside 8–4,000 Hz. Choose a different partial or root frequency.",
        );
      frequencies.set(id, f);
      for (const edge of children.get(id) || []) {
        frequencies.set(edge.to, (f * edge.fromN) / edge.toN);
        queue.push(edge.to);
      }
    }
    if (frequencies.size !== sources.length)
      throw Error(
        "That link would create a tuning loop. Choose a different destination.",
      );
    return sources.map((s) => ({ ...s, f: frequencies.get(s.id) }));
  }

  function shareURL(state, base) {
    const url = new URL(base);
    url.search = "";
    url.hash = "";
    const p = url.searchParams;
    p.set("setup", "1");
    p.set("a4", state.a);
    const indexes = new Map(state.sources.map((s, i) => [s.id, i + 1]));
    for (const s of state.sources)
      p.append(
        "src",
        JSON.stringify([s.name, s.f, s.group, s.color, s.kind || "source"]),
      );
    for (const l of state.links)
      p.append(
        "link",
        indexes.get(l.from) +
          "." +
          l.fromN +
          "-" +
          indexes.get(l.to) +
          "." +
          l.toN,
      );
    p.set("view", state.view);
    p.set("partials", state.limit);
    p.set("tunings", state.systems.join(","));
    p.set("selected", indexes.get(state.selected.id) + "." + state.selected.n);
    if (state.fullscreen) p.set("fullscreen", "1");
    if (state.grouped) p.set("grouped", "1");
    if (state.muted) p.set("sound", "off");
    if (state.mapRefs) p.set("lanes", "1");
    if (!state.refColumns) p.set("refcols", "0");
    if (state.mapUnit === "hz") p.set("unit", "hz");
    if (state.mapCamera)
      p.set("camera", state.mapCamera.center + "," + state.mapCamera.span);
    return url.href;
  }
  function fromURL(href, defaults) {
    const p = new URL(href).searchParams;
    if (!["setup", "a4", "fullscreen", "src", "link"].some((k) => p.has(k)))
      return null;
    const bad = () => {
      throw Error(
        "This setup URL contains an unsupported or incomplete setting.",
      );
    };
    if (p.has("setup") && p.get("setup") !== "1") bad();
    const s = structuredClone(defaults);
    const rows = p.getAll("src");
    if (rows.length)
      s.sources = rows.map((row, i) => {
        const a = JSON.parse(row);
        if (!Array.isArray(a) || a.length !== 5) bad();
        const [name, f, group, color, kind] = a;
        if (
          typeof name !== "string" ||
          !name.trim() ||
          name.length > 40 ||
          !validHz(f) ||
          typeof group !== "string" ||
          group.length > 32 ||
          typeof color !== "string" ||
          !/^#[0-9a-f]{6}$/i.test(color) ||
          !["strings", "brass", "source"].includes(kind)
        )
          bad();
        return { id: "s" + (i + 1), name, f, group, color, kind };
      });
    s.a = p.has("a4") ? Number(p.get("a4")) : s.a;
    s.limit = p.has("partials") ? Number(p.get("partials")) : s.limit;
    s.view = p.get("view") ?? s.view;
    s.systems = p.has("tunings")
      ? [...new Set(p.get("tunings").split(","))]
      : s.systems;
    if (
      !Number.isFinite(s.a) ||
      s.a < 300 ||
      s.a > 600 ||
      ![8, 12, 16, 24, 32].includes(s.limit) ||
      !["partial", "pitch", "map"].includes(s.view) ||
      !s.systems.every((k) => Object.hasOwn(globalThis.AtlasPitch.systems, k))
    )
      bad();
    function endpoint(spec) {
      const m = /^([1-9]\d*)\.([1-9]\d*)$/.exec(spec);
      const src = m && s.sources[Number(m[1]) - 1];
      if (!src || !partial(Number(m[2]))) bad();
      return { id: src.id, n: Number(m[2]) };
    }
    s.links = p.getAll("link").map((spec) => {
      const pair = spec.split("-");
      if (pair.length !== 2) bad();
      const origin = endpoint(pair[0]),
        destination = endpoint(pair[1]);
      return {
        from: origin.id,
        fromN: origin.n,
        to: destination.id,
        toN: destination.n,
      };
    });
    s.sources = resolve(s.sources, s.links);
    s.selected = p.has("selected")
      ? endpoint(p.get("selected"))
      : rows.length
        ? { id: s.sources[0].id, n: 1 }
        : s.selected;
    if (s.selected.n > s.limit) bad();
    s.fullscreen = p.get("fullscreen") === "1";
    s.grouped = p.get("grouped") === "1";
    s.muted = p.get("sound") === "off";
    s.mapRefs = p.get("lanes") === "1";
    s.refColumns = p.get("refcols") !== "0";
    s.mapUnit = p.get("unit") === "hz" ? "hz" : "cents";
    s.mapCamera = null;
    if (p.has("camera")) {
      const v = p.get("camera").split(",").map(Number);
      if (v.length !== 2 || !v.every(Number.isFinite) || v[1] <= 0) bad();
      s.mapCamera = { center: v[0], span: v[1] };
    }
    return s;
  }
  return { resolve, shareURL, fromURL };
})();
