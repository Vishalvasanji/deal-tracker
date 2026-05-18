'use client'

import { useState, useTransition } from 'react'
import { upsertQapUnitType, deleteQapUnitType, replaceQapUnitTypes } from '@/lib/qap-actions'
import type { QapUnitType } from '@/lib/db/schema'
import { Trash2, Plus, ClipboardPaste } from 'lucide-react'

const AMI_OPTIONS = ['20', '30', '40', '50', '60', '70', '80', '120', 'unrestricted'] as const

type UnitRow = Omit<QapUnitType, 'updated_at'> & { isNew?: boolean }

interface Props {
  dealId: string
  initialUnits: QapUnitType[]
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
  if (!bedrooms && !baths) return '—'
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

export function UnitMixTable({ dealId, initialUnits }: Props) {
  const [rows, setRows] = useState<UnitRow[]>(
    initialUnits.length > 0 ? initialUnits : [makeNewRow(dealId, 0)]
  )
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [pasteCount, setPasteCount] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  function updateRow(rowIndex: number, field: string, rawValue: string) {
    setRows(prev =>
      prev.map(r => {
        if (r.row_index !== rowIndex) return r
        let parsed: string | number | null = rawValue
        if (
          ['bedrooms', 'sqft', 'num_units', 'monthly_rent', 'is_lihtc', 'is_staff', 'is_subsidy', 'is_psh'].includes(field)
        ) {
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
      setRows(prev =>
        prev.map(r => (r.row_index === rowIndex ? { ...r, ...overrides, isNew: false } : r))
      )
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

    const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
    const allCols = lines.map(l => l.split('\t').map(c => c.trim()))
    const dataLines = allCols.filter(cols => !isSkipRow(cols) && cols.length >= 2)
    if (dataLines.length === 0) return

    e.preventDefault()

    const newRows: UnitRow[] = dataLines.map((cols, idx) => ({
      id: `temp-${Date.now()}-${idx}`,
      deal_id: dealId,
      row_index: idx,
      label: null,
      bedrooms: parseNumCol(cols[0] ?? ''),
      baths: parseBathsCol(cols[1] ?? ''),
      sqft: parseNumCol(cols[2] ?? ''),
      num_units: parseNumCol(cols[3] ?? ''),
      is_lihtc: parseBoolCol(cols[4] ?? '1'),
      is_staff: parseBoolCol(cols[5] ?? '0'),
      is_subsidy: parseBoolCol(cols[6] ?? '0'),
      is_psh: parseBoolCol(cols[7] ?? '0'),
      ami_restriction: parseAmiCol(cols[8] ?? '60'),
      monthly_rent: parseNumCol(cols[9] ?? ''),
      isNew: true,
    }))

    setRows(newRows)
    setPasteCount(newRows.length)

    startTransition(async () => {
      await replaceQapUnitTypes(
        dealId,
        newRows.map(r => ({
          row_index: r.row_index,
          label: null,
          bedrooms: r.bedrooms,
          baths: r.baths,
          sqft: r.sqft,
          num_units: r.num_units,
          is_lihtc: r.is_lihtc ?? 1,
          is_staff: r.is_staff ?? 0,
          is_subsidy: r.is_subsidy ?? 0,
          is_psh: r.is_psh ?? 0,
          ami_restriction: r.ami_restriction ?? '60',
          monthly_rent: r.monthly_rent,
        }))
      )
      setRows(prev => prev.map(r => ({ ...r, isNew: false })))
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  const totalUnits = rows.reduce((s, r) => s + (r.num_units ?? 0), 0)
  const lihtcUnits = rows.reduce((s, r) => s + (r.is_lihtc ? (r.num_units ?? 0) : 0), 0)
  const avgRent =
    totalUnits > 0
      ? Math.round(
          rows.reduce((s, r) => s + (r.monthly_rent ?? 0) * (r.num_units ?? 0), 0) / totalUnits
        )
      : 0

  // Column widths — fixed so nothing truncates
  const col = {
    unitType: 'w-36',   // "2 BR 2.5 Bath"
    brs:      'w-16',   // "2"
    baths:    'w-16',   // "2.5"
    sqft:     'w-24',   // "1,100"
    units:    'w-20',   // "24"
    flag:     'w-16',   // checkbox columns
    ami:      'w-28',   // "Not Restricted" dropdown
    rent:     'w-28',   // "$1,759"
    del:      'w-10',
  }

  const thCls = 'text-left text-xs font-semibold text-muted-foreground px-3 py-3 whitespace-nowrap'
  const tdCls = 'px-2 py-1.5'

  return (
    <div className="space-y-4" onPaste={handlePaste}>
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

      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2.5">
        <ClipboardPaste className="h-3.5 w-3.5 shrink-0" />
        <span>
          Copy the blue input cells from the Mickens Model unit mix tab and paste here (Ctrl+V / ⌘V).
          Unit Type is auto-generated by the QAP Excel formula.
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className={`${thCls} ${col.unitType} text-muted-foreground/60`}>Unit Type</th>
              <th className={`${thCls} ${col.brs} text-center`}>BRs</th>
              <th className={`${thCls} ${col.baths} text-center`}>Baths</th>
              <th className={`${thCls} ${col.sqft} text-right`}>Sqft</th>
              <th className={`${thCls} ${col.units} text-center`}># Units</th>
              <th className={`${thCls} ${col.flag} text-center`}>LIHTC</th>
              <th className={`${thCls} ${col.flag} text-center`}>Staff</th>
              <th className={`${thCls} ${col.flag} text-center`}>Sub</th>
              <th className={`${thCls} ${col.flag} text-center`}>PSH</th>
              <th className={`${thCls} ${col.ami}`}>AMI %</th>
              <th className={`${thCls} ${col.rent} text-right`}>Rent / mo</th>
              <th className={`${thCls} ${col.del}`} />
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.row_index} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
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
                {/* Baths */}
                <td className={`${tdCls} ${col.baths}`}>
                  <input
                    className={inputCls + ' text-center'}
                    type="number" min={0} step={0.5}
                    value={row.baths ?? ''}
                    onChange={e => updateRow(row.row_index, 'baths', e.target.value)}
                    onBlur={() => saveRow(row.row_index)}
                  />
                </td>
                {/* Sqft */}
                <td className={`${tdCls} ${col.sqft}`}>
                  <input
                    className={inputCls + ' text-right'}
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
                {/* Rent/mo */}
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
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/20 font-medium">
                <td className="px-3 py-2.5 text-xs text-muted-foreground" colSpan={3}>Totals</td>
                <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                  {rows.reduce((s, r) => s + (r.sqft ?? 0) * (r.num_units ?? 0), 0).toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-center text-sm tabular-nums">{totalUnits}</td>
                <td className="px-3 py-2.5 text-center text-xs text-muted-foreground" colSpan={4}>
                  {lihtcUnits} LIHTC
                </td>
                <td />
                <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                  {avgRent > 0 ? `$${avgRent.toLocaleString()} avg` : ''}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <button
        onClick={addRow}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add unit type
      </button>
    </div>
  )
}
