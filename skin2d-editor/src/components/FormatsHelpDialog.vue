<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const panelRef = ref<HTMLElement | null>(null)

function onBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) {
    e.preventDefault()
    emit('close')
  }
}

watch(
  () => props.open,
  (v) => {
    if (v) {
      document.body.style.overflow = 'hidden'
      queueMicrotask(() => panelRef.value?.focus())
    } else {
      document.body.style.overflow = ''
    }
  },
)

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="backdrop"
      role="presentation"
      @click="onBackdropClick"
    >
      <div
        ref="panelRef"
        class="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="formats-help-title"
        tabindex="-1"
        @click.stop
      >
        <div class="panel-head">
          <h2 id="formats-help-title" class="title">支持的文件格式</h2>
          <button type="button" class="close-btn" aria-label="关闭" @click="emit('close')">
            ✕
          </button>
        </div>
        <div class="panel-body">
          <p class="lead">
            通过<strong>文件 → 导入…</strong>可选择下列类型。本工具在浏览器中解析元数据并预览骨骼摘要；与游戏引擎内完全一致的表现需以各运行时为准。
          </p>

          <section>
            <h3>Spine JSON（<code>*.json</code>）</h3>
            <ul>
              <li>
                <strong>贴图与动画预览</strong>：在导入对话框中<strong>一次多选</strong>同一角色的
                <code>*.json</code>（骨架）<strong>与</strong>
                <code>*.atlas</code>（图集描述）<strong>与</strong> atlas 中引用的各页
                <code>*.png</code>（或同名的 <code>jpg</code> 等），即可在画布上绘制贴图并播放动画。
              </li>
              <li><strong>仅骨架 JSON</strong>：只选单个 JSON 时仍可解析骨骼元数据并尝试骨骼线回退，但<strong>无贴图、无 Spine 运行时网格绘制</strong>。</li>
              <li><strong>版本</strong>：项目依赖 <code>@esotericsoftware/spine-core</code>（当前为 4.x 系列）。导出时请尽量选择<strong>与运行时一致</strong>的编辑器导出选项。</li>
              <li><strong>兼容性</strong>：编辑器大版本（如 3.8 与 4.x）字段与行为不同；若官方运行时解析失败，会尝试 JSON 回退绘制骨骼，可能与引擎内姿态略有差异。</li>
              <li><strong>注意</strong>：<strong>不能</strong>直接打开 Spine 工程文件 <code>.spine</code>；请在 Spine Editor 中先导出 JSON。</li>
            </ul>
          </section>

          <section>
            <h3>DragonBones 骨架 JSON（如 <code>*_ske.json</code>）</h3>
            <ul>
              <li><strong>内容</strong>：运行时骨架数据，根节点通常含 <code>armature</code> 数组。</li>
              <li><strong>版本</strong>：DragonBones 有 4.x、5.5 等多套 JSON 约定；字段随版本演变。</li>
              <li><strong>兼容性</strong>：请尽量使用与目标引擎 / 官方文档一致的导出版本；过旧或过新的 JSON 可能出现统计字段缺失或解析告警。</li>
              <li><strong>贴图</strong>：<code>*_tex.json</code> / 图集需与工程配套；本工具导入骨架 JSON 时<strong>不自动加载贴图</strong>。</li>
            </ul>
          </section>

          <section>
            <h3>DragonBones 工程（<code>*.dbproj</code>）</h3>
            <ul>
              <li><strong>内容</strong>：DragonBonesPro、LoongBones 等生成的<strong>工程文件</strong>（一般为 UTF-8 JSON）。骨架可能位于 <code>armature</code>、<code>dragonBones</code>、<code>library</code> 等节点下，导入时会尝试归一化。</li>
              <li><strong>版本 / 兼容</strong>：不同编辑器版本、不同厂商（龙骨 / LoongBones）工程结构可能不同；升级编辑器后工程内层字段可能变化。</li>
              <li><strong>注意</strong>：<strong>不包含</strong>贴图资源；若为<strong>二进制或非 JSON</strong>封装，无法解析，请改导出 <code>*_ske.json</code>。无法识别时请核对编辑器版本或提供可复现的 JSON 结构（脱敏）。</li>
            </ul>
          </section>

          <section>
            <h3>glTF 2.0（<code>*.gltf</code> / <code>*.glb</code>）</h3>
            <ul>
              <li><strong>内容</strong>：Khronos 开放标准；此处仅做<strong>摘要</strong>（节点、动画、皮肤数量等），用于与 2D 管线或混合资源对照。</li>
              <li><strong>版本</strong>：解析侧按 glTF 2.0；<code>.glb</code> 为二进制封装。</li>
              <li><strong>兼容性</strong>：扩展项（extensions）众多；未实现的扩展仅影响摘要完整度，不保证覆盖所有 DCC 导出细节。</li>
            </ul>
          </section>

          <section class="note">
            <h3>通用说明</h3>
            <ul>
              <li>文件名与路径请使用 <strong>ASCII</strong>；文本编码建议 <strong>UTF-8</strong>。</li>
              <li>本工具<strong>无后端</strong>，文件仅在本地浏览器中读取，不上传服务器。</li>
              <li>若升级 Spine / DragonBones / 编辑器后导入异常，请先<strong>用目标版本重新导出</strong>，再对照各官方「运行时与数据版本」说明排查。</li>
            </ul>
          </section>
        </div>
        <div class="panel-foot">
          <button type="button" class="btn-primary" @click="emit('close')">确定</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.panel {
  width: min(640px, 100%);
  max-height: min(88vh, 720px);
  display: flex;
  flex-direction: column;
  background: var(--win-surface, #fff);
  border: 1px solid var(--win-border-strong, #d1d1d1);
  border-radius: var(--win-radius, 8px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  outline: none;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--win-border, #e5e5e5);
  flex-shrink: 0;
}

.title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--win-radius-sm, 4px);
  background: transparent;
  font-size: 14px;
  line-height: 1;
  color: var(--win-text-secondary, #5c5c5c);
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.06);
}

.panel-body {
  padding: 12px 16px 8px;
  overflow-y: auto;
  flex: 1;
  font-size: 13px;
  line-height: 1.55;
  color: var(--win-text, #1a1a1a);
}

.lead {
  margin: 0 0 14px;
  color: var(--win-text-secondary, #5c5c5c);
}

section {
  margin-bottom: 16px;
}

section h3 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
}

section ul {
  margin: 0;
  padding-left: 1.25em;
}

section li {
  margin-bottom: 6px;
}

section.note {
  padding-top: 8px;
  border-top: 1px dashed var(--win-border, #e5e5e5);
}

code {
  font-family: var(--win-mono, Consolas, monospace);
  font-size: 12px;
  background: rgba(0, 0, 0, 0.05);
  padding: 1px 5px;
  border-radius: 3px;
}

.panel-foot {
  padding: 10px 16px 14px;
  border-top: 1px solid var(--win-border, #e5e5e5);
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.btn-primary {
  min-width: 88px;
  padding: 6px 16px;
  border: 1px solid var(--win-accent, #0067c0);
  border-radius: var(--win-radius-sm, 4px);
  background: var(--win-accent, #0067c0);
  color: #fff;
  font-size: 13px;
}

.btn-primary:hover {
  background: var(--win-accent-hover, #005a9e);
  border-color: var(--win-accent-hover, #005a9e);
}
</style>
