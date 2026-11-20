"use strict";
(() => {
  const P = globalThis.AtlasPitch,
    $ = (id) => document.getElementById(id);
  const paths = {
    wave: "M2 12h3l2-6 3 12 3-15 3 14 2-7 2 2h2",
    keyboard:
      "M3 5h18v14H3z M6 9h1m3 0h1m3 0h1m3 0h.5M6 12h1m3 0h1m3 0h1m3 0h.5M8 16h8",
    plus: "M12 5v14M5 12h14",
    tuning: "M3 7h6m4 0h8M3 17h10m4 0h4M9 4v6m4 4v6",
    sound: "M3 9h4l5-4v14l-5-4H3z M15 8q4 4 0 8m3-11q7 7 0 14",
    mute: "M3 9h4l5-4v14l-5-4H3z M16 9l5 6m0-6-5 6",
    group: "M3 6h7v12H3z M14 6h7v12h-7z",
    focus:
      "M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5 M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
    dots: "M5 12h.1m6.9 0h.1m6.9 0h.1",
    strings: "m5 18 11-15m-7 17L20 5M3 13l10 7M9 5l10 7",
    brass: "M3 11h7l7-5v12l-7-5H6a3 3 0 1 0 3 3v-3M19 5v14",
    source: "M3 12h3l3-7 5 14 3-7h4",
    play: "m7 4 12 8-12 8z",
    stop: "M6 6h12v12H6z",
    cursor: "m5 3 14 10-7 1-3 7z",
    check: "m4 12 5 5L20 6",
    x: "m6 6 12 12M18 6 6 18",
  };
  function icon(key) {
    return (
      '<svg class="ui-icon" viewBox="0 0 24 24" fill="' +
      (key === "play" ? "currentColor" : "none") +
      '" stroke="currentColor" stroke-width="' +
      (key === "dots" ? 3.5 : 1.65) +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
      paths[key] +
      '"/></svg>'
    );
  }
  document
    .querySelectorAll("i[data-icon]")
    .forEach((i) => (i.innerHTML = icon(i.dataset.icon)));
  const palette = [
    "#b197de",
    "#e49865",
    "#68b79f",
    "#7ea8d7",
    "#d3889f",
    "#beb263",
  ];
  const presets = {
    cello: {
      name: "Cello",
      midi: 36,
      group: "Strings",
      color: palette[0],
      kind: "strings",
    },
    horn: {
      name: "Horn in F",
      midi: 29,
      group: "Brass",
      color: palette[1],
      kind: "brass",
    },
    violin: {
      name: "Violin",
      midi: 55,
      group: "Strings",
      color: palette[2],
      kind: "strings",
    },
    bass: {
      name: "Double bass",
      midi: 28,
      group: "Strings",
      color: palette[3],
      kind: "strings",
    },
    trumpet: {
      name: "B♭ trumpet",
      midi: 46,
      group: "Brass",
      color: palette[4],
      kind: "brass",
    },
  };
  const presetHz = (p, a) => P.edoHz(p.midi - 69, 12, a);
  const defaults = {
    sources: ["cello", "horn", "violin"].map((id) => ({
      ...presets[id],
      id,
      f: presetHz(presets[id], 440),
    })),
    a: 440,
    systems: ["12", "31"],
    refColumns: true,
    limit: 12,
    view: "partial",
    grouped: false,
    muted: false,
    selected: { id: "cello", n: 3 },
  };
  const storageKey = "polyspectra.workspace.v1";
  const limits = [8, 12, 16, 24, 32];
  function readWorkspace() {
    try {
      const s = JSON.parse(localStorage.getItem(storageKey));
      if (
        !s ||
        !Array.isArray(s.sources) ||
        !s.sources.length ||
        !s.sources.every(
          (x) =>
            typeof x.name === "string" &&
            typeof x.group === "string" &&
            /^[\w-]+$/.test(x.id) &&
            x.f >= 8 &&
            x.f <= 4000 &&
            /^#[0-9a-f]{6}$/i.test(x.color),
        ) ||
        new Set(s.sources.map((x) => x.id)).size !== s.sources.length
      )
        return defaults;
      if (
        !limits.includes(s.limit) ||
        !(s.a >= 300 && s.a <= 600) ||
        !Array.isArray(s.systems) ||
        !s.systems.length ||
        !s.systems.every((k) => Object.hasOwn(P.systems, k)) ||
        !s.sources.some((x) => x.id === s.selected?.id) ||
        !Number.isInteger(s.selected.n) ||
        s.selected.n < 1 ||
        s.selected.n > s.limit
      )
        return defaults;
      return { ...defaults, ...s };
    } catch {
      return defaults;
    }
  }
  const state = readWorkspace();
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const fmt = (f) =>
    f.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const delta = (c) =>
    (Math.abs(c) < 0.05
      ? "0.0"
      : (c > 0 ? "+" : "−") + Math.abs(c).toFixed(1)) + " ¢";
  const pnum = (n) => "P" + String(n).padStart(2, "0");
  const getSource = (id) => state.sources.find((s) => s.id === id);
  const selected = () => getSource(state.selected.id);
  const selectedHz = () => selected().f * state.selected.n;
  const noteName = (f) => P.note(P.pitch(f, state.a));
  function colors(c) {
    return (
      "--c:" +
      c +
      ";--tint:color-mix(in srgb," +
      c +
      " 15%,white);--dark:color-mix(in srgb," +
      c +
      " 58%,#15291f)"
    );
  }
  function sources() {
    if (!state.grouped) return state.sources;
    const groups = Array.from(new Set(state.sources.map((s) => s.group)));
    return groups.flatMap((g) => state.sources.filter((s) => s.group === g));
  }
  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      $("save-status").innerHTML = icon("check") + "Saved on this device";
    } catch {
      $("save-status").textContent = "Changes last for this session";
    }
  }
  let toastTimer;
  function announce(text, visible = false) {
    $("announce").textContent = text;
    if (visible) {
      clearTimeout(toastTimer);
      $("announce").className = "toast";
      toastTimer = setTimeout(() => ($("announce").className = "sr"), 3200);
    }
  }
  let context,
    voices = [],
    playing = false,
    audioSeq = 0,
    endTimer;
  function clearAudio() {
    audioSeq++;
    clearTimeout(endTimer);
    for (const v of voices) {
      try {
        const t = context.currentTime;
        v.gain.gain.cancelScheduledValues(t);
        v.gain.gain.setTargetAtTime(0.0001, t, 0.012);
        v.osc.stop(t + 0.055);
      } catch {}
    }
    voices = [];
    playing = false;
    refreshPlay();
  }
  async function play(freqs, duration = 1.3) {
    clearAudio();
    if (state.muted) {
      announce("Sound is off. Turn it on in the toolbar.", true);
      return;
    }
    const seq = audioSeq;
    try {
      context ??= new (window.AudioContext || window.webkitAudioContext)();
      if (context.state !== "running") await context.resume();
      if (seq !== audioSeq) return;
      if (
        freqs.some(
          (f) => f >= Math.min(20000, context.sampleRate / 2) || f < 20,
        )
      ) {
        announce(
          "This pitch is outside the 20 Hz–20 kHz playback range.",
          true,
        );
        return;
      }
      const t = context.currentTime;
      for (const f of freqs) {
        const osc = context.createOscillator(),
          gain = context.createGain();
        osc.type = "sine";
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.13 / freqs.length, t + 0.022);
        gain.gain.setValueAtTime(0.13 / freqs.length, t + duration - 0.12);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
        osc.start(t);
        osc.stop(t + duration + 0.01);
        voices.push({ osc, gain });
      }
      playing = true;
      refreshPlay();
      endTimer = setTimeout(
        () => {
          if (seq === audioSeq) {
            playing = false;
            voices = [];
            refreshPlay();
          }
        },
        duration * 1000 + 30,
      );
    } catch {
      announce(
        "Audio could not start on this device. Tap Play partial to retry.",
        true,
      );
    }
  }
  function refreshPlay() {
    const button = $("play");
    if (button)
      button.innerHTML =
        icon(playing ? "stop" : "play") +
        (playing ? "Stop sound" : "Play partial");
  }
  function drawChart() {
    const box = $("chart"),
      w = Math.max(200, box.clientWidth),
      h = box.clientHeight,
      pad = 12;
    const lo = Math.min(...state.sources.map((s) => s.f)) / 1.21,
      hi = Math.max(...state.sources.map((s) => s.f * state.limit)) * 1.12;
    const pos = (f) =>
      pad + ((w - 2 * pad) * Math.log(f / lo)) / Math.log(hi / lo);
    const base = h - 20,
      top = 11,
      points = [],
      ticks = [];
    let svg =
      '<svg viewBox="0 0 ' +
      w +
      " " +
      h +
      '" role="img" aria-label="Harmonic peaks by sounding frequency"><title>Ideal harmonic peaks. Heights decrease with partial number for legibility.</title><defs>';
    state.sources.forEach((s, i) => {
      svg +=
        '<linearGradient id="fill' +
        i +
        '" x1="0" y1="0" x2="0" y2="1"><stop stop-color="' +
        s.color +
        '" stop-opacity=".50"/><stop offset="1" stop-color="' +
        s.color +
        '" stop-opacity=".06"/></linearGradient>';
    });
    svg += "</defs>";
    for (let i = 0; i <= 4; i++) {
      const y = top + ((base - top) * i) / 4;
      svg +=
        '<path d="M' +
        pad +
        " " +
        y +
        "H" +
        (w - pad) +
        '" stroke="#a3c7ae" stroke-opacity="' +
        (i === 4 ? 0.36 : 0.14) +
        '" stroke-dasharray="' +
        (i === 4 ? "0" : "2 5") +
        '"/>';
    }
    for (let e = 0; e <= 6; e++)
      for (const m of [1, 2, 3, 5, 7]) {
        const f = m * 10 ** e;
        if (f < lo || f > hi) continue;
        const x = pos(f),
          major = [1, 2, 5].includes(m);
        svg +=
          '<path d="M' +
          x +
          " " +
          (major ? top : top + 2) +
          "V" +
          base +
          '" stroke="#a3c7ae" stroke-opacity="' +
          (major ? 0.16 : 0.08) +
          '" stroke-dasharray="2 5"/>';
        if (major && (!ticks.length || x - ticks.at(-1) > 45)) {
          ticks.push(x);
          svg +=
            '<text x="' +
            x +
            '" y="' +
            (h - 3) +
            '" text-anchor="middle" fill="#b3c2b6" font-family="monospace" font-size="11">' +
            (f >= 1000 ? f / 1000 + "k" : f) +
            "</text>";
        }
      }
    state.sources.forEach((s, i) => {
      let d = "M" + pad + " " + base;
      for (let n = 1; n <= state.limit; n++) {
        const x = pos(s.f * n),
          y = base - (base - top) / n ** 0.32,
          spread = Math.min(
            (pos(s.f * (n + 1)) - x) * 0.43,
            Math.max(4, w * 0.016),
          );
        const l = x - spread,
          r = x + spread;
        d +=
          " L" +
          l +
          " " +
          base +
          " C" +
          (x - spread * 0.23) +
          " " +
          (base - 1) +
          " " +
          (x - spread * 0.15) +
          " " +
          (y + 8) +
          " " +
          x +
          " " +
          y +
          " C" +
          (x + spread * 0.1) +
          " " +
          (y + 7) +
          " " +
          (x + spread * 0.2) +
          " " +
          (base - 1) +
          " " +
          r +
          " " +
          base;
        points.push({ x, y, s, n });
      }
      d += " L" + (w - pad) + " " + base;
      svg +=
        '<path d="' +
        d +
        ' Z" fill="url(#fill' +
        i +
        ')"/><path d="' +
        d +
        '" fill="none" stroke="' +
        s.color +
        '" stroke-width="1.5"/>';
    });
    const active = points.find(
      (p) => p.s.id === state.selected.id && p.n === state.selected.n,
    );
    if (active) {
      const { x, y, s, n } = active,
        label = pnum(n) + " · " + fmt(s.f * n) + " Hz",
        lw = label.length * 6.5 + 13;
      const lx = Math.min(Math.max(1, x - lw * 0.5), w - lw - 1);
      svg +=
        '<path d="M' +
        x +
        " 1V" +
        base +
        '" stroke="' +
        s.color +
        '" opacity=".65" stroke-dasharray="3 4"/><circle cx="' +
        x +
        '" cy="' +
        y +
        '" r="3.7" fill="' +
        s.color +
        '" stroke="#152e27" stroke-width="1.6"/><rect x="' +
        lx +
        '" y="0" width="' +
        lw +
        '" height="18" rx="4" fill="#29453a"/><text x="' +
        (lx + lw / 2) +
        '" y="12.5" text-anchor="middle" font-size="10.5" font-family="monospace" fill="#e2eedd">' +
        label +
        "</text>";
    }
    points.forEach(({ x, y, s, n }) => {
      svg +=
        '<circle data-src="' +
        s.id +
        '" data-n="' +
        n +
        '" cx="' +
        x +
        '" cy="' +
        y +
        '" r="8" fill="transparent" style="cursor:pointer"><title>' +
        esc(s.name) +
        " · " +
        pnum(n) +
        " · " +
        fmt(s.f * n) +
        " Hz</title></circle>";
    });
    box.innerHTML = svg + "</svg>";
  }
  function cell(s, n, byPitch) {
    const f = s.f * n,
      sel = state.selected.id === s.id && state.selected.n === n;
    return (
      '<button class="cell" data-src="' +
      s.id +
      '" data-n="' +
      n +
      '" aria-pressed="' +
      sel +
      '" tabindex="' +
      (sel ? 0 : -1) +
      '" aria-label="' +
      esc(s.name) +
      ", partial " +
      n +
      ", " +
      noteName(f) +
      ", " +
      fmt(f) +
      ' hertz"><span class="notename">' +
      noteName(f) +
      (byPitch ? ' <span class="which">' + pnum(n) + "</span>" : "") +
      '</span><span class="hz">' +
      fmt(f) +
      " <small>Hz</small></span></button>"
    );
  }
  function drawMatrix() {
    const ss = sources(),
      byPitch = state.view === "pitch",
      refs = byPitch && state.refColumns ? state.systems : [];
    const matrix = $("matrix");
    matrix.style.minWidth =
      ss.length * (window.innerWidth < 600 ? 122 : 153) +
      refs.length * 136 +
      55 +
      "px";
    let html =
      '<colgroup><col class="gutter">' +
      ss
        .concat(refs)
        .map(() => "<col>")
        .join("") +
      "</colgroup><thead>";
    if (state.grouped) {
      const byGroup = new Map();
      ss.forEach((s) => byGroup.set(s.group, (byGroup.get(s.group) || 0) + 1));
      html +=
        '<tr class="group-row"><th class="gutter">Group</th>' +
        Array.from(
          byGroup,
          ([g, n]) =>
            '<th scope="colgroup" colspan="' +
            n +
            '">' +
            esc(g || "Ungrouped") +
            "</th>",
        ).join("") +
        (refs.length
          ? '<th colspan="' + refs.length + '">Tuning references</th>'
          : "") +
        "</tr>";
    }
    html +=
      '<tr><th scope="col" class="gutter axis-head">' +
      (byPitch ? "Pitch<br>band" : "Partial") +
      "</th>";
    ss.forEach((s) => {
      html +=
        '<th scope="col" draggable="true" data-head="' +
        s.id +
        '" class="source-head" style="' +
        colors(s.color) +
        '"><div class="head-inner"><span class="source-sign">' +
        icon(
          s.kind === "brass"
            ? "brass"
            : s.kind === "strings"
              ? "strings"
              : "source",
        ) +
        '</span><span class="head-text"><strong title="' +
        esc(s.name) +
        '">' +
        esc(s.name) +
        "</strong><small>" +
        noteName(s.f) +
        " · " +
        fmt(s.f) +
        ' Hz</small></span><button class="icon" data-edit="' +
        s.id +
        '" aria-label="Edit ' +
        esc(s.name) +
        '" title="Edit, move or remove source">' +
        icon("dots") +
        "</button></div></th>";
    });
    refs.forEach((k) => {
      html +=
        '<th scope="col" class="ref-head">' +
        P.systems[k] +
        "<br><small>Reference</small></th>";
    });
    html += "</tr></thead><tbody>";
    function sourceTd(s, inner) {
      return '<td style="' + colors(s.color) + '">' + inner + "</td>";
    }
    if (!byPitch) {
      for (let n = 1; n <= state.limit; n++) {
        html +=
          '<tr><th scope="row" class="gutter ' +
          (state.selected.n === n ? "current-row" : "") +
          '">' +
          pnum(n) +
          "</th>" +
          ss.map((s) => sourceTd(s, cell(s, n, false))).join("") +
          "</tr>";
      }
    } else {
      const bands = new Map();
      for (const s of ss)
        for (let n = 1; n <= state.limit; n++) {
          const midi = P.pitch(s.f * n, state.a);
          if (!bands.has(midi)) bands.set(midi, new Map());
          const row = bands.get(midi);
          if (!row.has(s.id)) row.set(s.id, []);
          row.get(s.id).push(n);
        }
      for (const midi of [...bands.keys()].sort((a, b) => a - b)) {
        const row = bands.get(midi);
        html +=
          '<tr><th scope="row" class="gutter ' +
          (midi === P.pitch(selectedHz(), state.a) ? "current-row" : "") +
          '">' +
          P.note(midi) +
          "</th>";
        ss.forEach((s) => {
          html += sourceTd(
            s,
            row.has(s.id)
              ? row
                  .get(s.id)
                  .map((n) => cell(s, n, true))
                  .join("")
              : '<div class="empty-cell">·</div>',
          );
        });
        refs.forEach((k) => {
          const tones = P.tonesInBand(k, midi, state.a);
          html +=
            "<td>" +
            (tones
              .map(
                (r) =>
                  '<button class="cell ref-cell" data-tone="' +
                  r.f +
                  '" title="Play ' +
                  P.systems[k] +
                  " reference, " +
                  fmt(r.f) +
                  ' Hz"><b>' +
                  r.label +
                  '</b><span class="hz">' +
                  fmt(r.f) +
                  "</span></button>",
              )
              .join("") || '<div class="empty-cell">·</div>') +
            "</td>";
        });
        html += "</tr>";
      }
    }
    matrix.innerHTML = html + "</tbody>";
    $("view-note").textContent = byPitch
      ? "Rows align by nearest 12-EDO note."
      : "P01 is the sounding fundamental.";
    $("by-partial").setAttribute("aria-pressed", !byPitch);
    $("by-pitch").setAttribute("aria-pressed", byPitch);
    $("groups").setAttribute("aria-pressed", state.grouped);
    $("groups").querySelector("span").textContent = state.grouped
      ? "Grouped"
      : "Group sources";
    $("limit").value = state.limit;
    $("count").textContent =
      ss.length + (ss.length === 1 ? " source" : " sources");
  }
  function drawInspector() {
    const s = selected(),
      n = state.selected.n,
      f = s.f * n;
    const tuning = state.systems
      .map((k) => {
        const r = P.nearest(k, f, state.a),
          d = P.cents(f, r.f);
        return (
          '<button class="tune-line" data-pair="' +
          r.f +
          '" title="Hear both · ' +
          fmt(r.f) +
          ' Hz reference · deviation of partial from reference"><span>' +
          P.systems[k] +
          '</span><span class="degree">' +
          r.label +
          '</span><span class="cents">' +
          delta(d) +
          "</span></button>"
        );
      })
      .join("");
    const near = state.sources
      .filter((o) => o.id !== s.id)
      .map((o) => P.closest(f, o, state.limit))
      .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));
    const matches = near
      .map((m) => {
        const o = getSource(m.id);
        return (
          '<button class="match" data-pair="' +
          m.f +
          '" title="Hear both · ' +
          esc(o.name) +
          " at " +
          fmt(m.f) +
          ' Hz"><span class="dot" style="--c:' +
          o.color +
          '"></span><span class="match-info">' +
          esc(o.name) +
          " · " +
          pnum(m.n) +
          '</span><span class="delta">' +
          delta(m.delta) +
          "</span>" +
          icon("sound") +
          "</button>"
        );
      })
      .join("");
    $("inspector").innerHTML =
      '<div class="inspector-title">' +
      icon("focus") +
      '<h2>Partial inspector</h2></div><div class="readout"><span class="source-label"><span class="dot" style="--c:' +
      s.color +
      '"></span>' +
      esc(s.name) +
      " · " +
      pnum(n) +
      '</span><div class="read-pitch"><strong>' +
      noteName(f) +
      '</strong><span class="read-hz">' +
      fmt(f) +
      ' Hz</span></div><button class="play" id="play"></button></div><div class="ins-block"><div class="ins-heading"><h3>Tuning comparison</h3><small>A4 = ' +
      state.a +
      "</small></div>" +
      tuning +
      '</div><div class="ins-block"><h3>Closest partials</h3>' +
      (matches || '<p class="muted">Add another source to compare.</p>') +
      "</div>";
    refreshPlay();
  }
  function render() {
    const ss = sources();
    $("legend").innerHTML = ss
      .map(
        (s) =>
          '<button data-legend="' +
          s.id +
          '" title="Select ' +
          esc(s.name) +
          '"><span class="dot" style="--c:' +
          s.color +
          '"></span>' +
          esc(s.name) +
          "</button>",
      )
      .join("");
    $("sound").innerHTML =
      icon(state.muted ? "mute" : "sound") +
      "<span>Sound " +
      (state.muted ? "off" : "on") +
      "</span>";
    $("sound").setAttribute("aria-pressed", !state.muted);
    drawMatrix();
    drawChart();
    drawInspector();
    save();
  }
  function choose(id, n, focus = false) {
    if (!getSource(id)) return;
    state.selected = { id, n: Math.max(1, Math.min(state.limit, n)) };
    render();
    if (focus) {
      const target = $("matrix").querySelector('.cell[aria-pressed="true"]');
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    announce(
      selected().name +
        ", partial " +
        state.selected.n +
        ", " +
        fmt(selectedHz()) +
        " hertz",
    );
    play([selectedHz()]);
  }
  let editing = null,
    formColor = palette[0],
    formKind = "source";
  function showColors(color) {
    formColor = color;
    $("colors").innerHTML =
      palette
        .map(
          (c, i) =>
            '<button type="button" aria-label="' +
            ["Lavender", "Copper", "Mint", "Blue", "Rose", "Olive"][i] +
            '" data-color="' +
            c +
            '" aria-pressed="' +
            (c === color) +
            '" style="--c:' +
            c +
            '"></button>',
        )
        .join("") +
      '<input type="color" id="custom-color" value="' +
      color +
      '" title="Custom color" aria-label="Custom column color">';
  }
  function fillPreset(key) {
    const p = presets[key];
    if (!p) {
      formKind = "source";
      return;
    }
    formKind = p.kind;
    $("source-name").value = p.name;
    $("group-name").value = p.group;
    $("frequency").value = Number(presetHz(p, state.a).toFixed(8));
    showColors(p.color);
  }
  function sourceDialog(id = null) {
    editing = id;
    const s = id ? getSource(id) : null;
    $("source-title").textContent = s ? "Edit source" : "Add source";
    $("source-save").textContent = s ? "Save changes" : "Add source";
    $("preset").value = "custom";
    $("source-name").value = s?.name || "";
    $("frequency").value = s?.f || 110;
    $("group-name").value = s?.group || "";
    formKind = s?.kind || "source";
    $("group-names").innerHTML = [
      ...new Set(state.sources.map((o) => o.group).filter(Boolean)),
    ]
      .map((g) => '<option value="' + esc(g) + '"></option>')
      .join("");
    showColors(s?.color || palette[state.sources.length % palette.length]);
    const ss = sources(),
      idx = ss.findIndex((o) => o.id === id);
    $("arrange").innerHTML = s
      ? '<div class="arrange-tools"><button type="button" data-step="-1" ' +
        (idx === 0 ? "disabled" : "") +
        '>Move left</button><button type="button" data-step="1" ' +
        (idx === ss.length - 1 ? "disabled" : "") +
        '>Move right</button><button type="button" class="remove" data-remove ' +
        (ss.length === 1 ? 'disabled title="Keep at least one source"' : "") +
        ">Remove</button></div>"
      : "";
    $("source-dialog").showModal();
  }
  function reorder(id, targetId) {
    const ss = [...sources()],
      from = ss.findIndex((s) => s.id === id),
      to = ss.findIndex((s) => s.id === targetId);
    if (from < 0 || to < 0 || from === to) return;
    const [s] = ss.splice(from, 1);
    ss.splice(to, 0, s);
    state.sources = ss;
    if (state.grouped) {
      const seq = ss
        .map((s) => s.group)
        .filter((g, i, a) => i === 0 || a[i - 1] !== g);
      state.grouped = new Set(seq).size === seq.length;
    }
    render();
  }
  function openTuning() {
    $("concert").value = state.a;
    $("ref-columns").checked = state.refColumns;
    $("systems").innerHTML = Object.entries(P.systems)
      .map(
        ([k, v]) =>
          '<label class="check"><input type="checkbox" value="' +
          k +
          '" ' +
          (state.systems.includes(k) ? "checked" : "") +
          ">" +
          v +
          "</label>",
      )
      .join("");
    $("tuning-dialog").showModal();
  }
  $("add").onclick = () => sourceDialog();
  $("tuning").onclick = openTuning;
  $("help").onclick = () => $("help-dialog").showModal();
  $("sound").onclick = () => {
    state.muted = !state.muted;
    if (state.muted) clearAudio();
    render();
  };
  $("preset").onchange = (e) => fillPreset(e.target.value);
  $("colors").onclick = (e) => {
    const b = e.target.closest("[data-color]");
    if (b) showColors(b.dataset.color);
  };
  $("colors").oninput = (e) => {
    if (e.target.type === "color") {
      formColor = e.target.value;
      $("colors")
        .querySelectorAll("button")
        .forEach((b) =>
          b.setAttribute("aria-pressed", b.dataset.color === formColor),
        );
    }
  };
  $("source-form").onsubmit = (e) => {
    e.preventDefault();
    const name = $("source-name").value.trim();
    if (!name) {
      $("source-name").setCustomValidity("Enter a name for this source.");
      $("source-name").reportValidity();
      return;
    }
    const source = {
      id: editing || crypto.randomUUID(),
      name,
      f: Number($("frequency").value),
      group: $("group-name").value.trim(),
      kind: formKind,
      color: formColor,
    };
    if (editing) Object.assign(getSource(editing), source);
    else {
      state.sources.push(source);
      state.selected = { id: source.id, n: 1 };
    }
    clearAudio();
    $("source-dialog").close();
    render();
  };
  $("source-name").oninput = (e) => e.target.setCustomValidity("");
  $("source-dialog").addEventListener("close", () =>
    $("source-name").setCustomValidity(""),
  );
  $("arrange").onclick = (e) => {
    const change = e.target.closest("[data-step]"),
      remove = e.target.closest("[data-remove]");
    if (change) {
      // Apply pending edits before moving the column.
      const ss = sources(),
        idx = ss.findIndex((s) => s.id === editing),
        dest = ss[idx + Number(change.dataset.step)];
      if (!dest || !$("source-form").reportValidity()) return;
      const id = editing;
      $("source-form").requestSubmit();
      if (!$("source-dialog").open) reorder(id, dest.id);
    } else if (remove && state.sources.length > 1) {
      clearAudio();
      state.sources = state.sources.filter((s) => s.id !== editing);
      if (state.selected.id === editing)
        state.selected = { id: state.sources[0].id, n: state.selected.n };
      $("source-dialog").close();
      render();
    }
  };
  $("tuning-form").onsubmit = (e) => {
    e.preventDefault();
    const refs = [...$("systems").querySelectorAll("input:checked")].map(
      (el) => el.value,
    );
    if (!refs.length) {
      const el = $("systems").querySelector("input");
      el.setCustomValidity("Select at least one tuning reference.");
      el.reportValidity();
      return;
    }
    state.systems = refs;
    state.a = Number($("concert").value);
    state.refColumns = $("ref-columns").checked;
    $("tuning-dialog").close();
    render();
  };
  $("systems").onchange = () =>
    $("systems")
      .querySelectorAll("input")
      .forEach((el) => el.setCustomValidity(""));
  document.querySelectorAll("dialog").forEach((d) => {
    d.querySelectorAll(".close,.cancel").forEach(
      (b) => (b.onclick = () => d.close()),
    );
    d.addEventListener("click", (e) => {
      if (e.target === d) {
        const r = d.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          d.close();
      }
    });
  });
  $("limit").onchange = (e) => {
    state.limit = Number(e.target.value);
    state.selected.n = Math.min(state.selected.n, state.limit);
    clearAudio();
    render();
  };
  $("groups").onclick = () => {
    state.grouped = !state.grouped;
    render();
  };
  function switchView(view) {
    state.view = view;
    $("matrix-scroll").scrollTop = 0;
    $("matrix-scroll").scrollLeft = 0;
    render();
  }
  $("by-pitch").onclick = () => switchView("pitch");
  $("by-partial").onclick = () => switchView("partial");
  function chooseClicked(e) {
    const b = e.target.closest("[data-src]");
    if (b) {
      choose(b.dataset.src, Number(b.dataset.n));
      if (e.currentTarget === $("matrix"))
        $("matrix")
          .querySelector('.cell[aria-pressed="true"]')
          ?.focus({ preventScroll: true });
      return;
    }
    const edit = e.target.closest("[data-edit]");
    if (edit) sourceDialog(edit.dataset.edit);
    const ref = e.target.closest("[data-tone]");
    if (ref) play([Number(ref.dataset.tone)]);
  }
  $("matrix").addEventListener("click", chooseClicked);
  $("chart").addEventListener("click", chooseClicked);
  $("legend").onclick = (e) => {
    const b = e.target.closest("[data-legend]");
    if (b) choose(b.dataset.legend, state.selected.n);
  };
  $("inspector").onclick = (e) => {
    if (e.target.closest("#play")) {
      if (playing) clearAudio();
      else play([selectedHz()]);
      return;
    }
    const pair = e.target.closest("[data-pair]");
    if (pair) play([selectedHz(), Number(pair.dataset.pair)], 6);
  };
  let dragId = null;
  $("matrix").ondragstart = (e) => {
    const th = e.target.closest("[data-head]");
    if (!th) return;
    dragId = th.dataset.head;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dragId);
  };
  $("matrix").ondragover = (e) => {
    const th = e.target.closest("[data-head]");
    if (dragId && th) {
      e.preventDefault();
      th.classList.add("dragover");
    }
  };
  $("matrix").ondragleave = (e) =>
    e.target.closest("[data-head]")?.classList.remove("dragover");
  $("matrix").ondrop = (e) => {
    const th = e.target.closest("[data-head]");
    if (!dragId || !th) return;
    e.preventDefault();
    reorder(dragId, th.dataset.head);
    dragId = null;
  };
  $("matrix").ondragend = () => {
    dragId = null;
    $("matrix")
      .querySelectorAll(".dragover")
      .forEach((el) => el.classList.remove("dragover"));
  };
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      clearAudio();
      return;
    }
    if (
      document.querySelector("dialog[open]") ||
      e.ctrlKey ||
      e.altKey ||
      e.metaKey ||
      e.shiftKey ||
      e.target.closest("input,select,textarea,[contenteditable=true]")
    )
      return;
    if (
      e.target.closest("button") &&
      !e.target.closest(".cell[data-src]") &&
      e.code === "Space"
    )
      return;
    let { id, n } = state.selected;
    if (e.key === "ArrowUp") n++;
    else if (e.key === "ArrowDown") n--;
    else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const ss = sources(),
        i = ss.findIndex((s) => s.id === id),
        j = i + (e.key === "ArrowLeft" ? -1 : 1);
      if (!ss[j]) {
        e.preventDefault();
        return;
      }
      id = ss[j].id;
      if (state.view === "pitch")
        n = P.closest(selectedHz(), ss[j], state.limit).n;
    } else if (e.code !== "Space") return;
    e.preventDefault();
    choose(id, n, true);
  });
  window.addEventListener("resize", drawChart);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearAudio();
  });
  render();
})();
