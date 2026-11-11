// Flat-lay image: one PNG with a column per outfit. Layout is pure (testable);
// drawing uses a canvas in the browser.
import type { Outfit, OutfitPieces } from './engine/types.ts'
import type { Piece } from './types.ts'

export const W = 2000
export const H = 1000
const MARGIN = 80
const TITLE_BOTTOM = 150
const ART_BOTTOM = 800
const COL_GAP = 70
const GAP = 22

export interface Box { x: number; y: number; w: number; h: number }
export interface Placed extends Box { piece: Piece }
export interface Size { w: number; h: number }

// Relative heights keep proportions realistic: trousers taller than tops, bags and shoes smaller.
const LEFT: [keyof OutfitPieces, number][] = [['coat', 1.35], ['light', 0.95], ['top', 1], ['shoes', 0.5]]
const RIGHT_BAG: [keyof OutfitPieces, number][] = [['bag', 0.6], ['accessory', 0.28]]

export const columnWidth = (n: number) => (W - MARGIN * 2 - COL_GAP * (n - 1)) / n
export const columnX = (i: number, n: number) => MARGIN + i * (columnWidth(n) + COL_GAP)

/** Fit an image of the given size inside a box, centered, never upscaled past 1.6x. */
function fit(size: Size, box: Box): Box {
  const s = Math.min(box.w / size.w, box.h / size.h)
  const w = size.w * s
  const h = size.h * s
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h }
}

/** Stack items top to bottom in a box, heights proportional to weight. */
function stack(items: { piece: Piece; weight: number }[], box: Box, sizes: Record<string, Size>): Placed[] {
  if (!items.length) return []
  const total = items.reduce((s, i) => s + i.weight, 0)
  const room = box.h - GAP * (items.length - 1)
  let y = box.y
  return items.map(({ piece, weight }) => {
    const h = (room * weight) / total
    const slot = { x: box.x, y, w: box.w, h }
    y += h + GAP
    return { piece, ...fit(sizes[piece.code] ?? { w: 1, h: 1 }, slot) }
  })
}

export function layoutOutfit(o: OutfitPieces, index: number, count: number, sizes: Record<string, Size>): Placed[] {
  const cw = columnWidth(count)
  const x0 = columnX(index, count)
  const half = (cw - GAP) / 2
  const top = TITLE_BOTTOM
  const height = ART_BOTTOM - TITLE_BOTTOM

  const left = LEFT.filter(([r]) => o[r]).map(([r, weight]) => ({ piece: o[r]!, weight }))

  const bagItems = RIGHT_BAG.filter(([r]) => o[r]).map(([r, weight]) => ({ piece: o[r]!, weight }))
  const lower: { piece: Piece; weight: number }[] = []
  if (o.onepiece) lower.push({ piece: o.onepiece, weight: 2.1 })
  if (o.bottom) lower.push({ piece: o.bottom, weight: 1.7 })
  if (o.legwear) lower.push({ piece: o.legwear, weight: 1.0 })

  const bagH = bagItems.length ? height * 0.3 : 0
  const gap = bagItems.length ? GAP : 0
  return [
    ...stack(left, { x: x0, y: top, w: half, h: height }, sizes),
    ...stack(bagItems, { x: x0 + half + GAP, y: top, w: half, h: bagH }, sizes),
    ...stack(lower, { x: x0 + half + GAP, y: top + bagH + gap, w: half, h: height - bagH - gap }, sizes),
  ]
}

export function hasOverlap(placed: Placed[]): boolean {
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i], b = placed[j]
      if (a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5) return true
    }
  }
  return false
}

/** About 20 words: the "how it feels" sentences of the when-to-wear note, whole sentences only. */
export function blurbOf(o: Outfit, max = 20): string {
  const parts = o.note.split(/(?<=\.)\s+/)
  const sentences = parts.length > 1 ? parts.slice(1) : parts
  const count = (t: string) => t.split(/\s+/).length
  let out = ''
  for (const sentence of sentences) {
    const next = out ? `${out} ${sentence}` : sentence
    if (out && count(next) > max + 4) break
    out = next
  }
  if (count(out) > max + 8) out = out.split(/\s+/).slice(0, max).join(' ').replace(/[,;:]$/, '') + '…'
  return out
}

export function wrap(measure: (s: string) => number, text: string, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (line && measure(next) > width) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

export function flatlayFilename(date: string, occasion: string, n: number): string {
  return `${date} ${occasion.replace(/[\\/:*?"<>|]/g, '')} - ${n} options.png`
}

// ---------- drawing (browser only) ----------

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"
const INK = '#3b2a20'
const GREY = '#9a8f84'

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

export async function renderFlatlay(
  outfits: Outfit[],
  title: string,
  urlOf: (p: Piece) => string | null,
): Promise<HTMLCanvasElement> {
  const pieces = new Map<string, Piece>()
  for (const o of outfits) for (const p of Object.values(o.pieces)) if (p) pieces.set(p.code, p)
  const images = new Map<string, HTMLImageElement>()
  await Promise.all(
    [...pieces.values()].map(async (p) => {
      const url = urlOf(p)
      const img = url ? await loadImage(url) : null
      if (img) images.set(p.code, img)
    }),
  )
  const sizes: Record<string, Size> = {}
  for (const [code, img] of images) sizes[code] = { w: img.naturalWidth, h: img.naturalHeight }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#efe5d4'
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = INK
  ctx.textBaseline = 'alphabetic'
  ctx.font = `600 54px ${SERIF}`
  ctx.fillText(title, MARGIN, 105)

  const n = outfits.length
  const cw = columnWidth(n)
  outfits.forEach((o, i) => {
    const placed = layoutOutfit(o.pieces, i, n, sizes)
    for (const p of placed) {
      const img = images.get(p.piece.code)
      if (img) {
        ctx.save()
        ctx.shadowColor = 'rgba(59, 42, 32, 0.28)'
        ctx.shadowBlur = 18
        ctx.shadowOffsetY = 8
        ctx.drawImage(img, p.x, p.y, p.w, p.h)
        ctx.restore()
      } else {
        ctx.fillStyle = GREY
        ctx.font = `28px ${SERIF}`
        ctx.textAlign = 'center'
        ctx.fillText(`${p.piece.code}`, p.x + p.w / 2, p.y + p.h / 2)
        ctx.textAlign = 'left'
      }
    }

    // captions
    const x = columnX(i, n)
    const codes = Object.values(o.pieces).filter((p): p is Piece => Boolean(p)).map((p) => p.code).join(' ')
    ctx.font = `15px ${SERIF}`
    const codesW = ctx.measureText(codes).width
    let size = 28
    const head = `${o.id}  ${o.title} · ${o.mood}`
    ctx.font = `600 ${size}px ${SERIF}`
    while (size > 18 && ctx.measureText(head).width > cw - codesW - 16) {
      size -= 1
      ctx.font = `600 ${size}px ${SERIF}`
    }
    let shown = head
    while (shown.length > 4 && ctx.measureText(shown).width > cw - codesW - 16) shown = shown.slice(0, -2)
    if (shown !== head) shown = shown.trimEnd() + '…'
    ctx.fillStyle = INK
    ctx.fillText(shown, x, ART_BOTTOM + 50)
    ctx.font = `15px ${SERIF}`
    ctx.fillStyle = GREY
    ctx.textAlign = 'right'
    ctx.fillText(codes, x + cw, ART_BOTTOM + 50)
    ctx.textAlign = 'left'

    ctx.font = `19px ${SERIF}`
    ctx.fillStyle = '#6f6054'
    wrap((s) => ctx.measureText(s).width, blurbOf(o), cw).slice(0, 4).forEach((line, k) => {
      ctx.fillText(line, x, ART_BOTTOM + 90 + k * 27)
    })
  })
  return canvas
}
