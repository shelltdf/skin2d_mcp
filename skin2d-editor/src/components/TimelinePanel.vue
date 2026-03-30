<script setup lang="ts">
import { computed, ref } from 'vue'
import { MixBlend, MixDirection, Physics, Skeleton } from '@esotericsoftware/spine-core'
import { useSpineRuntimeStore } from '../stores/spineRuntime'
import { useHierarchySelectionStore } from '../stores/hierarchySelection'
import { useUiSettingsStore } from '../stores/uiSettings'

const spine = useSpineRuntimeStore()
const hierarchy = useHierarchySelectionStore()
const ui = useUiSettingsStore()
const t = ui.t

const hasSpine = computed(() => spine.ready)
const duration = computed(() => spine.currentDuration)
const time = computed(() => spine.currentTime)
const progress = computed(() => {
  const d = duration.value || 0
  if (d <= 0) return 0
  return Math.max(0, Math.min(1, time.value / d))
})

function fmt(v: number) {
  if (!Number.isFinite(v)) return '0.00'
  return v.toFixed(2)
}

function onAnimChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value
  if (v) spine.setAnimation(v, true)
}

function onSeek(e: MouseEvent) {
  if (!hasSpine.value) return
  const d = duration.value || 0
  if (d <= 0) return
  const el = e.currentTarget as HTMLDivElement
  const r = el.getBoundingClientRect()
  const x = Math.max(0, Math.min(1, (e.clientX - r.left) / Math.max(1, r.width)))
  spine.seek(x * d)
}

const isScrubbing = ref(false)
let scrubPointerId = -1

function scrubAtEvent(e: PointerEvent) {
  if (!hasSpine.value) return
  const d = duration.value || 0
  if (d <= 0) return
  const el = e.currentTarget as HTMLDivElement
  const r = el.getBoundingClientRect()
  const x = Math.max(0, Math.min(1, (e.clientX - r.left) / Math.max(1, r.width)))
  spine.seek(x * d)
}

function onTrackPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  if (!hasSpine.value) return
  e.preventDefault()
  // 拖动寻帧：自动暂停播放，方便精确定位
  if (spine.playing) spine.togglePlay()
  isScrubbing.value = true
  scrubPointerId = e.pointerId
  ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
  scrubAtEvent(e)
}

function onTrackPointerMove(e: PointerEvent) {
  if (!isScrubbing.value || e.pointerId !== scrubPointerId) return
  scrubAtEvent(e)
}

function onTrackPointerUp(e: PointerEvent) {
  if (!isScrubbing.value || e.pointerId !== scrubPointerId) return
  isScrubbing.value = false
  scrubPointerId = -1
  try {
    ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
}

type TimelineTab = 'dope' | 'curves'
const tab = ref<TimelineTab>('curves')

type DopeRow = {
  id: string
  label: string
  kind: 'bone' | 'slot' | 'other'
  targetName: string
  times: number[]
}

function getFrameTimeAny(tl: any, frameIndex: number): number {
  const entries = typeof tl.getFrameEntries === 'function' ? tl.getFrameEntries() : 1
  const frames: ArrayLike<number> | undefined = tl.frames
  if (!frames) return 0
  return Number(frames[frameIndex * entries] ?? 0)
}

const dopeRows = computed<DopeRow[]>(() => {
  const b = spine.bundle
  const animName = spine.currentAnimation
  if (!spine.ready || !b || !animName) return []
  const anim = b.skeletonData.findAnimation(animName)
  if (!anim) return []

  const out: DopeRow[] = []
  const pushRow = (row: DopeRow) => {
    // 去重并排序
    row.times = [...new Set(row.times.filter((x) => Number.isFinite(x)))].sort((a, c) => a - c)
    out.push(row)
  }

  for (const tl of anim.timelines as any[]) {
    const frameCount = typeof tl.getFrameCount === 'function' ? tl.getFrameCount() : 0
    if (!frameCount) continue
    const times: number[] = []
    for (let i = 0; i < frameCount; i++) times.push(getFrameTimeAny(tl, i))

    const ctor = tl?.constructor?.name ?? 'Timeline'
    if (typeof tl.boneIndex === 'number') {
      const boneName = b.skeletonData.bones[tl.boneIndex]?.name ?? `bone#${tl.boneIndex}`
      pushRow({
        id: `bone:${boneName}:${ctor}`,
        label: `${t('骨骼', 'Bone')} ${boneName} · ${ctor.replace('Timeline', '')}`,
        kind: 'bone',
        targetName: boneName,
        times,
      })
      continue
    }
    if (typeof tl.slotIndex === 'number') {
      const slotName = b.skeletonData.slots[tl.slotIndex]?.name ?? `slot#${tl.slotIndex}`
      pushRow({
        id: `slot:${slotName}:${ctor}`,
        label: `${t('插槽', 'Slot')} ${slotName} · ${ctor.replace('Timeline', '')}`,
        kind: 'slot',
        targetName: slotName,
        times,
      })
      continue
    }

    pushRow({
      id: `other:${ctor}`,
      label: ctor,
      kind: 'other',
      targetName: ctor,
      times,
    })
  }

  return out
})

const selectedBoneName = computed(() => {
  const b = spine.bundle
  if (!spine.ready || !b) return null
  if (hierarchy.selected?.kind === 'bone') return hierarchy.selected.name
  return b.skeletonData.bones[0]?.name ?? null
})

type CurveProp = 'x' | 'y' | 'rotation' | 'scaleX' | 'scaleY'
const curveVisible = ref<Record<CurveProp, boolean>>({
  rotation: true,
  x: false,
  y: false,
  scaleX: false,
  scaleY: false,
})
const curvePropOrder: CurveProp[] = ['rotation', 'x', 'y', 'scaleX', 'scaleY']

function toggleCurve(p: CurveProp) {
  curveVisible.value = { ...curveVisible.value, [p]: !curveVisible.value[p] }
}

function showAllCurves() {
  curveVisible.value = { rotation: true, x: true, y: true, scaleX: true, scaleY: true }
}

function hideAllCurves() {
  curveVisible.value = { rotation: false, x: false, y: false, scaleX: false, scaleY: false }
}

function anyCurveVisible() {
  return curvePropOrder.some((p) => curveVisible.value[p])
}

type CurvePoint = { t: number; v: number }
type CurveSeries = Record<CurveProp, CurvePoint[]>

const curveSeries = computed<CurveSeries>(() => {
  const b = spine.bundle
  const animName = spine.currentAnimation
  const boneName = selectedBoneName.value
  const d = duration.value || 0
  if (!spine.ready || !b || !animName || !boneName || d <= 0) {
    return { rotation: [], x: [], y: [], scaleX: [], scaleY: [] }
  }

  const anim = b.skeletonData.findAnimation(animName)
  if (!anim) return { rotation: [], x: [], y: [], scaleX: [], scaleY: [] }

  // 用临时 skeleton 采样（只读曲线预览），避免影响主视口播放状态
  const tmp = new Skeleton(b.skeletonData)
  tmp.setToSetupPose()
  if (b.skeletonData.defaultSkin) tmp.setSkin(b.skeletonData.defaultSkin)
  else if (b.skeletonData.skins.length > 0) tmp.setSkin(b.skeletonData.skins[0])

  const bone = tmp.findBone(boneName)
  if (!bone) return { rotation: [], x: [], y: [], scaleX: [], scaleY: [] }

  const pts: CurveSeries = { rotation: [], x: [], y: [], scaleX: [], scaleY: [] }
  const samples = 120
  for (let i = 0; i <= samples; i++) {
    const t = (d * i) / samples
    tmp.setToSetupPose()
    anim.apply(tmp, 0, t, false, [], 1, MixBlend.replace, MixDirection.mixIn)
    tmp.updateWorldTransform(Physics.update)
    pts.x.push({ t, v: bone.x })
    pts.y.push({ t, v: bone.y })
    pts.rotation.push({ t, v: bone.rotation })
    pts.scaleX.push({ t, v: bone.scaleX })
    pts.scaleY.push({ t, v: bone.scaleY })
  }
  return pts
})

const visibleSeries = computed(() => {
  const s = curveSeries.value
  return curvePropOrder
    .filter((p) => curveVisible.value[p])
    .map((p) => ({ prop: p, pts: s[p] }))
})

function curvePropFromTimeline(tl: any): CurveProp | null {
  const n = tl?.constructor?.name ?? ''
  if (n === 'RotateTimeline') return 'rotation'
  if (n === 'TranslateTimeline' || n === 'TranslateXTimeline') return 'x'
  if (n === 'TranslateYTimeline') return 'y'
  if (n === 'ScaleTimeline' || n === 'ScaleXTimeline') return 'scaleX'
  if (n === 'ScaleYTimeline') return 'scaleY'
  return null
}

const curveKeyframes = computed<CurveSeries>(() => {
  const b = spine.bundle
  const animName = spine.currentAnimation
  const boneName = selectedBoneName.value
  const d = duration.value || 0
  if (!spine.ready || !b || !animName || !boneName || d <= 0) {
    return { rotation: [], x: [], y: [], scaleX: [], scaleY: [] }
  }
  const anim = b.skeletonData.findAnimation(animName)
  if (!anim) return { rotation: [], x: [], y: [], scaleX: [], scaleY: [] }

  const boneIndex = b.skeletonData.bones.findIndex((bn) => bn.name === boneName)
  if (boneIndex < 0) return { rotation: [], x: [], y: [], scaleX: [], scaleY: [] }

  const timesByProp: Record<CurveProp, Set<number>> = {
    rotation: new Set(),
    x: new Set(),
    y: new Set(),
    scaleX: new Set(),
    scaleY: new Set(),
  }

  for (const tl of anim.timelines as any[]) {
    if (typeof tl?.boneIndex !== 'number' || tl.boneIndex !== boneIndex) continue
    const prop = curvePropFromTimeline(tl)
    if (!prop) continue
    const frameCount = typeof tl.getFrameCount === 'function' ? tl.getFrameCount() : 0
    for (let i = 0; i < frameCount; i++) {
      const t = getFrameTimeAny(tl, i)
      if (Number.isFinite(t)) timesByProp[prop].add(t)
    }
  }

  // sample actual values at keyframe times (so markers land on the curve)
  const tmp = new Skeleton(b.skeletonData)
  tmp.setToSetupPose()
  if (b.skeletonData.defaultSkin) tmp.setSkin(b.skeletonData.defaultSkin)
  else if (b.skeletonData.skins.length > 0) tmp.setSkin(b.skeletonData.skins[0])
  const bone = tmp.findBone(boneName)
  if (!bone) return { rotation: [], x: [], y: [], scaleX: [], scaleY: [] }

  const out: CurveSeries = { rotation: [], x: [], y: [], scaleX: [], scaleY: [] }
  for (const prop of curvePropOrder) {
    const ts = [...timesByProp[prop]].filter((t) => t >= 0 && t <= d).sort((a, c) => a - c)
    for (const t of ts) {
      tmp.setToSetupPose()
      anim.apply(tmp, 0, t, false, [], 1, MixBlend.replace, MixDirection.mixIn)
      tmp.updateWorldTransform(Physics.update)
      let v = 0
      if (prop === 'rotation') v = bone.rotation
      else if (prop === 'x') v = bone.x
      else if (prop === 'y') v = bone.y
      else if (prop === 'scaleX') v = bone.scaleX
      else if (prop === 'scaleY') v = bone.scaleY
      out[prop].push({ t, v })
    }
  }
  return out
})

const curveRange = computed(() => {
  let min = Infinity
  let max = -Infinity
  for (const s of visibleSeries.value) {
    for (const p of s.pts) {
      min = Math.min(min, p.v)
      max = Math.max(max, p.v)
    }
  }
  for (const s of visibleSeries.value) {
    const kfs = curveKeyframes.value[s.prop]
    for (const p of kfs) {
      min = Math.min(min, p.v)
      max = Math.max(max, p.v)
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 }
  if (min === max) return { min: min - 1, max: max + 1 }
  return { min, max }
})

function curveColor(prop: CurveProp): string {
  switch (prop) {
    case 'rotation':
      return 'var(--win-accent)'
    case 'x':
      return '#22c55e'
    case 'y':
      return '#eab308'
    case 'scaleX':
      return '#a855f7'
    case 'scaleY':
      return '#ef4444'
  }
}

function curvePath(pts: CurvePoint[], min: number, max: number): string {
  if (!pts.length) return ''
  const padX = 14
  const padY = 10
  const w = 1000
  const h = 260
  const iw = w - padX * 2
  const ih = h - padY * 2
  const dx = iw / Math.max(1, pts.length - 1)
  const mapY = (v: number) => padY + (1 - (v - min) / (max - min)) * ih
  let d = ''
  for (let i = 0; i < pts.length; i++) {
    const x = padX + i * dx
    const y = mapY(pts[i].v)
    d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`
  }
  return d
}

function curveY(v: number, min: number, max: number): number {
  const padY = 10
  const h = 260
  const ih = h - padY * 2
  return padY + (1 - (v - min) / (max - min)) * ih
}

function curveX(t: number, d: number): number {
  const padX = 14
  const w = 1000
  const iw = w - padX * 2
  return d > 0 ? padX + (t / d) * iw : padX
}
</script>

<template>
  <footer class="timeline">
    <div class="tl-head">
      <div class="tl-left">
        <button
          type="button"
          class="play"
          :disabled="!hasSpine"
          :title="hasSpine ? (spine.playing ? t('暂停', 'Pause') : t('播放', 'Play')) : t('需导入 Spine 多文件包', 'Import Spine bundle required')"
          @click="spine.togglePlay()"
        >
          {{ spine.playing ? '⏸' : '▶' }}
        </button>
        <label v-if="hasSpine && spine.animationNames.length" class="anim-label">
          <span class="anim-caption">{{ t('动画', 'Animation') }}</span>
          <select class="anim-select" :value="spine.currentAnimation ?? ''" @change="onAnimChange">
            <option v-for="n in spine.animationNames" :key="n" :value="n">{{ n }}</option>
          </select>
        </label>
      </div>

      <div class="tl-center">
        <div class="tabs" role="tablist" :aria-label="t('时间轴视图', 'Timeline view')">
          <button
            type="button"
            class="tab"
            :class="{ on: tab === 'dope' }"
            role="tab"
            :aria-selected="tab === 'dope'"
            :aria-label="t('摄影表', 'Dope Sheet')"
            @click="tab = 'dope'"
          >
            {{ t('摄影表', 'Dope Sheet') }}
          </button>
          <button
            type="button"
            class="tab"
            :class="{ on: tab === 'curves' }"
            role="tab"
            :aria-selected="tab === 'curves'"
            :aria-label="t('曲线', 'Curves')"
            @click="tab = 'curves'"
          >
            {{ t('曲线', 'Curves') }}
          </button>
        </div>
      </div>

      <div class="tl-right">
        <span class="label">{{ t('时间轴', 'Timeline') }}</span>
      </div>
    </div>
    <div class="tl-track">
      <div v-if="hasSpine && duration > 0" class="ruler" />
      <div v-if="hasSpine && duration > 0" class="timeline-strip">
        <span class="timeline-name" :title="t('时间线', 'timeline')">{{ t('时间线', 'timeline') }}</span>
        <span class="timeline-time" :aria-label="t('动画时间', 'Animation time')">{{ fmt(time) }} / {{ fmt(duration) }}s</span>
        <div
          class="track"
          :title="t('拖动/点击跳转时间', 'Drag/click to seek')"
          @click="onSeek"
          @pointerdown="onTrackPointerDown"
          @pointermove="onTrackPointerMove"
          @pointerup="onTrackPointerUp"
          @pointercancel="onTrackPointerUp"
        >
          <div class="track-rail" aria-hidden="true">
            <div class="track-fill" :style="{ width: `${(progress * 100).toFixed(2)}%` }" />
          </div>
          <div class="track-handle" :style="{ left: `${(progress * 100).toFixed(2)}%` }" aria-hidden="true">
            ⟡
          </div>
          <div class="playhead" :style="{ left: `${(progress * 100).toFixed(2)}%` }" />
        </div>
      </div>
      <div v-if="hasSpine && duration > 0" class="subpanel" role="tabpanel">
        <div v-if="tab === 'dope'" class="dope">
          <div v-if="!dopeRows.length" class="muted pad">{{ t('当前动画无可显示的通道。', 'No channels to show for this animation.') }}</div>
          <div
            v-else
            class="dope-scroll"
            :aria-label="t('摄影表：通道与关键帧', 'Dope Sheet: channels and keyframes')"
          >
            <div v-for="r in dopeRows" :key="r.id" class="dope-row">
              <div class="dope-label" :title="r.label">{{ r.label }}</div>
              <div class="dope-line">
                <button
                  v-for="t in r.times"
                  :key="t"
                  type="button"
                  class="kf"
                  :style="{ left: `${(t / duration) * 100}%` }"
                  :title="`${r.label}\\n@ ${fmt(t)}s`"
                  @click="spine.seek(t)"
                />
              </div>
            </div>
          </div>
        </div>
        <div v-else class="curves">
          <div class="curve-head">
            <span class="muted">{{ t('对象', 'Object') }}</span>
            <strong class="bone">{{ selectedBoneName ?? '—' }}</strong>
            <span class="muted">{{ t('通道', 'Channels') }}</span>
            <button type="button" class="mini" @click="showAllCurves">{{ t('全部显示', 'Show all') }}</button>
            <button type="button" class="mini" @click="hideAllCurves">{{ t('全部隐藏', 'Hide all') }}</button>
          </div>
          <div class="curve-channels" :aria-label="t('动画通道列表', 'Channel list')">
            <button
              v-for="p in curvePropOrder"
              :key="p"
              type="button"
              class="ch"
              :class="{ on: curveVisible[p] }"
              @click="toggleCurve(p)"
            >
              <span class="eye" aria-hidden="true">{{ curveVisible[p] ? '👁' : '·' }}</span>
              <span class="nm">{{ p }}</span>
              <span class="sw" :style="{ background: curveColor(p) }" aria-hidden="true" />
            </button>
          </div>

          <div v-if="!anyCurveVisible()" class="muted">
            {{ t('请在下方列表中选择要显示的曲线通道。', 'Select channels below to display curves.') }}
          </div>
          <svg
            class="curve-svg"
            viewBox="0 0 1000 260"
            preserveAspectRatio="none"
            :aria-label="t('曲线预览', 'Curve preview')"
          >
            <!-- Axis helpers -->
            <line class="curve-axis x0" :x1="curveX(0, duration)" y1="0" :x2="curveX(0, duration)" y2="260" />
            <line
              class="curve-axis y0"
              x1="0"
              :y1="curveY(0, curveRange.min, curveRange.max)"
              x2="1000"
              :y2="curveY(0, curveRange.min, curveRange.max)"
            />
            <path
              v-for="s in visibleSeries"
              :key="s.prop"
              class="curve-line"
              :style="{ stroke: curveColor(s.prop) }"
              :d="curvePath(s.pts, curveRange.min, curveRange.max)"
            />
            <g v-for="s in visibleSeries" :key="`kf-${s.prop}`" class="kf-group">
              <circle
                v-for="p in curveKeyframes[s.prop]"
                :key="p.t"
                class="curve-kf"
                :style="{ stroke: curveColor(s.prop) }"
                :cx="curveX(p.t, duration)"
                :cy="curveY(p.v, curveRange.min, curveRange.max)"
                r="4"
              />
            </g>
            <g v-for="s in visibleSeries" :key="`start-${s.prop}`">
              <circle
                v-if="s.pts.length"
                class="curve-start"
                :style="{ stroke: curveColor(s.prop) }"
                :cx="curveX(s.pts[0].t, duration)"
                :cy="curveY(s.pts[0].v, curveRange.min, curveRange.max)"
                r="5"
              />
            </g>
            <line
              class="curve-playhead"
              :x1="curveX(time, duration)"
              y1="0"
              :x2="curveX(time, duration)"
              y2="260"
            />
          </svg>
        </div>
      </div>
      <p v-else class="placeholder">
        {{ t('导入 Spine（JSON + .atlas + 贴图多选）后可在此选择动画并播放/暂停。', 'Import Spine (multi-select JSON + .atlas + textures) to choose and play animations here.') }}
      </p>
    </div>
  </footer>
</template>

<style scoped>
.timeline {
  flex: 1;
  height: 100%;
  min-height: 0;
  background: var(--win-surface-alt);
  border-top: 1px solid var(--win-border);
  display: flex;
  flex-direction: column;
}

.tl-head {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border-bottom: 1px solid var(--win-border);
  height: 36px;
}

.tl-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 36px;
  height: 100%;
}

.tl-center {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 36px;
  height: 100%;
}

.tl-right {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-width: 0;
  min-height: 36px;
  height: 100%;
}

.play {
  width: 32px;
  height: 24px;
  border: 1px solid var(--win-border-strong);
  border-radius: var(--win-radius-sm);
  background: var(--win-surface);
  font-size: 12px;
  line-height: 1;
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
  line-height: 1;
}

.anim-caption {
  flex-shrink: 0;
}

.anim-select {
  min-width: 140px;
  max-width: 240px;
  height: 24px;
  padding: 3px 8px;
  font-size: 12px;
  border: 1px solid var(--win-border-strong);
  border-radius: var(--win-radius-sm);
  background: var(--win-surface);
  line-height: 1;
}

.label {
  font-size: 12px;
  font-weight: 600;
  color: var(--win-text-secondary);
  letter-spacing: 0.04em;
  line-height: 1;
}


.tabs {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px;
  border: 1px solid var(--win-border);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.03);
  min-height: 24px;
}

.tab {
  border: none;
  background: transparent;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--win-text-secondary);
  line-height: 1;
  cursor: pointer;
}

.tab.on {
  background: color-mix(in srgb, var(--win-accent) 14%, transparent);
  color: var(--win-text);
  font-weight: 600;
}

.tl-track {
  flex: 1;
  position: relative;
  padding: 4px 12px 8px;
  display: flex;
  flex-direction: column;
}

.ruler {
  height: 6px;
  border-radius: 4px;
  background: repeating-linear-gradient(
    90deg,
    var(--win-border) 0,
    var(--win-border) 1px,
    transparent 1px,
    transparent 40px
  );
  opacity: 0.16;
  margin-bottom: 4px;
}

.timeline-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.timeline-name {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--win-text-secondary);
  font-family: var(--win-mono, Consolas, monospace);
}

.timeline-time {
  flex-shrink: 0;
  width: 140px;
  text-align: right;
  font-family: var(--win-mono, Consolas, monospace);
  font-size: 11px;
  color: var(--win-text-secondary);
  font-variant-numeric: tabular-nums;
}

.track {
  position: relative;
  height: 8px;
  border-radius: 999px;
  overflow: visible;
  cursor: pointer;
  flex: 1;
  touch-action: none;
}

.track-rail {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  border: 1px solid var(--win-border-strong);
  background: rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.track-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: color-mix(in srgb, var(--win-accent) 40%, transparent);
}

.track-handle {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 18px;
  line-height: 1;
  color: color-mix(in srgb, var(--win-text-secondary) 75%, transparent);
  pointer-events: none;
  user-select: none;
  z-index: 2;
}

.playhead {
  position: absolute;
  top: -8px;
  width: 2px;
  height: 28px;
  background: var(--win-accent);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12);
  z-index: 1;
}

.subpanel {
  margin-top: 4px;
  border: 1px solid var(--win-border);
  border-radius: 8px;
  background: var(--win-surface);
  min-height: 104px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.dope {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.dope-scroll {
  flex: 1;
  min-height: 0;
  /* 通道过多时提供上下滚动条 */
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
  overscroll-behavior: contain;
}

.dope-row {
  display: grid;
  grid-template-columns: 280px 1fr;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  height: 28px;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.06);
}

.dope-row:last-child {
  border-bottom: none;
}

.dope-label {
  font-size: 12px;
  color: var(--win-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dope-line {
  position: relative;
  height: 18px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.kf {
  position: absolute;
  top: 4px;
  width: 8px;
  height: 8px;
  margin-left: -4px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.25);
  background: #fff;
  cursor: pointer;
}

.kf:hover {
  background: color-mix(in srgb, var(--win-accent) 18%, #fff);
  border-color: color-mix(in srgb, var(--win-accent) 50%, rgba(0, 0, 0, 0.25));
}

.pad {
  padding: 10px 12px;
}

.curves {
  height: 100%;
  padding: 6px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
}

.curve-head {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mini {
  padding: 2px 8px;
  border: 1px solid var(--win-border);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.02);
  font-size: 12px;
  color: var(--win-text);
}

.mini:hover {
  background: rgba(0, 0, 0, 0.04);
}

.bone {
  font-size: 12px;
  color: var(--win-text);
}

.curve-channels {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--win-border);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.02);
  padding: 2px 8px;
  font-size: 12px;
  color: var(--win-text);
}

.ch.on {
  border-color: color-mix(in srgb, var(--win-accent) 40%, var(--win-border));
  background: color-mix(in srgb, var(--win-accent) 10%, rgba(0, 0, 0, 0.02));
}

.eye {
  width: 14px;
  text-align: center;
  color: var(--win-text-secondary);
  font-family: var(--win-mono, Consolas, monospace);
}

.nm {
  font-family: var(--win-mono, Consolas, monospace);
}

.sw {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.18);
}

.curve-svg {
  width: 100%;
  flex: 1;
  min-height: 80px;
  height: auto;
}

.curve-line {
  fill: none;
  stroke-width: 2;
}

.curve-axis {
  stroke: rgba(0, 0, 0, 0.18);
  stroke-width: 1;
  stroke-dasharray: 3 4;
}

.curve-axis.y0 {
  stroke: rgba(0, 103, 192, 0.28);
}

.curve-start {
  fill: rgba(255, 255, 255, 0.85);
  stroke-width: 2.5;
}

.curve-kf {
  fill: color-mix(in srgb, var(--win-surface) 88%, transparent);
  stroke-width: 2;
  opacity: 0.95;
}

.curve-kf:hover {
  opacity: 1;
  fill: #fff;
}

.curve-playhead {
  stroke: rgba(196, 125, 0, 0.9);
  stroke-width: 2;
}

.placeholder,
.hint {
  margin: 0;
  font-size: 12px;
  color: var(--win-text-secondary);
}

.placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 12px;
  border: 1px dashed var(--win-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--win-surface) 80%, transparent);
}
</style>
