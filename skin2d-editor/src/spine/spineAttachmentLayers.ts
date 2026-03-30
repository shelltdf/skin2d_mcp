/**
 * 拆分 Spine Canvas 绘制：Region（贴图）与 Mesh（网格变形）。
 * 基于 @esotericsoftware/spine-canvas 的 SkeletonRenderer 内部逻辑，遵守 Spine Runtimes 许可。
 */
import type { Color, Slot } from '@esotericsoftware/spine-core'
import { MeshAttachment, RegionAttachment, Skeleton } from '@esotericsoftware/spine-core'
import { SkeletonRenderer } from '@esotericsoftware/spine-canvas'

/** RegionAttachment：走官方 drawImages（sprite/四边形贴图） */
export function drawSpineRegionAttachments(renderer: SkeletonRenderer, skeleton: Skeleton): void {
  const r = renderer as unknown as { drawImages(s: Skeleton): void }
  r.drawImages(skeleton)
}

export type SpineRegionWireOptions = {
  /** 是否绘制 RegionAttachment 的四边形边框（清晰绿色） */
  drawWire: boolean
}

/** RegionAttachment：绘制贴图四边形边框（用于“贴图网格线”覆盖普通贴图） */
export function drawSpineRegionWires(
  ctx: CanvasRenderingContext2D,
  skeleton: Skeleton,
  options: SpineRegionWireOptions,
): void {
  if (!options.drawWire) return

  const drawOrder = skeleton.drawOrder
  const tmp = new Float32Array(8)
  for (let i = 0, n = drawOrder.length; i < n; i++) {
    const slot = drawOrder[i]
    const attachment = slot.getAttachment()
    if (!(attachment instanceof RegionAttachment)) continue

    // (x0,y0,x1,y1,x2,y2,x3,y3) in world space
    attachment.computeWorldVertices(slot, tmp, 0, 2)
    ctx.save()
    ctx.globalAlpha = 1
    ctx.strokeStyle = '#15803d'
    ctx.lineWidth = strokeWidthForCrispGreen(ctx)
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(tmp[0], tmp[1])
    ctx.lineTo(tmp[2], tmp[3])
    ctx.lineTo(tmp[4], tmp[5])
    ctx.lineTo(tmp[6], tmp[7])
    ctx.closePath()
    ctx.stroke()
    ctx.restore()
  }
}

/** 屏幕空间约 2px 的线宽（当前变换为世界缩放后的用户单位） */
function strokeWidthForCrispGreen(ctx: CanvasRenderingContext2D): number {
  const sc = Math.abs(ctx.getTransform().a) || 1
  return Math.max(1.15, 2.25 / sc)
}

export type SpineMeshDrawOptions = {
  /** 是否绘制网格的纹理三角（MeshAttachment 的贴图） */
  drawTexture: boolean
  /** 是否绘制网格三角边线（清晰绿色） */
  drawWire: boolean
}

/** MeshAttachment：绘制贴图网格（纹理 + 三角剖分），可选绿色线框以便辨认网格 */
export function drawSpineMeshAttachments(
  renderer: SkeletonRenderer,
  skeleton: Skeleton,
  options: SpineMeshDrawOptions,
): void {
  const r = renderer as unknown as {
    ctx: CanvasRenderingContext2D
    vertices: Float32Array
    tempColor: Color
    debugRendering: boolean
    computeMeshVertices: (slot: Slot, mesh: MeshAttachment, pma: boolean) => Float32Array
    drawTriangle: (
      img: CanvasImageSource,
      x0: number,
      y0: number,
      u0: number,
      v0: number,
      x1: number,
      y1: number,
      u1: number,
      v1: number,
      x2: number,
      y2: number,
      u2: number,
      v2: number,
    ) => void
  }

  const ctx = r.ctx
  const color = r.tempColor
  const skeletonColor = skeleton.color
  const drawOrder = skeleton.drawOrder
  let vertices = r.vertices

  for (let i = 0, n = drawOrder.length; i < n; i++) {
    const slot = drawOrder[i]
    const attachment = slot.getAttachment()
    if (!(attachment instanceof MeshAttachment)) continue
    const mesh = attachment
    vertices = r.computeMeshVertices(slot, mesh, false)
    const tris = mesh.triangles
    const region = mesh.region
    if (!region) continue

    const slotColor = slot.color
    const attachmentColor = attachment.color
    color.set(
      skeletonColor.r * slotColor.r * attachmentColor.r,
      skeletonColor.g * slotColor.g * attachmentColor.g,
      skeletonColor.b * slotColor.b * attachmentColor.b,
      skeletonColor.a * slotColor.a * attachmentColor.a,
    )
    ctx.globalAlpha = color.a

    const texture = options.drawTexture ? region.texture.getImage() : null

    for (let j = 0; j < tris.length; j += 3) {
      const t1 = tris[j] * 8
      const t2 = tris[j + 1] * 8
      const t3 = tris[j + 2] * 8
      const x0 = vertices[t1]
      const y0 = vertices[t1 + 1]
      const u0 = vertices[t1 + 6]
      const v0 = vertices[t1 + 7]
      const x1 = vertices[t2]
      const y1 = vertices[t2 + 1]
      const u1 = vertices[t2 + 6]
      const v1 = vertices[t2 + 7]
      const x2 = vertices[t3]
      const y2 = vertices[t3 + 1]
      const u2 = vertices[t3 + 6]
      const v2 = vertices[t3 + 7]
      if (texture) {
        r.drawTriangle(texture, x0, y0, u0, v0, x1, y1, u1, v1, x2, y2, u2, v2)
      }
      if (options.drawWire) {
        ctx.save()
        ctx.globalAlpha = 1
        ctx.strokeStyle = '#15803d'
        ctx.lineWidth = strokeWidthForCrispGreen(ctx)
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.lineTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.closePath()
        ctx.stroke()
        ctx.restore()
      }
    }
  }
  ctx.globalAlpha = 1
}
