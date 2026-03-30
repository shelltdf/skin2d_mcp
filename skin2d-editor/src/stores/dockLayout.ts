import { defineStore } from 'pinia'
import { ref } from 'vue'

type DockSnapshot = {
  leftVisible: boolean
  rightVisible: boolean
  bottomVisible: boolean
  leftWidth: number
  rightWidth: number
  bottomHeight: number
}

const LS_KEY = 'skin2d.dockLayout.v1'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function maxBottomHeightForViewport(): number {
  // Leave room for toolbar/menu area + status bar + splitters.
  // This prevents the bottom dock from visually overlapping the status bar on small windows.
  const h = typeof window !== 'undefined' ? window.innerHeight : 800
  return Math.max(220, h - 320)
}

export const useDockLayoutStore = defineStore('dockLayout', () => {
  const leftVisible = ref(true)
  const rightVisible = ref(true)
  const bottomVisible = ref(true)

  const leftWidth = ref(280)
  const rightWidth = ref(300)
  // 默认：时间轴 dock 占窗口高度一半（首次启动、无本地配置时生效）
  const bottomHeight = ref(320)

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) {
        // no saved layout: use half of current window height
        const h = typeof window !== 'undefined' ? window.innerHeight : 640
        bottomHeight.value = clamp(Math.round(h * 0.5), 120, maxBottomHeightForViewport())
        return
      }
      const obj = JSON.parse(raw) as Partial<DockSnapshot>
      if (typeof obj.leftVisible === 'boolean') leftVisible.value = obj.leftVisible
      if (typeof obj.rightVisible === 'boolean') rightVisible.value = obj.rightVisible
      if (typeof obj.bottomVisible === 'boolean') bottomVisible.value = obj.bottomVisible
      if (typeof obj.leftWidth === 'number') leftWidth.value = clamp(obj.leftWidth, 180, 520)
      if (typeof obj.rightWidth === 'number') rightWidth.value = clamp(obj.rightWidth, 220, 620)
      if (typeof obj.bottomHeight === 'number') bottomHeight.value = clamp(obj.bottomHeight, 120, maxBottomHeightForViewport())
    } catch {
      // ignore
    }
  }

  function saveToStorage() {
    try {
      const snap: DockSnapshot = {
        leftVisible: leftVisible.value,
        rightVisible: rightVisible.value,
        bottomVisible: bottomVisible.value,
        leftWidth: leftWidth.value,
        rightWidth: rightWidth.value,
        bottomHeight: bottomHeight.value,
      }
      localStorage.setItem(LS_KEY, JSON.stringify(snap))
    } catch {
      // ignore
    }
  }

  function setLeftVisible(v: boolean) {
    leftVisible.value = v
    saveToStorage()
  }
  function setRightVisible(v: boolean) {
    rightVisible.value = v
    saveToStorage()
  }
  function setBottomVisible(v: boolean) {
    bottomVisible.value = v
    saveToStorage()
  }

  function setLeftWidth(px: number) {
    leftWidth.value = clamp(px, 180, 520)
    saveToStorage()
  }
  function setRightWidth(px: number) {
    rightWidth.value = clamp(px, 220, 620)
    saveToStorage()
  }
  function setBottomHeight(px: number) {
    bottomHeight.value = clamp(px, 120, maxBottomHeightForViewport())
    saveToStorage()
  }

  function toggleLeft() {
    setLeftVisible(!leftVisible.value)
  }
  function toggleRight() {
    setRightVisible(!rightVisible.value)
  }
  function toggleBottom() {
    setBottomVisible(!bottomVisible.value)
  }

  return {
    leftVisible,
    rightVisible,
    bottomVisible,
    leftWidth,
    rightWidth,
    bottomHeight,
    loadFromStorage,
    saveToStorage,
    setLeftVisible,
    setRightVisible,
    setBottomVisible,
    setLeftWidth,
    setRightWidth,
    setBottomHeight,
    toggleLeft,
    toggleRight,
    toggleBottom,
  }
})

