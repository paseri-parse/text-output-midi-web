import { start, getTransport, MembraneSynth, NoiseSynth, MetalSynth, PolySynth, Synth } from 'tone';
import { ParsedNote, ParsedChord } from '../utils/parser';

export interface PianoTrackConfig {
  timbre: 'sine' | 'triangle' | 'square' | 'sawtooth';
  volume: number;      // dB
  octaveShift: number; // 整数、-2〜+2
}

export class AudioPlayer {
  private isPlaying = false;
  private kick: PolySynth | null = null;
  private snare: NoiseSynth | null = null;
  private snareBody: PolySynth | null = null;
  private hihatClosed: MetalSynth | null = null;
  private hihatOpen: MetalSynth | null = null;
  private crash: MetalSynth | null = null;
  private pianos: PolySynth<Synth>[] = [];
  private playbackTimeout: ReturnType<typeof setTimeout> | null = null;

  private initSynths(): void {
    // this.kick = new MembraneSynth({
    //   pitchDecay: 0.05,
    //   octaves: 6,
    //   envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
    // // this.kick = new MembraneSynth({
    // //     volume: 0,
    // //     envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
    // }).toDestination();
    this.kick = new PolySynth(MembraneSynth, {
    volume: 0,
    pitchDecay: 0.05,
    octaves: 4,
    envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4 }
  }).toDestination();

    // this.snare = new NoiseSynth({
    //   noise: { type: 'white' },
    //   envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
    // }).toDestination();
    this.snare = new NoiseSynth({
        volume: -2,
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
      }).toDestination();

    // スネアの低域（ドンッという芯の成分）
    this.snareBody = new PolySynth(MembraneSynth, {
      volume: -6,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0 },
      pitchDecay: 0.05,
      octaves: 2
    }).toDestination();

    this.hihatClosed = new MetalSynth({
      envelope: { attack: 0.001, decay: 0.08, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    }).toDestination();
    this.hihatClosed.frequency.value = 400;

    this.hihatOpen = new MetalSynth({
      envelope: { attack: 0.001, decay: 0.4, release: 0.1 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    }).toDestination();
    // this.hihatOpen.frequency.value = 400;
    //   private hihat = new Tone.MetalSynth({
    //     volume: -22,
    //     envelope: { attack: 0.001, decay: 0.05, sustain: 0 },
    //     resonance: 3000
    //   }).toDestination();

    this.crash = new MetalSynth({
      envelope: { attack: 0.001, decay: 1.0, release: 0.3 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    }).toDestination();
    this.crash.frequency.value = 300;

    // pianos は play() 呼び出し時にトラック数分生成する
  }

  private triggerNote(note: number, duration: number, time: number): void {
    switch (note) {
      case 36:
        this.kick?.triggerAttackRelease('C1', duration, time);
        break;
      case 38:
        (this.snare as any)?.triggerAttackRelease(duration, time);
        this.snareBody?.triggerAttackRelease('C1', duration, time);
        break;
      case 42:
        this.hihatClosed?.triggerAttackRelease(400, duration, time);
        break;
      case 46:
        this.hihatOpen?.triggerAttackRelease(400, duration, time);
        break;
      case 49:
        this.crash?.triggerAttackRelease(300, duration, time);
        break;
    }
  }

  public async play(tracks: ParsedNote[][], bpm: number, pianoTracks?: ParsedChord[][], pianoConfigs?: PianoTrackConfig[]): Promise<void> {
    if (this.isPlaying) return;
    this.isPlaying = true;

    await start();

    this.initSynths();

    const transport = getTransport();
    transport.stop();
    transport.cancel();
    transport.bpm.value = bpm;

    const beatSeconds = 60 / bpm;
    let maxDuration = 0;

    for (const track of tracks) {
      let currentTime = 0;
      for (const note of track) {
        const noteDuration = note.duration * beatSeconds;
        if (note.note !== -1) {
          const t = currentTime;
          const n = note.note;
          const d = noteDuration;
          transport.schedule((audioTime) => {
            this.triggerNote(n, d, audioTime);
          }, t);
        }
        currentTime += noteDuration;
        if (currentTime > maxDuration) maxDuration = currentTime;
      }
    }

    if (pianoTracks) {
      // トラック数分 PolySynth を生成
      this.pianos = pianoTracks.map((_, i) => {
        const cfg = pianoConfigs?.[i];
        return new PolySynth(Synth, {
          oscillator: { type: cfg?.timbre ?? 'triangle' },
          volume: cfg?.volume ?? -6,
          envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.8 },
        }).toDestination();
      });

      pianoTracks.forEach((chords, trackIdx) => {
        const octaveShift = pianoConfigs?.[trackIdx]?.octaveShift ?? 0;
        let currentTime = 0;
        for (const chord of chords) {
          const noteDuration = chord.duration * beatSeconds;
          if (chord.notes.length > 0) {
            const t = currentTime;
            const freqs = chord.notes.map(n => 440 * Math.pow(2, (n - 69 + octaveShift * 12) / 12));
            const d = noteDuration;
            const synth = this.pianos[trackIdx];
            transport.schedule((audioTime) => {
              synth?.triggerAttackRelease(freqs, d, audioTime);
            }, t);
          }
          currentTime += noteDuration;
          if (currentTime > maxDuration) maxDuration = currentTime;
        }
      });
    }

    transport.start('+0');

    await new Promise<void>((resolve) => {
      this.playbackTimeout = setTimeout(() => {
        this.cleanup();
        resolve();
      }, maxDuration * 1000 + 500);
    });
  }

  private cleanup(): void {
    if (this.playbackTimeout !== null) {
      clearTimeout(this.playbackTimeout);
      this.playbackTimeout = null;
    }
    const transport = getTransport();
    transport.stop();
    transport.cancel();
    this.kick?.dispose();   this.kick = null;
    this.snare?.dispose();  this.snare = null;
    this.hihatClosed?.dispose(); this.hihatClosed = null;
    this.hihatOpen?.dispose();   this.hihatOpen = null;
    this.crash?.dispose();  this.crash = null;
    this.pianos.forEach(p => p.dispose());
    this.pianos = [];
    this.isPlaying = false;
  }

  public stop(): void {
    this.cleanup();
  }
}