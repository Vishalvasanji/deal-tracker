// QAP Selection Criteria — calc layer.
// Computes the Calculated points for every visible criterion from Project Description /
// Unit Mix data, applies the section caps, and sums to TOTAL POINTS (sheet row 129).
// Self-Score is the applicant's manual claim, passed through and summed in parallel.

import {
  SECTION_MAX, TOTAL_MAX, PREFERENCE_PARISHES, extendedAffordPoints, neighborhoodFeatureScore,
  NEIGHBORHOOD_FEATURE_KEYS, PROJECT_AMENITY_KEYS, SPECIAL_NEEDS_UNIT_KEYS,
} from './qap-selection'

export interface SelectionDeps {
  s12: Record<string, string>
  s24: Record<string, string>
  s25: Record<string, string>
  s26: Record<string, string>
  s27: Record<string, string>
  totalUnits: number
  pctUnitsAt30Ami: number              // §VI.H — fraction of units at ≤30% AMI (0..1)
  tdc: number                          // Total Development Cost — §III.C ratio denominator
  selfScores: Record<string, number>  // section 'selection' values keyed by criterion key
}

export interface CriterionResult {
  key: string
  label: string
  calc: number
  max: number
  detail: string
  selfScore: number
}

export interface SectionResult {
  roman: string
  title: string
  max: number
  criteria: CriterionResult[]
  calcSubtotal: number
  selfSubtotal: number
}

export interface ThresholdResult { key: string; label: string; met: boolean; status: string }

export interface SelectionResult {
  sections: SectionResult[]
  thresholds: ThresholdResult[]
  totalCalc: number
  totalSelf: number
  totalMax: number
}

const num = (v: string | undefined) => {
  const x = parseFloat(String(v ?? '').replace(/[$,%\s]/g, ''))
  return isNaN(x) ? 0 : x
}
const pct = (v: number) => `${(v * 100).toFixed(1)}%`

export function computeSelection(deps: SelectionDeps): SelectionResult {
  const { s12, s24, s25, s26, s27, totalUnits, pctUnitsAt30Ami, tdc, selfScores } = deps
  const q = (m: Record<string, string>, k: string) => (m[k] ?? '') === 'Yes'
  const ss = (k: string) => num(String(selfScores[k] ?? 0))

  // ── §I. TARGETED PROJECT TYPE ───────────────────────────────────────────────
  const qct = q(s12, 'is_qct')
  const ccrp = q(s12, 'is_concerted_revitalization')
  const newConst = q(s12, 'new_construction')
  const isInfill = q(s12, 'is_infill')

  // I.A Community Redevelopment (select one, max 3) — distressed/redev/owner-occ require QCT+CCRP.
  const redevQual = qct && ccrp
  let redevPts = 0
  const redevReasons: string[] = []
  if (q(s12, 'is_distressed') && redevQual) { redevPts = 3; redevReasons.push('Distressed Property') }
  if (q(s12, 'is_redevelopment') && redevQual) { redevPts = 3; redevReasons.push('Redevelopment Property') }
  if (q(s12, 'is_owner_occupied_dev') && redevQual) { redevPts = 3; redevReasons.push('Owner Occupied / Plan of Action') }
  if (newConst && redevQual) { redevPts = 3; redevReasons.push('New Construction in a Concerted Community Revitalization Plan') }
  if (q(s12, 'is_pha')) { redevPts = 3; redevReasons.push('PHA sponsored project') }
  const redevDetail = redevPts > 0
    ? redevReasons[0]
    : (qct || ccrp ? 'Requires the project to be in a QCT and a Concerted Community Revitalization Plan' : 'No qualifying redevelopment selection')

  // I.B Rehabilitation & Preservation (cascade — first match wins, max 8)
  const rehabOptions: [string, number, string][] = [
    ['is_existing_lihtc', 8, 'Existing LIHTC project'],
    ['is_usda_funded', 8, 'Existing USDA / LHC / Federally Funded'],
    ['is_nonhistoric_rehab', 7, 'Existing non-historic residential building'],
    ['is_blighted', 7, 'Blighted housing remediation / replacement'],
    ['is_rehab_infill', 7, 'Rehab Infill / Scattered Site'],
    ['is_historic_preservation', 3, 'Preservation of Residential Historic Property'],
  ]
  let rehabPts = 0, rehabDetail = 'No rehabilitation / preservation selection', rehabUsedInfill = false
  for (const [k, p, lbl] of rehabOptions) {
    if (q(s12, k)) { rehabPts = p; rehabDetail = lbl; rehabUsedInfill = k === 'is_rehab_infill'; break }
  }

  // I.C New Construction (max 7) + NC Infill, and Homeownership (max 1)
  let newConstPts = 0, ncInfillPts = 0
  if (newConst && !isInfill) newConstPts = 7
  if (newConst && q(s12, 'is_nc_infill_scattered') && newConstPts === 0) ncInfillPts = 7
  const newConstBlock = Math.max(newConstPts, ncInfillPts)
  const newConstDetail = newConstPts > 0 ? 'New Construction'
    : ncInfillPts > 0 ? 'New Construction Infill / Scattered Site'
    : (newConst ? 'New construction present (infill flag determines eligibility)' : 'Not a new construction project')
  const homeownershipPts = (newConst && q(s12, 'is_homeownership')) ? 1 : 0

  const sectionI_calc = Math.min(SECTION_MAX.I, Math.max(newConstBlock, rehabPts) + redevPts + homeownershipPts)
  const sectionI: SectionResult = {
    roman: 'I', title: 'Targeted Project Type', max: SECTION_MAX.I,
    criteria: [
      { key: 'I_A_redev', label: 'Community Redevelopment (select one)', calc: redevPts, max: 3, detail: redevDetail, selfScore: ss('I_A_redev') },
      { key: 'I_B_rehab', label: 'Rehabilitation & Preservation', calc: rehabPts, max: 8, detail: rehabDetail, selfScore: ss('I_B_rehab') },
      { key: 'I_C_newconst', label: 'New Construction', calc: newConstBlock, max: 7, detail: newConstDetail, selfScore: ss('I_C_newconst') },
      { key: 'I_C_homeownership', label: 'Homeownership Project', calc: homeownershipPts, max: 1, detail: homeownershipPts > 0 ? 'Qualifies' : '—', selfScore: ss('I_C_homeownership') },
    ],
    calcSubtotal: sectionI_calc,
    selfSubtotal: ss('I_A_redev') + ss('I_B_rehab') + ss('I_C_newconst') + ss('I_C_homeownership'),
  }

  // ── §II. TARGETED POPULATION TYPE (max 6, special needs OR elderly) ──────────
  const snClaim = q(s24, 's24_01_special_needs_points')
  let snUnits = 0
  for (const { active, units } of SPECIAL_NEEDS_UNIT_KEYS) if (q(s24, active)) snUnits += num(s24[units])
  const snPct = totalUnits > 0 ? snUnits / totalUnits : 0
  let snPts = 0
  if (snClaim) snPts = snPct >= 0.30 ? 6 : snPct >= 0.20 ? 5 : snPct >= 0.10 ? 4 : 0
  const elderly100 = q(s24, 's24_03_elderly_100pct')
  const elderlyPts = (snPts === 0 && elderly100) ? 6 : 0
  const sectionII_calc = Math.max(snPts, elderlyPts)
  const sectionII: SectionResult = {
    roman: 'II', title: 'Targeted Population Type', max: SECTION_MAX.II,
    criteria: [
      { key: 'II_A_special_needs', label: 'Special Needs Households', calc: snPts, max: 6, detail: snClaim ? `${pct(snPct)} of units for special needs` : 'Not claimed', selfScore: ss('II_A_special_needs') },
      { key: 'II_A_elderly', label: 'Elderly Households (100%)', calc: elderlyPts, max: 6, detail: elderly100 ? (snPts > 0 ? 'Cannot combine with special needs' : '100% elderly') : 'Not 100% elderly', selfScore: ss('II_A_elderly') },
    ],
    calcSubtotal: sectionII_calc,
    selfSubtotal: ss('II_A_special_needs') + ss('II_A_elderly'),
  }

  // ── §III. PRIORITY DEVELOPMENT AREAS AND OTHER PREFERENCES (max 13) ──────────
  const extClaim = q(s25, 's25_01_extended_afford_points')
  const extWritten = q(s25, 's25_01_written_agreement')
  const extPts0 = extendedAffordPoints(s25['s25_01_waiver_length'] ?? '')
  const extAffordPts = (extClaim && extWritten && extPts0 > 0) ? extPts0 : 0
  const dda = q(s12, 'is_dda'), tribal = q(s12, 'is_tribal')
  const govPts = (dda || qct || tribal) ? 2 : 0
  const govWhich = [dda && 'DDA', qct && 'QCT', tribal && 'RTO'].filter(Boolean).join(', ')
  const parishNorm = (s12['parish'] ?? '').trim().toLowerCase()
  const parishPts = PREFERENCE_PARISHES.includes(parishNorm) ? 2 : 0
  const afClaim = q(s25, 's25_02_additional_financial')
  const afAmount = num(s25['s25_03_additional_financial_amount'])
  const afRatio = (afClaim && tdc > 0) ? afAmount / tdc : 0
  const afPts = afRatio >= 0.07 ? 4 : afRatio >= 0.04 ? 3 : afRatio >= 0.02 ? 2 : 0
  const sectionIII_calc = Math.min(SECTION_MAX.III, extAffordPts + govPts + parishPts + afPts)
  const sectionIII: SectionResult = {
    roman: 'III', title: 'Priority Development Areas & Other Preferences', max: SECTION_MAX.III,
    criteria: [
      { key: 'III_A_ext_afford', label: 'Extended Affordability Agreement', calc: extAffordPts, max: 7, detail: extAffordPts > 0 ? `${s25['s25_01_waiver_length']}` : (extClaim ? 'Requires written agreement + length' : 'Not claimed'), selfScore: ss('III_A_ext_afford') },
      { key: 'III_B_gov', label: 'Governmental Priorities (DDA / QCT / RTO)', calc: govPts, max: 2, detail: govPts > 0 ? `Located in ${govWhich}` : 'Not in a DDA, QCT, or RTO', selfScore: ss('III_B_gov') },
      { key: 'III_B_parish', label: 'Preference Parish (no LIHTC award in 20 yrs)', calc: parishPts, max: 2, detail: parishPts > 0 ? (s12['parish'] ?? '') : 'Parish not on preference list', selfScore: ss('III_B_parish') },
      { key: 'III_C_addl_financial', label: 'Additional Financial Support', calc: afPts, max: 4, detail: afClaim ? `${pct(afRatio)} of TDC` : 'Not claimed', selfScore: ss('III_C_addl_financial') },
    ],
    calcSubtotal: sectionIII_calc,
    selfSubtotal: ss('III_A_ext_afford') + ss('III_B_gov') + ss('III_B_parish') + ss('III_C_addl_financial'),
  }

  // ── §IV. LOCATION CHARACTERISTICS (max 5) ────────────────────────────────────
  const isRural = q(s12, 'is_rural')
  let nhScore = 0
  for (const k of NEIGHBORHOOD_FEATURE_KEYS) nhScore += neighborhoodFeatureScore(s26[k] ?? '', isRural)
  const sectionIV_calc = Math.min(SECTION_MAX.IV, nhScore)
  const sectionIV: SectionResult = {
    roman: 'IV', title: 'Location Characteristics', max: SECTION_MAX.IV,
    criteria: [
      { key: 'IV_A_neighborhood', label: 'Neighborhood Features', calc: sectionIV_calc, max: 5, detail: `${nhScore.toFixed(1)} feature points (${isRural ? 'rural' : 'urban'} thresholds)`, selfScore: ss('IV_A_neighborhood') },
    ],
    calcSubtotal: sectionIV_calc,
    selfSubtotal: ss('IV_A_neighborhood'),
  }

  // ── §V. PROJECT CHARACTERISTICS (max 16) ──────────────────────────────────────
  const homeownership = q(s12, 'is_homeownership')
  const singleSite = q(s12, 'is_single_site')
  const commFac = q(s27, 's27_02_community_facilities')
  const claimedInfill = ncInfillPts > 0 || rehabUsedInfill
  const cfPts = (!homeownership && singleSite && commFac && !claimedInfill) ? 2 : 0
  const cfDetail = cfPts > 0 ? 'Qualifies'
    : !commFac ? 'No community facilities'
    : claimedInfill ? 'Not eligible — infill/scattered-site points claimed'
    : !singleSite ? 'Requires a single-site project'
    : homeownership ? 'Not available for homeownership' : '—'
  const dishPts = q(s27, 's27_03_dishwashers') ? 1 : 0
  let amenityCount = 0
  for (const k of PROJECT_AMENITY_KEYS) if (q(s27, k)) amenityCount++
  const amenityPts = Math.min(amenityCount, 2)
  const mobility = num(s27['s27_06_mobility_units']), hv = num(s27['s27_07_hearing_vision_units'])
  const reqMob = totalUnits > 0 ? Math.ceil(totalUnits * 0.05) : 0
  const reqHv = totalUnits > 0 ? Math.ceil(totalUnits * 0.02) : 0
  const excessAcc = (mobility + hv) - (reqMob + reqHv)
  const accPct = totalUnits > 0 ? excessAcc / totalUnits : 0
  const accPts = accPct >= 0.20 ? 3 : accPct >= 0.10 ? 2 : 0
  const secI = (q(s27, 's27_08_security_cameras') || q(s27, 's27_08_security_gate') || q(s27, 's27_08_security_guard')) ? 2 : 0
  const secII = q(s27, 's27_08_cameras_surveillance') ? 1 : 0
  const hudPts = q(s27, 's27_03_hud_defensible_space') ? 2 : 0
  const fqhcPts = q(s27, 's27_03_fqhc') ? 1 : 0
  const sectionV_calc = Math.min(SECTION_MAX.V, cfPts + dishPts + amenityPts + accPts + secI + secII + hudPts + fqhcPts)
  const sectionV: SectionResult = {
    roman: 'V', title: 'Project Characteristics', max: SECTION_MAX.V,
    criteria: [
      { key: 'V_A_community_fac', label: 'Community Facilities', calc: cfPts, max: 2, detail: cfDetail, selfScore: ss('V_A_community_fac') },
      { key: 'V_B_dishwashers', label: 'Dishwashers in each unit (required)', calc: dishPts, max: 1, detail: dishPts > 0 ? 'Provided' : 'Not provided', selfScore: ss('V_B_dishwashers') },
      { key: 'V_C_amenities', label: 'Project Amenities', calc: amenityPts, max: 2, detail: `${amenityCount} amenit${amenityCount === 1 ? 'y' : 'ies'} claimed (capped at 2)`, selfScore: ss('V_C_amenities') },
      { key: 'V_D_accessible', label: 'Additional Accessible Units', calc: accPts, max: 3, detail: totalUnits > 0 ? `${pct(accPct)} of units above the §504 minimum` : 'Enter unit mix', selfScore: ss('V_D_accessible') },
      { key: 'V_E_security_i', label: 'On-Site Security (cameras / gate / guard)', calc: secI, max: 2, detail: secI > 0 ? 'Provided' : 'None selected', selfScore: ss('V_E_security_i') },
      { key: 'V_E_security_ii', label: 'Security cameras connect to crime surveillance', calc: secII, max: 1, detail: secII > 0 ? 'Yes' : 'No', selfScore: ss('V_E_security_ii') },
      { key: 'V_F_hud_defensible', label: 'HUD Defensible Space', calc: hudPts, max: 2, detail: hudPts > 0 ? 'Yes' : 'No', selfScore: ss('V_F_hud_defensible') },
      { key: 'V_G_fqhc', label: 'Federally Qualified Health Center (FQHC)', calc: fqhcPts, max: 1, detail: fqhcPts > 0 ? 'On-site (frequency tiers 2–3 pts not captured in §27)' : 'No', selfScore: ss('V_G_fqhc') },
    ],
    calcSubtotal: sectionV_calc,
    selfSubtotal: ['V_A_community_fac', 'V_B_dishwashers', 'V_C_amenities', 'V_D_accessible', 'V_E_security_i', 'V_E_security_ii', 'V_F_hud_defensible', 'V_G_fqhc'].reduce((s, k) => s + ss(k), 0),
  }

  const sections = [sectionI, sectionII, sectionIII, sectionIV, sectionV]
  const totalCalc = sections.reduce((s, x) => s + x.calcSubtotal, 0)
  const totalSelf = sections.reduce((s, x) => s + x.selfSubtotal, 0)

  // ── §VI. THRESHOLD REQUIREMENTS (acknowledgements, not points) ────────────────
  const tier12 = q(s27, 's27_09_tier1_2_parish')
  const fortified = q(s27, 's27_09_fortified_roof') || q(s27, 's27_09_fortified_silver')
  const thresholds: ThresholdResult[] = [
    { key: 'H', label: '30% AMI set-aside: ≥5% of units at or below 30% AMI', met: pctUnitsAt30Ami >= 0.05, status: `${pct(pctUnitsAt30Ami)} of units` },
    { key: 'I', label: 'Resiliency: FORTIFIED roofs, windows & doors (Tier 1 / Tier 2 parishes)', met: !tier12 || fortified, status: tier12 ? (fortified ? 'Met' : 'Required — not met') : 'Not required (not Tier 1/2)' },
    { key: 'J_evic', label: 'Eviction Prevention Plan', met: q(s27, 's27_10_eviction_prevention_plan'), status: q(s27, 's27_10_eviction_prevention_plan') ? 'Met' : 'Required' },
    { key: 'J_screen', label: 'Low-Barrier Tenant Screening', met: q(s27, 's27_10_low_barrier_screening'), status: q(s27, 's27_10_low_barrier_screening') ? 'Met' : 'Required' },
    { key: 'K', label: 'Development Wi-Fi (architect certification required)', met: q(s27, 's27_03_free_wifi'), status: q(s27, 's27_03_free_wifi') ? 'Met' : 'Required' },
  ]

  return { sections, thresholds, totalCalc, totalSelf, totalMax: TOTAL_MAX }
}
