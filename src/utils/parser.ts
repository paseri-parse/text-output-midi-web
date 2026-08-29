import { DRUM_MAPPING, DrumMapping } from './drumMapping';
import { PIANO_MAPPING, PianoMapping } from './pianoMapping';

export interface ParsedNote {
  note: number;
  duration: number;
  name: string;
}

export interface ParsedChord {
  notes: number[];  // [] = rest, [n] = single note, [n1,n2,...] = chord
  duration: number;
}

// 数字サフィックス: 1=全音符, 2=2分, 4=4分, 8=8分, 16=16分
const NOTE_NUM_RE = /^(16|1|2|4|8)/;

// ブロックコメント（/* ... */）を除去する
function stripComments(phrase: string): string {
  return phrase.replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseDurationSuffix(
  phrase: string,
  i: number,
  baseDuration: number
): { duration: number; nextI: number } {
  let noteBaseUnit = baseDuration;
  const numMatch = NOTE_NUM_RE.exec(phrase.slice(i));
  if (numMatch) {
    noteBaseUnit = 4 / parseInt(numMatch[1]);
    i += numMatch[0].length;
  }

  let dotFactor = 1;
  if (i < phrase.length && phrase[i] === '.') {
    dotFactor = 1.5;
    i++;
  }

  let ties = 0;
  while (i < phrase.length && phrase[i] === 'ー') {
    ties++;
    i++;
  }

  return { duration: noteBaseUnit * (dotFactor + ties), nextI: i };
}

export function parsePhrase(phrase: string, baseDuration: number = 1, mapping: DrumMapping = DRUM_MAPPING): ParsedNote[] {
  const notes: ParsedNote[] = [];
  let i = 0;
  phrase = stripComments(phrase);

  while (i < phrase.length) {
    const char = phrase[i];
    const entry = mapping[char];

    if (!entry) {
      i++;
      continue;
    }
    i++;

    // # で半音上げ
    let noteNum = entry.note;
    if (i < phrase.length && phrase[i] === '#' && noteNum !== -1) {
      noteNum += 1;
      i++;
    }

    const { duration, nextI } = parseDurationSuffix(phrase, i, baseDuration);
    i = nextI;

    notes.push({
      note: noteNum,
      duration,
      name: noteNum !== entry.note ? entry.name + '#' : entry.name,
    });
  }

  return notes;
}

export function parsePianoPhrase(
  phrase: string,
  baseDuration: number = 1,
  mapping: PianoMapping = PIANO_MAPPING,
  octaveShift: number = 0
): ParsedChord[] {
  const chords: ParsedChord[] = [];
  let i = 0;
  phrase = stripComments(phrase);

  // コンポーネントで設定されたオクターブを初期値にする
  let currentOctaveShift = octaveShift;

  while (i < phrase.length) {
    const char = phrase[i];

    // o5 / o4 / o3 ... を検出
    if (
      char === 'o' &&
      i + 1 < phrase.length &&
      /[0-9]/.test(phrase[i + 1])
    ) {
      const octave = Number(phrase[i + 1]);

      // C4を基準にしたオクターブシフト
      currentOctaveShift = octave - 4;

      i += 2;
      continue;
    }

    if (char === '"') {
      // 和音
      i++;

      const notes: number[] = [];

      while (i < phrase.length && phrase[i] !== '"') {
        const entry = mapping[phrase[i]];
        i++;

        if (entry && entry.note !== -1) {
          let noteNum =
            entry.note + currentOctaveShift * 12;

          // # で半音上げ
          if (i < phrase.length && phrase[i] === '#') {
            noteNum += 1;
            i++;
          }

          notes.push(noteNum);
        }
      }

      if (i < phrase.length) {
        i++;
      }

      const { duration, nextI } =
        parseDurationSuffix(
          phrase,
          i,
          baseDuration
        );

      i = nextI;

      chords.push({
        notes,
        duration,
      });

      continue;
    }

    const entry = mapping[char];

    if (!entry) {
      i++;
      continue;
    }

    i++;

    let noteNumP =
      entry.note === -1
        ? -1
        : entry.note + currentOctaveShift * 12;

    // # で半音上げ
    if (
      i < phrase.length &&
      phrase[i] === '#' &&
      noteNumP !== -1
    ) {
      noteNumP += 1;
      i++;
    }

    const { duration, nextI } =
      parseDurationSuffix(
        phrase,
        i,
        baseDuration
      );

    i = nextI;

    chords.push({
      notes: noteNumP === -1 ? [] : [noteNumP],
      duration,
    });
  }

  return chords;
}