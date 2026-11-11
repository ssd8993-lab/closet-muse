// Imports the closet from a local folder into public/closet-data/ (git-ignored).
//
// Usage:
//   npm run import -- "/path/to/Closet"
//   CLOSET_DIR="/path/to/Closet" npm run import
//
// Expects:
//   <Closet>/Closet Inventory.md
//   <Closet>/Lookbook/Pieces_cutout/<photo code>.webp
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, existsSync, rmSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseInventory } from './parse-inventory.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const closetDir = resolve(process.argv[2] || process.env.CLOSET_DIR || '')
if (!process.argv[2] && !process.env.CLOSET_DIR) {
  console.error('Tell me where the Closet folder is:\n  npm run import -- "/path/to/Closet"')
  process.exit(2)
}

const inventoryPath = join(closetDir, 'Closet Inventory.md')
const cutoutDir = join(closetDir, 'Lookbook', 'Pieces_cutout')
if (!existsSync(inventoryPath)) {
  console.error(`Cannot find ${inventoryPath}`)
  process.exit(2)
}

const { pieces, problems } = parseInventory(readFileSync(inventoryPath, 'utf8'))

// Match cutouts to pieces by photo code.
const cutouts = new Set(
  existsSync(cutoutDir) ? readdirSync(cutoutDir).filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5)) : [],
)
const codes = new Set(pieces.map((p) => p.code))
for (const p of pieces) {
  if (cutouts.has(p.code)) p.cutout = `cutouts/${p.code}.webp`
  else {
    p.cutout = null
    problems.push({ line: null, code: p.code, level: 'warning', message: 'No cutout image found' })
  }
}
for (const c of cutouts) {
  if (!codes.has(c)) problems.push({ line: null, code: c, level: 'warning', message: 'Cutout has no row in the inventory' })
}

const errors = problems.filter((p) => p.level === 'error')
const warnings = problems.filter((p) => p.level === 'warning')
const show = (p) => `  ${p.level.toUpperCase()}${p.line ? ` line ${p.line}` : ''}${p.code ? ` [${p.code}]` : ''}: ${p.message}`

if (errors.length) {
  console.error(`Found ${errors.length} error(s); nothing was imported:`)
  errors.forEach((p) => console.error(show(p)))
  process.exit(1)
}

const outDir = join(root, 'public', 'closet-data')
rmSync(outDir, { recursive: true, force: true })
mkdirSync(join(outDir, 'cutouts'), { recursive: true })
for (const p of pieces) {
  if (p.cutout) copyFileSync(join(cutoutDir, `${p.code}.webp`), join(outDir, p.cutout))
}
writeFileSync(
  join(outDir, 'closet.json'),
  JSON.stringify({ importedAt: new Date().toISOString(), pieces }, null, 2),
)

const byCategory = {}
for (const p of pieces) byCategory[p.category] = (byCategory[p.category] || 0) + 1
console.log(`Imported ${pieces.length} pieces (${pieces.filter((p) => p.cutout).length} with cutouts) into public/closet-data/`)
console.log(Object.entries(byCategory).map(([k, v]) => `${k} ${v}`).join(' · '))
if (warnings.length) {
  console.log(`${warnings.length} warning(s):`)
  warnings.slice(0, 25).forEach((p) => console.log(show(p)))
  if (warnings.length > 25) console.log(`  ...and ${warnings.length - 25} more`)
}
