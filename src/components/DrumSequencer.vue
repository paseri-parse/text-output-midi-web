<script setup lang="ts">
import { ref, computed } from 'vue'
import { parsePhrase } from '../utils/parser'
import { NOTE_DURATIONS } from '../utils/drumMapping'
import { generateMIDI, downloadMIDI } from '../services/midiGenerator'
import { AudioPlayer } from '../services/audioPlayer'

const bassSnarePhrase = ref('どったんどどたん')
const cymbalPhrase = ref('ぱっちっちっしー')
const bpm = ref(120)
const baseDuration = ref('1/4')
const isPlaying = ref(false)

let audioPlayer: AudioPlayer | null = null

const parsedNotes = computed(() => {
  const duration = NOTE_DURATIONS[baseDuration.value as keyof typeof NOTE_DURATIONS]
  const bassSnareNotes = parsePhrase(bassSnarePhrase.value, duration)
  const cymbalNotes = parsePhrase(cymbalPhrase.value, duration)
  return [...bassSnareNotes, ...cymbalNotes]
})

const play = async () => {
  isPlaying.value = true
  try {
    audioPlayer = new AudioPlayer()
    const duration = NOTE_DURATIONS[baseDuration.value as keyof typeof NOTE_DURATIONS]
    await audioPlayer.play(parsedNotes.value, bpm.value, duration)
  } catch (error) {
    console.error('Playback error:', error)
  } finally {
    isPlaying.value = false
  }
}

const downloadMIDIFile = () => {
  const midiData = generateMIDI(parsedNotes.value, bpm.value)
  const now = new Date()
  const filename = `drum_${now.getHours()}_${now.getMinutes()}_${now.getSeconds()}.mid`
  downloadMIDI(midiData, filename)
}

const stop = () => {
  if (audioPlayer) {
    audioPlayer.stop()
  }
  isPlaying.value = false
}
</script>

<template>
  <div class="container">
    <h1>🥁 ドラムシーケンサー</h1>
    
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
        ど = バスドラム(36) | た = スネア(38) | っ = 休符
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
        ぱ = クラッシュ(49) | ち = クローズハイハット(42) | し = オープンハイハット(46)
      </div>
    </div>

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
        <button @click="downloadMIDIFile">⬇ MIDIダウンロード</button>
      </div>
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
</style>