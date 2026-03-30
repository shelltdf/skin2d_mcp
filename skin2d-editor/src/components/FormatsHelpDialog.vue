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

          <section class="howto-top">
            <h3>如何选择文件（单文件 / 多选 / 目录）</h3>
            <p class="howto-note">
              导入使用浏览器标准的「打开文件」对话框；当前<strong>没有「选择整个文件夹」</strong>入口，也<strong>不能</strong>把资源目录一次性拖成一条「文件夹」选择记录。请按下方各格式说明：要么<strong>只选一个文件</strong>，要么在<strong>同一次</strong>打开对话框里<strong>多选</strong>多个文件（Windows：按住
              <kbd>Ctrl</kbd>
              逐个点选；macOS：按住
              <kbd>Cmd</kbd>
              点选），或把整包打成<strong>单个 zip</strong>再导入（见 Live2D）。
            </p>
            <table class="mode-table" aria-label="导入方式图例">
              <thead>
                <tr>
                  <th scope="col">标记</th>
                  <th scope="col">含义</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span class="badge badge-single">单文件</span></td>
                  <td>对话框中只选中 <strong>1 个</strong>文件后打开。</td>
                </tr>
                <tr>
                  <td><span class="badge badge-multi">多选</span></td>
                  <td>
                    在<strong>同一次</strong>「打开文件」里选中 <strong>2 个及以上</strong>文件（须含所列类型，一般来自同一导出目录）。
                  </td>
                </tr>
                <tr>
                  <td><span class="badge badge-zip">单 zip</span></td>
                  <td>仅选 <strong>1 个</strong><code>.zip</code>，包内需含对应模型的全部引用文件。</td>
                </tr>
                <tr>
                  <td><span class="badge badge-nodir">非目录</span></td>
                  <td>本工具<strong>不支持</strong>仅用「选文件夹」导入；请多选文件或改用 zip。</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h3>
              Spine JSON（<code>*.json</code>）
              <span class="badges-row" aria-label="导入方式">
                <span class="badge badge-multi">多选：完整预览</span>
                <span class="badge badge-single">单文件：仅骨架元数据</span>
                <span class="badge badge-nodir">非目录</span>
              </span>
            </h3>
            <ul>
              <li>
                <strong>贴图与动画预览</strong>（<span class="badge badge-multi">多选</span>）：在同一次导入中选中骨架
                <code>*.json</code>、<code>*.atlas</code>，以及 atlas 中引用的各页
                <code>*.png</code>（或 <code>jpg</code> 等）；缺一不可时画布可能无贴图或加载失败。
              </li>
              <li>
                <strong>仅骨架 JSON</strong>（<span class="badge badge-single">单文件</span>）：只选 1 个 Spine 导出 JSON 时仍可解析骨骼元数据并尝试骨骼线，但<strong>无贴图、无 Spine 贴图网格（Mesh）绘制</strong>。
              </li>
              <li><strong>版本</strong>：项目依赖 <code>@esotericsoftware/spine-core</code>（当前为 4.x 系列）。导出时请尽量选择<strong>与运行时一致</strong>的编辑器导出选项。</li>
              <li><strong>兼容性</strong>：编辑器大版本（如 3.8 与 4.x）字段与行为不同；若官方运行时解析失败，会尝试 JSON 回退绘制骨骼，可能与引擎内姿态略有差异。</li>
              <li><strong>注意</strong>：<strong>不能</strong>直接打开 Spine 工程文件 <code>.spine</code>；请在 Spine Editor 中先导出 JSON。</li>
            </ul>
          </section>

          <section>
            <h3>
              Live2D Cubism（<code>*.model3.json</code> / <code>*.zip</code>）
              <span class="badges-row" aria-label="导入方式">
                <span class="badge badge-zip">单 zip：画布预览</span>
                <span class="badge badge-single">单文件 model3：仅元数据</span>
                <span class="badge badge-nodir">非目录（可 zip 打包）</span>
              </span>
            </h3>
            <ul>
              <li>
                <strong>内容</strong>：Cubism Editor 导出的模型描述 JSON，根节点含 <code>FileReferences</code>，引用
                <code>.moc3</code>、贴图、物理、姿势与 <code>Motions</code> 等。
              </li>
              <li>
                <strong>画布预览</strong>（<span class="badge badge-zip">单 zip</span>）：将模型目录内所需文件（含 <code>*.model3.json</code>、<code>.moc3</code>、贴图等）打成一个
                <code>.zip</code>，导入时<strong>只选该 zip 这一份文件</strong>（不要与别的格式多选混在一起）。
              </li>
              <li>
                <strong>仅元数据</strong>（<span class="badge badge-single">单文件</span>）：只导入 <code>*.model3.json</code> 时，可解析版本、贴图数量、动作组名等并在面板展示，但<strong>不会在画布上渲染 Live2D 模型</strong>。
              </li>
              <li>
                <strong>注意</strong>：单独只选 <code>.moc3</code> / <code>.moc</code> 会提示改为导入
                <code>*.model3.json</code> 或使用整包 zip；请遵守 Live2D 公开样本与 SDK 许可。
              </li>
            </ul>
          </section>

          <section>
            <h3>
              DragonBones 骨架 JSON（如 <code>*_ske.json</code>）
              <span class="badges-row" aria-label="导入方式">
                <span class="badge badge-single">单文件</span>
                <span class="badge badge-nodir">非目录</span>
              </span>
            </h3>
            <ul>
              <li><strong>内容</strong>：运行时骨架数据，根节点通常含 <code>armature</code> 数组。</li>
              <li><strong>版本</strong>：DragonBones 有 4.x、5.5 等多套 JSON 约定；字段随版本演变。</li>
              <li><strong>兼容性</strong>：请尽量使用与目标引擎 / 官方文档一致的导出版本；过旧或过新的 JSON 可能出现统计字段缺失或解析告警。</li>
              <li>
                <strong>贴图</strong>：<code>*_tex.json</code> / 图集需与工程配套；本工具导入骨架 JSON 时<strong>不自动加载贴图</strong>，也<strong>不支持</strong>在同一次导入里附带多选贴图（仅解析该 ske JSON）。
              </li>
            </ul>
          </section>

          <section>
            <h3>
              DragonBones 工程（<code>*.dbproj</code>）
              <span class="badges-row" aria-label="导入方式">
                <span class="badge badge-single">单文件</span>
                <span class="badge badge-nodir">非目录</span>
              </span>
            </h3>
            <ul>
              <li><strong>内容</strong>：DragonBonesPro、LoongBones 等生成的<strong>工程文件</strong>（一般为 UTF-8 JSON）。骨架可能位于 <code>armature</code>、<code>dragonBones</code>、<code>library</code> 等节点下，导入时会尝试归一化。</li>
              <li><strong>版本 / 兼容</strong>：不同编辑器版本、不同厂商（龙骨 / LoongBones）工程结构可能不同；升级编辑器后工程内层字段可能变化。</li>
              <li><strong>注意</strong>：<strong>不包含</strong>贴图资源；若为<strong>二进制或非 JSON</strong>封装，无法解析，请改导出 <code>*_ske.json</code>。无法识别时请核对编辑器版本或提供可复现的 JSON 结构（脱敏）。</li>
            </ul>
          </section>

          <section>
            <h3>
              glTF 2.0（<code>*.gltf</code> / <code>*.glb</code>）
              <span class="badges-row" aria-label="导入方式">
                <span class="badge badge-single">单文件</span>
                <span class="badge badge-nodir">非目录</span>
              </span>
            </h3>
            <ul>
              <li><strong>内容</strong>：Khronos 开放标准；此处仅做<strong>摘要</strong>（节点、动画、皮肤数量等），用于与 2D 管线或混合资源对照。</li>
              <li>
                <strong>版本 / 外部资源</strong>：解析侧按 glTF 2.0；<code>.glb</code> 为二进制封装。若使用外部引用的
                <code>.gltf</code> + <code>.bin</code> + 纹理，当前流程为<strong>仅单选主 <code>.gltf</code></strong>，嵌套资源可能无法随单文件一同解析，建议优先使用自包含的 <code>.glb</code>。
              </li>
              <li><strong>兼容性</strong>：扩展项（extensions）众多；未实现的扩展仅影响摘要完整度，不保证覆盖所有 DCC 导出细节。</li>
            </ul>
          </section>

          <section class="note">
            <h3>通用说明</h3>
            <ul>
              <li>
                <span class="badge badge-nodir">非目录</span>
                再次说明：导入对话框<strong>不是</strong>资源管理器里的「打开文件夹」；若习惯整目录操作，请对 Spine 使用<strong>多选文件</strong>，或对 Live2D 使用<strong>单 zip</strong>。
              </li>
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
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 10px;
}

.badges-row {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  font-weight: 500;
}

.badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  padding: 2px 8px;
  border-radius: 4px;
  vertical-align: middle;
  white-space: nowrap;
}

.badge-single {
  background: rgba(0, 103, 192, 0.12);
  color: #005a9e;
  border: 1px solid rgba(0, 103, 192, 0.35);
}

.badge-multi {
  background: rgba(16, 124, 16, 0.14);
  color: #1b5e20;
  border: 1px solid rgba(16, 124, 16, 0.4);
}

.badge-zip {
  background: rgba(123, 31, 162, 0.12);
  color: #6a1b9a;
  border: 1px solid rgba(123, 31, 162, 0.35);
}

.badge-nodir {
  background: rgba(120, 84, 0, 0.12);
  color: #5d4037;
  border: 1px solid rgba(120, 84, 0, 0.35);
}

.howto-top {
  padding: 10px 12px;
  margin-bottom: 18px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: var(--win-radius-sm, 4px);
  border: 1px solid var(--win-border, #e5e5e5);
}

.howto-top h3 {
  margin-bottom: 8px;
}

.howto-note {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--win-text, #1a1a1a);
}

.mode-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.mode-table th,
.mode-table td {
  border: 1px solid var(--win-border, #e5e5e5);
  padding: 8px 10px;
  text-align: left;
  vertical-align: top;
}

.mode-table th {
  background: rgba(0, 0, 0, 0.04);
  font-weight: 600;
  width: 28%;
}

.mode-table tbody tr:nth-child(even) td {
  background: rgba(0, 0, 0, 0.02);
}

kbd {
  font-family: var(--win-mono, Consolas, monospace);
  font-size: 11px;
  padding: 1px 6px;
  border: 1px solid var(--win-border-strong, #ccc);
  border-radius: 3px;
  background: linear-gradient(to bottom, #fafafa, #eee);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08);
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
