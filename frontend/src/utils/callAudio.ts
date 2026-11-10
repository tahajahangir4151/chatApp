// Synthesized audio alerts for audio/video calling using Web Audio API

let audioCtx: AudioContext | null = null;
let ringtoneInterval: any = null;
let activeOscillators: OscillatorNode[] = [];

const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

export const stopRingtone = () => {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  activeOscillators.forEach((osc) => {
    try {
      osc.stop();
      osc.disconnect();
    } catch (e) {
      // already stopped
    }
  });
  activeOscillators = [];
};

/**
 * Starts standard outgoing phone dial tone (ringback: 440Hz + 480Hz, 2s on, 3s off)
 */
export const startOutgoingRingtone = () => {
  stopRingtone();
  const ctx = getAudioContext();
  if (!ctx) return;

  const playBurst = () => {
    try {
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(440, now);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gain.gain.setValueAtTime(0.08, now + 1.8);
      gain.gain.linearRampToValueAtTime(0, now + 2.0);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 2.0);
      osc2.stop(now + 2.0);

      activeOscillators.push(osc1, osc2);
    } catch (e) {
      console.warn("AudioContext play error:", e);
    }
  };

  playBurst();
  ringtoneInterval = setInterval(playBurst, 4500);
};

/**
 * Starts modern melodic incoming call chime (repeating cheerful sequence)
 */
export const startIncomingRingtone = () => {
  stopRingtone();
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [
    { freq: 659.25, time: 0.0, dur: 0.18 }, // E5
    { freq: 830.61, time: 0.2, dur: 0.18 }, // G#5
    { freq: 987.77, time: 0.4, dur: 0.22 }, // B5
    { freq: 1318.51, time: 0.65, dur: 0.35 }, // E6
    { freq: 987.77, time: 1.1, dur: 0.2 }, // B5
    { freq: 1318.51, time: 1.35, dur: 0.45 }, // E6
  ];

  const playSequence = () => {
    try {
      const now = ctx.currentTime;

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(note.freq, now + note.time);

        gain.gain.setValueAtTime(0, now + note.time);
        gain.gain.linearRampToValueAtTime(0.12, now + note.time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.time);
        osc.stop(now + note.time + note.dur);
        activeOscillators.push(osc);
      });
    } catch (e) {
      console.warn("Incoming chime error:", e);
    }
  };

  playSequence();
  ringtoneInterval = setInterval(playSequence, 2800);
};

/**
 * Short positive ding when call connects
 */
export const playCallConnectedSound = () => {
  stopRingtone();
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.18); // E5

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {}
};

/**
 * Short descending tone when call ends
 */
export const playCallEndedSound = () => {
  stopRingtone();
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.exponentialRampToValueAtTime(329.63, now + 0.22); // E4

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {}
};

/**
 * Busy signal beeps
 */
export const playCallBusySound = () => {
  stopRingtone();
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    [0, 0.4, 0.8].forEach((offset) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(480, now + offset);
      osc2.frequency.setValueAtTime(620, now + offset);

      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.08, now + offset + 0.02);
      gain.gain.linearRampToValueAtTime(0, now + offset + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now + offset);
      osc2.start(now + offset);
      osc1.stop(now + offset + 0.25);
      osc2.stop(now + offset + 0.25);
    });
  } catch (e) {}
};
