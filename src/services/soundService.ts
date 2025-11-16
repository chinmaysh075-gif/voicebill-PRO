class SoundService {
  private audioContext: AudioContext | null = null;
  private enabled = true;

  constructor() {
    // Initialize audio context only when needed
    this.initAudioContext();
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Audio context not supported:', error);
    }
  }

  private async playTone(frequency: number, duration: number, volume: number = 0.1) {
    if (!this.enabled || !this.audioContext) return;

    try {
      // Resume audio context if suspended (required by browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (error) {
      console.warn('Error playing sound:', error);
    }
  }

  // Success sound - ascending notes
  async playSuccess() {
    if (!this.enabled) return;
    await this.playTone(523, 0.1); // C5
    setTimeout(() => this.playTone(659, 0.1), 100); // E5
    setTimeout(() => this.playTone(784, 0.2), 200); // G5
  }

  // Error sound - descending notes
  async playError() {
    if (!this.enabled) return;
    await this.playTone(400, 0.15); // Lower tone
    setTimeout(() => this.playTone(300, 0.2), 150); // Even lower
  }

  // Item added sound - single pleasant tone
  async playItemAdded() {
    if (!this.enabled) return;
    await this.playTone(800, 0.1, 0.08);
  }

  // Voice listening start
  async playListeningStart() {
    if (!this.enabled) return;
    await this.playTone(600, 0.1, 0.06);
  }

  // Voice listening stop
  async playListeningStop() {
    if (!this.enabled) return;
    await this.playTone(400, 0.1, 0.06);
  }

  // Button click sound
  async playClick() {
    if (!this.enabled) return;
    await this.playTone(1000, 0.05, 0.05);
  }

  // Checkout complete sound - celebration
  async playCheckoutComplete() {
    if (!this.enabled) return;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    for (let i = 0; i < notes.length; i++) {
      setTimeout(() => this.playTone(notes[i], 0.15, 0.08), i * 100);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const soundService = new SoundService();