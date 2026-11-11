# Closet Muse

Personal AI stylist: weather-aware outfit suggestions and flat-lays built only from pieces in my own closet.

Status: MVP in progress (local web page first). Scope and dates are in the project charter.

## What works now

- Import `Closet Inventory.md` and the cutout images (with a validation report).
- Browse and filter the closet: category, search, rain-safe only.

Next: forecast and day type, rule-based outfit engine, flat-lays, swap, wear log.

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install

# Import your closet (point at your Closet folder). Personal data stays out of git.
npm run import -- "/path/to/Closet"

npm run dev        # opens the page at http://localhost:5173
```

The importer reads `Closet Inventory.md` and `Lookbook/Pieces_cutout/<code>.webp`, checks every row,
and writes `public/closet-data/` (ignored by git). It stops with a list of errors if a row is invalid,
and prints warnings for things like a missing cutout.

## Other commands

```bash
npm test           # parser tests
npm run build      # type-check and build the static page into dist/
```

## Privacy

Closet photos and the inventory are never committed (see `.gitignore`). Do not host the built page
publicly with your closet data inside it; sign-in and private storage come before any phone or hosted use.
