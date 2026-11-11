// Parses "Closet Inventory.md" into structured pieces and reports problems.
// Row format (one piece per line):
// Category | Item | Color | Details | Vibe/Use | Weight | Layer | Over sweater | Rain-safe | Warmth | Formality | Photo code

const DASHES = new Set(['–', '—', '-', ''])

const WEIGHTS = ['light', 'mid', 'heavy']
const LAYERS = ['base', 'mid', 'outer']
const FORMALITIES = ['casual', 'smart', 'dressy']

// Which slot of a flat-lay each category fills.
const SLOT_BY_CATEGORY = {
  Tops: 'top',
  Sweaters: 'top',
  Outerwear: 'outer',
  Bottoms: 'bottom',
  Skirts: 'bottom',
  Dresses: 'onepiece',
  Rompers: 'onepiece',
  Jumpsuits: 'onepiece',
  Sets: 'onepiece',
  Shoes: 'shoes',
  Bags: 'bag',
  Accessories: 'accessory',
}

// Categories where weight, layer and warmth are legitimately "–".
const NO_LAYER = new Set(['Shoes', 'Bags', 'Accessories'])
const NO_WEIGHT = new Set(['Bags', 'Accessories'])
const NO_WARMTH = new Set(['Bags', 'Accessories'])

const isDash = (v) => DASHES.has(v.trim())

export function parseInventory(text) {
  const pieces = []
  const problems = []
  const seen = new Map()

  const lines = text.split(/\r?\n/)
  lines.forEach((raw, i) => {
    const lineNo = i + 1
    const m = raw.match(/^\* `(.*)`\s*$/)
    if (!m) {
      if (/^\s*\*/.test(raw)) {
        problems.push({ line: lineNo, code: null, level: 'error', message: 'Row is not wrapped in backticks' })
      }
      return
    }
    const f = m[1].split('|').map((x) => x.trim())
    if (f.length !== 12) {
      problems.push({ line: lineNo, code: null, level: 'error', message: `Expected 12 fields, found ${f.length}` })
      return
    }
    const [category, item, color, details, vibe, weight, layer, overSweater, rainSafe, warmth, formality, code] = f
    const err = (message) => problems.push({ line: lineNo, code, level: 'error', message })
    const warn = (message) => problems.push({ line: lineNo, code, level: 'warning', message })

    if (!(category in SLOT_BY_CATEGORY)) err(`Unknown category "${category}"`)
    if (!code) err('Missing photo code')
    if (!item) err('Missing item name')
    if (!color) err('Missing color')

    // weight
    let w = null
    if (isDash(weight)) {
      if (!NO_WEIGHT.has(category)) err('Weight is "–" but this category needs light, mid or heavy')
    } else if (WEIGHTS.includes(weight)) w = weight
    else err(`Weight "${weight}" is not light, mid or heavy`)

    // layer
    let l = null
    if (isDash(layer)) {
      if (!NO_LAYER.has(category)) err('Layer is "–" but this category needs base, mid or outer')
    } else if (LAYERS.includes(layer)) l = layer
    else err(`Layer "${layer}" is not base, mid or outer`)

    // over sweater
    let os = null
    if (isDash(overSweater)) os = null
    else if (overSweater === 'yes') os = true
    else if (overSweater === 'no') os = false
    else err(`Over sweater "${overSweater}" is not yes, no or –`)
    if (os !== null && l !== 'outer') warn('Over sweater is set on a piece that is not an outer layer')

    // rain-safe
    let rs = false
    if (rainSafe === 'yes') rs = true
    else if (rainSafe === 'no') rs = false
    else err(`Rain-safe "${rainSafe}" is not yes or no`)

    // warmth
    let wm = null
    if (isDash(warmth)) {
      if (!NO_WARMTH.has(category)) err('Warmth is "–" but this category needs 1, 2 or 3')
    } else if (['1', '2', '3'].includes(warmth)) wm = Number(warmth)
    else err(`Warmth "${warmth}" is not 1, 2 or 3`)

    // formality
    if (!FORMALITIES.includes(formality)) err(`Formality "${formality}" is not casual, smart or dressy`)

    // duplicates
    if (code) {
      if (seen.has(code)) err(`Duplicate photo code, first seen on line ${seen.get(code)}`)
      else seen.set(code, lineNo)
    }

    // sanity warnings
    const blob = `${item} ${color} ${details}`.toLowerCase()
    if (blob.includes('suede') && rs) warn('Suede item marked rain-safe')
    const excluded = /excluded/i.test(vibe)
    if (blob.includes('grey') && blob.includes('jeans') && !excluded) warn('Grey jeans are in the closet and not marked excluded')

    pieces.push({
      code,
      category,
      slot: SLOT_BY_CATEGORY[category] ?? null,
      item,
      color,
      details,
      vibe,
      weight: w,
      layer: l,
      overSweater: os,
      rainSafe: rs,
      warmth: wm,
      formality: FORMALITIES.includes(formality) ? formality : null,
      excluded,
    })
  })

  return { pieces, problems }
}
