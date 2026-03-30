<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useUiSettingsStore } from '../stores/uiSettings'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const panelRef = ref<HTMLElement | null>(null)
const ui = useUiSettingsStore()
const t = ui.t

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
          <h2 id="formats-help-title" class="title">{{ t('支持的文件格式', 'Supported file formats') }}</h2>
          <button type="button" class="close-btn" :aria-label="t('关闭', 'Close')" @click="emit('close')">
            ✕
          </button>
        </div>
        <div class="panel-body">
          <p class="lead">
            {{ t('通过', 'Use') }}<strong>{{ t('文件 → 导入…', 'File → Import…') }}</strong
            >{{ t('可选择下列类型。本工具在浏览器中解析元数据并预览骨骼摘要；与游戏引擎内完全一致的表现需以各运行时为准。', 'to select formats below. This tool parses metadata in the browser and previews a rig summary; exact in-engine rendering depends on each runtime.') }}
          </p>

          <section class="howto-top">
            <h3>{{ t('如何选择文件（单文件 / 多选 / 目录）', 'How to pick files (single / multi-select / folder)') }}</h3>
            <p class="howto-note">
              {{
                t(
                  '导入使用浏览器标准的「打开文件」对话框；当前没有「选择整个文件夹」入口，也不能把资源目录一次性拖成一条「文件夹」选择记录。请按下方各格式说明：要么只选一个文件，要么在同一次打开对话框里多选多个文件（Windows：按住 Ctrl 逐个点选；macOS：按住 Cmd 点选），或把整包打成单个 zip 再导入（见 Live2D）。',
                  'Import uses the browser “Open file” dialog. There is currently no “Select folder” entry, and you cannot drag a directory as a single folder record. Follow each format below: either pick one file, or multi-select files in the same dialog (Windows: hold Ctrl; macOS: hold Cmd), or package everything into a single zip (see Live2D).',
                )
              }}
            </p>
            <table class="mode-table" :aria-label="t('导入方式图例', 'Import mode legend')">
              <thead>
                <tr>
                  <th scope="col">{{ t('标记', 'Badge') }}</th>
                  <th scope="col">{{ t('含义', 'Meaning') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span class="badge badge-single">{{ t('单文件', 'Single') }}</span></td>
                  <td>{{ t('对话框中只选中 1 个文件后打开。', 'Pick exactly 1 file in the dialog.') }}</td>
                </tr>
                <tr>
                  <td><span class="badge badge-multi">{{ t('多选', 'Multi') }}</span></td>
                  <td>
                    {{ t('在同一次「打开文件」里选中 2 个及以上文件（须含所列类型，一般来自同一导出目录）。', 'Select 2+ files in the same dialog (must include the required types; usually from the same export folder).') }}
                  </td>
                </tr>
                <tr>
                  <td><span class="badge badge-zip">{{ t('单 zip', 'Zip') }}</span></td>
                  <td>{{ t('仅选 1 个 .zip，包内需含对应模型的全部引用文件。', 'Pick exactly 1 .zip that includes all referenced files.') }}</td>
                </tr>
                <tr>
                  <td><span class="badge badge-nodir">{{ t('非目录', 'No folder') }}</span></td>
                  <td>{{ t('本工具不支持仅用「选文件夹」导入；请多选文件或改用 zip。', 'Folder-only import is not supported; multi-select files or use a zip.') }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h3>
              Spine JSON（<code>*.json</code>）
              <span class="badges-row" :aria-label="t('导入方式', 'Import modes')">
                <span class="badge badge-multi">{{ t('多选：完整预览', 'Multi: full preview') }}</span>
                <span class="badge badge-single">{{ t('单文件：仅骨架元数据', 'Single: metadata only') }}</span>
                <span class="badge badge-nodir">{{ t('非目录', 'No folder') }}</span>
              </span>
            </h3>
            <ul>
              <li>
                <strong>{{ t('贴图与动画预览', 'Texture & animation preview') }}</strong>（<span class="badge badge-multi">{{ t('多选', 'Multi') }}</span>）：
                {{ t('在同一次导入中选中骨架 *.json、*.atlas，以及 atlas 中引用的各页 *.png（或 jpg 等）；缺一不可时画布可能无贴图或加载失败。', 'Select skeleton *.json, *.atlas, and all referenced texture pages (*.png/jpg/etc.) in the same import. Missing files may cause no textures or load failure.') }}
              </li>
              <li>
                <strong>{{ t('仅骨架 JSON', 'Skeleton JSON only') }}</strong>（<span class="badge badge-single">{{ t('单文件', 'Single') }}</span>）：
                {{ t('只选 1 个 Spine 导出 JSON 时仍可解析骨骼元数据并尝试骨骼线，但无贴图、无 Spine 贴图网格（Mesh）绘制。', 'With only the exported JSON, we can parse metadata and draw bones, but there will be no textures and no mesh rendering.') }}
              </li>
              <li>
                <strong>{{ t('版本', 'Version') }}</strong>：{{ t('项目依赖', 'This project uses') }}
                <code>@esotericsoftware/spine-core</code>{{ t('（当前为 4.x 系列）。导出时请尽量选择与运行时一致的编辑器导出选项。', ' (currently 4.x). Export with a version compatible with the runtime whenever possible.') }}
              </li>
              <li>
                <strong>{{ t('兼容性', 'Compatibility') }}</strong>：{{ t('编辑器大版本（如 3.8 与 4.x）字段与行为不同；若官方运行时解析失败，会尝试 JSON 回退绘制骨骼，可能与引擎内姿态略有差异。', 'Major editor versions (e.g., 3.8 vs 4.x) differ in fields/behavior. If runtime parsing fails, a JSON fallback may draw bones with slight differences.') }}
              </li>
              <li>
                <strong>{{ t('注意', 'Note') }}</strong>：{{ t('不能直接打开 Spine 工程文件 .spine；请在 Spine Editor 中先导出 JSON。', 'You cannot open a Spine project file (.spine) directly; export JSON from Spine Editor first.') }}
              </li>
            </ul>
          </section>

          <section>
            <h3>
              Live2D Cubism（<code>*.model3.json</code> / <code>*.zip</code>）
              <span class="badges-row" :aria-label="t('导入方式', 'Import modes')">
                <span class="badge badge-zip">{{ t('单 zip：画布预览', 'Zip: canvas preview') }}</span>
                <span class="badge badge-single">{{ t('单文件 model3：仅元数据', 'Single model3: metadata only') }}</span>
                <span class="badge badge-nodir">{{ t('非目录（可 zip 打包）', 'No folder (zip allowed)') }}</span>
              </span>
            </h3>
            <ul>
              <li>
                <strong>{{ t('内容', 'Content') }}</strong>：{{
                  t(
                    'Cubism Editor 导出的模型描述 JSON，根节点含 FileReferences，引用 .moc3、贴图、物理、姿势与 Motions 等。',
                    'A Cubism Editor exported model JSON. Root includes FileReferences referencing .moc3, textures, physics, pose and Motions, etc.',
                  )
                }}
              </li>
              <li>
                <strong>{{ t('画布预览', 'Canvas preview') }}</strong>（<span class="badge badge-zip">{{ t('单 zip', 'Zip') }}</span>）：
                {{
                  t(
                    '将模型目录内所需文件（含 *.model3.json、.moc3、贴图等）打成一个 .zip，导入时只选该 zip 这一份文件（不要与别的格式多选混在一起）。',
                    'Zip the required files (including *.model3.json, .moc3, textures, etc.) into a single .zip. Import by selecting only that zip (do not multi-select with other formats).',
                  )
                }}
              </li>
              <li>
                <strong>{{ t('仅元数据', 'Metadata only') }}</strong>（<span class="badge badge-single">{{ t('单文件', 'Single') }}</span>）：
                {{
                  t(
                    '只导入 *.model3.json 时，可解析版本、贴图数量、动作组名等并在面板展示，但不会在画布上渲染 Live2D 模型。',
                    'Importing only *.model3.json shows metadata (version, texture count, motion groups, etc.) in panels, but does not render the Live2D model on canvas.',
                  )
                }}
              </li>
              <li>
                <strong>{{ t('注意', 'Note') }}</strong>：{{
                  t(
                    '单独只选 .moc3 / .moc 会提示改为导入 *.model3.json 或使用整包 zip；请遵守 Live2D 公开样本与 SDK 许可。',
                    'Importing .moc3/.moc alone will prompt you to import *.model3.json or use a full zip package. Please follow Live2D sample and SDK licensing.',
                  )
                }}
              </li>
            </ul>
          </section>

          <section>
            <h3>
              {{ t('DragonBones 骨架 JSON', 'DragonBones skeleton JSON') }}（{{ t('如', 'e.g.') }} <code>*_ske.json</code>）
              <span class="badges-row" :aria-label="t('导入方式', 'Import modes')">
                <span class="badge badge-single">{{ t('单文件', 'Single') }}</span>
                <span class="badge badge-nodir">{{ t('非目录', 'No folder') }}</span>
              </span>
            </h3>
            <ul>
              <li><strong>{{ t('内容', 'Content') }}</strong>：{{ t('运行时骨架数据，根节点通常含 armature 数组。', 'Runtime rig data; root usually contains an armature array.') }}</li>
              <li><strong>{{ t('版本', 'Version') }}</strong>：{{ t('DragonBones 有 4.x、5.5 等多套 JSON 约定；字段随版本演变。', 'DragonBones has multiple JSON schemas (4.x, 5.5, etc.); fields evolve across versions.') }}</li>
              <li><strong>{{ t('兼容性', 'Compatibility') }}</strong>：{{ t('请尽量使用与目标引擎 / 官方文档一致的导出版本；过旧或过新的 JSON 可能出现统计字段缺失或解析告警。', 'Export with a version matching your target engine/docs; too old/new JSON may miss fields or trigger warnings.') }}</li>
              <li>
                <strong>{{ t('贴图', 'Textures') }}</strong>：{{
                  t(
                    '*_tex.json / 图集需与工程配套；本工具导入骨架 JSON 时不自动加载贴图，也不支持在同一次导入里附带多选贴图（仅解析该 ske JSON）。',
                    'Texture atlas (*_tex.json) must match the project. This tool does not auto-load textures when importing the skeleton JSON, and does not support multi-selecting textures together (it parses only the ske JSON).',
                  )
                }}
              </li>
            </ul>
          </section>

          <section>
            <h3>
              {{ t('DragonBones 工程', 'DragonBones project') }}（<code>*.dbproj</code>）
              <span class="badges-row" :aria-label="t('导入方式', 'Import modes')">
                <span class="badge badge-single">{{ t('单文件', 'Single') }}</span>
                <span class="badge badge-nodir">{{ t('非目录', 'No folder') }}</span>
              </span>
            </h3>
            <ul>
              <li>
                <strong>{{ t('内容', 'Content') }}</strong>：{{
                  t(
                    'DragonBonesPro、LoongBones 等生成的工程文件（一般为 UTF-8 JSON）。骨架可能位于 armature、dragonBones、library 等节点下，导入时会尝试归一化。',
                    'Project file from DragonBonesPro/LoongBones (usually UTF-8 JSON). The rig may be under armature/dragonBones/library, and import will try to normalize structures.',
                  )
                }}
              </li>
              <li><strong>{{ t('版本 / 兼容', 'Version / compatibility') }}</strong>：{{ t('不同编辑器版本、不同厂商（龙骨 / LoongBones）工程结构可能不同；升级编辑器后工程内层字段可能变化。', 'Different editor versions/vendors may use different structures; fields can change after upgrades.') }}</li>
              <li>
                <strong>{{ t('注意', 'Note') }}</strong>：{{
                  t(
                    '不包含贴图资源；若为二进制或非 JSON 封装，无法解析，请改导出 *_ske.json。无法识别时请核对编辑器版本或提供可复现的 JSON 结构（脱敏）。',
                    'Does not include textures. If the file is binary or non-JSON, it cannot be parsed—export *_ske.json instead. If unrecognized, verify editor version or provide a reproducible (sanitized) JSON structure.',
                  )
                }}
              </li>
            </ul>
          </section>

          <section>
            <h3>
              glTF 2.0（<code>*.gltf</code> / <code>*.glb</code>）
              <span class="badges-row" :aria-label="t('导入方式', 'Import modes')">
                <span class="badge badge-single">{{ t('单文件', 'Single') }}</span>
                <span class="badge badge-nodir">{{ t('非目录', 'No folder') }}</span>
              </span>
            </h3>
            <ul>
              <li><strong>{{ t('内容', 'Content') }}</strong>：{{ t('Khronos 开放标准；此处仅做摘要（节点、动画、皮肤数量等），用于与 2D 管线或混合资源对照。', 'Khronos open standard. Here we show a summary only (nodes, animations, skins, etc.) for comparison with 2D or mixed pipelines.') }}</li>
              <li>
                <strong>{{ t('版本 / 外部资源', 'Version / external resources') }}</strong>：{{
                  t(
                    '解析侧按 glTF 2.0；.glb 为二进制封装。若使用外部引用的 .gltf + .bin + 纹理，当前流程为仅单选主 .gltf，嵌套资源可能无法随单文件一同解析，建议优先使用自包含的 .glb。',
                    'Parsed as glTF 2.0; .glb is the binary container. If using external .gltf + .bin + textures, the current flow selects only the main .gltf, so nested resources may not be parsed; prefer self-contained .glb.',
                  )
                }}
              </li>
              <li><strong>{{ t('兼容性', 'Compatibility') }}</strong>：{{ t('扩展项（extensions）众多；未实现的扩展仅影响摘要完整度，不保证覆盖所有 DCC 导出细节。', 'There are many extensions; unimplemented ones may reduce summary completeness and may not cover all DCC export details.') }}</li>
            </ul>
          </section>

          <section class="note">
            <h3>{{ t('通用说明', 'General notes') }}</h3>
            <ul>
              <li>
                <span class="badge badge-nodir">{{ t('非目录', 'No folder') }}</span>
                {{
                  t(
                    '再次说明：导入对话框不是资源管理器里的「打开文件夹」；若习惯整目录操作，请对 Spine 使用多选文件，或对 Live2D 使用单 zip。',
                    'Again: the import dialog is not “Open folder”. If you prefer folder workflows, use multi-select for Spine, or a single zip for Live2D.',
                  )
                }}
              </li>
              <li>{{ t('文件名与路径请使用 ASCII；文本编码建议 UTF-8。', 'Use ASCII file paths; prefer UTF-8 text encoding.') }}</li>
              <li>{{ t('本工具无后端，文件仅在本地浏览器中读取，不上传服务器。', 'This tool has no backend. Files are read locally in the browser and are not uploaded.') }}</li>
              <li>{{ t('若升级 Spine / DragonBones / 编辑器后导入异常，请先用目标版本重新导出，再对照各官方「运行时与数据版本」说明排查。', 'If import breaks after upgrading editors/runtimes, re-export with the target version and check official “runtime vs data version” notes.') }}</li>
            </ul>
          </section>
        </div>
        <div class="panel-foot">
          <button type="button" class="btn-primary" @click="emit('close')">{{ t('确定', 'OK') }}</button>
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
