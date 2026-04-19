export interface DrumMappingEntry {
  note: number;
  name: string;
}

export type DrumMapping = Record<string, DrumMappingEntry>;

export const DRUM_MAPPING: DrumMapping = {
  'ど': { note: 36, name: 'Bass Drum' },
  'た': { note: 38, name: 'Snare' },
  'ぱ': { note: 49, name: 'Crash Cymbal' },
  'ち': { note: 42, name: 'Closed Hi-Hat' },
  'し': { note: 46, name: 'Open Hi-Hat' },
  'っ': { note: -1, name: 'Rest' },
  'ん': { note: -1, name: 'Rest' }
};

export const NOTE_DURATIONS = {
  '1/16': 0.25,
  '1/8': 0.5,
  '1/4': 1.0,
  '1/2': 2.0,
  '全': 4.0
} as const; // as const を付けることでリテラル型になります

// キーの型を抽出
export type NoteDurationKey = keyof typeof NOTE_DURATIONS;

export const DRUM_CHANNEL = 10;
export const VELOCITY = 100;