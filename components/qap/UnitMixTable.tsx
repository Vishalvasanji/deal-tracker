'use client'

import { useState, useTransition } from 'react'
import { upsertQapUnitType, deleteQapUnitType, replaceQapUnitTypes } from '@/lib/qap-actions'
import type { QapUnitType } from '@/lib/db/schema'
import { Trash2, Plus, ClipboardPaste, AlertTriangle } from 'lucide-react'

const AMI_OPTIONS = ['20', '30', '40', '50', '60', '70', '80', '120', 'unrestricted'] as const

const AMI_LABELS: Record<string, string> = {
  '20': '20% AMI', '30': '30% AMI', '40': '40% AMI', '50': '50% AMI',
  '60': '60% AMI', '70': '70% AMI', '80': '80% AMI', '120': '120% AMI',
  'unrestricted': 'Not Restricted',
}

const BR_LABELS = ['0 BR', '1 BR', '2 BR', '3 BR', '4 BR']
const BR_RANGE  = [0, 1, 2, 3, 4]

// LHC minimums — Excel AE44:AI44 (sqft) and AE45:AI45 (baths) indexed by bedroom count
const MIN_SQFT  = [450, 650, 800, 1100, 1400] // 0BR–4BR
const MIN_BATHS = [1, 1, 1, 2, 2.5]           // 0BR–4BR

type UnitRow = Omit<QapUnitType, 'updated_at'> & { isNew?: boolean }

interface Props {
  dealId: string
  initialUnits: QapUnitType[]
  /** Market rents by BR count (0–4) from §23.09 — s23_09_market_Xbr */
  marketRents?: Record<number, number>
  /** HUD FMR by BR count (0–4) from §23.10 — s23_10_fmr_Xbr */
  fmrRents?: Record<number, number>
  /** AMI contract rent limits by ami_key ('20'–'120') and BR count — derived from parish + §23.06 UAs */
  amiRentLimits?: Record<string, Record<number, number>>
}

const inputCls =
  'border-0 bg-transparent text-sm px-2 py-2 w-full focus:outline-none focus:ring-1 focus:ring-ring rounded'

function makeNewRow(dealId: string, rowIndex: number): UnitRow {
  return {
    id: `temp-${Date.now()}-${rowIndex}`,
    deal_id: dealId,
    row_index: rowIndex,
    label: null,
    bedrooms: null,
    baths: null,
    sqft: null,
    num_units: null,
    is_lihtc: 1,
    is_staff: 0,
    is_subsidy: 0,
    is_psh: 0,
    ami_restriction: '60',
    monthly_rent: null,
    isNew: true,
  }
}

function unitTypeLabel(bedrooms: number | null, baths: number | null): string {
  if (bedrooms == null && baths == null) return '—'
  return `${bedrooms ?? '?'} BR ${baths ?? '?'} Bath`
}

function parseBoolCol(val: string): number {
  return ['yes', 'y', '1', 'true', 'x', '✓'].includes(val.trim().toLowerCase()) ? 1 : 0
}

function parseAmiCol(val: string): string {
  const v = val.trim().replace(/%\s*(ami)?/i, '').trim().toLowerCase()
  if (!v || ['not restricted', 'unrestricted', 'nr', 'market', 'n/a'].includes(v)) return 'unrestricted'
  const num = parseInt(v, 10)
  return [20, 30, 40, 50, 60, 70, 80, 120].includes(num) ? String(num) : '60'
}

function parseNumCol(val: string): number | null {
  const n = parseFloat(val.replace(/[$,\s]/g, ''))
  return isNaN(n) ? null : Math.round(n)
}

function parseBathsCol(val: string): number | null {
  const n = parseFloat(val.replace(/[$,\s]/g, ''))
  return isNaN(n) ? null : n
}

function isSkipRow(cols: string[]): boolean {
  const first = cols[0]?.toLowerCase().trim() ?? ''
  if (!first) return true
  return ['# brs', 'brs', 'beds', 'bedrooms', 'unit type', 'type', '#', 'total', 'totals'].includes(first)
}

interface RentLimits {
  amiRentLimits?: Record<string, Record<number, number>>
  marketRents?:   Record<number, number>
  fmrRents?:      Record<number, number>
}

/**
 * Returns validation messages for a row.
 * Self-contained checks run always; rent-limit checks run when Section 23 data is provided.
 */
function getRowFlags(row: UnitRow, rentLimits?: RentLimits): string[] {
  const flags: string[] = []
  const hasUnits = (row.num_units ?? 0) > 0
  if (!hasUnits) return flags

  const br = row.bedrooms
  const inBrRange = br != null && br >= 0 && br <= 4

  // LIHTC + Staff mutual conflict (Excel counts staff only when LIHTC ≠ Yes)
  if (row.is_lihtc === 1 && row.is_staff === 1) {
    flags.push('Unit is checked both LIHTC and Staff — it will be counted as LIHTC only, not Staff')
  }

  // Flag 3 — Sqft below LHC minimum (Excel AO: IF(E<AJ,3,""))
  if (inBrRange && row.sqft != null && row.sqft < MIN_SQFT[br!]) {
    flags.push(`Sqft ${row.sqft.toLocaleString()} is below the LHC minimum of ${MIN_SQFT[br!].toLocaleString()} for ${br}BR`)
  }

  // Flag 4 — Baths below LHC minimum (Excel AP: IF(D<AK,4,""))
  if (inBrRange && row.baths != null && row.baths < MIN_BATHS[br!]) {
    flags.push(`${row.baths} baths is below the LHC minimum of ${MIN_BATHS[br!]} for ${br}BR`)
  }

  // Flag 5 — PSH rule: must be 0BR or 1BR at 30% AMI (Excel AQ)
  if (row.is_psh === 1) {
    const validBr = br === 0 || br === 1
    const valid30 = row.ami_restriction === '30'
    if (!validBr || !valid30) {
      const issues: string[] = []
      if (!validBr) issues.push('must be 0BR or 1BR')
      if (!valid30) issues.push('must be at 30% AMI')
      flags.push(`PSH rule violation: ${issues.join(' and ')}`)
    }
  }

  // Flag 7 — Staff unit rule: not LIHTC, not PSH, Not AMI Restricted, rent = $0 (Excel AS)
  if (row.is_staff === 1 && row.is_lihtc !== 1) {
    const issues: string[] = []
    if (row.is_psh === 1)                       issues.push('cannot also be PSH')
    if (row.ami_restriction !== 'unrestricted') issues.push('AMI must be Not Restricted')
    if ((row.monthly_rent ?? 0) !== 0)          issues.push('rent must be $0')
    if (issues.length > 0) flags.push(`Staff unit issue: ${issues.join(', ')}`)
  }

  const rent = row.monthly_rent
  if (rent != null && inBrRange) {
    // Flag 1 — Rent > AMI contract rent limit (Excel AM: IF(L>AG,1,""))
    const amiKey = row.ami_restriction
    if (amiKey && amiKey !== 'unrestricted' && rentLimits?.amiRentLimits) {
      const limit = rentLimits.amiRentLimits[amiKey]?.[br!]
      if (limit !== undefined && rent > limit) {
        flags.push(`Rent $${rent.toLocaleString()} exceeds the ${amiKey}% AMI contract rent limit of $${limit.toLocaleString()} for ${br}BR`)
      }
    }

    // Flag 2 — Rent > Market rate (Excel AN: IF(L>AI,2,""))
    if (rentLimits?.marketRents) {
      const market = rentLimits.marketRents[br!]
      if (market !== undefined && rent > market) {
        flags.push(`Rent $${rent.toLocaleString()} exceeds estimated market rent of $${market.toLocaleString()} for ${br}BR`)
      }
    }

    // Flag 6 — Rent > FMR (Excel AR: IF(L>AH,6,""))
    if (rentLimits?.fmrRents) {
      const fmr = rentLimits.fmrRents[br!]
      if (fmr !== undefined && rent > fmr) {
        flags.push(`Rent $${rent.toLocaleString()} exceeds HUD Fair Market Rent of $${fmr.toLocaleString()} for ${br}BR`)
      }
    }
  }

  return flags
}

export function UnitMixTable({ dealId, initialUnits, marketRents, fmrRents, amiRentLimits }: Props) {
  const rentLimits: RentLimits = { amiRentLimits, marketRents, fmrRents }
  const [rows, setRows] = useState<UnitRow[]>(
    initialUnits.length > 0 ? initialUnits : [makeNewRow(dealId, 0)]
  )
  const [savedAt, setSavedAt]     = useState<string | null>(null)
  const [pasteCount, setPasteCount] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  function updateRow(rowIndex: number, field: string, rawValue: string) {
    setRows(prev =>
      prev.map(r => {
        if (r.row_index !== rowIndex) return r
        let parsed: string | number | null = rawValue
        if (['bedrooms', 'sqft', 'num_units', 'monthly_rent', 'is_lihtc', 'is_staff', 'is_subsidy', 'is_psh'].includes(field)) {
          parsed = rawValue === '' ? null : parseInt(rawValue, 10)
        } else if (field === 'baths') {
          parsed = rawValue === '' ? null : parseFloat(rawValue)
        }
        return { ...r, [field]: parsed }
      })
    )
  }

  function saveRow(rowIndex: number, overrides: Partial<UnitRow> = {}) {
    const row = rows.find(r => r.row_index === rowIndex)
    if (!row) return
    const merged = { ...row, ...overrides }
    startTransition(async () => {
      await upsertQapUnitType(dealId, rowIndex, {
        label: null,
        bedrooms: merged.bedrooms,
        baths: merged.baths,
        sqft: merged.sqft,
        num_units: merged.num_units,
        is_lihtc: merged.is_lihtc ?? 1,
        is_staff: merged.is_staff ?? 0,
        is_subsidy: merged.is_subsidy ?? 0,
        is_psh: merged.is_psh ?? 0,
        ami_restriction: merged.ami_restriction ?? '60',
        monthly_rent: merged.monthly_rent,
      })
      setRows(prev => prev.map(r => (r.row_index === rowIndex ? { ...r, ...overrides, isNew: false } : r)))
      setSavedAt(new Date().toLocaleTimeString())
      setPasteCount(null)
    })
  }

  function addRow() {
    const nextIndex = rows.length > 0 ? Math.max(...rows.map(r => r.row_index)) + 1 : 0
    setRows(prev => [...prev, makeNewRow(dealId, nextIndex)])
  }

  function handleDelete(row: UnitRow) {
    startTransition(async () => {
      if (!row.isNew) await deleteQapUnitType(row.id, dealId)
      setRows(prev => prev.filter(r => r.row_index !== row.row_index))
    })
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const text = e.clipboardData.getData('text/plain')
    if (!text.trim()) return
    const lines    = text.trim().split(/\r?\n/).filter(l => l.trim())
    const allCols  = lines.map(l => l.split('\t').map(c => c.trim()))
    const dataLines = allCols.filter(cols => !isSkipRow(cols) && cols.length >= 2)
    if (dataLines.length === 0) return
    e.preventDefault()

    const newRows: UnitRow[] = dataLines.map((cols, idx) => ({
      id: `temp-${Date.now()}-${idx}`,
      deal_id: dealId,
      row_index: idx,
      label: null,
      bedrooms:      parseNumCol(cols[0] ?? ''),
      baths:         parseBathsCol(cols[1] ?? ''),
      sqft:          parseNumCol(cols[2] ?? ''),
      num_units:     parseNumCol(cols[3] ?? ''),
      is_lihtc:      parseBoolCol(cols[4] ?? '1'),
      is_staff:      parseBoolCol(cols[5] ?? '0'),
      is_subsidy:    parseBoolCol(cols[6] ?? '0'),
      is_psh:        parseBoolCol(cols[7] ?? '0'),
      ami_restriction: parseAmiCol(cols[8] ?? '60'),
      monthly_rent:  parseNumCol(cols[9] ?? ''),
      isNew: true,
    }))

    setRows(newRows)
    setPasteCount(newRows.length)
    startTransition(async () => {
      await replaceQapUnitTypes(
        dealId,
        newRows.map(r => ({
          row_index:       r.row_index,
          label:           null,
          bedrooms:        r.bedrooms,
          baths:           r.baths,
          sqft:            r.sqft,
          num_units:       r.num_units,
          is_lihtc:        r.is_lihtc   ?? 1,
          is_staff:        r.is_staff   ?? 0,
          is_subsidy:      r.is_subsidy ?? 0,
          is_psh:          r.is_psh     ?? 0,
          ami_restriction: r.ami_restriction ?? '60',
          monthly_rent:    r.monthly_rent,
        }))
      )
      setRows(prev => prev.map(r => ({ ...r, isNew: false })))
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  // ── Aggregations ─────────────────────────────────────────────────────────────

  const populated  = rows.filter(r => (r.num_units ?? 0) > 0)
  const totalUnits = rows.reduce((s, r) => s + (r.num_units ?? 0), 0)

  // LIHTC count: matches Excel col O — IF(G="Yes",F,0) — includes any row with LIHTC=1
  const lihtcUnits = rows.reduce((s, r) => s + (r.is_lihtc ? (r.num_units ?? 0) : 0), 0)

  // Staff count: matches Excel col P — IF(AND(H="Yes",G<>"Yes"),F,0) — excludes LIHTC rows
  const staffUnits   = rows.reduce((s, r) => s + (r.is_staff && !r.is_lihtc ? (r.num_units ?? 0) : 0), 0)
  const subsidyUnits = rows.reduce((s, r) => s + (r.is_subsidy ? (r.num_units ?? 0) : 0), 0)
  const pshUnits     = rows.reduce((s, r) => s + (r.is_psh ? (r.num_units ?? 0) : 0), 0)
  const residentialUnits = totalUnits - staffUnits

  const avgRent = totalUnits > 0
    ? Math.round(rows.reduce((s, r) => s + (r.monthly_rent ?? 0) * (r.num_units ?? 0), 0) / totalUnits)
    : 0

  // Units at-or-below AMI thresholds
  const amiAtOrBelow = (keys: string[]) =>
    rows.reduce((s, r) => s + (keys.includes(r.ami_restriction ?? '') ? (r.num_units ?? 0) : 0), 0)

  const unitsUnder20  = amiAtOrBelow(['20'])
  const unitsUnder30  = amiAtOrBelow(['20', '30'])
  const unitsUnder50  = amiAtOrBelow(['20', '30', '40', '50'])
  const unitsUnder60  = amiAtOrBelow(['20', '30', '40', '50', '60'])
  const unitsUnder80  = amiAtOrBelow(['20', '30', '40', '50', '60', '70', '80'])
  const unitsNotRestr = amiAtOrBelow(['unrestricted'])

  // Set-aside eligibility
  const pct4060  = totalUnits > 0 ? unitsUnder60 / totalUnits : 0
  const meets4060 = pct4060 >= 0.40
  const pct2050   = totalUnits > 0 ? unitsUnder50 / totalUnits : 0
  const meets2050  = pct2050 >= 0.20

  // LIHTC Income Average — weighted AMI of all LIHTC units with numeric restriction
  const lihtcWtdAmi = rows.reduce((s, r) => {
    if (!r.is_lihtc || r.ami_restriction === 'unrestricted') return s
    const ami = parseInt(r.ami_restriction ?? '', 10)
    return isNaN(ami) ? s : s + ami * (r.num_units ?? 0)
  }, 0)
  const lihtcIncomeAvg = lihtcUnits > 0 ? lihtcWtdAmi / lihtcUnits : 0

  // AMI × BR matrix (rows = AMI levels, cols = BR 0–4)
  const amiMatrix = AMI_OPTIONS.map(ami =>
    BR_RANGE.map(br =>
      rows.reduce((s, r) =>
        s + (r.ami_restriction === ami && r.bedrooms === br ? (r.num_units ?? 0) : 0), 0)
    )
  )
  const pshByBr  = BR_RANGE.map(br =>
    rows.reduce((s, r) => s + (r.is_psh === 1 && r.bedrooms === br ? (r.num_units ?? 0) : 0), 0)
  )
  const brTotals = BR_RANGE.map(br =>
    rows.reduce((s, r) => s + (r.bedrooms === br ? (r.num_units ?? 0) : 0), 0)
  )

  const totalFlags = rows.reduce((s, r) => s + getRowFlags(r, rentLimits).length, 0)

  // ── Styles ────────────────────────────────────────────────────────────────────

  const col = {
    unitType: 'w-36',
    brs:      'w-16',
    baths:    'w-16',
    sqft:     'w-24',
    units:    'w-20',
    flag:     'w-16',
    ami:      'w-28',
    rent:     'w-28',
    warn:     'w-8',
    del:      'w-10',
  }
  const thCls   = 'text-left text-xs font-semibold text-muted-foreground px-3 py-3 whitespace-nowrap'
  const tdCls   = 'px-2 py-1.5'
  const statLbl = 'text-xs text-muted-foreground'
  const statVal = 'text-xs font-semibold tabular-nums'

  return (
    <div className="space-y-6" onPaste={handlePaste}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Unit Mix & Rents</h2>
        <span className="text-xs text-muted-foreground">
          {isPending
            ? 'Saving…'
            : savedAt
            ? pasteCount
              ? `Pasted ${pasteCount} rows · Saved ${savedAt}`
              : `Saved at ${savedAt}`
            : 'Changes save on blur'}
        </span>
      </div>

      {/* Paste hint */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2.5">
        <ClipboardPaste className="h-3.5 w-3.5 shrink-0" />
        <span>
          Copy the blue input cells from the Mickens Model unit mix tab and paste here (Ctrl+V / ⌘V).
          Unit Type is auto-generated by the QAP Excel formula.
        </span>
      </div>

      {/* Flag summary banner */}
      {totalFlags > 0 && (
        <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            {totalFlags} validation {totalFlags === 1 ? 'issue' : 'issues'} found — see flagged rows and the details section below.
          </span>
        </div>
      )}

      {/* Main table */}
      <div className="overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className={`${thCls} ${col.unitType} text-muted-foreground/60`}>Unit Type</th>
              <th className={`${thCls} ${col.brs}  text-center`}>BRs</th>
              <th className={`${thCls} ${col.baths} text-center`}>Baths</th>
              <th className={`${thCls} ${col.sqft}  text-right`}>Sqft</th>
              <th className={`${thCls} ${col.units} text-center`}># Units</th>
              <th className={`${thCls} ${col.flag}  text-center`}>LIHTC</th>
              <th className={`${thCls} ${col.flag}  text-center`}>Staff</th>
              <th className={`${thCls} ${col.flag}  text-center`}>Sub</th>
              <th className={`${thCls} ${col.flag}  text-center`}>PSH</th>
              <th className={`${thCls} ${col.ami}`}>AMI %</th>
              <th className={`${thCls} ${col.rent}  text-right`}>Rent / mo</th>
              <th className={`${thCls} ${col.warn}`} />
              <th className={`${thCls} ${col.del}`}  />
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const flags    = getRowFlags(row, rentLimits)
              const hasFlags = flags.length > 0
              const br       = row.bedrooms
              const inBr     = br != null && br >= 0 && br <= 4
              const badSqft  = inBr && row.sqft  != null && row.sqft  < MIN_SQFT[br!]
              const badBaths = inBr && row.baths != null && row.baths < MIN_BATHS[br!]

              return (
                <tr
                  key={row.row_index}
                  className={`border-b border-border/40 hover:bg-muted/20 transition-colors ${hasFlags ? 'bg-amber-50/30' : ''}`}
                >
                  {/* Unit Type — read-only */}
                  <td className={`${tdCls} ${col.unitType} text-sm text-muted-foreground whitespace-nowrap pl-3`}>
                    {unitTypeLabel(row.bedrooms, row.baths)}
                  </td>

                  {/* BRs */}
                  <td className={`${tdCls} ${col.brs}`}>
                    <input
                      className={inputCls + ' text-center'}
                      type="number" min={0} max={5}
                      value={row.bedrooms ?? ''}
                      onChange={e => updateRow(row.row_index, 'bedrooms', e.target.value)}
                      onBlur={() => saveRow(row.row_index)}
                    />
                  </td>

                  {/* Baths — highlighted when below minimum */}
                  <td className={`${tdCls} ${col.baths}`}>
                    <input
                      className={`${inputCls} text-center ${badBaths ? 'text-amber-700 font-medium' : ''}`}
                      type="number" min={0} step={0.5}
                      value={row.baths ?? ''}
                      onChange={e => updateRow(row.row_index, 'baths', e.target.value)}
                      onBlur={() => saveRow(row.row_index)}
                    />
                  </td>

                  {/* Sqft — highlighted when below minimum */}
                  <td className={`${tdCls} ${col.sqft}`}>
                    <input
                      className={`${inputCls} text-right ${badSqft ? 'text-amber-700 font-medium' : ''}`}
                      type="number"
                      value={row.sqft ?? ''}
                      onChange={e => updateRow(row.row_index, 'sqft', e.target.value)}
                      onBlur={() => saveRow(row.row_index)}
                    />
                  </td>

                  {/* # Units */}
                  <td className={`${tdCls} ${col.units}`}>
                    <input
                      className={inputCls + ' text-center'}
                      type="number" min={0}
                      value={row.num_units ?? ''}
                      onChange={e => updateRow(row.row_index, 'num_units', e.target.value)}
                      onBlur={() => saveRow(row.row_index)}
                    />
                  </td>

                  {/* Flag checkboxes */}
                  {(['is_lihtc', 'is_staff', 'is_subsidy', 'is_psh'] as const).map(flag => (
                    <td key={flag} className={`${tdCls} ${col.flag} text-center`}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded cursor-pointer"
                        checked={(row[flag] ?? 0) === 1}
                        onChange={e => {
                          const newVal = e.target.checked ? 1 : 0
                          updateRow(row.row_index, flag, String(newVal))
                          saveRow(row.row_index, { [flag]: newVal })
                        }}
                      />
                    </td>
                  ))}

                  {/* AMI % */}
                  <td className={`${tdCls} ${col.ami}`}>
                    <select
                      className={inputCls}
                      value={row.ami_restriction ?? '60'}
                      onChange={e => {
                        updateRow(row.row_index, 'ami_restriction', e.target.value)
                        saveRow(row.row_index, { ami_restriction: e.target.value })
                      }}
                    >
                      {AMI_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>
                          {opt === 'unrestricted' ? 'Not Restricted' : `${opt}%`}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Rent / mo */}
                  <td className={`${tdCls} ${col.rent}`}>
                    <input
                      className={inputCls + ' text-right'}
                      type="number"
                      value={row.monthly_rent ?? ''}
                      onChange={e => updateRow(row.row_index, 'monthly_rent', e.target.value)}
                      onBlur={() => saveRow(row.row_index)}
                      placeholder="$"
                    />
                  </td>

                  {/* Flags indicator */}
                  <td className={`${tdCls} ${col.warn} text-center`}>
                    {hasFlags && (
                      <span title={flags.join('\n')} className="cursor-help inline-block">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mx-auto" />
                      </span>
                    )}
                  </td>

                  {/* Delete */}
                  <td className={`${tdCls} ${col.del} text-center`}>
                    <button
                      onClick={() => handleDelete(row)}
                      className="text-muted-foreground hover:text-rose-500 transition-colors p-1 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>

          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/20 font-medium">
                <td className="px-3 py-2.5 text-xs text-muted-foreground" colSpan={3}>Totals</td>
                {/* Weighted sqft */}
                <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                  {rows.reduce((s, r) => s + (r.sqft ?? 0) * (r.num_units ?? 0), 0).toLocaleString()}
                </td>
                {/* Total units */}
                <td className="px-3 py-2.5 text-center text-sm tabular-nums">{totalUnits}</td>
                {/* LIHTC */}
                <td className="px-3 py-2.5 text-center text-xs text-muted-foreground" title="LIHTC units">
                  {lihtcUnits > 0 ? lihtcUnits : ''}
                </td>
                {/* Staff */}
                <td className="px-3 py-2.5 text-center text-xs text-muted-foreground" title="Staff units (non-LIHTC)">
                  {staffUnits > 0 ? staffUnits : ''}
                </td>
                {/* Subsidy */}
                <td className="px-3 py-2.5 text-center text-xs text-muted-foreground" title="Rental subsidy units">
                  {subsidyUnits > 0 ? subsidyUnits : ''}
                </td>
                {/* PSH */}
                <td className="px-3 py-2.5 text-center text-xs text-muted-foreground" title="PSH units">
                  {pshUnits > 0 ? pshUnits : ''}
                </td>
                <td />
                {/* Avg rent */}
                <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                  {avgRent > 0 ? `$${avgRent.toLocaleString()} avg` : ''}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Add row */}
      <button
        onClick={addRow}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add unit type
      </button>

      {/* ── Summary Section (only when rows exist) ────────────────────────────── */}
      {populated.length > 0 && (
        <div className="space-y-5 pt-2 border-t border-border/40">

          {/* AMI × Bedroom matrix */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Unit Mix Summary
            </p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-36">AMI Level</th>
                    {BR_LABELS.map(l => (
                      <th key={l} className="text-center px-3 py-2 font-semibold text-muted-foreground w-16">{l}</th>
                    ))}
                    <th className="text-center px-3 py-2 font-semibold text-muted-foreground w-16">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {AMI_OPTIONS.map((ami, i) => {
                    const rowTotal = amiMatrix[i].reduce((s, v) => s + v, 0)
                    if (rowTotal === 0) return null
                    return (
                      <tr key={ami} className="border-b border-border/30 last:border-b-0">
                        <td className="px-3 py-2 font-medium text-foreground">{AMI_LABELS[ami]}</td>
                        {amiMatrix[i].map((count, j) => (
                          <td key={j} className="px-3 py-2 text-center tabular-nums">
                            {count > 0 ? count : <span className="text-muted-foreground/30">—</span>}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center tabular-nums font-semibold">{rowTotal}</td>
                      </tr>
                    )
                  })}
                  {/* PSH row */}
                  {pshUnits > 0 && (
                    <tr className="border-t border-border bg-muted/10">
                      <td className="px-3 py-2 text-muted-foreground italic">PSH Units</td>
                      {pshByBr.map((count, j) => (
                        <td key={j} className="px-3 py-2 text-center tabular-nums text-muted-foreground">
                          {count > 0 ? count : <span className="text-muted-foreground/30">—</span>}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center tabular-nums text-muted-foreground font-semibold">{pshUnits}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/20">
                    <td className="px-3 py-2 font-semibold text-foreground">Total Units</td>
                    {brTotals.map((count, j) => (
                      <td key={j} className="px-3 py-2 text-center tabular-nums font-semibold">
                        {count > 0 ? count : <span className="text-muted-foreground/30">—</span>}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center tabular-nums font-bold">{totalUnits}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {/* Unit Counts */}
            <div className="rounded-xl border border-border px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unit Counts</p>
              <div className="flex justify-between">
                <span className={statLbl}>Total</span>
                <span className={statVal}>{totalUnits}</span>
              </div>
              <div className="flex justify-between">
                <span className={statLbl}>Residential</span>
                <span className={statVal}>{residentialUnits}</span>
              </div>
              <div className="flex justify-between">
                <span className={statLbl}>LIHTC</span>
                <span className={statVal}>
                  {lihtcUnits}{totalUnits > 0 ? ` (${Math.round(lihtcUnits / totalUnits * 100)}%)` : ''}
                </span>
              </div>
              {staffUnits > 0 && (
                <div className="flex justify-between">
                  <span className={statLbl}>Staff</span>
                  <span className={statVal}>{staffUnits}</span>
                </div>
              )}
              {subsidyUnits > 0 && (
                <div className="flex justify-between">
                  <span className={statLbl}>Rental Subsidy</span>
                  <span className={statVal}>{subsidyUnits}</span>
                </div>
              )}
              {pshUnits > 0 && (
                <div className="flex justify-between">
                  <span className={statLbl}>PSH</span>
                  <span className={statVal}>
                    {pshUnits}{totalUnits > 0 ? ` (${Math.round(pshUnits / totalUnits * 100)}%)` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* AMI Thresholds */}
            <div className="rounded-xl border border-border px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">AMI Breakdown</p>
              {unitsUnder20 > 0 && (
                <div className="flex justify-between">
                  <span className={statLbl}>At 20% AMI</span>
                  <span className={statVal}>{unitsUnder20}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className={statLbl}>≤30% AMI</span>
                <span className={statVal}>{unitsUnder30}</span>
              </div>
              <div className="flex justify-between">
                <span className={statLbl}>≤50% AMI</span>
                <span className={statVal}>{unitsUnder50}</span>
              </div>
              <div className="flex justify-between">
                <span className={statLbl}>≤60% AMI</span>
                <span className={statVal}>{unitsUnder60}</span>
              </div>
              <div className="flex justify-between">
                <span className={statLbl}>≤80% AMI</span>
                <span className={statVal}>{unitsUnder80}</span>
              </div>
              {unitsNotRestr > 0 && (
                <div className="flex justify-between">
                  <span className={statLbl}>Not Restricted</span>
                  <span className={statVal}>{unitsNotRestr}</span>
                </div>
              )}
            </div>

            {/* Set-Aside Eligibility */}
            <div className="rounded-xl border border-border px-4 py-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Set-Aside Eligibility</p>
              <div className="space-y-0.5">
                <div className="flex justify-between items-baseline">
                  <span className={statLbl}>40/60 set-aside</span>
                  <span className={`${statVal} ${meets4060 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {Math.round(pct4060 * 100)}%
                  </span>
                </div>
                <p className={`text-xs ${meets4060 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {meets4060 ? '✓ Meets' : '✗ Does not meet'} (need ≥40% at ≤60%)
                </p>
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between items-baseline">
                  <span className={statLbl}>20/50 set-aside</span>
                  <span className={`${statVal} ${meets2050 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {Math.round(pct2050 * 100)}%
                  </span>
                </div>
                <p className={`text-xs ${meets2050 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {meets2050 ? '✓ Meets' : '✗ Does not meet'} (need ≥20% at ≤50%)
                </p>
              </div>
            </div>

            {/* LIHTC Metrics */}
            <div className="rounded-xl border border-border px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">LIHTC Metrics</p>
              {lihtcIncomeAvg > 0 && (
                <div className="flex justify-between">
                  <span className={statLbl}>Income Average</span>
                  <span className={statVal}>{lihtcIncomeAvg.toFixed(1)}% AMI</span>
                </div>
              )}
              {avgRent > 0 && (
                <div className="flex justify-between">
                  <span className={statLbl}>Avg Rent / mo</span>
                  <span className={statVal}>${avgRent.toLocaleString()}</span>
                </div>
              )}
              {marketRents && Object.keys(marketRents).length > 0 && (
                <div className="flex justify-between">
                  <span className={statLbl}>Market rents</span>
                  <span className={`text-xs font-medium text-emerald-600`}>✓ Loaded</span>
                </div>
              )}
              {fmrRents && Object.keys(fmrRents).length > 0 && (
                <div className="flex justify-between">
                  <span className={statLbl}>HUD FMRs</span>
                  <span className={`text-xs font-medium text-emerald-600`}>✓ Loaded</span>
                </div>
              )}
              {amiRentLimits && Object.keys(amiRentLimits).length > 0 && (
                <div className="flex justify-between">
                  <span className={statLbl}>AMI rent limits</span>
                  <span className={`text-xs font-medium text-emerald-600`}>✓ Loaded</span>
                </div>
              )}
              {(!marketRents || !fmrRents || !amiRentLimits) && (
                <p className="text-xs text-muted-foreground/60 pt-1 leading-relaxed">
                  {[
                    !amiRentLimits && 'AMI limits (enter parish in §12.01 + UAs in §23.06)',
                    !marketRents  && 'Market rents (§23.09)',
                    !fmrRents     && 'FMRs (§23.10)',
                  ].filter(Boolean).join(' · ')} not yet entered.
                </p>
              )}
            </div>
          </div>

          {/* Validation detail list */}
          {totalFlags > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Validation Issues</p>
              <ul className="space-y-1.5">
                {rows.flatMap(row =>
                  getRowFlags(row, rentLimits).map((msg, i) => (
                    <li key={`${row.row_index}-${i}`} className="text-xs text-amber-700 flex gap-2 items-start">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>
                        <span className="font-medium">
                          Row {row.row_index + 1} ({unitTypeLabel(row.bedrooms, row.baths)}):
                        </span>{' '}
                        {msg}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
