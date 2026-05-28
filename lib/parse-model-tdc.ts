// Generic underwriting-model parser. Scans EVERY sheet of an uploaded workbook
// for total-development-cost-type labels and returns ranked candidates with
// provenance. No assumptions about file name, sheet name, or cell location.

export interface TdcCandidate {
  value: number
  sheet: string
  cell: string      // e.g. "Sources & Uses!I79"
  label: string     // the matched label text
  priority: number  // lower = better
}

export interface ParsedModel {
  tdcCandidates: TdcCandidate[]
  sourcesCandidates: TdcCandidate[]
  bestTdc: TdcCandidate | null
  bestSources: TdcCandidate | null
}

// Prioritized label lists (index = priority). Matched case-insensitively.
const TDC_LABELS = [
  'total development cost',
  'total development costs',
  'total uses of funds',
  'total uses',
  'total project cost',
  'total project costs',
  'total replacement cost',
]
const SOURCES_LABELS = [
  'total sources of funds',
  'total sources',
]

const MAX_ROWS = 600
const MAX_COLS = 60

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[:*).]+$/g, '').replace(/\s+/g, ' ').trim()
}

/** Returns {priority} if the normalized text matches one of the labels, else null. */
function matchLabel(text: string, labels: string[]): number | null {
  const norm = normalize(text)
  if (!norm) return null
  // exact match first (best), then startsWith (penalized)
  let exact = labels.indexOf(norm)
  if (exact >= 0) return exact
  for (let i = 0; i < labels.length; i++) {
    if (norm.startsWith(labels[i])) return i + 100
  }
  return null
}

export async function parseModelTdc(buf: ArrayBuffer): Promise<ParsedModel> {
  const XLSX: any = await import('xlsx')
  const wb = XLSX.read(buf, { type: 'array' })

  const tdcCandidates: TdcCandidate[] = []
  const sourcesCandidates: TdcCandidate[] = []
  const seen = new Set<string>()

  for (const sheetName of wb.SheetNames as string[]) {
    const ws = wb.Sheets[sheetName]
    if (!ws || !ws['!ref']) continue
    const range = XLSX.utils.decode_range(ws['!ref'])
    const rEnd = Math.min(range.e.r, range.s.r + MAX_ROWS)
    const cEnd = Math.min(range.e.c, range.s.c + MAX_COLS)

    for (let r = range.s.r; r <= rEnd; r++) {
      for (let c = range.s.c; c <= cEnd; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })]
        if (!cell || typeof cell.v !== 'string') continue

        const tryAdd = (labels: string[], bucket: TdcCandidate[]) => {
          const pri = matchLabel(cell.v, labels)
          if (pri === null) return
          const found = rightmostNumber(XLSX, ws, r, c + 1, cEnd) ?? belowNumber(XLSX, ws, r, c)
          if (!found) return
          const key = `${sheetName}!${found.cell}=${found.value}`
          if (seen.has(key)) return
          seen.add(key)
          bucket.push({
            value: found.value,
            sheet: sheetName,
            cell: `${sheetName}!${found.cell}`,
            label: cell.v.trim(),
            priority: pri,
          })
        }

        tryAdd(TDC_LABELS, tdcCandidates)
        tryAdd(SOURCES_LABELS, sourcesCandidates)
      }
    }
  }

  const rank = (a: TdcCandidate, b: TdcCandidate) =>
    a.priority - b.priority || b.value - a.value
  tdcCandidates.sort(rank)
  sourcesCandidates.sort(rank)

  return {
    tdcCandidates,
    sourcesCandidates,
    bestTdc: tdcCandidates[0] ?? null,
    bestSources: sourcesCandidates[0] ?? null,
  }
}

/** Rightmost positive number in row r between columns [cStart, cEnd]. */
function rightmostNumber(
  XLSX: any, ws: any, r: number, cStart: number, cEnd: number
): { value: number; cell: string } | null {
  for (let c = cEnd; c >= cStart; c--) {
    const cell = ws[XLSX.utils.encode_cell({ r, c })]
    if (cell && typeof cell.v === 'number' && isFinite(cell.v) && cell.v > 0) {
      return { value: Math.round(cell.v), cell: XLSX.utils.encode_cell({ r, c }) }
    }
  }
  return null
}

/** Positive number directly below the label cell. */
function belowNumber(
  XLSX: any, ws: any, r: number, c: number
): { value: number; cell: string } | null {
  const cell = ws[XLSX.utils.encode_cell({ r: r + 1, c })]
  if (cell && typeof cell.v === 'number' && isFinite(cell.v) && cell.v > 0) {
    return { value: Math.round(cell.v), cell: XLSX.utils.encode_cell({ r: r + 1, c }) }
  }
  return null
}
