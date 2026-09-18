let midiOutput: MIDIOutput | null = null;

export async function connectToIac(): Promise<void> {
  if (!navigator.requestMIDIAccess) {
    throw new Error('このブラウザはWeb MIDI APIに対応していません');
  }

  const midiAccess = await navigator.requestMIDIAccess();
  midiOutput = Array.from(midiAccess.outputs.values()).find(output => {
    const name = output.name ?? '';
    return name.includes('IAC') || name.includes('loopMIDI');
  }) ?? null;

  if (!midiOutput) {
    throw new Error('IAC DriverまたはloopMIDIの出力ポートが見つかりません');
  }
}

export function sendNoteOn(
  pitch: number,
  velocity = 100,
  channel = 0,
  timestamp?: number,
): void {
  midiOutput?.send([
    0x90 | (channel & 0x0f),
    Math.max(0, Math.min(127, pitch)),
    Math.max(0, Math.min(127, velocity)),
  ], timestamp);
}

export function sendNoteOff(
  pitch: number,
  channel = 0,
  timestamp?: number,
): void {
  midiOutput?.send([
    0x80 | (channel & 0x0f),
    Math.max(0, Math.min(127, pitch)),
    0,
  ], timestamp);
}

export function disconnectIac(): void {
  midiOutput = null;
}