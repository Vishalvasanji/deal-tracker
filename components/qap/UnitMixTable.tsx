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

const cellCls =
  'border-0 bg-transparent text-sm px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-ring rounded'

function makeNewRow(dealId: string, rowIndex: number): UnitRow {
  return {
    id: `temp-${Date.now()}-${rowIndex}`,
    deal_id: dealId,
    row_index: rowIndex,
    label: '',
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

// --- paste helpers ---
// Paste format (from Mickens Model blue cells):
// Col 0: # BRs | Col 1: # Baths | Col 2: Sqft | Col 3: # Units
// Col 4: LIHTC | Col 5: Staff Unit | Col 6: Subsidy | Col 7: PSH
// Col 8: % AMI | Col 9: Net Rent
// Unit Type label is auto-generated from BRs + Baths

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

function makeLabel(bedroomsRaw: string, bathsRaw: string): string {
  const beds = parseInt(bedroomsRaw, 10)
  const baths = bathsRaw.trim()
  if (!beds) return ''
  return `${beds} BR ${baths} Bath`
}

function isSkipRow(cols: string[]): boolean {
  const first = cols[0]?.toLowerCase().trim() ?? ''
  if (!first) return true
  // Skip header rows and totals
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
        label: merged.label,
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

    // Column mapping: BRs | Baths | Sqft | Units | LIHTC | Staff | Subsidy | PSH | AMI% | Net Rent
    const newRows: UnitRow[] = dataLines.map((cols, idx) => ({
      id: `temp-${Date.now()}-${idx}`,
      deal_id: dealId,
      row_index: idx,
      label: makeLabel(cols[0] ?? '', cols[1] ?? ''),
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
          label: r.label,
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

  const thCls = 'text-left text-xs font-semibold text-muted-foreground px-2 py-2 whitespace-nowrap'

  return (
    <div className="space-y-3" onPaste={handlePaste}>
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

      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
        <ClipboardPaste className="h-3.5 w-3.5 shrink-0" />
        <span>
          Copy the blue input cells from the Mickens Model unit mix tab and paste here (Ctrl+V / ⌘V).
          Unit Type is auto-generated from BRs + Baths.
        </span>
      </div>

      <table className="w-full text-sm border-collapse min-w-[860px]">
        <thead>
          <tr className="border-b border-border">
            <th className={thCls}>Unit Type</th>
            <th className={thCls}>BRs</th>
            <th className={thCls}>Baths</th>
            <th className={thCls}>Sqft</th>
            <th className={thCls}># Units</th>
            <th className={thCls}>LIHTC</th>
            <th className={thCls}>Staff</th>
            <th className={thCls}>Sub</th>
            <th className={thCls}>PSH</th>
            <th className={thCls}>AMI %</th>
            <th className={thCls}>Rent/mo</th>
            <th className={thCls} />
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.row_index} className="border-b border-border/50 hover:bg-muted/30">
              <td className="px-1 py-1">
                <input
                  className={cellCls}
                  placeholder="auto-generated"
                  value={row.label ?? ''}
                  onChange={e => updateRow(row.row_index, 'label', e.target.value)}
                  onBlur={() => saveRow(row.row_index)}
                />
              </td>
              <td className="px-1 py-1 w-14">
                <input
                  className={cellCls + ' text-center'}
                  type="number"
                  min={0}
                  max={5}
                  value={row.bedrooms ?? ''}
                  onChange={e => updateRow(row.row_index, 'bedrooms', e.target.value)}
                  onBlur={() => saveRow(row.row_index)}
                />
              </td>
              <td className="px-1 py-1 w-14">
                <input
                  className={cellCls + ' text-center'}
                  type="number"
                  min={0}
                  step={0.5}
                  value={row.baths ?? ''}
                  onChange={e => updateRow(row.row_index, 'baths', e.target.value)}
                  onBlur={() => saveRow(row.row_index)}
                />
              </td>
              <td className="px-1 py-1 w-20">
                <input
                  className={cellCls + ' text-right'}
                  type="number"
                  value={row.sqft ?? ''}
                  onChange={e => updateRow(row.row_index, 'sqft', e.target.value)}
                  onBlur={() => saveRow(row.row_index)}
                />
              </td>
              <td className="px-1 py-1 w-16">
                <input
                  className={cellCls + ' text-center'}
                  type="number"
                  min={0}
                  value={row.num_units ?? ''}
                  onChange={e => updateRow(row.row_index, 'num_units', e.target.value)}
                  onBlur={() => saveRow(row.row_index)}
                />
              </td>
              {(['is_lihtc', 'is_staff', 'is_subsidy', 'is_psh'] as const).map(flag => (
                <td key={flag} className="px-1 py-1 text-center w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded"
                    checked={(row[flag] ?? 0) === 1}
                    onChange={e => {
                      const newVal = e.target.checked ? 1 : 0
                      updateRow(row.row_index, flag, String(newVal))
                      saveRow(row.row_index, { [flag]: newVal })
                    }}
                  />
                </td>
              ))}
              <td className="px-1 py-1 w-28">
                <select
                  className={cellCls}
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
              <td className="px-1 py-1 w-24">
                <input
                  className={cellCls + ' text-right'}
                  type="number"
                  value={row.monthly_rent ?? ''}
                  onChange={e => updateRow(row.row_index, 'monthly_rent', e.target.value)}
                  onBlur={() => saveRow(row.row_index)}
                  placeholder="$"
                />
              </td>
              <td className="px-1 py-1 w-8">
                <button
                  onClick={() => handleDelete(row)}
                  className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-border font-medium">
              <td className="px-2 py-2 text-xs text-muted-foreground" colSpan={4}>
                Totals
              </td>
              <td className="px-2 py-2 text-center text-sm">{totalUnits}</td>
              <td className="px-2 py-2 text-center text-xs text-muted-foreground">
                {lihtcUnits} LIHTC
              </td>
              <td colSpan={4} />
              <td className="px-2 py-2 text-right text-sm">
                {avgRent > 0 ? `$${avgRent.toLocaleString()} avg` : ''}
              </td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>

      <button
        onClick={addRow}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
      >
        <Plus className="h-4 w-4" />
        Add unit type
      </button>
    </div>
  )
}
