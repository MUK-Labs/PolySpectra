"use strict";
globalThis.AtlasMIDI = (() => {
  // MIDI note numbers always use A4 = 440 Hz, independently of the workspace.
  function encode(frequency, range) {
    if (
      !(
        Number.isFinite(frequency) &&
        frequency > 0 &&
        Number.isInteger(range) &&
        range >= 1 &&
        range <= 96
      )
    )
      return null;
    const pitch = 69 + 12 * Math.log2(frequency / 440);
    // At a half step prefer the lower key and bend up.
    const note = Math.max(0, Math.min(127, Math.ceil(pitch - 0.5 - 1e-10)));
    const shift = (pitch - note) / range;
    if (Math.abs(shift) > 1 + 1e-10) return null;
    const bend = Math.max(
      0,
      Math.min(16383, 8192 + Math.round(shift * (shift < 0 ? 8192 : 8191))),
    );
    return { note, bend };
  }
  class Output {
    constructor() {
      this.port = null;
      this.range = 2;
      this.active = new Map();
      this.configured = new Set();
    }
    route(port, range) {
      this.stop();
      this.port = port;
      this.range = range;
      this.configured.clear();
    }
    release(channel) {
      const note = this.active.get(channel);
      if (note === undefined) return;
      this.active.delete(channel);
      this.port.send([0x80 + channel - 1, note, 0]);
      this.port.send([0xe0 + channel - 1, 0, 64]);
    }
    stop() {
      for (const channel of this.active.keys()) {
        try {
          this.release(channel);
        } catch {
          /* Port disconnected. */
        }
      }
    }
    start(channel, frequency, velocity = 88) {
      if (
        !this.port ||
        !Number.isInteger(channel) ||
        channel < 1 ||
        channel > 16
      )
        return false;
      const data = encode(frequency, this.range);
      if (!data) return false;
      const ch = channel - 1;
      this.release(channel);
      if (!this.configured.has(channel)) {
        for (const [cc, value] of [
          [101, 0],
          [100, 0],
          [6, this.range],
          [38, 0],
          [101, 127],
          [100, 127],
        ])
          this.port.send([0xb0 + ch, cc, value]);
        this.configured.add(channel);
      }
      this.port.send([0xe0 + ch, data.bend & 127, data.bend >> 7]);
      this.port.send([0x90 + ch, data.note, velocity]);
      this.active.set(channel, data.note);
      return true;
    }
  }
  class Input {
    constructor(trigger) {
      this.trigger = trigger;
      this.active = new Map();
    }
    release(id) {
      const held = this.active.get(id);
      if (!held) return;
      this.active.delete(id);
      held.stop();
    }
    stop() {
      for (const id of this.active.keys()) this.release(id);
    }
    receive(data, sources, limit) {
      if (!data || data.length !== 3) return;
      const [status, key, velocity] = data;
      const channel = (status & 15) + 1, type = status & 0xf0;
      const panic = type === 0xb0 && (key === 120 || key === 123);
      if (panic || type === 0x80 || (type === 0x90 && velocity === 0)) {
        for (const [id, held] of this.active)
          if (held.channel === channel && (panic || held.key === key))
            this.release(id);
        return;
      }
      if (type !== 0x90) return;
      for (const source of sources) {
        if ((source.inputChannel ?? source.channel) !== channel) continue;
        const n = key - (source.baseKey ?? 60) + 1;
        if (n < 1 || n > limit) continue;
        this.release(source.id);
        const stop = this.trigger(source, n, velocity);
        this.active.set(source.id, { channel, key, stop });
      }
    }
  }
  return { encode, Output, Input };
})();
