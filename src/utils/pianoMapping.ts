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
};
