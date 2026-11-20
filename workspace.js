"use strict";
globalThis.PolyWorkspace = (() => {
  const P = globalThis.AtlasPitch;
  const bendRanges = [1, 2, 3, 12, 24, 48];
  const limits = [8, 12, 16, 24, 32, 48, 88];
  const partial = (n) => Number.isInteger(n) && n >= 1 && n <= 88;
  const validHz = (f) => Number.isFinite(f) && f >= 8 && f <= 4000;
  // Each follower has one independent tuning constraint. Resolve roots first so a
  // branch or chain is computed from full-precision fundamentals in one pass.
  function resolve(sources, links) {
    for (const s of sources)
      if (s.scale !== undefined && !P.validScale(s.scale))
        throw Error(
          "Use 1–120 divisions, a first step from −96 to 96 and an offset within ±2400 cents. Custom scales must ascend from 0 to below 1200 cents.",
        );
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
        frequencies.set(
          edge.to,
          (f * P.ratio(src, edge.fromN)) / P.ratio(byId.get(edge.to), edge.toN),
        );
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
        JSON.stringify([
          s.name,
          s.f,
          s.group,
          s.color,
          s.kind || "source",
          ...(s.scale ? [s.scale] : []),
        ]),
      );
    const channels = state.sources.map((s, i) => s.channel ?? autoChannel(i));
    if (channels.some((ch, i) => ch !== autoChannel(i)))
      p.set("channels", channels.join(","));
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
    if (state.collapsedOverlay) p.set("overlay", "collapsed");
    if (state.fullscreen) p.set("fullscreen", "1");
    if (state.grouped) p.set("grouped", "1");
    if (state.bendRange && state.bendRange !== 2)
      p.set("bend", state.bendRange);
    if (state.muted) p.set("sound", "off");
    if (state.mapRefs) p.set("lanes", "1");
    if (!state.refColumns) p.set("refcols", "0");
    if (state.mapUnit === "hz") p.set("unit", "hz");
    if (state.mapCamera)
      p.set("camera", state.mapCamera.center + "," + state.mapCamera.span);
    return url.href;
  }
  function fromURL(href, defaults) {
    let p = new URL(href).searchParams;
    if (!["setup", "a4", "fullscreen", "src", "link"].some((k) => p.has(k))) {
      if (p.get("example") === "quarter-tone-pianos")
        return pianoExample(defaults);
      if (p.get("example") !== "linked-strings") return null;
      p = linkedStringsParameters();
    }
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
        if (!Array.isArray(a) || (a.length !== 5 && a.length !== 6)) bad();
        const [name, f, group, color, kind, scale] = a;
        if (a.length === 6 && !P.validScale(scale)) bad();
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
        return {
          id: "s" + (i + 1),
          name,
          f,
          group,
          color,
          kind,
          ...(scale ? { scale } : {}),
        };
      });
    if (p.has("channels")) {
      const channels = p.get("channels").split(",").map(Number);
      if (channels.length !== s.sources.length || !validChannels(channels))
        bad();
      s.sources.forEach((src, i) => (src.channel = channels[i]));
    }
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
      !limits.includes(s.limit) ||
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
    s.collapsedOverlay = p.get("overlay") === "collapsed";
    s.fullscreen = p.get("fullscreen") === "1";
    s.grouped = p.get("grouped") === "1";
    s.bendRange = p.has("bend") ? Number(p.get("bend")) : 2;
    if (!bendRanges.includes(s.bendRange)) bad();
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
  const autoChannel = (i) => (i < 16 ? i + 1 : 0);
  function validChannels(channels) {
    const active = channels.filter(Boolean);
    return (
      channels.every((c) => Number.isInteger(c) && c >= 0 && c <= 16) &&
      new Set(active).size === active.length
    );
  }
  // This shared setup uses the same decoder as a pasted session URL.
  function linkedStringsParameters() {
    const p = new URLSearchParams({
      setup: "1",
      a4: "440",
      channels: "1,2,3,4,7,5",
      view: "map",
      partials: "32",
      tunings: "31",
      selected: "5.1",
      fullscreen: "1",
      lanes: "1",
      camera: "10242.457097218572,6359.1640720280375",
    });
    const rows = [
      ["String IV", 65.18518518518518, "Strings", "#b197de", "strings"],
      ["String III", 97.77777777777777, "Strings", "#b197de", "source"],
      ["String II", 146.66666666666666, "", "#b197de", "source"],
      ["String I", 220, "", "#b197de", "source"],
      [
        "Keyboard",
        440,
        "",
        "#7ea8d7",
        "source",
        { offset: 0, start: 0, divisions: 12 },
      ],
      ["Horn in F", 43.456790123456784, "Brass", "#e49865", "brass"],
    ];
    for (const row of rows) p.append("src", JSON.stringify(row));
    for (const link of ["4.2-3.3", "3.2-2.3", "2.2-1.3", "5.1-4.2", "1.2-6.3"])
      p.append("link", link);
    return p;
  }
  function pianoExample(defaults) {
    const setup = structuredClone(defaults);
    setup.sources = [0, 50].map((offset, i) => ({
      id: "piano" + (i + 1),
      name: i ? "Piano II" : "Piano I",
      group: "Pianos",
      f: 440,
      kind: "source",
      color: i ? "#e49865" : "#7ea8d7",
      scale: { divisions: 12, start: -9, offset },
    }));
    return {
      ...setup,
      limit: 24,
      selected: { id: "piano1", n: 10 },
      view: "map",
      links: [],
      systems: ["12"],
    };
  }
  return {
    resolve,
    shareURL,
    fromURL,
    limits,
    bendRanges,
    autoChannel,
    validChannels,
  };
})();
