import { ParsedNote } from '../utils/parser';

export class AudioPlayer {
  private context: AudioContext;
  private isPlaying = false;

  constructor() {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  private playDrumSound(note: number, duration: number, time: number): void {
    if (note === -1) return;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.connect(gain);
    gain.connect(this.context.destination);

    const frequency = this.noteToFrequency(note);
    osc.frequency.setValueAtTime(frequency, time);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration * 0.1);
    gain.gain.setValueAtTime(0.01, time + duration * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.start(time);
    osc.stop(time + duration);
  }

  private noteToFrequency(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  public async play(notes: ParsedNote[], bpm: number, baseDuration: number = 1): Promise<void> {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    const beatDuration = 60 / bpm;
    let currentTime = this.context.currentTime;

    for (const note of notes) {
      const noteDuration = note.duration * beatDuration * baseDuration;
      this.playDrumSound(note.note, noteDuration, currentTime);
      currentTime += noteDuration;
    }

    await new Promise(resolve => setTimeout(resolve, (currentTime - this.context.currentTime) * 1000));
    
    this.isPlaying = false;
  }

  public stop(): void {
    this.context.close();
  }
}