'use client'

import { useState, useTransition } from 'react'
import { upsertQapUnitType, deleteQapUnitType } from '@/lib/qap-actions'
import type { QapUnitType } from '@/lib/db/schema'
import { Trash2, Plus } from 'lucide-react'

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

export function UnitMixTable({ dealId, initialUnits }: Props) {
  const [rows, setRows] = useState<UnitRow[]>(
    initialUnits.length > 0 ? initialUnits : [makeNewRow(dealId, 0)]
  )
  const [savedAt, setSavedAt] = useState<string | null>(null)
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

  const totalUnits = rows.reduce((s, r) => s + (r.num_units ?? 0), 0)
  const lihtcUnits = rows.reduce((s, r) => s + (r.is_lihtc ? (r.num_units ?? 0) : 0), 0)
  const avgRent =
    totalUnits > 0
      ? Math.round(rows.reduce((s, r) => s + (r.monthly_rent ?? 0) * (r.num_units ?? 0), 0) / totalUnits)
      : 0

  const thCls = 'text-left text-xs font-semibold text-muted-foreground px-2 py-2 whitespace-nowrap'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Unit Mix & Rents</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save on blur'}
        </span>
      </div>

      <table className="w-full text-sm border-collapse min-w-[860px]">
        <thead>
          <tr className="border-b border-border">
            <th className={thCls}>Unit Type</th>
            <th className={thCls}>Beds</th>
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
                  placeholder="e.g. 2BR/2BA"
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
