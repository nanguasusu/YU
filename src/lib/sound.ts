import type { SoundType } from '../types';

// Reuse a single AudioContext instance — creating one per sound is expensive
let sharedAudioCtx: AudioContext | null = null;

const getAudioCtx = (): AudioContext | null => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as never as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }
    // Resume if suspended (browser autoplay policy)
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
};

export const playSound = (type: SoundType, muted = false): void => {
  if (muted) return;

  try {
    const audioCtx = getAudioCtx();
    if (!audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const t = audioCtx.currentTime;

    switch (type) {
      case 'complete':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, t);
        oscillator.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
        gainNode.gain.setValueAtTime(0.2, t);
        gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        oscillator.start();
        oscillator.stop(t + 0.1);
        break;
      case 'click':
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(400, t);
        oscillator.frequency.exponentialRampToValueAtTime(200, t + 0.05);
        gainNode.gain.setValueAtTime(0.1, t);
        gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        oscillator.start();
        oscillator.stop(t + 0.05);
        break;
      case 'minimize':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, t);
        oscillator.frequency.exponentialRampToValueAtTime(300, t + 0.15);
        gainNode.gain.setValueAtTime(0.1, t);
        gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        oscillator.start();
        oscillator.stop(t + 0.15);
        break;
      case 'unminimize':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(300, t);
        oscillator.frequency.exponentialRampToValueAtTime(600, t + 0.15);
        gainNode.gain.setValueAtTime(0.1, t);
        gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        oscillator.start();
        oscillator.stop(t + 0.15);
        break;
      case 'pop':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, t);
        oscillator.frequency.exponentialRampToValueAtTime(800, t + 0.05);
        gainNode.gain.setValueAtTime(0.1, t);
        gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        oscillator.start();
        oscillator.stop(t + 0.05);
        break;
    }
  } catch {
    // Ignore audio errors.
  }
};
