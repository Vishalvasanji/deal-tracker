'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'
const activeBtn = 'bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-medium'
const inactiveBtn = 'bg-muted text-muted-foreground rounded-lg px-4 py-1.5 text-sm'
const subHeaderCls = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide'
const noteCls = 'text-xs text-muted-foreground rounded-lg px-3 py-2 bg-muted/50'

const YES_NO_OPTS = ['Yes', 'No', 'Missing']

interface Props {
  dealId: string
  initial: Record<string, string>
}

export default function Section27Form({ dealId, initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [isPending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<string | null>(null)

  function save(fk: string, val: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_27', fk, val)
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

  const onSiteAmenities: { fk: string; label: string }[] = [
    { fk: 's27_04_playground', label: 'Playground' },
    { fk: 's27_04_basketball_court', label: 'Basketball Court' },
    { fk: 's27_04_computer_center', label: 'Computer Center (at least 5 computers)' },
    { fk: 's27_04_exercise_room', label: 'Exercise Room (must have equipment)' },
    { fk: 's27_04_picnic_area', label: 'Picnic Area With Permanent Grill' },
    { fk: 's27_04_walking_trail', label: 'Paved Walking Trail (min. 1/4 mile)' },
    { fk: 's27_04_off_street_parking', label: 'Off Street Parking' },
    { fk: 's27_04_community_garden', label: 'Community Garden (QAP VII.V.D)' },
    { fk: 's27_04_patio_balcony', label: 'Patio or Balcony' },
    { fk: 's27_04_tennis_court', label: 'Tennis Court' },
    { fk: 's27_04_courtyard_seating', label: 'Courtyard with Seating' },
    { fk: 's27_04_dog_park', label: 'Dog Park or Designated Pet Areas' },
    { fk: 's27_04_multipurpose_room', label: 'Open Access Multi-Purpose Tenant Activity Room' },
  ]

  const resiliencyActive = values['s27_09_resiliency'] === 'Yes'
  const fortifiedRoofMissing = resiliencyActive && values['s27_09_fortified_roof'] !== 'Yes'

  const securityActive = values['s27_08_onsite_security'] === 'Yes'
  const jointVentureActive = values['s27_12_joint_venture'] === 'Yes'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Section 27 — Project Characteristics</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      {/* 27.01 */}
      <div className="space-y-3">
        <YesNoToggle fk="s27_01_green_building" label="27.01 — Does the project qualify as a Green Building under the QAP?" />
      </div>

      {/* 27.02 */}
      <div className="space-y-3">
        <YesNoToggle fk="s27_02_community_facilities" label="27.02 — Does the project include Community Facilities as defined in the Glossary?" />
      </div>

      {/* 27.03 Unit Features */}
      <div className="space-y-4">
        <p className={subHeaderCls}>27.03 Unit Features</p>
        <div className="space-y-4">
          <YesNoToggle fk="s27_03_washers_dryers" label="Washers and dryers installed and maintained in each unit" />
          <YesNoToggle fk="s27_03_dishwashers" label="Dishwashers installed and maintained in each unit" />
          <YesNoToggle fk="s27_03_free_wifi" label="Free Development Tenant Wi-Fi" />
          <YesNoToggle fk="s27_03_universal_design" label="Universal Design as defined in the QAP" />
          <YesNoToggle fk="s27_03_hud_defensible_space" label="HUD Defensible Space as defined in the QAP" />
        </div>
      </div>

      {/* 27.031 */}
      <div className="space-y-3">
        <YesNoToggle fk="s27_031_ceiling_fans" label="27.031 — Ceiling fans in living room and all bedrooms" />
      </div>

      {/* 27.032 */}
      <div className="space-y-3">
        <YesNoToggle fk="s27_032_smart_thermostat" label="27.032 — Smart thermostat installed in each unit" />
      </div>

      {/* 27.04 On-Site Amenities */}
      <div className="space-y-4">
        <p className={subHeaderCls}>27.04 On-Site Amenities</p>
        <div className="grid grid-cols-2 gap-4">
          {onSiteAmenities.map(({ fk, label }) => (
            <YesNoToggle key={fk} fk={fk} label={label} />
          ))}
        </div>
      </div>

      {/* 27.05 Accessible Units */}
      <div className="space-y-4">
        <p className={subHeaderCls}>27.05 Accessible Units</p>
        <YesNoToggle
          fk="s27_05_accessible_units"
          label="Accessible Units Required Under Section 504 — does the project meet requirements?"
        />

        <div>
          <label className={labelCls}>27.06 — Total units accessible to people with mobility impairments</label>
          <input
            type="number"
            className={inputCls}
            value={values['s27_06_mobility_units'] ?? ''}
            onChange={e => setValues(prev => ({ ...prev, s27_06_mobility_units: e.target.value }))}
            onBlur={e => handleBlur('s27_06_mobility_units', e.target.value)}
            min={0}
          />
        </div>

        <div>
          <label className={labelCls}>27.07 — Total units accessible to people with hearing or vision impairments</label>
          <input
            type="number"
            className={inputCls}
            value={values['s27_07_hearing_vision_units'] ?? ''}
            onChange={e => setValues(prev => ({ ...prev, s27_07_hearing_vision_units: e.target.value }))}
            onBlur={e => handleBlur('s27_07_hearing_vision_units', e.target.value)}
            min={0}
          />
        </div>
      </div>

      {/* 27.08 Onsite Security */}
      <div className="space-y-4">
        <p className={subHeaderCls}>27.08 Onsite Security</p>
        <YesNoToggle fk="s27_08_onsite_security" label="Does the project have Onsite Security as defined in the Glossary?" />
        <p className={noteCls}>Estimated security payroll expense is calculated from the Revenues and Expenses worksheet.</p>

        {securityActive && (
          <div className="space-y-4 pl-4 border-l-2 border-border">
            <YesNoToggle fk="s27_08_security_cameras" label="Will security cameras be included?" />
            <YesNoToggle fk="s27_08_security_gate" label="Will a security gate be included?" />
            <YesNoToggle fk="s27_08_security_guard" label="Will an on-site security guard be included?" />
            <YesNoToggle fk="s27_08_cameras_surveillance" label="Will security cameras connect with local crime surveillance initiative?" />
          </div>
        )}
      </div>

      {/* 27.09 Resiliency Standards */}
      <div className="space-y-4">
        <p className={subHeaderCls}>27.09 Resiliency Standards</p>
        <YesNoToggle fk="s27_09_resiliency" label="Does the project have any of the following Resiliency Standards?" />

        {resiliencyActive && (
          <div className="space-y-4 pl-4 border-l-2 border-border">
            <YesNoToggle fk="s27_09_fortified_roof" label="FORTIFIED Roof (REQUIRED)" />

            {fortifiedRoofMissing && (
              <p className="text-xs rounded-lg px-3 py-2 bg-red-50 border border-red-200 text-red-700">
                FORTIFIED Roof is required as a prerequisite for Resiliency Standards.
              </p>
            )}

            <YesNoToggle fk="s27_09_fortified_gold" label="FORTIFIED GOLD" />
            <YesNoToggle fk="s27_09_fortified_silver" label="FORTIFIED SILVER" />
          </div>
        )}
      </div>

      {/* 27.10 Eviction Prevention */}
      <div className="space-y-4">
        <p className={subHeaderCls}>27.10 Eviction Prevention</p>
        <YesNoToggle fk="s27_10_eviction_prevention_plan" label="Does the project commit to creating an Eviction Prevention Plan?" />
        <YesNoToggle fk="s27_10_low_barrier_screening" label="Does the project commit to implementing low-barrier tenant screening?" />
      </div>

      {/* 27.11 Minority / Women's / Veteran's Business Participation */}
      <div className="space-y-4">
        <p className={subHeaderCls}>27.11 Minority / Women's / Veteran's Business Participation</p>
        <YesNoToggle fk="s27_11_professional_services" label="Professional Services / General Contractor — MWV participation?" />
        <YesNoToggle fk="s27_11_sub_1_5pct" label="Sub-Contractors/Vendors 1%–4.99% of Total Development Cost — MWV participation?" />
        <YesNoToggle fk="s27_11_sub_over_5pct" label="Sub-Contractors/Vendors >5% of Total Development Cost — MWV participation?" />
      </div>

      {/* 27.12 Joint Venture */}
      <div className="space-y-4">
        <p className={subHeaderCls}>27.12 Joint Venture</p>
        <YesNoToggle fk="s27_12_joint_venture" label="Is this a Joint Venture property development?" />

        {jointVentureActive && (
          <div className="space-y-4 pl-4 border-l-2 border-border">
            <YesNoToggle fk="s27_12_certified_minority" label="With a Certified Minority Entity?" />
            <YesNoToggle fk="s27_12_woman_owned" label="With a Woman-Owned Business?" />
            <YesNoToggle fk="s27_12_veteran_owned" label="With a Veteran-Owned Business?" />
            <YesNoToggle fk="s27_12_service_disabled_veteran" label="With a Service Disabled Veteran-Owned Business?" />
            <YesNoToggle fk="s27_12_qualified_small_business" label="With a Qualified Small Business?" />
          </div>
        )}

        <div>
          <label className={labelCls}>Comment</label>
          <textarea
            className={inputCls}
            rows={3}
            value={values['s27_12_comment'] ?? ''}
            onChange={e => setValues(prev => ({ ...prev, s27_12_comment: e.target.value }))}
            onBlur={e => handleBlur('s27_12_comment', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
