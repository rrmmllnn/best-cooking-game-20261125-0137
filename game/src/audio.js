// All sound is synthesised with the Web Audio API: short oscillator blips and a filtered noise
// burst for the grill, so the game ships no audio files and works fully offline. Everything is
// guarded, so a browser with no audio (or a blocked context) plays silently instead of crashing.

export function createSfx() {
  let context = null;
  let sizzle = null;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return context;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      return null;
    }
    return context;
  }

  function blip(frequency, seconds, type, volume, when = 0) {
    const audio = ensure();
    if (!audio) return;
    try {
      const start = audio.currentTime + when;
      const voice = audio.createOscillator();
      const gain = audio.createGain();
      voice.type = type;
      voice.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
      voice.connect(gain).connect(audio.destination);
      voice.start(start);
      voice.stop(start + seconds + 0.02);
    } catch {
      // Sound is garnish; a failure here must never stop the game.
    }
  }

  /** A short burst of filtered noise: the patty hitting the hot grill. */
  function hiss(seconds) {
    const audio = ensure();
    if (!audio) return;
    try {
      const length = Math.floor(audio.sampleRate * seconds);
      const buffer = audio.createBuffer(1, length, audio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
      const source = audio.createBufferSource();
      source.buffer = buffer;
      const filter = audio.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 4200;
      const gain = audio.createGain();
      gain.gain.value = 0.12;
      source.connect(filter).connect(gain).connect(audio.destination);
      source.start();
    } catch {
      // Silence is fine.
    }
  }

  return {
    /** Call on the first pointer or key press: browsers only allow audio after a gesture. */
    unlock() {
      ensure();
    },
    click() {
      blip(660, 0.06, 'triangle', 0.08);
    },
    add() {
      blip(520, 0.07, 'sine', 0.1);
      blip(780, 0.08, 'sine', 0.07, 0.05);
    },
    grill() {
      hiss(0.35);
      blip(180, 0.12, 'sawtooth', 0.05);
    },
    ready() {
      blip(880, 0.09, 'sine', 0.09);
      blip(1174, 0.12, 'sine', 0.09, 0.08);
    },
    serve() {
      blip(523, 0.1, 'triangle', 0.12);
      blip(659, 0.1, 'triangle', 0.12, 0.09);
      blip(784, 0.18, 'triangle', 0.12, 0.18);
    },
    wrong() {
      blip(220, 0.16, 'square', 0.07);
      blip(175, 0.2, 'square', 0.07, 0.12);
    },
    burn() {
      blip(140, 0.25, 'sawtooth', 0.08);
    },
    over() {
      blip(392, 0.14, 'triangle', 0.1);
      blip(523, 0.14, 'triangle', 0.1, 0.13);
      blip(659, 0.22, 'triangle', 0.1, 0.26);
    },
    /** Keep a soft sizzle node alive while any patty cooks; call with false to stop it. */
    setSizzle(on) {
      const audio = ensure();
      if (!audio) return;
      try {
        if (on && !sizzle) {
          const length = audio.sampleRate;
          const buffer = audio.createBuffer(1, length, audio.sampleRate);
          const data = buffer.getChannelData(0);
          for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
          const source = audio.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          const filter = audio.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.value = 5200;
          const gain = audio.createGain();
          gain.gain.value = 0.02;
          source.connect(filter).connect(gain).connect(audio.destination);
          source.start();
          sizzle = { source, gain };
        } else if (!on && sizzle) {
          sizzle.source.stop();
          sizzle = null;
        }
      } catch {
        sizzle = null;
      }
    },
  };
}
