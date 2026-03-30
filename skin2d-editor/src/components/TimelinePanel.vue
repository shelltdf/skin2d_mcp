<template>
  <footer class="timeline">
    <div class="tl-head">
      <button type="button" class="play" disabled title="即将推出">▶</button>
      <button type="button" class="play" disabled title="即将推出">⏸</button>
      <span class="label">时间轴</span>
    </div>
    <div class="tl-track">
      <div class="ruler" />
      <p class="placeholder">关键帧与曲线编辑将在后续版本提供。</p>
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
}

.play {
  width: 32px;
  height: 28px;
  border: 1px solid var(--win-border-strong);
  border-radius: var(--win-radius-sm);
  background: var(--win-surface);
  font-size: 12px;
  opacity: 0.5;
}

.label {
  font-size: 12px;
  font-weight: 600;
  color: var(--win-text-secondary);
  letter-spacing: 0.04em;
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

.placeholder {
  margin: 0;
  font-size: 12px;
  color: var(--win-text-secondary);
}
</style>
