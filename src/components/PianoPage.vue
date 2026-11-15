<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'

const START_MIDI = 36
const END_MIDI = 72
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const BLACK_SET = new Set([1, 3, 6, 8, 10])
const BLACK_OFFSET_IN_OCT = { 1: 0.65, 3: 1.65, 6: 3.65, 8: 4.65, 10: 5.65 }

const buildKeys = () => {
  let whiteCount = 0
  const whites = []
  const blacks = []

  for (let midi = START_MIDI; midi <= END_MIDI; midi++) {
    const semitone = midi % 12
    const octave = Math.floor(midi / 12) - 1
    const relativeOctave = Math.floor((midi - START_MIDI) / 12)
    const label = NOTE_NAMES[semitone] + octave

    if (BLACK_SET.has(semitone)) {
      blacks.push({
        midi,
        leftOffset: relativeOctave * 7 + BLACK_OFFSET_IN_OCT[semitone],
        label,
      })
    } else {
      whites.push({ midi, label, isC: semitone === 0 })
      whiteCount++
    }
  }
  return { whites, blacks, totalWhiteKeys: whiteCount }
}

const { whites, blacks, totalWhiteKeys } = buildKeys()
const whiteKeyWidth = 100 / totalWhiteKeys
const blackKeyWidth = whiteKeyWidth * 0.62
const pressed = reactive({})

const blackKeyStyle = (key) => ({
  left: `${(key.leftOffset * whiteKeyWidth - blackKeyWidth / 2).toFixed(3)}%`,
  width: `${blackKeyWidth.toFixed(3)}%`,
})

let audioCtx = null
let midiAccess = null
let midiOutputs = []
const activeNodes = new Map()
const midiStatus = ref('')

const getAudioContext = () => {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

const startAudio = (midi) => {
  const context = getAudioContext()
  if (context.state === 'suspended') void context.resume()
  if (activeNodes.has(midi)) return

  const frequency = 440 * Math.pow(2, (midi - 69) / 12)
  const now = context.currentTime
  const master = context.createGain()
  master.gain.setValueAtTime(0, now)
  master.gain.linearRampToValueAtTime(0.45, now + 0.006)
  master.gain.exponentialRampToValueAtTime(0.22, now + 0.09)
  master.connect(context.destination)

  const oscillators = [[1, 0.6], [2, 0.22], [3, 0.09], [4, 0.04]].map(([harmonic, volume]) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency * harmonic
    gain.gain.value = volume
    oscillator.connect(gain)
    gain.connect(master)
    oscillator.start(now)
    return oscillator
  })

  activeNodes.set(midi, { oscillators, master })
}

const stopAudio = (midi) => {
  const node = activeNodes.get(midi)
  if (!node) return

  const now = getAudioContext().currentTime
  node.master.gain.cancelScheduledValues(now)
  node.master.gain.setValueAtTime(node.master.gain.value, now)
  node.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
  node.oscillators.forEach(oscillator => oscillator.stop(now + 0.35))
  activeNodes.delete(midi)
}

const refreshOutputs = () => {
  if (!midiAccess) return
  midiOutputs = [...midiAccess.outputs.values()]
  midiStatus.value = midiOutputs.length
    ? midiOutputs.map(output => output.name).join(' / ')
    : 'デバイスなし'
}

const playNote = (midi) => {
  if (pressed[midi]) return
  pressed[midi] = true
  startAudio(midi)
  midiOutputs.forEach(output => output.send([0x90, midi, 100]))
}

const stopNote = (midi) => {
  if (!pressed[midi]) return
  delete pressed[midi]
  stopAudio(midi)
  midiOutputs.forEach(output => output.send([0x80, midi, 0]))
}

const onPointerDown = (midi, event) => {
  event.preventDefault()
  playNote(midi)
}
const onPointerUp = (midi, event) => {
  event.preventDefault()
  stopNote(midi)
}
const onPointerLeave = (midi) => stopNote(midi)
const onPointerEnter = (midi, event) => {
  if (event.buttons > 0) playNote(midi)
}
const onWindowPointerUp = () => Object.keys(pressed).forEach(midi => stopNote(Number(midi)))

onMounted(async () => {
  window.addEventListener('pointerup', onWindowPointerUp)
  if (!navigator.requestMIDIAccess) {
    midiStatus.value = 'Web MIDI 非対応'
    return
  }
  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false })
    midiAccess.onstatechange = refreshOutputs
    refreshOutputs()
  } catch (error) {
    midiStatus.value = 'アクセス拒否'
    console.warn('[Piano] MIDI access denied:', error)
  }
})

onUnmounted(() => {
  window.removeEventListener('pointerup', onWindowPointerUp)
  Object.keys(pressed).forEach(midi => stopNote(Number(midi)))
  void audioCtx?.close()
  audioCtx = null
})
</script>

<template>
  <div class="piano-page">
    <div class="piano-info">
      <span class="info-range">C2 – C5 &nbsp;·&nbsp; 37鍵</span>
      <span class="info-midi">MIDI OUT: {{ midiStatus || '—' }}</span>
    </div>

    <div class="piano-wrap">
      <div class="piano-keys">
        <div
          v-for="key in whites"
          :key="key.midi"
          class="key white-key"
          :class="{ pressed: pressed[key.midi] }"
          @pointerdown="onPointerDown(key.midi, $event)"
          @pointerup="onPointerUp(key.midi, $event)"
          @pointerleave="onPointerLeave(key.midi)"
          @pointerenter="onPointerEnter(key.midi, $event)"
        >
          <span v-if="key.isC" class="key-label">{{ key.label }}</span>
        </div>

        <div
          v-for="key in blacks"
          :key="key.midi"
          class="key black-key"
          :class="{ pressed: pressed[key.midi] }"
          :style="blackKeyStyle(key)"
          @pointerdown="onPointerDown(key.midi, $event)"
          @pointerup="onPointerUp(key.midi, $event)"
          @pointerleave="onPointerLeave(key.midi)"
          @pointerenter="onPointerEnter(key.midi, $event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.piano-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 110px);
  min-height: 320px;
  background: #111;
  color: #fff;
  font-family: 'DM Mono', monospace;
}

.piano-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
  font-size: 11px;
}

.info-range { color: rgba(255, 255, 255, 0.38); }
.info-midi { color: rgba(255, 255, 255, 0.5); }

.piano-wrap {
  flex: 1;
  display: flex;
  align-items: stretch;
  padding: 36px 28px 52px;
  min-height: 0;
}

.piano-keys {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
}

.key {
  touch-action: none;
  user-select: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.white-key {
  flex: 1;
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  margin-right: 1.5px;
  padding-bottom: 8px;
  background: #ede9e0;
  border: 1px solid #999;
  border-top: none;
  border-radius: 0 0 5px 5px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.4);
  transition: background 0.05s;
}

.white-key:last-child { margin-right: 0; }
.white-key.pressed { background: #b8d0f0; }

.black-key {
  position: absolute;
  top: 0;
  z-index: 2;
  height: 61%;
  background: #1c1c1c;
  border: 1px solid #000;
  border-top: none;
  border-radius: 0 0 4px 4px;
  box-shadow: 2px 5px 10px rgba(0, 0, 0, 0.65);
  transition: background 0.05s;
}

.black-key.pressed { background: #2a4e80; }
.key-label { font-size: 9px; color: rgba(0, 0, 0, 0.45); pointer-events: none; }

@media (max-width: 600px) {
  .piano-wrap { padding: 24px 8px 32px; }
  .piano-info { padding-right: 10px; padding-left: 10px; }
}
</style>