'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'
import { PARISH_DATA } from '@/lib/qap-parish-data'

const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const selectCls = inputCls
const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'
const activeBtn = 'bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-medium'
const inactiveBtn = 'bg-muted text-muted-foreground rounded-lg px-4 py-1.5 text-sm'
const subHeaderCls = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide'
const noteCls = 'text-xs text-muted-foreground rounded-lg px-3 py-2 bg-muted/50'
const readOnlyCell = 'text-right text-sm tabular-nums px-2 py-1.5 bg-muted/30 rounded text-foreground'
const pendingCell = 'text-right text-sm tabular-nums px-2 py-1.5 text-muted-foreground italic'

// Cooking & hot-water fuel = Controls!A127:A130 (4 opts). Heating fuel (§23.04) = Controls!A120:A125 (6, incl. Propane/Oil).
const FUEL_OPTS = ['Natural Gas', 'Electric', 'Other', 'Missing']
const HOT_WATER_FUEL_OPTS = ['Natural Gas', 'Electric', 'Other', 'Missing']
const HEAT_FUEL_OPTS = ['Natural Gas', 'Electric', 'Propane', 'Oil', 'Other', 'Missing']
const HEAT_SYSTEM_OPTS = ['Forced Air', 'Hot Water', 'Other', 'Missing']
const PAYER_OPTS = ['Owner', 'Tenant', 'Missing']
const YES_NO_OPTS = ['Yes', 'No', 'Missing']

// 4-person AMI by Louisiana parish (source: 2025 QAP Excel, Parishes sheet col B × 2)
const PARISH_AMI: Record<string, number> = {
  'Acadia': 69200,
  'Allen': 65200,
  'Ascension': 91700,
  'Assumption': 77200,
  'Avoyelles': 54700,
  'Beauregard': 85000,
  'Bienville': 55300,
  'Bossier': 81700,
  'Caddo': 81700,
  'Calcasieu': 91100,
  'Caldwell': 86800,
  'Cameron': 91100,
  'Catahoula': 65700,
  'Claiborne': 47300,
  'Concordia': 54000,
  'Desoto': 81700,
  'East Baton Rouge': 91700,
  'East Carroll': 39900,
  'East Feliciana': 91700,
  'Evangeline': 58100,
  'Franklin': 58700,
  'Grant': 78000,
  'Iberia': 75500,
  'Iberville': 79000,
  'Jackson': 60400,
  'Jefferson': 89800,
  'Jefferson Davis': 80600,
  'Lafayette': 84700,
  'Lafourche': 75700,
  'Lasalle': 92200,
  'Lincoln': 70800,
  'Livingston': 91700,
  'Madison': 50400,
  'Morehouse': 54100,
  'Natchitoches': 72600,
  'Orleans': 89800,
  'Ouachita': 73400,
  'Plaquemines': 89800,
  'Pointe Coupee': 91700,
  'Rapides': 78000,
  'Red River': 63400,
  'Richland': 69100,
  'Sabine': 68600,
  'St. Bernard': 89800,
  'St. Charles': 89800,
  'St. Helena': 91700,
  'St. James': 94700,
  'St. John': 89800,
  'St. Landry': 62800,
  'St. Martin': 84700,
  'St. Mary': 70600,
  'St. Tammany': 98000,
  'Tangipahoa': 80400,
  'Tensas': 54900,
  'Terrebonne': 75700,
  'Union': 73400,
  'Vermilion': 80300,
  'Vernon': 71800,
  'Washington': 64900,
  'Webster': 53200,
  'West Baton Rouge': 91700,
  'West Carroll': 77000,
  'West Feliciana': 91700,
  'Winn': 68000,
}

const AMI_LEVELS = [
  { label: '120% AMI', pct: 1.20 },
  { label: '20% AMI',  pct: 0.20 },
  { label: '30% AMI',  pct: 0.30 },
  { label: '40% AMI',  pct: 0.40 },
  { label: '50% AMI',  pct: 0.50 },
  { label: '60% AMI',  pct: 0.60 },
  { label: '70% AMI',  pct: 0.70 },
  { label: '80% AMI',  pct: 0.80 },
]

const BR_LABELS = ['0BR', '1BR', '2BR', '3BR', '4BR']

/**
 * Calculates gross rent limits per the QAP AMI Rents sheet formula.
 */
function calcGrossRents(ami4: number, amiPct: number): [number, number, number, number, number] {
  const inc4 = Math.round(ami4 * amiPct)
  const inc1 = Math.round(inc4 * 0.70 / 50) * 50
  const inc2 = Math.round(inc4 * 0.80 / 50) * 50
  const inc3 = Math.round(inc4 * 0.90 / 50) * 50
  const inc5 = Math.round(inc4 * 1.08 / 50) * 50
  const inc6 = Math.round(inc4 * 1.16 / 50) * 50

  const br0 = Math.floor(inc1 * 0.3 / 12)
  const br1 = Math.floor(((inc1 + inc2) / 2) * 0.3 / 12)
  const br2 = Math.floor(inc3 * 0.3 / 12)
  const br3 = Math.floor(((inc4 + inc5) / 2) * 0.3 / 12)
  const br4 = Math.floor(inc6 * 0.3 / 12)

  return [br0, br1, br2, br3, br4]
}

interface Props {
  dealId: string
  initial: Record<string, string>
  parish: string
  /** H-5: Whether the project has tax-exempt bond financing */
  bondFinancing?: boolean
}

export function Section23Form({ dealId, initial, parish, bondFinancing }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [isPending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<string | null>(null)

  function save(fk: string, val: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_23', fk, val)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  function handleSelect(fk: string, val: string) {
    setValues(prev => ({ ...prev, [fk]: val }))
    save(fk, val)
  }

  function handleBlur(fk: string, val: string) {
    save(fk, val)
  }

  function YesNoToggle({ fk, label }: { fk: string; label: string }) {
    return (
      <div className="space-y-1.5">
        <label className={labelCls}>{label}</label>
        <div className="flex gap-2 flex-wrap">
          {YES_NO_OPTS.map(opt => (
            <button key={opt} type="button"
              onClick={() => handleSelect(fk, opt)}
              className={values[fk] === opt ? activeBtn : inactiveBtn}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Derive 4-person AMI from the parish selected in §12.01
  const ami4 = PARISH_AMI[parish] ?? 0
  const hasAmi = ami4 > 0

  // Utility allowances by bedroom
  const ua = [0, 1, 2, 3, 4].map(i => parseInt(values[`s23_06_ua_${['0','1','2','3','4'][i]}br`] ?? '0') || 0)

  const amenities: { fk: string; label: string }[] = [
    { fk: 's23_04_oven_range', label: 'Oven / Range' },
    { fk: 's23_04_refrigerator', label: 'Refrigerator' },
    { fk: 's23_04_microwave', label: 'Microwave' },
    { fk: 's23_04_dishwasher', label: 'Dishwasher' },
    { fk: 's23_04_garbage_disposal', label: 'Garbage Disposal' },
    { fk: 's23_04_washer_dryer', label: 'Washer / Dryer' },
    { fk: 's23_04_washer_dryer_hookup', label: 'Washer / Dryer Hookup' },
  ]

  const utilityRows: { label: string; fuelFk?: string; fuelOpts?: string[]; payerFk: string }[] = [
    { label: 'Cooking',          fuelFk: 's23_05_cooking_fuel',   fuelOpts: FUEL_OPTS,           payerFk: 's23_05_cooking_payer' },
    { label: 'Other / Lighting',                                                                    payerFk: 's23_05_lighting_payer' },
    { label: 'Hot Water',        fuelFk: 's23_05_hot_water_fuel', fuelOpts: HOT_WATER_FUEL_OPTS,  payerFk: 's23_05_hot_water_payer' },
    { label: 'Water',                                                                               payerFk: 's23_05_water_payer' },
    { label: 'Heating',                                                                             payerFk: 's23_05_heating_payer' },
    { label: 'Air Conditioning',                                                                    payerFk: 's23_05_ac_payer' },
    { label: 'Sewer',                                                                               payerFk: 's23_05_sewer_payer' },
    { label: 'Trash Collection',                                                                    payerFk: 's23_05_trash_payer' },
  ]

  const ua06Keys     = ['s23_06_ua_0br', 's23_06_ua_1br', 's23_06_ua_2br', 's23_06_ua_3br', 's23_06_ua_4br']
  const market09Keys = ['s23_09_market_0br', 's23_09_market_1br', 's23_09_market_2br', 's23_09_market_3br', 's23_09_market_4br']
  const brInputLabels = ['0 Bedroom ($)', '1 Bedroom ($)', '2 Bedroom ($)', '3 Bedroom ($)', '4 Bedroom ($)']

  // Shared rent table component
  function RentTable({ title, getCellValue, note }: {
    title: string
    getCellValue: (amiPct: number, brIdx: number) => number | null
    note?: string
  }) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">{title}</p>
        {note && <p className={noteCls}>{note}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1.5 pr-3 text-xs font-semibold text-muted-foreground w-24">AMI Level</th>
                {BR_LABELS.map(br => (
                  <th key={br} className="text-right py-1.5 px-2 text-xs font-semibold text-muted-foreground">{br}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AMI_LEVELS.map(({ label, pct }) => (
                <tr key={label} className="border-b border-border/30">
                  <td className="py-1.5 pr-3 text-xs font-medium text-muted-foreground">{label}</td>
                  {[0, 1, 2, 3, 4].map(brIdx => {
                    const val = getCellValue(pct, brIdx)
                    return (
                      <td key={brIdx} className="py-1.5 px-2">
                        {val === null
                          ? <span className={pendingCell}>—</span>
                          : <span className={readOnlyCell}>${val.toLocaleString()}</span>
                        }
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!hasAmi && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Select the project parish in §12.01 to populate this table.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Section 23 — Information Related to Rent Limits</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      {/* 23.01 */}
      <div className="space-y-3">
        <p className={subHeaderCls}>23.01 National Non-Metropolitan Income Limit</p>
        <YesNoToggle fk="s23_01_nonmetro_income_limit" label="Use the national non-metropolitan income limit for this project?" />
        {values['s23_01_nonmetro_income_limit'] === 'Yes' && (
          <p className={noteCls}>
            You are electing to use the national non-metropolitan income limit for this project per Housing Act Section 520.
          </p>
        )}
        {/* H-5: Bond financing conflict with non-metro election */}
        {values['s23_01_nonmetro_income_limit'] === 'Yes' && bondFinancing === true && (
          <p className="text-xs rounded-lg px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700">
            Error: The national non-metropolitan income limit election cannot be used for projects with tax-exempt bond financing. Projects with bond financing must use the applicable area median income.
          </p>
        )}
      </div>

      {/* 23.02 — Parish-driven AMI (read-only display) */}
      <div className="space-y-3">
        <p className={subHeaderCls}>23.02 4-Person AMI &amp; Comment</p>
        <p className={noteCls}>
          The 4-person AMI is determined automatically from the parish selected in §12.01. It drives the Gross Rent and Contract Rent tables below.
        </p>
        <div className="flex items-center gap-4">
          <div>
            <p className={labelCls}>Parish (from §12.01)</p>
            <p className="text-sm font-medium text-foreground">
              {parish || <span className="text-muted-foreground italic">Not selected — go to §12.01</span>}
            </p>
          </div>
          <div>
            <p className={labelCls}>4-Person AMI</p>
            <p className="text-sm font-semibold text-foreground tabular-nums">
              {hasAmi ? `$${ami4.toLocaleString()}` : <span className="text-muted-foreground italic">—</span>}
            </p>
          </div>
        </div>
        <div>
          <label className={labelCls}>Comment on AMI information</label>
          <textarea
            className={inputCls}
            rows={2}
            value={values['s23_02_comment'] ?? ''}
            onChange={e => setValues(prev => ({ ...prev, s23_02_comment: e.target.value }))}
            onBlur={e => handleBlur('s23_02_comment', e.target.value)}
          />
        </div>
      </div>

      {/* 23.03 — Gross Rents Table */}
      <div className="space-y-3">
        <p className={subHeaderCls}>23.03 AMI Gross Rent Limits</p>
        <RentTable
          title='"Gross" Rent Limits for AMI-Restricted Units'
          getCellValue={(pct, brIdx) => {
            if (!hasAmi) return null
            return calcGrossRents(ami4, pct)[brIdx]
          }}
        />
      </div>

      {/* 23.04 */}
      <div className="space-y-4">
        <p className={subHeaderCls}>23.04 Amenities and Heating System</p>

        <p className="text-xs font-semibold text-muted-foreground">Amenities included in units</p>
        <div className="grid grid-cols-2 gap-4">
          {amenities.map(({ fk, label }) => (
            <YesNoToggle key={fk} fk={fk} label={label} />
          ))}
        </div>

        <p className="text-xs font-semibold text-muted-foreground mt-2">Heating System</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Heating Fuel</label>
            <select
              className={selectCls}
              value={values['s23_04_heating_fuel'] ?? ''}
              onChange={e => handleSelect('s23_04_heating_fuel', e.target.value)}
            >
              <option value="">Select…</option>
              {HEAT_FUEL_OPTS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>System Type</label>
            <select
              className={selectCls}
              value={values['s23_04_system_type'] ?? ''}
              onChange={e => handleSelect('s23_04_system_type', e.target.value)}
            >
              <option value="">Select…</option>
              {HEAT_SYSTEM_OPTS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Comment</label>
          <textarea
            className={inputCls}
            rows={2}
            value={values['s23_04_comment'] ?? ''}
            onChange={e => setValues(prev => ({ ...prev, s23_04_comment: e.target.value }))}
            onBlur={e => handleBlur('s23_04_comment', e.target.value)}
          />
        </div>
      </div>

      {/* 23.05 */}
      <div className="space-y-3">
        <p className={subHeaderCls}>23.05 Utilities Information</p>
        <p className={noteCls}>
          For each utility, select who pays (Owner or Tenant). For Cooking and Hot Water, also select the fuel type.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground w-40">Utility</th>
                <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">Fuel Type</th>
                <th className="text-left py-2 text-xs font-semibold text-muted-foreground">Payer</th>
              </tr>
            </thead>
            <tbody>
              {utilityRows.map(({ label, fuelFk, fuelOpts, payerFk }) => (
                <tr key={payerFk} className="border-b border-border/30">
                  <td className="py-2 pr-4 text-sm font-medium">{label}</td>
                  <td className="py-2 pr-4">
                    {fuelFk && fuelOpts ? (
                      <select
                        className="rounded-lg border border-input bg-background px-2 py-1 text-xs w-40 focus:outline-none focus:ring-2 focus:ring-ring"
                        value={values[fuelFk] ?? ''}
                        onChange={e => handleSelect(fuelFk, e.target.value)}
                      >
                        <option value="">Select…</option>
                        {fuelOpts.map(o => <option key={o}>{o}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2">
                    <select
                      className="rounded-lg border border-input bg-background px-2 py-1 text-xs w-32 focus:outline-none focus:ring-2 focus:ring-ring"
                      value={values[payerFk] ?? ''}
                      onChange={e => handleSelect(payerFk, e.target.value)}
                    >
                      <option value="">Select…</option>
                      {PAYER_OPTS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <label className={labelCls}>Comment</label>
          <textarea
            className={inputCls}
            rows={2}
            value={values['s23_05_comment'] ?? ''}
            onChange={e => setValues(prev => ({ ...prev, s23_05_comment: e.target.value }))}
            onBlur={e => handleBlur('s23_05_comment', e.target.value)}
          />
        </div>
      </div>

      {/* 23.06 */}
      <div className="space-y-3">
        <p className={subHeaderCls}>23.06 Utility Allowances (for LIHTC Units)</p>
        <p className={noteCls}>The Checklist will include a request for appropriate documentation. UAs are subtracted from gross rents to produce contract rents in §23.07.</p>
        <div className="grid grid-cols-5 gap-3">
          {ua06Keys.map((fk, i) => (
            <div key={fk}>
              <label className={labelCls}>{brInputLabels[i]}</label>
              <input
                type="number"
                className={inputCls}
                value={values[fk] ?? ''}
                onChange={e => setValues(prev => ({ ...prev, [fk]: e.target.value }))}
                onBlur={e => handleBlur(fk, e.target.value)}
                min={0}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 23.07 — Contract Rents Table */}
      <div className="space-y-3">
        <p className={subHeaderCls}>23.07 AMI &ldquo;Contract&rdquo; Rent Limits</p>
        <p className={noteCls}>
          Contract rents = Gross Rent − Utility Allowance. Updated live as §12.01 parish and §23.06 UAs are entered.
        </p>
        <RentTable
          title='"Contract" Rent Limits for LIHTC Units'
          getCellValue={(pct, brIdx) => {
            if (!hasAmi) return null
            const gross = calcGrossRents(ami4, pct)[brIdx]
            return Math.max(0, gross - ua[brIdx])
          }}
        />
        <div>
          <label className={labelCls}>Comment on Contract Rents</label>
          <textarea
            className={inputCls}
            rows={2}
            value={values['s23_07_comment'] ?? ''}
            onChange={e => setValues(prev => ({ ...prev, s23_07_comment: e.target.value }))}
            onBlur={e => handleBlur('s23_07_comment', e.target.value)}
          />
        </div>
      </div>

      {/* 23.09 */}
      <div className="space-y-3">
        <p className={subHeaderCls}>23.09 Estimated Market Rents</p>
        <p className={noteCls}>
          Enter your estimated market rents by bedroom count. LHC underwriters will compare these to HUD FMRs.
        </p>
        <div className="grid grid-cols-5 gap-3">
          {market09Keys.map((fk, i) => (
            <div key={fk}>
              <label className={labelCls}>{brInputLabels[i]}</label>
              <input
                type="number"
                className={inputCls}
                value={values[fk] ?? ''}
                onChange={e => setValues(prev => ({ ...prev, [fk]: e.target.value }))}
                onBlur={e => handleBlur(fk, e.target.value)}
                min={0}
              />
            </div>
          ))}
        </div>
        <div>
          <label className={labelCls}>Comment</label>
          <textarea
            className={inputCls}
            rows={2}
            value={values['s23_09_market_comment'] ?? ''}
            onChange={e => setValues(prev => ({ ...prev, s23_09_market_comment: e.target.value }))}
            onBlur={e => handleBlur('s23_09_market_comment', e.target.value)}
          />
        </div>
      </div>

      {/* 23.10 — HUD Fair Market Rents (auto-filled from the §12.01 parish; PD23-1) */}
      <div className="space-y-3">
        <p className={subHeaderCls}>23.10 HUD Fair Market Rents</p>
        {PARISH_DATA[parish] ? (
          <>
            <p className={noteCls}>
              HUD FY2025 Fair Market Rents for {parish} Parish, from the QAP Parishes table. LHC underwriters compare these to the market rents above.
            </p>
            <div className="grid grid-cols-5 gap-3">
              {PARISH_DATA[parish].fmr.map((v, i) => (
                <div key={i}>
                  <label className={labelCls}>{brInputLabels[i]}</label>
                  <div className={readOnlyCell}>${v.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className={noteCls}>Select the project parish in §12.01 to populate the HUD Fair Market Rents.</p>
        )}
        <div>
          <label className={labelCls}>Comment on FMRs</label>
          <textarea
            className={inputCls}
            rows={2}
            value={values['s23_11_fmr_comment'] ?? ''}
            onChange={e => setValues(prev => ({ ...prev, s23_11_fmr_comment: e.target.value }))}
            onBlur={e => handleBlur('s23_11_fmr_comment', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
