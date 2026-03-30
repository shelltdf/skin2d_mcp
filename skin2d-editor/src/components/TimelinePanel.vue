<script setup lang="ts">
import { computed } from 'vue'
import { useSpineRuntimeStore } from '../stores/spineRuntime'

const spine = useSpineRuntimeStore()

const hasSpine = computed(() => spine.ready)

function onAnimChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value
  if (v) spine.setAnimation(v, true)
}
</script>

<template>
  <footer class="timeline">
    <div class="tl-head">
      <button
        type="button"
        class="play"
        :disabled="!hasSpine"
        :title="hasSpine ? (spine.playing ? '暂停' : '播放') : '需导入 Spine 多文件包'"
        @click="spine.togglePlay()"
      >
        {{ spine.playing ? '⏸' : '▶' }}
      </button>
      <label v-if="hasSpine && spine.animationNames.length" class="anim-label">
        <span class="anim-caption">动画</span>
        <select class="anim-select" :value="spine.currentAnimation ?? ''" @change="onAnimChange">
          <option v-for="n in spine.animationNames" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>
      <span class="label">时间轴</span>
    </div>
    <div class="tl-track">
      <div class="ruler" />
      <p v-if="hasSpine" class="hint">
        Spine 由视口帧循环驱动；若有动画可切换并播放/暂停。关键帧编辑后续版本提供。
      </p>
      <p v-else class="placeholder">导入 Spine（JSON + .atlas + 贴图多选）后可在此选择动画并播放/暂停。</p>
    </div>
  </footer>
</template>

<style scoped>
.timeline {
  flex-shrink: 0;
  height: 148px;
  background: var(--win-surface-alt);
  border-top: 1px solid var(--win-border);
  display: flex;
  flex-direction: column;
}

.tl-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--win-border);
  flex-wrap: wrap;
}

.play {
  width: 32px;
  height: 28px;
  border: 1px solid var(--win-border-strong);
  border-radius: var(--win-radius-sm);
  background: var(--win-surface);
  font-size: 12px;
  cursor: pointer;
}

.play:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.anim-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--win-text-secondary);
}

.anim-caption {
  flex-shrink: 0;
}

.anim-select {
  min-width: 140px;
  max-width: 240px;
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid var(--win-border-strong);
  border-radius: var(--win-radius-sm);
  background: var(--win-surface);
}

.label {
  font-size: 12px;
  font-weight: 600;
  color: var(--win-text-secondary);
  letter-spacing: 0.04em;
  margin-left: auto;
}

.tl-track {
  flex: 1;
  position: relative;
  padding: 12px;
}

.ruler {
  height: 24px;
  border-radius: 4px;
  background: repeating-linear-gradient(
    90deg,
    var(--win-border) 0,
    var(--win-border) 1px,
    transparent 1px,
    transparent 40px
  );
  opacity: 0.35;
  margin-bottom: 8px;
}

.placeholder,
.hint {
  margin: 0;
  font-size: 12px;
  color: var(--win-text-secondary);
}
</style>
