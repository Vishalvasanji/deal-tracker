'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const selectCls = inputCls
const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'
const activeBtn = 'bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-medium'
const inactiveBtn = 'bg-muted text-muted-foreground rounded-lg px-4 py-1.5 text-sm'
const subHeaderCls = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide'
const noteCls = 'text-xs text-muted-foreground rounded-lg px-3 py-2 bg-muted/50'

const FUEL_OPTS = ['Natural Gas', 'Electric', 'Propane', 'Oil', 'Other', 'Missing']
const HOT_WATER_FUEL_OPTS = ['Natural Gas', 'Electric', 'Other', 'Missing']
const HEAT_SYSTEM_OPTS = ['Forced Air', 'Hot Water', 'Other', 'Missing']
const PAYER_OPTS = ['Owner', 'Tenant', 'Missing']
const YES_NO_OPTS = ['Yes', 'No', 'Missing']

interface Props {
  dealId: string
  initial: Record<string, string>
}

export default function Section23Form({ dealId, initial }: Props) {
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
    { label: 'Cooking', fuelFk: 's23_05_cooking_fuel', fuelOpts: FUEL_OPTS, payerFk: 's23_05_cooking_payer' },
    { label: 'Other / Lighting', payerFk: 's23_05_lighting_payer' },
    { label: 'Hot Water', fuelFk: 's23_05_hot_water_fuel', fuelOpts: HOT_WATER_FUEL_OPTS, payerFk: 's23_05_hot_water_payer' },
    { label: 'Water', payerFk: 's23_05_water_payer' },
    { label: 'Heating', payerFk: 's23_05_heating_payer' },
    { label: 'Air Conditioning', payerFk: 's23_05_ac_payer' },
    { label: 'Sewer', payerFk: 's23_05_sewer_payer' },
    { label: 'Trash Collection', payerFk: 's23_05_trash_payer' },
  ]

  const brLabels = ['0 Bedroom ($)', '1 Bedroom ($)', '2 Bedroom ($)', '3 Bedroom ($)', '4 Bedroom ($)']
  const ua06Keys = ['s23_06_ua_0br', 's23_06_ua_1br', 's23_06_ua_2br', 's23_06_ua_3br', 's23_06_ua_4br']
  const market09Keys = ['s23_09_market_0br', 's23_09_market_1br', 's23_09_market_2br', 's23_09_market_3br', 's23_09_market_4br']

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
      </div>

      {/* 23.02 */}
      <div className="space-y-3">
        <p className={subHeaderCls}>23.02 Comment</p>
        <div>
          <label className={labelCls}>Comment on AMI information</label>
          <textarea
            className={inputCls}
            rows={3}
            value={values['s23_02_comment'] ?? ''}
            onChange={e => setValues(prev => ({ ...prev, s23_02_comment: e.target.value }))}
            onBlur={e => handleBlur('s23_02_comment', e.target.value)}
          />
        </div>
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
              {FUEL_OPTS.map(o => <option key={o}>{o}</option>)}
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
        <p className={noteCls}>The Checklist will include a request for appropriate documentation.</p>
        <div className="grid grid-cols-5 gap-3">
          {ua06Keys.map((fk, i) => (
            <div key={fk}>
              <label className={labelCls}>{brLabels[i]}</label>
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

      {/* 23.07 */}
      <div className="space-y-3">
        <p className={subHeaderCls}>23.07 Contract Rent Table</p>
        <p className={noteCls}>
          AMI Contract Rent limits are calculated by LHC from the parish, utility allowances, and AMI data. They will appear in the completed QAP model.
        </p>
        <div>
          <label className={labelCls}>Comment on Contract Rents</label>
          <textarea
            className={inputCls}
            rows={3}
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
              <label className={labelCls}>{brLabels[i]}</label>
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

      {/* 23.11 */}
      <div className="space-y-3">
        <p className={subHeaderCls}>23.11 HUD Fair Market Rents</p>
        <p className={noteCls}>
          HUD FY2023 FMRs are pre-loaded from the LHC database and are not user-editable.
        </p>
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
