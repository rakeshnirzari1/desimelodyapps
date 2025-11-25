// Audio Wake Lock Manager
// Keeps audio playing even when screen is locked

export class AudioWakeLock {
  private wakeLock: any = null;
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  async request() {
    try {
      // Request wake lock if supported
      if ('wakeLock' in navigator) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('Wake Lock activated');
      }

      // Create silent audio context to keep session alive
      this.createSilentAudio();
    } catch (err) {
      console.error('Wake lock request failed:', err);
    }
  }

  private createSilentAudio() {
    try {
      // Create audio context (this keeps the audio session alive)
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create oscillator (silent tone generator)
      this.oscillator = this.audioContext.createOscillator();
      this.gainNode = this.audioContext.createGain();
      
      // Set volume to near-zero (inaudible)
      this.gainNode.gain.value = 0.001;
      
      // Connect oscillator -> gain -> destination
      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
      
      // Start the oscillator (creates continuous silent audio)
      this.oscillator.start();
      
      console.log('Silent audio context created');
    } catch (err) {
      console.error('Failed to create silent audio:', err);
    }
  }

  async release() {
    try {
      // Stop oscillator
      if (this.oscillator) {
        this.oscillator.stop();
        this.oscillator.disconnect();
        this.oscillator = null;
      }

      // Close audio context
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }

      // Release wake lock
      if (this.wakeLock) {
        await this.wakeLock.release();
        this.wakeLock = null;
        console.log('Wake Lock released');
      }
    } catch (err) {
      console.error('Wake lock release failed:', err);
    }
  }

  async reacquire() {
    // Reacquire if visibility changes
    if (document.visibilityState === 'visible') {
      await this.request();
    }
  }
}

// Singleton instance
export const audioWakeLock = new AudioWakeLock();
