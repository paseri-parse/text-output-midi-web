import { DrumMappingEntry, DrumMapping } from './drumMapping';

export type PianoMappingEntry = DrumMappingEntry;
export type PianoMapping = DrumMapping;

export const PIANO_MAPPING: PianoMapping = {
  'ド': { note: 60, name: 'C4' },
  'レ': { note: 62, name: 'D4' },
  'ミ': { note: 64, name: 'E4' },
  'フ': { note: 65, name: 'F4' },
  'ソ': { note: 67, name: 'G4' },
  'ラ': { note: 69, name: 'A4' },
  'シ': { note: 71, name: 'B4' },
  'ン': { note: -1, name: 'Rest' },
};
