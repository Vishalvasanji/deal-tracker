'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

interface Props {
  dealId: string
  initial: Record<string, string>
}

const labelCls = 'block text-sm font-medium text-foreground mb-1'
const inputCls =
  'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const selectCls = inputCls
const sectionHeaderCls =
  'text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2'

// M-1: PARISH_MSA lookup table
const PARISH_MSA: Record<string, string> = {
  'Acadia': 'Lafayette, LA MSA',
  'Allen': 'Non-Metro',
  'Ascension': 'Baton Rouge, LA MSA',
  'Assumption': 'Non-Metro',
  'Avoyelles': 'Non-Metro',
  'Beauregard': 'Non-Metro',
  'Bienville': 'Non-Metro',
  'Bossier': 'Shreveport-Bossier City, LA MSA',
  'Caddo': 'Shreveport-Bossier City, LA MSA',
  'Calcasieu': 'Lake Charles, LA MSA',
  'Caldwell': 'Non-Metro',
  'Cameron': 'Lake Charles, LA MSA',
  'Catahoula': 'Non-Metro',
  'Claiborne': 'Non-Metro',
  'Concordia': 'Non-Metro',
  'Desoto': 'Shreveport-Bossier City, LA MSA',
  'East Baton Rouge': 'Baton Rouge, LA MSA',
  'East Carroll': 'Non-Metro',
  'East Feliciana': 'Baton Rouge, LA MSA',
  'Evangeline': 'Non-Metro',
  'Franklin': 'Non-Metro',
  'Grant': 'Alexandria, LA MSA',
  'Iberia': 'Lafayette, LA MSA',
  'Iberville': 'Baton Rouge, LA MSA',
  'Jackson': 'Non-Metro',
  'Jefferson': 'New Orleans-Metairie, LA MSA',
  'Jefferson Davis': 'Non-Metro',
  'Lafayette': 'Lafayette, LA MSA',
  'Lafourche': 'Houma-Thibodaux, LA MSA',
  'Lasalle': 'Non-Metro',
  'Lincoln': 'Non-Metro',
  'Livingston': 'Baton Rouge, LA MSA',
  'Madison': 'Non-Metro',
  'Morehouse': 'Non-Metro',
  'Natchitoches': 'Non-Metro',
  'Orleans': 'New Orleans-Metairie, LA MSA',
  'Ouachita': 'Monroe, LA MSA',
  'Plaquemines': 'New Orleans-Metairie, LA MSA',
  'Pointe Coupee': 'Baton Rouge, LA MSA',
  'Rapides': 'Alexandria, LA MSA',
  'Red River': 'Non-Metro',
  'Richland': 'Non-Metro',
  'Sabine': 'Non-Metro',
  'St. Bernard': 'New Orleans-Metairie, LA MSA',
  'St. Charles': 'New Orleans-Metairie, LA MSA',
  'St. Helena': 'Baton Rouge, LA MSA',
  'St. James': 'New Orleans-Metairie, LA MSA',
  'St. John': 'New Orleans-Metairie, LA MSA',
  'St. Landry': 'Non-Metro',
  'St. Martin': 'Lafayette, LA MSA',
  'St. Mary': 'Lafayette, LA MSA',
  'St. Tammany': 'New Orleans-Metairie, LA MSA',
  'Tangipahoa': 'Hammond, LA MSA',
  'Tensas': 'Non-Metro',
  'Terrebonne': 'Houma-Thibodaux, LA MSA',
  'Union': 'Monroe, LA MSA',
  'Vermilion': 'Lafayette, LA MSA',
  'Vernon': 'Non-Metro',
  'Washington': 'Non-Metro',
  'Webster': 'Non-Metro',
  'West Baton Rouge': 'Baton Rouge, LA MSA',
  'West Carroll': 'Non-Metro',
  'West Feliciana': 'Baton Rouge, LA MSA',
  'Winn': 'Non-Metro',
}

// M-1: PARISH_AMI lookup table (same as Section23Form)
const PARISH_AMI: Record<string, number> = {
  'Acadia': 69200, 'Allen': 65200, 'Ascension': 91700, 'Assumption': 77200,
  'Avoyelles': 54700, 'Beauregard': 85000, 'Bienville': 55300, 'Bossier': 81700,
  'Caddo': 81700, 'Calcasieu': 91100, 'Caldwell': 86800, 'Cameron': 91100,
  'Catahoula': 65700, 'Claiborne': 47300, 'Concordia': 54000, 'Desoto': 81700,
  'East Baton Rouge': 91700, 'East Carroll': 39900, 'East Feliciana': 91700,
  'Evangeline': 58100, 'Franklin': 58700, 'Grant': 78000, 'Iberia': 75500,
  'Iberville': 79000, 'Jackson': 60400, 'Jefferson': 89800, 'Jefferson Davis': 80600,
  'Lafayette': 84700, 'Lafourche': 75700, 'Lasalle': 92200, 'Lincoln': 70800,
  'Livingston': 91700, 'Madison': 50400, 'Morehouse': 54100, 'Natchitoches': 72600,
  'Orleans': 89800, 'Ouachita': 73400, 'Plaquemines': 89800, 'Pointe Coupee': 91700,
  'Rapides': 78000, 'Red River': 63400, 'Richland': 69100, 'Sabine': 68600,
  'St. Bernard': 89800, 'St. Charles': 89800, 'St. Helena': 91700, 'St. James': 94700,
  'St. John': 89800, 'St. Landry': 62800, 'St. Martin': 84700, 'St. Mary': 70600,
  'St. Tammany': 98000, 'Tangipahoa': 80400, 'Tensas': 54900, 'Terrebonne': 75700,
  'Union': 73400, 'Vermilion': 80300, 'Vernon': 71800, 'Washington': 64900,
  'Webster': 53200, 'West Baton Rouge': 91700, 'West Carroll': 77000,
  'West Feliciana': 91700, 'Winn': 68000,
}

function YesNoToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const base = 'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors'
  const active = 'bg-primary text-primary-foreground'
  const inactive = 'bg-muted text-muted-foreground hover:bg-muted/80'
  return (
    <div className="flex gap-2 mt-1">
      <button type="button" className={`${base} ${value === 'Yes' ? active : inactive}`} onClick={() => onChange('Yes')}>Yes</button>
      <button type="button" className={`${base} ${value === 'No' ? active : inactive}`} onClick={() => onChange('No')}>No</button>
    </div>
  )
}

export function Section12Form({ dealId, initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save(fieldKey: string, value: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_12', fieldKey, value)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  function handleToggle(fieldKey: string, value: string) {
    setValues(v => ({ ...v, [fieldKey]: value }))
    save(fieldKey, value)
  }

  // M-1: Modified handleSelect to auto-populate MSA when parish changes
  function handleSelect(fieldKey: string, value: string) {
    setValues(v => {
      const next = { ...v, [fieldKey]: value }
      if (fieldKey === 'parish' && !v.msa) {
        next.msa = PARISH_MSA[value] ?? ''
        if (next.msa) save('msa', next.msa)
      }
      return next
    })
    save(fieldKey, value)
  }

  function handleBlur(fieldKey: string, value: string) {
    save(fieldKey, value)
  }

  // M-5: Pool classification guidance
  const newConstructionPct = parseFloat((values.new_construction_pct ?? '').replace('%', ''))
  const isRural = values.is_rural === 'Yes'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Characteristics of The Project</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      {/* 12.01 */}
      <div className="space-y-4">
        <p className={sectionHeaderCls}>12.01 — Project Location</p>
        <div>
          <label className={labelCls}>Project Name <span className="text-rose-500">*</span></label>
          <input className={inputCls} value={values.project_name ?? ''}
            onChange={e => setValues(v => ({ ...v, project_name: e.target.value }))}
            onBlur={e => handleBlur('project_name', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Street Address <span className="text-rose-500">*</span></label>
          <input className={inputCls} value={values.street_address ?? ''}
            onChange={e => setValues(v => ({ ...v, street_address: e.target.value }))}
            onBlur={e => handleBlur('street_address', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>City <span className="text-rose-500">*</span></label>
            <input className={inputCls} value={values.city ?? ''}
              onChange={e => setValues(v => ({ ...v, city: e.target.value }))}
              onBlur={e => handleBlur('city', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Parish <span className="text-rose-500">*</span></label>
            <select className={selectCls} value={values.parish ?? ''}
              onChange={e => handleSelect('parish', e.target.value)}>
              <option value="">Select parish…</option>
              {['Acadia','Allen','Ascension','Assumption','Avoyelles','Beauregard','Bienville','Bossier',
                'Caddo','Calcasieu','Caldwell','Cameron','Catahoula','Claiborne','Concordia','Desoto',
                'East Baton Rouge','East Carroll','East Feliciana','Evangeline','Franklin','Grant',
                'Iberia','Iberville','Jackson','Jefferson','Jefferson Davis','Lafayette','Lafourche',
                'Lasalle','Lincoln','Livingston','Madison','Morehouse','Natchitoches','Orleans',
                'Ouachita','Plaquemines','Pointe Coupee','Rapides','Red River','Richland','Sabine',
                'St. Bernard','St. Charles','St. Helena','St. James','St. John','St. Landry',
                'St. Martin','St. Mary','St. Tammany','Tangipahoa','Tensas','Terrebonne','Union',
                'Vermilion','Vernon','Washington','Webster','West Baton Rouge','West Carroll',
                'West Feliciana','Winn',
              ].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {/* M-1: AMI/MSA info note after parish selection */}
            {values.parish && PARISH_AMI[values.parish] && (
              <p className="text-xs text-sky-700 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 mt-1">
                4-person AMI for {values.parish} Parish: ${PARISH_AMI[values.parish].toLocaleString()} | MSA: {PARISH_MSA[values.parish] ?? 'Non-Metro'}
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>Zip Code</label>
            <input className={inputCls} value={values.zip_code ?? ''}
              onChange={e => setValues(v => ({ ...v, zip_code: e.target.value }))}
              onBlur={e => handleBlur('zip_code', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>MSA</label>
          <input className={inputCls} value={values.msa ?? ''} placeholder="e.g. Baton Rouge MSA"
            onChange={e => setValues(v => ({ ...v, msa: e.target.value }))}
            onBlur={e => handleBlur('msa', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Latitude (X)</label>
            <input className={inputCls} value={values.coord_x ?? ''} placeholder="e.g. 30.5069"
              onChange={e => setValues(v => ({ ...v, coord_x: e.target.value }))}
              onBlur={e => handleBlur('coord_x', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Longitude (Y)</label>
            <input className={inputCls} value={values.coord_y ?? ''} placeholder="e.g. -91.0937"
              onChange={e => setValues(v => ({ ...v, coord_y: e.target.value }))}
              onBlur={e => handleBlur('coord_y', e.target.value)} />
          </div>
        </div>
      </div>

      {/* 12.02 */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>12.02 — Site</p>
        <div>
          <label className={labelCls}>Is the entire project located on a single site? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.is_single_site ?? ''} onChange={v => handleToggle('is_single_site', v)} />
          {/* L-3: Multi-site info note */}
          {values.is_single_site === 'No' && (
            <p className="mt-2 text-xs rounded-lg px-3 py-2 bg-sky-50 border border-sky-200 text-sky-700">
              Multi-site project: Complete the Multi-Site Checklist in the supplemental worksheets of the QAP Application Model.
            </p>
          )}
        </div>
      </div>

      {/* 12.03 */}
      <div className="space-y-4">
        <p className={sectionHeaderCls}>12.03 — Development Type</p>
        <div>
          <label className={labelCls}>What is the primary development type? <span className="text-rose-500">*</span></label>
          <select className={selectCls} value={values.dev_type ?? ''}
            onChange={e => handleSelect('dev_type', e.target.value)}>
            <option value="">Select…</option>
            <option>New Construction</option>
            <option>Acquisition &amp; Rehab</option>
            <option>Adaptive Reuse</option>
            <option>Missing</option>
          </select>
        </div>
        {(values.dev_type === 'New Construction' || values.dev_type === 'Acquisition & Rehab' || values.dev_type === 'Adaptive Reuse') && (
          <div>
            <label className={labelCls}>Will any new construction take place?</label>
            <YesNoToggle value={values.new_construction ?? ''} onChange={v => handleToggle('new_construction', v)} />
          </div>
        )}
        {values.new_construction === 'Yes' && (
          <div>
            <label className={labelCls}>Percentage of new construction (by # of units)</label>
            <input className={inputCls} value={values.new_construction_pct ?? ''} placeholder="e.g. 100%"
              onChange={e => setValues(v => ({ ...v, new_construction_pct: e.target.value }))}
              onBlur={e => handleBlur('new_construction_pct', e.target.value)} />
            {/* M-5: Pool classification guidance */}
            {isRural && !isNaN(newConstructionPct) && newConstructionPct > 0 && (
              newConstructionPct > 50 ? (
                <p className="mt-2 text-xs rounded-lg px-3 py-2 bg-sky-50 border border-sky-200 text-sky-700">
                  Based on &gt;50% new construction, this project qualifies for the Rural Area New Construction Pool.
                </p>
              ) : (
                <p className="mt-2 text-xs rounded-lg px-3 py-2 bg-sky-50 border border-sky-200 text-sky-700">
                  Based on ≤50% new construction, this project qualifies for the Rural Area Rehabilitation Pool.
                </p>
              )
            )}
          </div>
        )}
      </div>

      {/* 12.04 */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>12.04 — Acquisition &amp; Rehabilitation</p>
        <div>
          <label className={labelCls}>Will any existing buildings be acquired? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.existing_acquired ?? ''} onChange={v => handleToggle('existing_acquired', v)} />
        </div>
        {values.existing_acquired === 'Yes' && (
          <div className="space-y-3 pl-4 border-l-2 border-border">
            <div>
              <label className={labelCls}>Will any existing residential buildings be acquired?</label>
              <YesNoToggle value={values.residential_acquired ?? ''} onChange={v => handleToggle('residential_acquired', v)} />
            </div>
            <div>
              <label className={labelCls}>Will any existing non-residential buildings be acquired?</label>
              <YesNoToggle value={values.nonresidential_acquired ?? ''} onChange={v => handleToggle('nonresidential_acquired', v)} />
            </div>
          </div>
        )}
        <div>
          <label className={labelCls}>Will any rehabilitation take place? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.rehab ?? ''} onChange={v => handleToggle('rehab', v)} />
        </div>
        <div>
          <label className={labelCls}>Will Substantial Rehabilitation take place? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.substantial_rehab ?? ''} onChange={v => handleToggle('substantial_rehab', v)} />
        </div>
        <div>
          <label className={labelCls}>Will any historic rehabilitation take place? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.historic_rehab ?? ''} onChange={v => handleToggle('historic_rehab', v)} />
        </div>
      </div>

      {/* 12.05 */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>12.05 — Purchase Price &amp; Basis</p>
        <div>
          <label className={labelCls}>Does the purchase price of the real estate exceed $500K? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.purchase_price_500k ?? ''} onChange={v => handleToggle('purchase_price_500k', v)} />
        </div>
        <div>
          <label className={labelCls}>Will Acquisition Cost of buildings be included in basis? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.acq_cost_in_basis ?? ''} onChange={v => handleToggle('acq_cost_in_basis', v)} />
        </div>
      </div>

      {/* 12.06 */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>12.06 — Existing Rental Housing</p>
        <div>
          <label className={labelCls}>Will any existing rental housing buildings be acquired? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.rental_housing_acquired ?? ''} onChange={v => handleToggle('rental_housing_acquired', v)} />
        </div>
        {values.rental_housing_acquired === 'Yes' && (
          <div>
            <label className={labelCls}>If so, are the seller and purchaser Related Persons?</label>
            <YesNoToggle value={values.related_persons ?? ''} onChange={v => handleToggle('related_persons', v)} />
          </div>
        )}
      </div>

      {/* 12.07 */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>12.07 — Site Characteristics</p>
        <div>
          <label className={labelCls}>Is this an infill project (as defined in the QAP)? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.is_infill ?? ''} onChange={v => handleToggle('is_infill', v)} />
        </div>
        <div>
          <label className={labelCls}>Is the project located in a Special Flood Hazard Area? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.is_flood_hazard ?? ''} onChange={v => handleToggle('is_flood_hazard', v)} />
        </div>
        <div>
          <label className={labelCls}>Is the project in a levee protected area? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.is_levee ?? ''} onChange={v => handleToggle('is_levee', v)} />
        </div>
      </div>

      {/* 12.08 */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>12.08 — Building Type</p>
        <div>
          <label className={labelCls}>What is the primary building type for this project? <span className="text-rose-500">*</span></label>
          <select className={selectCls} value={values.building_type ?? ''}
            onChange={e => handleSelect('building_type', e.target.value)}>
            <option value="">Select…</option>
            <option>Detached</option>
            <option>Detached / Semi-Detached</option>
            <option>Elevator</option>
            <option>Row</option>
            <option>Row House</option>
            <option>Semi-Detached</option>
            <option>Walk-Up</option>
            <option>Other</option>
            <option>Missing</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Does the project include other building types as well? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.other_building_types ?? ''} onChange={v => handleToggle('other_building_types', v)} />
        </div>
      </div>

      {/* 12.09 */}
      <div className="space-y-4">
        <p className={sectionHeaderCls}>12.09 — Census Tract</p>
        <div>
          <label className={labelCls}>In which census tract is the project primarily located? <span className="text-rose-500">*</span></label>
          <input className={inputCls} value={values.census_tract ?? ''} placeholder="e.g. 35.04"
            onChange={e => setValues(v => ({ ...v, census_tract: e.target.value }))}
            onBlur={e => handleBlur('census_tract', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Does any part of the project lie outside this census tract? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.census_tract_outside ?? ''} onChange={v => handleToggle('census_tract_outside', v)} />
        </div>
        {values.census_tract_outside === 'Yes' && (
          <div>
            <label className={labelCls}>If so, what % of the units are in this census tract?</label>
            <input className={inputCls} value={values.census_tract_outside_pct ?? ''} placeholder="e.g. 80%"
              onChange={e => setValues(v => ({ ...v, census_tract_outside_pct: e.target.value }))}
              onBlur={e => handleBlur('census_tract_outside_pct', e.target.value)} />
          </div>
        )}
        <div>
          <label className={labelCls}>Median income of the primary census tract ($)</label>
          <input className={inputCls} value={values.median_income_ct ?? ''} placeholder="e.g. 47500"
            onChange={e => setValues(v => ({ ...v, median_income_ct: e.target.value }))}
            onBlur={e => handleBlur('median_income_ct', e.target.value)} />
        </div>
      </div>

      {/* 12.10 */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>12.10 — Special Designations</p>
        <p className="text-xs text-muted-foreground -mt-2">Is any part of the project located in:</p>
        <div>
          <label className={labelCls}>A Difficult Development Area (DDA)? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.is_dda ?? ''} onChange={v => handleToggle('is_dda', v)} />
        </div>
        <div>
          <label className={labelCls}>A Qualified Census Tract (QCT)? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.is_qct ?? ''} onChange={v => handleToggle('is_qct', v)} />
        </div>
        <div>
          <label className={labelCls}>A Federally or State recognized Tribal Organization? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.is_tribal ?? ''} onChange={v => handleToggle('is_tribal', v)} />
        </div>
        <div>
          <label className={labelCls}>A Choice Neighborhood Initiative census tract? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.is_choice_neighborhood ?? ''} onChange={v => handleToggle('is_choice_neighborhood', v)} />
        </div>
        <div>
          <label className={labelCls}>An area part of a Concerted Community Revitalization Plan? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.is_concerted_revitalization ?? ''} onChange={v => handleToggle('is_concerted_revitalization', v)} />
        </div>
      </div>

      {/* 12.11 */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>12.11 — Rural Area</p>
        <div>
          <label className={labelCls}>Is this a Rural Area Project, as defined in the QAP? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.is_rural ?? ''} onChange={v => handleToggle('is_rural', v)} />
          {/* L-4: Rural area info note */}
          {values.is_rural === 'Yes' && (
            <p className="mt-2 text-xs rounded-lg px-3 py-2 bg-sky-50 border border-sky-200 text-sky-700">
              This project qualifies as a Rural Area Project. It may be eligible for the Rural Area Pool. Ensure the project meets QAP rural area eligibility requirements.
            </p>
          )}
        </div>
      </div>

      {/* 12.12 */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>12.12 — Incorporated Area</p>
        <div>
          <label className={labelCls}>Is the project located within an incorporated area (town, city)? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.is_incorporated ?? ''} onChange={v => handleToggle('is_incorporated', v)} />
        </div>
        {values.is_incorporated === 'Yes' && (
          <div>
            <label className={labelCls}>Population of the incorporated area</label>
            <input className={inputCls} value={values.incorporated_population ?? ''} placeholder="e.g. 220907"
              onChange={e => setValues(v => ({ ...v, incorporated_population: e.target.value }))}
              onBlur={e => handleBlur('incorporated_population', e.target.value)} />
          </div>
        )}
        <div>
          <label className={labelCls}>Is the project located in an Urban Area? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.is_urban ?? ''} onChange={v => handleToggle('is_urban', v)} />
        </div>
        <div>
          <label className={labelCls}>Is the project located in a Town or City with a population of 15,000 or less? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.is_town_15k ?? ''} onChange={v => handleToggle('is_town_15k', v)} />
        </div>
      </div>

      {/* 12.13 — 12.24: Project Classification Yes/No flags */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>12.13 — 12.24 — Project Classification</p>
        {[
          { key: 'is_distressed', label: '12.13 — Is the property a Distressed Property, as defined in the QAP (RD, HUD or PHA)?' },
          { key: 'is_redevelopment', label: '12.14 — Is this a Redevelopment Property, as defined in the QAP?' },
          { key: 'is_owner_occupied_dev', label: '12.15 — Is the property an Owner Occupied Property with Development Plan of Action, as defined in the QAP?' },
          { key: 'is_existing_lihtc', label: '12.16 — Is this an Existing LIHTC Project, as defined in the QAP?' },
          { key: 'is_usda_funded', label: '12.17 — Is this a rehabilitation of existing USDA, or Federally Funded project?' },
          { key: 'is_nonhistoric_rehab', label: '12.18 — Is this a rehab of an existing non-historic residential building?' },
          { key: 'is_blighted', label: '12.19 — Does this project constitute Blighted housing remediation and/or replacement, as defined in the QAP?' },
          { key: 'is_rehab_infill', label: '12.20 — Is this a Rehab Infill / Scattered Site Project, as defined in the QAP?' },
          { key: 'is_historic_preservation', label: '12.21 — Is this Preservation of Residential Historic Property, as defined in the QAP?' },
          { key: 'is_hap_contract', label: '12.22 — Is this an Existing Federally Funded Project with HAP Contract, or USDA with PBRA, as defined in the QAP?' },
          { key: 'is_nc_infill_scattered', label: '12.23 — Is this a New Construction Infill / Scattered Site Project, as defined in the QAP?' },
          { key: 'is_homeownership', label: '12.24 — Is this a Homeownership project, as defined in the QAP?' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className={labelCls}>{label} <span className="text-rose-500">*</span></label>
            <YesNoToggle value={values[key] ?? ''} onChange={v => handleToggle(key, v)} />
            {/* L-5: Existing LIHTC reminder */}
            {key === 'is_existing_lihtc' && values[key] === 'Yes' && (
              <p className="mt-2 text-xs rounded-lg px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700">
                Complete the &apos;Existing LHC Property&apos; tab in the QAP Application Model workbook.
              </p>
            )}
          </div>
        ))}
      </div>

      {/* 12.25 */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>12.25 — Veteran / Disabled / Elderly Preference</p>
        <div>
          <label className={labelCls}>
            Does the Taxpayer agree to give preference to Veterans, Disabled and Elderly persons on the PHA waiting list if they satisfy the requirements of the Project's Management and/or Operating Plan? <span className="text-rose-500">*</span>
          </label>
          <YesNoToggle value={values.veteran_preference ?? ''} onChange={v => handleToggle('veteran_preference', v)} />
          {/* H-1: Mandatory condition error when No */}
          {values.veteran_preference === 'No' && (
            <p className="mt-2 text-xs rounded-lg px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700">
              Providing preference to Veterans, Disabled, and Elderly persons on PHA waiting lists is a mandatory condition for receiving an LIHTC allocation. A &apos;No&apos; answer may affect your eligibility.
            </p>
          )}
        </div>
      </div>

      {/* 12.26 */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>12.26 — Preservation Property</p>
        <div>
          <label className={labelCls}>Is this a Preservation Property, as defined in the QAP? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.is_preservation_property ?? ''} onChange={v => handleToggle('is_preservation_property', v)} />
          {/* H-2: Preservation + New Construction conflict warning */}
          {values.is_preservation_property === 'Yes' && values.dev_type === 'New Construction' && (
            <p className="mt-2 text-xs rounded-lg px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700">
              Warning: A Preservation Property designation is typically inconsistent with New Construction as the primary development type. Verify that both selections are correct.
            </p>
          )}
        </div>
      </div>

      {/* 12.27 */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>12.27 — SRO &amp; Reallocated Credits</p>
        <div>
          <label className={labelCls}>Is this a Single Room Occupancy (SRO) Project, as defined in the QAP? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.is_sro ?? ''} onChange={v => handleToggle('is_sro', v)} />
        </div>
        <div>
          <label className={labelCls}>Is this a Project Reallocated Credits Based on Housing Discrimination, as defined in the QAP? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.is_reallocated_credits ?? ''} onChange={v => handleToggle('is_reallocated_credits', v)} />
        </div>
      </div>

      {/* 12.28 */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>12.28 — Federal Funds &amp; Assistance</p>
        <div>
          <label className={labelCls}>Does the project currently receive federal funds and/or receive insurance under a federal program? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.receives_federal_funds ?? ''} onChange={v => handleToggle('receives_federal_funds', v)} />
          {values.receives_federal_funds === 'Yes' && (
            <div className="mt-2 space-y-2">
              {!values.federal_funds_comment?.trim() && (
                <p className="text-xs rounded-lg px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700">
                  A comment is required explaining the federal program.
                </p>
              )}
              <label className={labelCls}>Comment</label>
              <textarea className={inputCls + ' min-h-[80px] resize-y'}
                value={values.federal_funds_comment ?? ''}
                onChange={e => setValues(v => ({ ...v, federal_funds_comment: e.target.value }))}
                onBlur={e => handleBlur('federal_funds_comment', e.target.value)} />
            </div>
          )}
        </div>
        <div>
          <label className={labelCls}>Will HUD or RD housing assistance, or other government assistance, be provided to the project? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.hud_rd_assistance ?? ''} onChange={v => handleToggle('hud_rd_assistance', v)} />
          {values.hud_rd_assistance === 'Yes' && (
            <div className="mt-2 space-y-2">
              {!values.hud_rd_comment?.trim() && (
                <p className="text-xs rounded-lg px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700">
                  A comment is required explaining the HUD/RD assistance.
                </p>
              )}
              <label className={labelCls}>Comment</label>
              <textarea className={inputCls + ' min-h-[80px] resize-y'}
                value={values.hud_rd_comment ?? ''}
                onChange={e => setValues(v => ({ ...v, hud_rd_comment: e.target.value }))}
                onBlur={e => handleBlur('hud_rd_comment', e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {/* 12.29 */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>12.29 — PHA Sponsored</p>
        <div>
          <label className={labelCls}>Is this a PHA sponsored project? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.is_pha ?? ''} onChange={v => handleToggle('is_pha', v)} />
        </div>
      </div>
    </div>
  )
}
