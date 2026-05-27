'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'
const subHeaderCls = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide'
const noteCls = 'text-xs text-muted-foreground rounded-lg px-3 py-2 bg-muted/50'

const NEIGHBORHOOD_URBAN_OPTS = ['Within 1 Mile Radius', 'Within 2 Mile Radius', 'No', 'Missing']
const NEIGHBORHOOD_RURAL_OPTS = ['Within 5 Mile Radius', 'Over 5 Mile Radius', 'No', 'Missing']
// Public Library uses proximity-based options (Adjacent scores 1 pt)
const LIBRARY_OPTS = ['Adjacent', 'No', 'Missing']
// Entertainment facilities: Adjacent = 1 pt each
const ENTERTAINMENT_OPTS = ['No', 'Missing', 'Adjacent']
const INCOMPATIBLE_OPTS = ['Adjacent', 'No', 'Missing']

interface Props {
  dealId: string
  isRural: boolean
  /** H-7: Whether the project is in a town/city with population ≤ 15,000 */
  isTown15k?: boolean
  initial: Record<string, string>
}

// Standard neighborhood distance scoring
function neighborhoodScore(val: string, isRural: boolean): number {
  if (isRural) return val === 'Within 5 Mile Radius' ? 1 : 0
  return val === 'Within 1 Mile Radius' ? 1 : val === 'Within 2 Mile Radius' ? 0.5 : 0
}

// Public Library: Adjacent = 1 pt (proximity-based, not distance-based)
function libraryScore(val: string): number {
  return val === 'Adjacent' ? 1 : 0
}

// Entertainment facilities: Adjacent = 1 pt each
function entertainmentScore(val: string): number {
  return val === 'Adjacent' ? 1 : 0
}

// Standard neighborhood features (Excel rows 835–836, 838–844, 846–849)
// Note: Public Library (row 837) handled separately; Recreational/Laundry/Gym use same opts as standard
const NEIGHBORHOOD_FEATURES: { fk: string; label: string }[] = [
  { fk: 's26_01_grocery_store',         label: 'Grocery Store' },
  { fk: 's26_01_fresh_produce',         label: 'Fresh Produce Market or Fruit Stand (must be in a fixed structure)' },
  // Public Library (row 837) rendered inline with LIBRARY_OPTS
  { fk: 's26_01_hospital_clinic',       label: 'Hospital / Doctor Office or Clinic' },
  { fk: 's26_01_bank',                  label: 'Bank / Credit Union with Live Tellers' },
  { fk: 's26_01_school',               label: 'Elementary, Secondary or Post-Secondary School' },
  { fk: 's26_01_college',              label: '4-Year College; University; or Voc/Tech/Comm College' },
  { fk: 's26_01_pharmacy',             label: 'Pharmacy / Drug Store (not including pharmacies within hospitals)' },
  { fk: 's26_01_public_transit',       label: 'Public Transportation (shuttle services excluded)' },
  { fk: 's26_01_day_care',             label: 'LA Licensed (current) Adult/Child Day Care / After School Care' },
  { fk: 's26_01_recreational_center',  label: 'Recreational / Youth Center / Senior Center or Comparable' },
  { fk: 's26_01_public_park',          label: 'Public Park' },
  { fk: 's26_01_police_fire',          label: 'Police or Fire Station' },
  { fk: 's26_01_laundry',             label: 'Laundry or Dry Cleaner' },
  { fk: 's26_01_gym',                 label: 'Gym or Health Club' },
]

const ENTERTAINMENT_FEATURES: { fk: string; label: string }[] = [
  { fk: 's26_01_movie_theater',        label: 'Movie Theater' },
  { fk: 's26_01_bowling_alley',        label: 'Bowling Alley' },
  { fk: 's26_01_trampoline_park',      label: 'Trampoline Park' },
  { fk: 's26_01_laser_tag',           label: 'Laser Tag' },
  { fk: 's26_01_entertainment_other',  label: 'Other Entertainment Facility' },
]

const INCOMPATIBLE_USES: { fk: string; label: string }[] = [
  { fk: 's26_02_junk_yard',            label: 'Junk Yard / Dump' },
  { fk: 's26_02_processing_plant',     label: 'Processing Plant' },
  { fk: 's26_02_high_voltage',         label: 'High Voltage Substation' },
  { fk: 's26_02_solid_waste',          label: 'Solid Waste Disposal' },
  { fk: 's26_02_heavy_industrial',     label: 'Heavy Industrial' },
  { fk: 's26_02_pig_chicken_farm',     label: 'Pig / Chicken Farm' },
  { fk: 's26_02_distribution_facility', label: 'Distribution Facility' },
  { fk: 's26_02_airport',             label: 'Airport' },
  { fk: 's26_02_salvage_yard',        label: 'Salvage Yard' },
  { fk: 's26_02_prison',              label: 'Prison' },
]

export function Section26Form({ dealId, isRural, isTown15k, initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [isPending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<string | null>(null)

  function save(fk: string, val: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_26', fk, val)
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

  const neighborhoodOpts = isRural ? NEIGHBORHOOD_RURAL_OPTS : NEIGHBORHOOD_URBAN_OPTS

  // Compute live neighborhood score (standard features + library + entertainment)
  const standardScore = NEIGHBORHOOD_FEATURES.reduce((sum, { fk }) =>
    sum + neighborhoodScore(values[fk] ?? '', isRural), 0)
  const libScore = libraryScore(values['s26_01_public_library'] ?? '')
  const entScore = ENTERTAINMENT_FEATURES.reduce((sum, { fk }) =>
    sum + entertainmentScore(values[fk] ?? ''), 0)
  const totalNeighborhoodScore = standardScore + libScore + entScore

  // Compute incompatible use penalty
  const incompatiblePenalty = INCOMPATIBLE_USES.filter(({ fk }) => values[fk] === 'Adjacent').length
  const anyAdjacent = incompatiblePenalty > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Section 26 — Location Characteristics</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      {/* 26.01 Positive Neighborhood Features */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className={subHeaderCls}>26.01 Positive Neighborhood Features</p>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
            totalNeighborhoodScore >= 10
              ? 'bg-green-100 text-green-800'
              : 'bg-amber-100 text-amber-800'
          }`}>
            Neighborhood Score: {totalNeighborhoodScore.toFixed(1)} pts
          </span>
        </div>

        <p className={noteCls}>
          LHC Market Analyst will confirm these features. Select the distance for each amenity.
          {isRural ? ' (Rural project — using rural distance thresholds.)' : ' (Urban/suburban project — using urban distance thresholds.)'}
        </p>

        <div className="grid grid-cols-1 gap-0">
          {/* Standard neighborhood features (rows 835–836) */}
          {NEIGHBORHOOD_FEATURES.slice(0, 2).map(({ fk, label }) => {
            const pts = neighborhoodScore(values[fk] ?? '', isRural)
            return (
              <div key={fk} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/30">
                <span className="text-sm text-foreground flex-1">{label}</span>
                <select className="rounded-lg border border-input bg-background px-2 py-1 text-xs w-44 focus:outline-none"
                  value={values[fk] ?? ''} onChange={e => handleSelect(fk, e.target.value)}>
                  <option value="">Select…</option>
                  {neighborhoodOpts.map(o => <option key={o}>{o}</option>)}
                </select>
                <span className="text-xs w-12 text-right font-mono text-muted-foreground">
                  {values[fk] && values[fk] !== '' && values[fk] !== 'Missing'
                    ? pts > 0 ? `+${pts}` : '0' : ''}
                </span>
              </div>
            )
          })}

          {/* Public Library (row 837) — Adjacent/No/Missing */}
          {(() => {
            const fk = 's26_01_public_library'
            const pts = libraryScore(values[fk] ?? '')
            return (
              <div key={fk} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/30">
                <span className="text-sm text-foreground flex-1">Public Library</span>
                <select className="rounded-lg border border-input bg-background px-2 py-1 text-xs w-44 focus:outline-none"
                  value={values[fk] ?? ''} onChange={e => handleSelect(fk, e.target.value)}>
                  <option value="">Select…</option>
                  {LIBRARY_OPTS.map(o => <option key={o}>{o}</option>)}
                </select>
                <span className="text-xs w-12 text-right font-mono text-muted-foreground">
                  {values[fk] && values[fk] !== '' && values[fk] !== 'Missing'
                    ? pts > 0 ? `+${pts}` : '0' : ''}
                </span>
              </div>
            )
          })()}

          {/* Standard neighborhood features (rows 838–849) */}
          {NEIGHBORHOOD_FEATURES.slice(2).map(({ fk, label }) => {
            const pts = neighborhoodScore(values[fk] ?? '', isRural)
            return (
              <div key={fk} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/30 last:border-b-0">
                <span className="text-sm text-foreground flex-1">{label}</span>
                <select className="rounded-lg border border-input bg-background px-2 py-1 text-xs w-44 focus:outline-none"
                  value={values[fk] ?? ''} onChange={e => handleSelect(fk, e.target.value)}>
                  <option value="">Select…</option>
                  {neighborhoodOpts.map(o => <option key={o}>{o}</option>)}
                </select>
                <span className="text-xs w-12 text-right font-mono text-muted-foreground">
                  {values[fk] && values[fk] !== '' && values[fk] !== 'Missing'
                    ? pts > 0 ? `+${pts}` : '0' : ''}
                </span>
              </div>
            )
          })}
        </div>

        {/* Entertainment Facilities (rows 851–855) */}
        <div className="space-y-2 pt-2">
          <p className="text-xs font-medium text-muted-foreground">Entertainment Facility</p>
          <div className="grid grid-cols-1 gap-0">
            {ENTERTAINMENT_FEATURES.map(({ fk, label }) => {
              const pts = entertainmentScore(values[fk] ?? '')
              return (
                <div key={fk} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/30 last:border-b-0">
                  <span className="text-sm text-foreground flex-1 pl-2">{label}</span>
                  <select
                    className={`rounded-lg border px-2 py-1 text-xs w-44 focus:outline-none ${
                      values[fk] === 'Adjacent' ? 'border-green-300 bg-green-50' : 'border-input bg-background'
                    }`}
                    value={values[fk] ?? ''} onChange={e => handleSelect(fk, e.target.value)}>
                    <option value="">Select…</option>
                    {ENTERTAINMENT_OPTS.map(o => <option key={o}>{o}</option>)}
                  </select>
                  <span className="text-xs w-12 text-right font-mono text-muted-foreground">
                    {values[fk] && values[fk] !== '' && values[fk] !== 'Missing'
                      ? pts > 0 ? `+${pts}` : '0' : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 26.02 Incompatible Uses */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className={subHeaderCls}>26.02 Incompatible Uses</p>
          {incompatiblePenalty > 0 && (
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-red-100 text-red-800">
              Incompatible Use Penalty: -{incompatiblePenalty} pts
            </span>
          )}
        </div>

        {/* H-7: Tiered incompatible use messages based on isTown15k */}
        {anyAdjacent && !isTown15k && (
          <p className="text-xs rounded-lg px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700">
            Error: Adjacent incompatible land uses are not permitted for this project type. Each adjacent incompatible use will result in a point deduction and may affect project eligibility.
          </p>
        )}
        {anyAdjacent && isTown15k && (
          <p className="text-xs rounded-lg px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700">
            Warning: Each adjacent incompatible use deducts 1 point from your score.
          </p>
        )}

        <div className="grid grid-cols-1 gap-0">
          {INCOMPATIBLE_USES.map(({ fk, label }) => (
            <div
              key={fk}
              className="flex items-center justify-between gap-3 py-1.5 border-b border-border/30 last:border-b-0"
            >
              <span className="text-sm text-foreground flex-1">{label}</span>
              <select
                className={`rounded-lg border px-2 py-1 text-xs w-36 focus:outline-none ${
                  values[fk] === 'Adjacent'
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : 'border-input bg-background'
                }`}
                value={values[fk] ?? ''}
                onChange={e => handleSelect(fk, e.target.value)}
              >
                <option value="">Select…</option>
                {INCOMPATIBLE_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
              <span className="text-xs w-12 text-right font-mono">
                {values[fk] === 'Adjacent' ? (
                  <span className="text-red-600">-1</span>
                ) : ''}
              </span>
            </div>
          ))}
        </div>

        <div>
          <label className={labelCls}>Please explain if any incompatible uses are adjacent</label>
          <textarea
            className={inputCls}
            rows={3}
            value={values['s26_02_incompatible_explain'] ?? ''}
            onChange={e => setValues(prev => ({ ...prev, s26_02_incompatible_explain: e.target.value }))}
            onBlur={e => handleBlur('s26_02_incompatible_explain', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
