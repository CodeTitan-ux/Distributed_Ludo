class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.muted = false;
  }

  init() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playTone(freq, type, duration, vol = 0.1, slideFreq = null) {
    if (this.muted) return;
    this.init();
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = type;
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      if (slideFreq) {
        osc.frequency.exponentialRampToValueAtTime(slideFreq, this.audioCtx.currentTime + duration);
      }
      
      gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
      
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch(err) {
      console.warn('Audio play failed', err);
    }
  }

  playRoll() {
    if (this.muted) return;
    for(let i = 0; i < 6; i++) {
        setTimeout(() => this.playTone(600 + Math.random() * 400, 'square', 0.05, 0.03), i * 50);
    }
  }

  playHop() {
    // short pop
    this.playTone(400, 'sine', 0.1, 0.05, 800);
  }

  playCapture() {
    // descending harsh tone
    this.playTone(300, 'sawtooth', 0.4, 0.1, 50);
  }

  playWin() {
    if (this.muted) return;
    const notes = [440, 554.37, 659.25, 880]; // A Major ARP
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.3, 0.1), i * 150);
    });
  }
}

export const soundEngine = new SoundEngine();
