import { DRUM_MAPPING, DrumMapping } from './drumMapping';
import { PIANO_MAPPING, PianoMapping } from './pianoMapping';

export interface ParsedNote {
  note: number;
  duration: number;
  volume: number;
  name: string;
}

export interface ParsedChord {
  notes: number[];  // [] = rest, [n] = single note, [n1,n2,...] = chord
  duration: number;
  volume: number;
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

export function parsePhrase(
  phrase: string,
  baseDuration: number = 1,
  mapping: DrumMapping = DRUM_MAPPING,
  baseVolume: number = 100,
): ParsedNote[] {
  const notes: ParsedNote[] = [];

  let i = 0;
  phrase = stripComments(phrase);

  // コンポーネント側の設定値を初期値として使用
  let currentDuration = baseDuration;
  let currentVolume = baseVolume;

  while (i < phrase.length) {
    const char = phrase[i];

    // ==================================================
    // 音量変更
    //
    // v0   → 以降 0
    // v64  → 以降 64
    // v127 → 以降 127
    // ==================================================
    if (char === 'v') {
      const numMatch = /^\d+/.exec(
        phrase.slice(i + 1)
      );

      if (numMatch) {
        const volume = Number(numMatch[0]);

        currentVolume = Math.max(
          0,
          Math.min(127, volume)
        );

        i += 1 + numMatch[0].length;
        continue;
      }
    }

    // ==================================================
    // 音価変更
    //
    // l4  → 以降を4分音符
    // l8  → 以降を8分音符
    // l16 → 以降を16分音符
    // ==================================================
    if (char === 'l') {
      const numMatch = /^\d+/.exec(
        phrase.slice(i + 1)
      );

      if (numMatch) {
        const denominator = Number(numMatch[0]);

        if (denominator > 0) {
          currentDuration = 4 / denominator;
        }

        i += 1 + numMatch[0].length;
        continue;
      }
    }

    const entry = mapping[char];

    if (!entry) {
      i++;
      continue;
    }

    i++;

    // # で半音上げ
    let noteNum = entry.note;

    if (
      i < phrase.length &&
      phrase[i] === '#' &&
      noteNum !== -1
    ) {
      noteNum += 1;
      i++;
    }

    // そのノートだけの音価指定
    const {
      duration,
      nextI,
    } = parseDurationSuffix(
      phrase,
      i,
      currentDuration
    );

    i = nextI;

    notes.push({
      note: noteNum,
      duration,
      volume: currentVolume,
      name:
        noteNum !== entry.note
          ? entry.name + '#'
          : entry.name,
    });
  }

  return notes;
}

export function parsePianoPhrase(
  phrase: string,
  baseDuration: number = 1,
  mapping: PianoMapping = PIANO_MAPPING,
  octaveShift: number = 0,
  baseVolume: number = 100
): ParsedChord[] {
  const chords: ParsedChord[] = [];

  let i = 0;
  phrase = stripComments(phrase);

  // コンポーネント側の設定値を初期値として使用
  let currentOctaveShift = octaveShift;
  let currentDuration = baseDuration;
  let currentVolume = baseVolume;

  while (i < phrase.length) {
    const char = phrase[i];

    // ==================================================
    // オクターブ変更
    //
    // o5 → 以降を5オクターブ
    // o4 → 以降を4オクターブ
    // ==================================================
    if (
      char === 'o' &&
      i + 1 < phrase.length &&
      /[0-9]/.test(phrase[i + 1])
    ) {
      const octave = Number(phrase[i + 1]);

      currentOctaveShift = octave - 4;

      i += 2;
      continue;
    }

    // ==================================================
    // 音価変更
    //
    // l4  → 以降を4分音符
    // l8  → 以降を8分音符
    // l16 → 以降を16分音符
    // ==================================================
    if (char === 'l') {
      const numMatch = /^\d+/.exec(
        phrase.slice(i + 1)
      );

      if (numMatch) {
        const denominator = Number(numMatch[0]);

        if (denominator > 0) {
          currentDuration = 4 / denominator;
        }

        i += 1 + numMatch[0].length;
        continue;
      }
    }

    // ==================================================
    // 音量変更
    //
    // v0   → 以降 0
    // v64  → 以降 64
    // v127 → 以降 127
    // ==================================================
    if (char === 'v') {
      const numMatch = /^\d+/.exec(
        phrase.slice(i + 1)
      );

      if (numMatch) {
        const volume = Number(numMatch[0]);

        currentVolume = Math.max(
          0,
          Math.min(127, volume)
        );

        i += 1 + numMatch[0].length;
        continue;
      }
    }

    // ==================================================
    // 和音
    // ==================================================
    if (char === '"') {
      i++;

      const notes: number[] = [];

      while (
        i < phrase.length &&
        phrase[i] !== '"'
      ) {
        const noteChar = phrase[i];
        const entry = mapping[noteChar];

        i++;

        if (entry && entry.note !== -1) {
          let noteNum =
            entry.note +
            currentOctaveShift * 12;

          // # で半音上げ
          if (
            i < phrase.length &&
            phrase[i] === '#'
          ) {
            noteNum += 1;
            i++;
          }

          notes.push(noteNum);
        }
      }

      // 閉じる " をスキップ
      if (
        i < phrase.length &&
        phrase[i] === '"'
      ) {
        i++;
      }

      // "ceg"8 のような個別音価
      const {
        duration,
        nextI,
      } = parseDurationSuffix(
        phrase,
        i,
        currentDuration
      );

      i = nextI;

      chords.push({
        notes,
        duration,
        volume: currentVolume,
      });

      continue;
    }

    // ==================================================
    // 通常のノート
    // ==================================================
    const entry = mapping[char];

    if (!entry) {
      i++;
      continue;
    }

    i++;

    let noteNum =
      entry.note === -1
        ? -1
        : entry.note +
          currentOctaveShift * 12;

    // # で半音上げ
    if (
      i < phrase.length &&
      phrase[i] === '#' &&
      noteNum !== -1
    ) {
      noteNum += 1;
      i++;
    }

    // c4 / c8 のような個別音価
    const {
      duration,
      nextI,
    } = parseDurationSuffix(
      phrase,
      i,
      currentDuration
    );

    i = nextI;

    chords.push({
      notes:
        noteNum === -1
          ? []
          : [noteNum],
      duration,
      volume: currentVolume,
    });
  }

  return chords;
}