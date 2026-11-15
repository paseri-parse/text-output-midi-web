<script setup lang="ts">
import { ref } from 'vue'
import DrumSequencer from './components/DrumSequencer.vue'
import PianoPage from './components/PianoPage.vue'

type Tab = 'sequencer' | 'piano'
const activeTab = ref<Tab>('sequencer')
const pianoInitialized = ref(false)

const selectTab = (tab: Tab) => {
  activeTab.value = tab
  if (tab === 'piano') pianoInitialized.value = true
}
</script>

<template>
  <div id="app">
    <nav class="app-tabs" aria-label="画面切り替え">
      <button
        :class="{ active: activeTab === 'sequencer' }"
        :aria-current="activeTab === 'sequencer' ? 'page' : undefined"
        @click="selectTab('sequencer')"
      >テキストシーケンサー</button>
      <button
        :class="{ active: activeTab === 'piano' }"
        :aria-current="activeTab === 'piano' ? 'page' : undefined"
        @click="selectTab('piano')"
      >ピアノ鍵盤</button>
    </nav>

    <div v-show="activeTab === 'sequencer'">
      <DrumSequencer />
    </div>
    <PianoPage v-if="pianoInitialized" v-show="activeTab === 'piano'" />
  </div>
</template>

<style scoped>
#app {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px 20px;
  min-height: 100vh;
}

.app-tabs {
  display: flex;
  gap: 8px;
  padding: 16px 0;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.app-tabs button {
  flex: 0 0 auto;
  min-width: 0;
  padding: 8px 16px;
  font-size: 14px;
}

.app-tabs button.active {
  background-color: #6b3467;
}

@media (max-width: 480px) {
  #app {
    padding-right: 10px;
    padding-left: 10px;
  }

  .app-tabs button {
    flex: 1;
    padding-right: 8px;
    padding-left: 8px;
    font-size: 13px;
  }
}
</style>