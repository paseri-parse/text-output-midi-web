import { DrumMappingEntry, DrumMapping } from './drumMapping';

export type PianoMappingEntry = DrumMappingEntry;
export type PianoMapping = DrumMapping;

export const PIANO_MAPPING: PianoMapping = {
  'c': { note: 60, name: 'C4', volume: 100 },
  'd': { note: 62, name: 'D4', volume: 100 },
  'e': { note: 64, name: 'E4', volume: 100 },
  'f': { note: 65, name: 'F4', volume: 100 },
  'g': { note: 67, name: 'G4', volume: 100 },
  'a': { note: 69, name: 'A4', volume: 100 },
  'b': { note: 71, name: 'B4', volume: 100 },
  'n': { note: -1, name: 'Rest', volume: 0 },
  'ド': { note: 60, name: 'C4', volume: 100 },
  'レ': { note: 62, name: 'D4', volume: 100 },
  'ミ': { note: 64, name: 'E4', volume: 100 },
  'ファ': { note: 65, name: 'F4', volume: 100 },
  'ソ': { note: 67, name: 'G4', volume: 100 },
  'ラ': { note: 69, name: 'A4', volume: 100 },
  'シ': { note: 71, name: 'B4', volume: 100 },
  'ッ': { note: -1, name: 'Rest', volume: 0 },
  'ン': { note: -1, name: 'Rest', volume: 0 },
  'ど': { note: 60, name: 'C4', volume: 100 },
  'れ': { note: 62, name: 'D4', volume: 100 },
  'み': { note: 64, name: 'E4', volume: 100 },
  'ふぁ': { note: 65, name: 'F4', volume: 100 },
  'そ': { note: 67, name: 'G4', volume: 100 },
  'ら': { note: 69, name: 'A4', volume: 100 },
  'し': { note: 71, name: 'B4', volume: 100 },
  'っ': { note: -1, name: 'Rest', volume: 0 },
  'ん': { note: -1, name: 'Rest', volume: 0 },
};
