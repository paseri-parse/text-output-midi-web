import { DRUM_MAPPING } from './drumMapping';

export interface ParsedNote {
  note: number;
  duration: number;
  name: string;
}

export function parsePhrase(phrase: string, baseDuration: number = 1): ParsedNote[] {
  const notes: ParsedNote[] = [];
  let i = 0;

  while (i < phrase.length) {
    const char = phrase[i];
    
    if (!DRUM_MAPPING[char as keyof typeof DRUM_MAPPING]) {
      i++;
      continue;
    }

    const mapping = DRUM_MAPPING[char as keyof typeof DRUM_MAPPING];
    let duration = baseDuration;

    let j = i + 1;
    while (j < phrase.length && phrase[j] === char) {
      duration += baseDuration;
      j++;
    }

    notes.push({
      note: mapping.note,
      duration: duration * (baseDuration < 1 ? 1 : baseDuration),
      name: mapping.name
    });

    i = j;
  }

  return notes;
}