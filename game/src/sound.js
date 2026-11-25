// Tiny WebAudio bleeps, made in code, no sound files. One job: feedback sounds.
let audioContext = null;

export function ensureAudio() {
  try {
    if (!audioContext) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioCtor) audioContext = new AudioCtor();
    }
    if (audioContext && audioContext.state === "suspended") audioContext.resume();
  } catch (err) {
    audioContext = null;
  }
}

export function playTone(frequency, durationSeconds, type, volume) {
  try {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type || "sine";
    oscillator.frequency.value = frequency;
    gain.gain.value = volume || 0.06;
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + durationSeconds);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + durationSeconds);
  } catch (err) {
    // Sound is garnish; a silent game still plays.
  }
}

export function playChopSound() {
  playTone(180, 0.07, "square", 0.05);
}

export function playSizzleSound() {
  playTone(1200, 0.12, "sawtooth", 0.02);
}

export function playServeSound() {
  playTone(660, 0.1, "sine", 0.07);
  setTimeout(() => playTone(880, 0.14, "sine", 0.07), 90);
}

export function playBellSound() {
  playTone(1040, 0.25, "sine", 0.08);
}
