import { ParsedNote } from '../utils/parser';

class MIDIBuilder {
  private data: number[] = [];

  private encodeVariableLength(value: number): number[] {
    const result = [];
    result.push(value & 0x7f);
    value >>= 7;
    
    while (value > 0) {
      result.push((value & 0x7f) | 0x80);
      value >>= 7;
    }
    
    return result.reverse();
  }

  public createTrack(notes: ParsedNote[], bpm: number, ppq: number = 480): number[] {
    const trackData: number[] = [];
    const ticksPerQuarterNote = ppq;
    const ticksPerBeat = ticksPerQuarterNote;
    
    const microsecondsPerBeat = Math.round(60000000 / bpm);
    trackData.push(0x00, 0xFF, 0x51, 0x03);
    trackData.push((microsecondsPerBeat >> 16) & 0xFF);
    trackData.push((microsecondsPerBeat >> 8) & 0xFF);
    trackData.push(microsecondsPerBeat & 0xFF);

    let currentTick = 0;

    for (const note of notes) {
      const noteTicks = Math.round(note.duration * ticksPerBeat);

      if (note.note !== -1) {
        trackData.push(...this.encodeVariableLength(0));
        trackData.push(0x99, note.note, 100);
      } else {
        trackData.push(...this.encodeVariableLength(0));
        trackData.push(0xB9, 0x00, 0x00);
      }

      currentTick += noteTicks;

      if (note.note !== -1) {
        trackData.push(...this.encodeVariableLength(noteTicks));
        trackData.push(0x89, note.note, 0);
      } else {
        trackData.push(...this.encodeVariableLength(noteTicks));
      }
    }

    trackData.push(0x00, 0xFF, 0x2F, 0x00);

    return trackData;
  }

  public createMIDIFile(notes: ParsedNote[], bpm: number): Uint8Array {
    const trackData = this.createTrack(notes, bpm);
    const trackLength = trackData.length;

    const midiData: number[] = [];

    midiData.push(...'MThd'.split('').map(c => c.charCodeAt(0)));
    midiData.push(0x00, 0x00, 0x00, 0x06);
    midiData.push(0x00, 0x00);
    midiData.push(0x00, 0x01);
    midiData.push(0x01, 0xE0);

    midiData.push(...'MTrk'.split('').map(c => c.charCodeAt(0)));
    midiData.push(
      (trackLength >> 24) & 0xFF,
      (trackLength >> 16) & 0xFF,
      (trackLength >> 8) & 0xFF,
      trackLength & 0xFF
    );
    midiData.push(...trackData);

    return new Uint8Array(midiData);
  }
}

export function generateMIDI(notes: ParsedNote[], bpm: number): Uint8Array {
  const builder = new MIDIBuilder();
  return builder.createMIDIFile(notes, bpm);
}

export function downloadMIDI(data: Uint8Array, filename: string = 'drums.mid'): void {
  const blob = new Blob([data], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}