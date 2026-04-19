import { ParsedNote, ParsedChord } from '../utils/parser';

const PPQ = 480;

function encodeVariableLength(value: number): number[] {
  const result: number[] = [];
  result.push(value & 0x7f);
  value >>= 7;
  while (value > 0) {
    result.push((value & 0x7f) | 0x80);
    value >>= 7;
  }
  return result.reverse();
}

interface MidiEvent {
  tick: number;
  data: number[];
}

function buildTempoTrack(bpm: number): number[] {
  const us = Math.round(60_000_000 / bpm);
  return [
    0x00, 0xFF, 0x51, 0x03,
    (us >> 16) & 0xFF, (us >> 8) & 0xFF, us & 0xFF,
    0x00, 0xFF, 0x2F, 0x00,
  ];
}

function eventsToTrackData(events: MidiEvent[]): number[] {
  events.sort((a, b) => a.tick - b.tick);
  const data: number[] = [];
  let lastTick = 0;
  for (const ev of events) {
    data.push(...encodeVariableLength(ev.tick - lastTick));
    data.push(...ev.data);
    lastTick = ev.tick;
  }
  data.push(0x00, 0xFF, 0x2F, 0x00);
  return data;
}

/** ドラムトラック: 複数フレーズを絶対時刻でマージしてチャンネル10 (0x09) に出力 */
function buildDrumTrack(tracks: ParsedNote[][]): number[] {
  const events: MidiEvent[] = [];
  for (const track of tracks) {
    let tick = 0;
    for (const note of track) {
      const ticks = Math.round(note.duration * PPQ);
      if (note.note !== -1) {
        events.push({ tick,          data: [0x99, note.note, 100] });
        events.push({ tick: tick + ticks, data: [0x89, note.note, 0] });
      }
      tick += ticks;
    }
  }
  return eventsToTrackData(events);
}

/** ピアノトラック: 和音をMIDIイベントに変換、チャンネル番号は 0-indexed */
function buildPianoTrack(chords: ParsedChord[], channel: number): number[] {
  const ch = channel & 0x0F;
  const events: MidiEvent[] = [];
  let tick = 0;
  for (const chord of chords) {
    const ticks = Math.round(chord.duration * PPQ);
    for (const note of chord.notes) {
      events.push({ tick,          data: [0x90 | ch, note, 100] });
      events.push({ tick: tick + ticks, data: [0x80 | ch, note, 0] });
    }
    tick += ticks;
  }
  return eventsToTrackData(events);
}

function assembleMIDI(tracks: number[][]): Uint8Array {
  const header: number[] = [
    ...'MThd'.split('').map(c => c.charCodeAt(0)),
    0x00, 0x00, 0x00, 0x06,
    0x00, 0x01,                              // format 1
    (tracks.length >> 8) & 0xFF, tracks.length & 0xFF,
    (PPQ >> 8) & 0xFF, PPQ & 0xFF,
  ];
  const body: number[] = [];
  for (const track of tracks) {
    body.push(...'MTrk'.split('').map(c => c.charCodeAt(0)));
    body.push(
      (track.length >> 24) & 0xFF,
      (track.length >> 16) & 0xFF,
      (track.length >> 8)  & 0xFF,
      track.length & 0xFF,
    );
    body.push(...track);
  }
  return new Uint8Array([...header, ...body]);
}

/** ドラムのみ MIDI */
export function generateDrumMIDI(drumTracks: ParsedNote[][], bpm: number): Uint8Array {
  return assembleMIDI([buildTempoTrack(bpm), buildDrumTrack(drumTracks)]);
}

/** 単一ピアノチャンネル MIDI */
export function generatePianoMIDI(chords: ParsedChord[], bpm: number, channel: number = 0): Uint8Array {
  return assembleMIDI([buildTempoTrack(bpm), buildPianoTrack(chords, channel)]);
}

/** 全トラックまとめた MIDI (ドラム + 複数ピアノ) */
export function generateCombinedMIDI(
  drumTracks: ParsedNote[][],
  pianoTracks: ParsedChord[][],
  bpm: number,
): Uint8Array {
  const tracks: number[][] = [buildTempoTrack(bpm), buildDrumTrack(drumTracks)];
  pianoTracks.forEach((chords, i) => tracks.push(buildPianoTrack(chords, i)));
  return assembleMIDI(tracks);
}

export function downloadMIDI(data: Uint8Array, filename: string = 'output.mid'): void {
  const blob = new Blob([data.buffer as ArrayBuffer], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// 後方互換: 旧 generateMIDI (ドラム flatten 版)
export function generateMIDI(notes: ParsedNote[], bpm: number): Uint8Array {
  return generateDrumMIDI([notes], bpm);
}
