<script setup lang="ts">
import { ref, computed } from 'vue'
import { parsePhrase, parsePianoPhrase } from '../utils/parser'
import { NOTE_DURATIONS, DRUM_MAPPING, DrumMapping } from '../utils/drumMapping'
import { PIANO_MAPPING, PianoMapping } from '../utils/pianoMapping'
import { generateDrumMIDI, generatePianoMIDI, generateCombinedMIDI, downloadMIDI } from '../services/midiGenerator'
import { AudioPlayer, PianoTrackConfig } from '../services/audioPlayer'

const bassSnarePhrase = ref('どったんどどたん')
const cymbalPhrase = ref('ぱっちっちっしー')
const bpm = ref(160)
const baseDuration = ref('1/8')
const isPlaying = ref(false)

const drumMapping = ref<DrumMapping>(JSON.parse(JSON.stringify(DRUM_MAPPING)))

const mappingRows = computed(() =>
  Object.entries(drumMapping.value).map(([char, entry]) => ({ char, ...entry }))
)

const addMappingRow = () => {
  drumMapping.value[''] = { note: 0, name: '' }
}

const updateMappingChar = (oldChar: string, newChar: string) => {
  if (oldChar === newChar || newChar === '') return
  if (drumMapping.value[newChar]) return // 重複禁止
  const entry = drumMapping.value[oldChar]
  delete drumMapping.value[oldChar]
  drumMapping.value[newChar] = entry
}

const removeMappingRow = (char: string) => {
  delete drumMapping.value[char]
}

const resetMapping = () => {
  drumMapping.value = JSON.parse(JSON.stringify(DRUM_MAPPING))
}

// --- ピアノチャンネル ---
interface PianoChannel {
  id: number
  name: string
  phrase: string
  timbre: 'sine' | 'triangle' | 'square' | 'sawtooth'
  volume: number
  octaveShift: number
}
let _nextChannelId = 1
const pianoChannels = ref<PianoChannel[]>([
  {
    id: _nextChannelId++,
    name: 'ピアノ Ch.1', phrase: 'cde o5cde',
    timbre: 'triangle',
    volume: 100,
    octaveShift: 0
  }
])

const addPianoChannel = () => {
  const id = _nextChannelId++
  pianoChannels.value.push({ id, name: `ピアノ Ch.${id}`, phrase: '', timbre: 'triangle', volume: -6, octaveShift: 0 })
}

const removePianoChannel = (id: number) => {
  if (pianoChannels.value.length <= 1) return
  pianoChannels.value = pianoChannels.value.filter(c => c.id !== id)
}
const pianoMapping = ref<PianoMapping>(JSON.parse(JSON.stringify(PIANO_MAPPING)))

const pianoMappingRows = computed(() =>
  Object.entries(pianoMapping.value).map(([char, entry]) => ({ char, ...entry }))
)

const addPianoMappingRow = () => {
  pianoMapping.value[''] = { note: 60, name: '' }
}

const updatePianoMappingChar = (oldChar: string, newChar: string) => {
  if (oldChar === newChar || newChar === '') return
  if (pianoMapping.value[newChar]) return
  const entry = pianoMapping.value[oldChar]
  delete pianoMapping.value[oldChar]
  pianoMapping.value[newChar] = entry
}

const removePianoMappingRow = (char: string) => {
  delete pianoMapping.value[char]
}

const resetPianoMapping = () => {
  pianoMapping.value = JSON.parse(JSON.stringify(PIANO_MAPPING))
}

let audioPlayer: AudioPlayer | null = null

const parsedNotes = computed(() => {
  const duration = NOTE_DURATIONS[baseDuration.value as keyof typeof NOTE_DURATIONS]
  const bassSnareNotes = parsePhrase(bassSnarePhrase.value, duration, drumMapping.value)
  const cymbalNotes = parsePhrase(
    cymbalPhrase.value,
    duration,
    drumMapping.value,
  )
  return [...bassSnareNotes, ...cymbalNotes]
})

const parsedPianoTracks = computed(() => {
  const duration =
    NOTE_DURATIONS[
      baseDuration.value as keyof typeof NOTE_DURATIONS
    ]

  return pianoChannels.value.map(ch =>
    parsePianoPhrase(
      ch.phrase,
      duration,
      pianoMapping.value,
      ch.octaveShift,
      ch.volume,
    )
  )
})

const play = async () => {
  isPlaying.value = true
  try {
    audioPlayer = new AudioPlayer()
    const duration = NOTE_DURATIONS[baseDuration.value as keyof typeof NOTE_DURATIONS]
    const bassSnareNotes = parsePhrase(bassSnarePhrase.value, duration, drumMapping.value)
    const cymbalNotes = parsePhrase(cymbalPhrase.value, duration, drumMapping.value)
    const pianoTracks = parsedPianoTracks.value
    const pianoConfigs: PianoTrackConfig[] = pianoChannels.value.map(ch => ({
      timbre: ch.timbre,
      volume: ch.volume,
      octaveShift: ch.octaveShift,
    }))
    await audioPlayer.play([bassSnareNotes, cymbalNotes], bpm.value, pianoTracks, pianoConfigs)
  } catch (error) {
    console.error('Playback error:', error)
  } finally {
    isPlaying.value = false
  }
}

const timestamp = () => {
  const now = new Date()
  return `${now.getHours()}_${now.getMinutes()}_${now.getSeconds()}`
}

const downloadDrumMIDI = () => {
  const duration = NOTE_DURATIONS[baseDuration.value as keyof typeof NOTE_DURATIONS]
  const bassSnareNotes = parsePhrase(bassSnarePhrase.value, duration, drumMapping.value)
  const cymbalNotes = parsePhrase(cymbalPhrase.value, duration, drumMapping.value)
  const data = generateDrumMIDI([bassSnareNotes, cymbalNotes], bpm.value)
  downloadMIDI(data, `drum_${timestamp()}.mid`)
}

const downloadPianoMIDI = (idx: number) => {
  const chords = parsedPianoTracks.value[idx]
  const data = generatePianoMIDI(chords, bpm.value, idx)
  const name = pianoChannels.value[idx]?.name ?? `piano_ch${idx + 1}`
  downloadMIDI(data, `${name}_${timestamp()}.mid`)
}

const downloadCombinedMIDI = () => {
  const duration = NOTE_DURATIONS[baseDuration.value as keyof typeof NOTE_DURATIONS]
  const bassSnareNotes = parsePhrase(bassSnarePhrase.value, duration, drumMapping.value)
  const cymbalNotes = parsePhrase(cymbalPhrase.value, duration, drumMapping.value)
  const data = generateCombinedMIDI([bassSnareNotes, cymbalNotes], parsedPianoTracks.value, bpm.value)
  downloadMIDI(data, `all_tracks_${timestamp()}.mid`)
}

const stop = () => {
  if (audioPlayer) {
    audioPlayer.stop()
  }
  isPlaying.value = false
}

// --- JSON バックアップ ---
const jsonText = ref('')
const jsonImportError = ref('')

const exportJSON = () => {
  jsonImportError.value = ''
  jsonText.value = JSON.stringify({
    bassSnarePhrase: bassSnarePhrase.value,
    cymbalPhrase: cymbalPhrase.value,
    bpm: bpm.value,
    baseDuration: baseDuration.value,
    drumMapping: drumMapping.value,
    pianoChannels: pianoChannels.value,
    pianoMapping: pianoMapping.value,
  }, null, 2)
}

const importJSON = () => {
  jsonImportError.value = ''
  try {
    const data = JSON.parse(jsonText.value)
    if (data.bassSnarePhrase !== undefined) bassSnarePhrase.value = data.bassSnarePhrase
    if (data.cymbalPhrase !== undefined) cymbalPhrase.value = data.cymbalPhrase
    if (data.bpm !== undefined) bpm.value = data.bpm
    if (data.baseDuration !== undefined) baseDuration.value = data.baseDuration
    if (data.drumMapping !== undefined) drumMapping.value = data.drumMapping
    if (data.pianoChannels !== undefined) pianoChannels.value = data.pianoChannels
    if (data.pianoMapping !== undefined) pianoMapping.value = data.pianoMapping
  } catch {
    jsonImportError.value = 'JSONの形式が正しくありません'
  }
}
</script>

<template>
  <div class="container">
    <h1>🥁 テキストシーケンサー</h1>

    <div class="section">
      <h2>設定</h2>
      <div class="control-group">
        <div>
          <label for="bpm">BPM:</label>
          <input
            id="bpm"
            v-model.number="bpm"
            type="range"
            min="40"
            max="300"
            step="1"
          />
          <span>{{ bpm }}</span>
        </div>

        <div>
          <label for="duration">基本音符長:</label>
          <select id="duration" v-model="baseDuration">
            <option value="1/16">1/16</option>
            <option value="1/8">1/8</option>
            <option value="1/4">1/4</option>
            <option value="1/2">1/2</option>
            <option value="全">全音符</option>
          </select>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>操作</h2>
      <div class="buttons">
        <button @click="play" :disabled="isPlaying">▶ 再生</button>
        <button @click="stop" :disabled="!isPlaying">⏹ 停止</button>
        <button @click="downloadDrumMIDI">⬇ ドラム MIDI</button>
        <button @click="downloadCombinedMIDI">⬇ 全トラック MIDI</button>
      </div>
    </div>

    <div class="section">
      <h2>バスドラム・スネア</h2>
      <label for="bass-snare">フレーズ入力:</label>
      <textarea
        id="bass-snare"
        v-model="bassSnarePhrase"
        placeholder="例: どったんどどたん"
        rows="3"
      />
      <div class="help-text">
        ど = バスドラム(36) | た = スネア(38) | っ = 休符<br>
        <small>音符長: ど8=8分音符 ど4=4分 ど2=2分 ど1=全音符 | 付点: ど8. | 延長: どー(2倍) どーー(3倍)</small>
      </div>
    </div>

    <div class="section">
      <h2>シンバル</h2>
      <label for="cymbal">フレーズ入力:</label>
      <textarea
        id="cymbal"
        v-model="cymbalPhrase"
        placeholder="例: ぱっちっちっしー"
        rows="3"
      />
      <div class="help-text">
        ぱ = クラッシュ(49) | ち = クローズハイハット(42) | し = オープンハイハット(46)<br>
        <small>音符長: し8=8分音符 | 付点: し8. | 延長: しー(2倍)</small>
      </div>
    </div>

    <div class="section">
      <h2>ドラムマッピング設定</h2>
      <table class="mapping-table">
        <thead>
          <tr>
            <th>文字</th>
            <th>MIDIノート番号</th>
            <th>名前</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in mappingRows" :key="row.char">
            <td>
              <input
                class="mapping-input char-input"
                :value="row.char"
                maxlength="1"
                @change="updateMappingChar(row.char, ($event.target as HTMLInputElement).value)"
              />
            </td>
            <td>
              <input
                class="mapping-input"
                type="number"
                v-model.number="drumMapping[row.char].note"
                min="-1"
                max="127"
              />
            </td>
            <td>
              <input
                class="mapping-input"
                type="text"
                v-model="drumMapping[row.char].name"
              />
            </td>
            <td>
              <button class="delete-btn" @click="removeMappingRow(row.char)">✕</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="mapping-actions">
        <button @click="addMappingRow">+ 追加</button>
        <button @click="resetMapping">リセット</button>
      </div>
      <div class="help-text">MIDIノート番号 -1 = 休符</div>
    </div>

    <div class="section">
      <div class="piano-header">
        <h2>ピアノ</h2>
        <button class="add-channel-btn" @click="addPianoChannel">+ チャンネル追加</button>
      </div>

      <div v-for="(ch, idx) in pianoChannels" :key="ch.id" class="piano-channel">
        <div class="piano-channel-header">
          <input class="channel-name-input" v-model="ch.name" />
          <button
            class="delete-btn"
            @click="removePianoChannel(ch.id)"
            :disabled="pianoChannels.length <= 1"
          >✕</button>
        </div>
        <div class="piano-channel-controls">
          <label>
            音色
            <select v-model="ch.timbre">
              <option value="triangle">トライアングル波</option>
              <option value="sine">サイン波</option>
              <option value="square">矩形波</option>
              <option value="sawtooth">のこぎり波</option>
            </select>
          </label>
          <label>
            音量 ({{ ch.volume }})
            <input
              type="range"
              v-model.number="ch.volume"
              min="0"
              max="127"
              step="1"
            />
          </label>
          <label>
            オクターブ ({{ ch.octaveShift >= 0 ? '+' : '' }}{{ ch.octaveShift }})
            <input type="range" v-model.number="ch.octaveShift" min="-3" max="3" step="1" />
          </label>
        </div>
        <textarea
          v-model="ch.phrase"
          :placeholder='`例: ドミソ"ドミソ"4ラシ`'
          rows="2"
        />
        <div class="help-text">
          ド=C4 レ=D4 ミ=E4 フ=F4 ソ=G4 ラ=A4 シ=B4 ン=休符 |
          <small>"ドミソ" で和音 | 音符長・付点・延長はドラムと同じ記法</small>
          <button class="inline-dl-btn" @click="downloadPianoMIDI(idx)">⬇ MIDI</button>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>ピアノ音符マッピング設定</h2>
      <table class="mapping-table">
        <thead>
          <tr>
            <th>文字</th>
            <th>MIDIノート番号</th>
            <th>名前</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in pianoMappingRows" :key="row.char">
            <td>
              <input
                class="mapping-input char-input"
                :value="row.char"
                maxlength="1"
                @change="updatePianoMappingChar(row.char, ($event.target as HTMLInputElement).value)"
              />
            </td>
            <td>
              <input
                class="mapping-input"
                type="number"
                v-model.number="pianoMapping[row.char].note"
                min="-1"
                max="127"
              />
            </td>
            <td>
              <input
                class="mapping-input"
                type="text"
                v-model="pianoMapping[row.char].name"
              />
            </td>
            <td>
              <button class="delete-btn" @click="removePianoMappingRow(row.char)">✕</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="mapping-actions">
        <button @click="addPianoMappingRow">+ 追加</button>
        <button @click="resetPianoMapping">リセット</button>
      </div>
      <div class="help-text">MIDIノート番号 -1 = 休符</div>
    </div>

    <div class="preview">
      <h3>プレビュー</h3>
      <p>総ノート数: {{ parsedNotes.length }}</p>
      <div class="notes-list">
        <div v-for="(note, index) in parsedNotes.slice(0, 10)" :key="index" class="note-item">
          {{ note.name }} ({{ note.duration }})
        </div>
        <div v-if="parsedNotes.length > 10" class="note-item">...</div>
      </div>
    </div>

    <div class="syntax-ref">
      <h3>フレーズ入力の書き方</h3>
      <table class="syntax-table">
        <thead>
          <tr><th>記法</th><th>意味</th><th>duration（4分=1拍基準）</th></tr>
        </thead>
        <tbody>
          <tr><td><code>ど</code></td><td>基本音符長（UIで選択）</td><td>baseDuration</td></tr>
          <tr><td><code>ど16</code></td><td>16分音符</td><td>0.25</td></tr>
          <tr><td><code>ど8</code></td><td>8分音符</td><td>0.5</td></tr>
          <tr><td><code>ど4</code></td><td>4分音符</td><td>1</td></tr>
          <tr><td><code>ど2</code></td><td>2分音符</td><td>2</td></tr>
          <tr><td><code>ど1</code></td><td>全音符</td><td>4</td></tr>
          <tr><td><code>ど.</code></td><td>付点（基本音符長 × 1.5）</td><td>baseDuration × 1.5</td></tr>
          <tr><td><code>ど8.</code></td><td>付点8分音符</td><td>0.75</td></tr>
          <tr><td><code>どー</code></td><td>延長（タイ）× 2</td><td>baseDuration × 2</td></tr>
          <tr><td><code>どーー</code></td><td>延長 × 3</td><td>baseDuration × 3</td></tr>
          <tr><td><code>ど8ー</code></td><td>8分音符タイ</td><td>1</td></tr>
          <tr><td><code>ど8.ー</code></td><td>付点8分 + タイ</td><td>1.25</td></tr>
          <tr><td><code>っ</code></td><td>休符（baseDuration 分）</td><td>baseDuration（無音）</td></tr>
          <tr><td><code>ド#</code></td><td>半音上げ（ドラム・ピアノ共通）</td><td>同上</td></tr>
          <tr><td><code>"ドミ#ソ"</code></td><td>和音内でも有効</td><td>同上</td></tr>
          <tr><td><code>"ドミソ"</code></td><td>和音（ピアノ）</td><td>baseDuration</td></tr>
          <tr><td><code>"ドミソ"4</code></td><td>和音 + 音符長指定</td><td>1（4分音符）</td></tr>
        </tbody>
      </table>
      <p class="syntax-note">数字・付点・延長（ー）は組み合わせ可能。ー は直前のノートの音符単位を基準に延長します。<code>#</code> は音符文字の直後に書き、数字・付点・延長より前に置く必要があります。</p>
    </div>

    <div class="section">
      <h2>JSON バックアップ</h2>
      <div class="json-actions">
        <button @click="exportJSON">▲ エクスポート</button>
        <button @click="importJSON">▼ インポート</button>
      </div>
      <p v-if="jsonImportError" class="json-error">{{ jsonImportError }}</p>
      <textarea
        v-model="jsonText"
        class="json-textarea"
        rows="10"
        placeholder="エクスポートするか、JSONをここに貼り付けてインポート..."
      />
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #8B4789;
}

h2 {
  font-size: 1.2em;
  margin-bottom: 10px;
  color: #6b3467;
}

.section {
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.section:last-of-type {
  border-bottom: none;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}

textarea,
input[type="range"],
select {
  width: 100%;
  margin-bottom: 10px;
}

textarea {
  font-family: 'Courier New', monospace;
  resize: vertical;
}

.help-text {
  font-size: 0.9em;
  color: #666;
  margin-top: 8px;
}

.control-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.control-group div {
  display: flex;
  flex-direction: column;
}

.control-group span {
  margin-top: 8px;
  font-weight: 600;
  color: #8B4789;
}

.buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

button {
  flex: 1;
  min-width: 150px;
  padding: 12px 20px;
  font-size: 16px;
  background-color: #8B4789;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

button:hover:not(:disabled) {
  background-color: #6b3467;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.preview {
  background-color: #f9f9f9;
  padding: 15px;
  border-radius: 4px;
  margin-top: 20px;
}

.preview h3 {
  margin-bottom: 10px;
  color: #6b3467;
}

.notes-list {
  max-height: 200px;
  overflow-y: auto;
  font-size: 0.9em;
}

.note-item {
  padding: 5px 0;
  color: #555;
}

.mapping-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 10px;
  font-size: 0.9em;
}

.mapping-table th {
  text-align: left;
  padding: 6px 8px;
  background: #f0e8f0;
  color: #6b3467;
  font-weight: 600;
}

.mapping-table td {
  padding: 4px 6px;
  border-bottom: 1px solid #eee;
}

.mapping-input {
  width: 100%;
  padding: 4px 6px;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-size: 0.9em;
  box-sizing: border-box;
}

.char-input {
  width: 3em;
  text-align: center;
}

.delete-btn {
  min-width: unset;
  flex: unset;
  padding: 4px 8px;
  font-size: 12px;
  background-color: #c0392b;
}

.delete-btn:hover:not(:disabled) {
  background-color: #922b21;
}

.mapping-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.mapping-actions button {
  min-width: unset;
  flex: unset;
  padding: 6px 14px;
  font-size: 13px;
}

.syntax-ref {
  margin-top: 24px;
  padding: 16px;
  background: #f5f0f5;
  border-radius: 6px;
}

.syntax-ref h3 {
  margin-bottom: 12px;
  color: #6b3467;
}

.syntax-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88em;
}

.syntax-table th {
  text-align: left;
  padding: 6px 10px;
  background: #e8d8e8;
  color: #6b3467;
}

.syntax-table td {
  padding: 5px 10px;
  border-bottom: 1px solid #e0d0e0;
}

.syntax-table tr:last-child td {
  border-bottom: none;
}

.syntax-table code {
  font-family: 'Courier New', monospace;
  background: #fff;
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid #ccc;
}

.syntax-note {
  margin-top: 10px;
  font-size: 0.85em;
  color: #666;
}

.piano-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.piano-header h2 {
  margin-bottom: 0;
}

.add-channel-btn {
  min-width: unset;
  flex: unset;
  padding: 5px 12px;
  font-size: 13px;
}

.piano-channel {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 10px;
}

.piano-channel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.channel-name-input {
  flex: 1;
  padding: 4px 8px;
  font-size: 0.9em;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-weight: 600;
  color: #6b3467;
}

.piano-channel textarea {
  width: 100%;
  font-family: 'Courier New', monospace;
  resize: vertical;
  box-sizing: border-box;
}

.piano-channel-controls {
  display: grid;
  grid-template-columns: auto 1fr 1fr;
  gap: 8px 16px;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.85em;
}

.piano-channel-controls label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-weight: 600;
  color: #555;
  margin-bottom: 0;
}

.piano-channel-controls select,
.piano-channel-controls input[type="range"] {
  width: 100%;
  margin-bottom: 0;
}

.inline-dl-btn {
  min-width: unset;
  flex: unset;
  padding: 2px 8px;
  font-size: 11px;
  margin-left: 8px;
  display: inline-block;
}

.json-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.json-actions button {
  min-width: unset;
  flex: unset;
  padding: 6px 16px;
  font-size: 13px;
}

.json-textarea {
  width: 100%;
  font-family: 'Courier New', monospace;
  font-size: 0.82em;
  resize: vertical;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px;
}

.json-error {
  color: #c0392b;
  font-size: 0.9em;
  margin: 4px 0;
}
</style>