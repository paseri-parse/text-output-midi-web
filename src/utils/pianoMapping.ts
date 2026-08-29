import { DrumMappingEntry, DrumMapping } from './drumMapping';

export type PianoMappingEntry = DrumMappingEntry;
export type PianoMapping = DrumMapping;

export const PIANO_MAPPING: PianoMapping = {
  'c': { note: 60, name: 'C4' },
  'd': { note: 62, name: 'D4' },
  'e': { note: 64, name: 'E4' },
  'f': { note: 65, name: 'F4' },
  'g': { note: 67, name: 'G4' },
  'a': { note: 69, name: 'A4' },
  'b': { note: 71, name: 'B4' },
  'n': { note: -1, name: 'Rest' },
};
