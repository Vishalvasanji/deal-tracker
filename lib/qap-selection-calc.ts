// QAP Selection Criteria — calc layer.
// Computes the Calculated points for every visible criterion from Project Description /
// Unit Mix data, applies the section caps, and sums to TOTAL POINTS (sheet row 129).
// Self-Score is the applicant's manual claim, passed through and summed in parallel.
// Each grouped block (e.g. I.A "select one") shows its individual selectable lines plus a
// group header carrying the rolled-up (MAX/capped) calculated subtotal.

import {
  SECTION_MAX, TOTAL_MAX, PREFERENCE_PARISHES, extendedAffordPoints, neighborhoodFeatureScore,
  NEIGHBORHOOD_FEATURE_KEYS, SPECIAL_NEEDS_UNIT_KEYS,
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
  level: 'group' | 'line'   // 'group' = header with rolled-up calc (no self-score input)
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
  const line = (key: string, label: string, calc: number, max: number, detail = ''): CriterionResult =>
    ({ key, label, calc, max, detail, selfScore: ss(key), level: 'line' })
  const group = (key: string, label: string, calc: number, max: number, detail = ''): CriterionResult =>
    ({ key, label, calc, max, detail, selfScore: 0, level: 'group' })
  const selfSum = (crits: CriterionResult[]) => crits.reduce((s, c) => s + (c.level === 'line' ? c.selfScore : 0), 0)

  // ── §I. TARGETED PROJECT TYPE ───────────────────────────────────────────────
  const qct = q(s12, 'is_qct')
  const ccrp = q(s12, 'is_concerted_revitalization')
  const newConst = q(s12, 'new_construction')
  const isInfill = q(s12, 'is_infill')
  const redevQual = qct && ccrp
  const qualNote = 'Requires QCT + Concerted Community Revitalization Plan'

  // I.A Community Redevelopment (select one, max 3)
  const distressedPts = q(s12, 'is_distressed') && redevQual ? 3 : 0
  const redevPropPts = q(s12, 'is_redevelopment') && redevQual ? 3 : 0
  const ownerPts = q(s12, 'is_owner_occupied_dev') && redevQual ? 3 : 0
  const ccrpNewPts = newConst && redevQual ? 3 : 0
  const phaPts = q(s12, 'is_pha') ? 3 : 0
  const redevPts = Math.max(distressedPts, redevPropPts, ownerPts, ccrpNewPts, phaPts)

  // I.B Rehabilitation & Preservation (cascade — first match wins, max 8)
  const h22 = q(s12, 'is_existing_lihtc') ? 8 : 0
  const h23 = h22 === 0 && q(s12, 'is_usda_funded') ? 8 : 0
  const h24 = h22 + h23 === 0 && q(s12, 'is_nonhistoric_rehab') ? 7 : 0
  const h25 = h22 + h23 + h24 === 0 && q(s12, 'is_blighted') ? 7 : 0
  const h26 = h22 + h23 + h24 + h25 === 0 && q(s12, 'is_rehab_infill') ? 7 : 0
  const h27 = h22 + h23 + h24 + h25 + h26 === 0 && q(s12, 'is_historic_preservation') ? 3 : 0
  const rehabPts = Math.max(h22, h23, h24, h25, h26, h27)
  const rehabUsedInfill = h26 > 0

  // I.C New Construction (max 7) + NC infill + Homeownership (max 1)
  const h31 = newConst && !isInfill ? 7 : 0
  const h32 = newConst && q(s12, 'is_nc_infill_scattered') && h31 === 0 ? 7 : 0
  const newConstBlock = Math.max(h31, h32)
  const homeownershipPts = newConst && q(s12, 'is_homeownership') ? 1 : 0

  const sectionI_calc = Math.min(SECTION_MAX.I, Math.max(newConstBlock, rehabPts) + redevPts + homeownershipPts)
  const sectionI_crit = [
    group('grp_I_A', 'A. Community Redevelopment — select one (max 3)', redevPts, 3,
      redevPts === 0 && !phaPts ? qualNote : ''),
    line('I_A_distressed', 'a. Distressed Property', distressedPts, 3, distressedPts ? '' : q(s12, 'is_distressed') ? qualNote : ''),
    line('I_A_redev', 'b. Redevelopment Property', redevPropPts, 3, redevPropPts ? '' : q(s12, 'is_redevelopment') ? qualNote : ''),
    line('I_A_owner', 'c. Owner Occupied / Plan of Action', ownerPts, 3, ownerPts ? '' : q(s12, 'is_owner_occupied_dev') ? qualNote : ''),
    line('I_A_ccrp', 'ii. New Construction in a Concerted Community Revitalization Plan', ccrpNewPts, 3),
    line('I_A_pha', 'iii. PHA sponsored project', phaPts, 3),
    group('grp_I_B', 'B. Rehabilitation & Preservation — select one (max 8)', rehabPts, 8),
    line('I_B_lihtc', 'i.a Existing LIHTC project', h22, 8),
    line('I_B_usda', 'i.b Existing USDA / LHC / Federally Funded', h23, 8),
    line('I_B_nonhistoric', 'i.c Existing non-historic residential building', h24, 7),
    line('I_B_blighted', 'i.d Blighted housing remediation / replacement', h25, 7),
    line('I_B_rehab_infill', 'i.e Rehab Infill / Scattered Site', h26, 7),
    line('I_B_historic', 'i.f Preservation of Residential Historic Property', h27, 3),
    group('grp_I_C', 'C. New Construction (max 8)', newConstBlock + homeownershipPts, 8,
      newConstBlock && rehabPts ? 'New construction and rehab are mutually exclusive — the higher counts' : ''),
    line('I_C_newconst', 'i.a New Construction', h31, 7, h31 ? '' : (newConst && isInfill ? 'Infill project — see NC Infill' : '')),
    line('I_C_ncinfill', 'i.b New Construction Infill / Scattered Site', h32, 7),
    line('I_C_homeownership', 'i.c Homeownership Project', homeownershipPts, 1),
  ]
  const sectionI: SectionResult = {
    roman: 'I', title: 'Targeted Project Type', max: SECTION_MAX.I,
    criteria: sectionI_crit, calcSubtotal: sectionI_calc, selfSubtotal: selfSum(sectionI_crit),
  }

  // ── §II. TARGETED POPULATION TYPE (max 6, special needs OR elderly) ──────────
  const snClaim = q(s24, 's24_01_special_needs_points')
  let snUnits = 0
  for (const { active, units } of SPECIAL_NEEDS_UNIT_KEYS) if (q(s24, active)) snUnits += num(s24[units])
  const snPct = totalUnits > 0 ? snUnits / totalUnits : 0
  let snPts = 0
  if (snClaim) snPts = snPct >= 0.30 ? 6 : snPct >= 0.20 ? 5 : snPct >= 0.10 ? 4 : 0
  const elderly100 = q(s24, 's24_03_elderly_100pct')
  const elderlyPts = snPts === 0 && elderly100 ? 6 : 0
  const sectionII_crit = [
    line('II_A_special_needs', 'A.i Special Needs Households', snPts, 6, snClaim ? `${pct(snPct)} of units for special needs` : 'Not claimed'),
    line('II_A_elderly', 'A.ii Elderly Households (100%)', elderlyPts, 6, elderly100 ? (snPts > 0 ? 'Cannot combine with special needs' : '100% elderly') : 'Not 100% elderly'),
  ]
  const sectionII: SectionResult = {
    roman: 'II', title: 'Targeted Population Type', max: SECTION_MAX.II,
    criteria: sectionII_crit, calcSubtotal: Math.max(snPts, elderlyPts), selfSubtotal: selfSum(sectionII_crit),
  }

  // ── §III. PRIORITY DEVELOPMENT AREAS AND OTHER PREFERENCES (max 13) ──────────
  const extClaim = q(s25, 's25_01_extended_afford_points')
  const extWritten = q(s25, 's25_01_written_agreement')
  const extPts0 = extendedAffordPoints(s25['s25_01_waiver_length'] ?? '')
  const extAffordPts = extClaim && extWritten && extPts0 > 0 ? extPts0 : 0
  const dda = q(s12, 'is_dda'), tribal = q(s12, 'is_tribal')
  const ddaPts = dda ? 2 : 0, qctPts = qct ? 2 : 0, rtoPts = tribal ? 2 : 0
  const govPts = Math.max(ddaPts, qctPts, rtoPts)
  const parishNorm = (s12['parish'] ?? '').trim().toLowerCase()
  const parishPts = PREFERENCE_PARISHES.includes(parishNorm) ? 2 : 0
  const afClaim = q(s25, 's25_02_additional_financial')
  const afAmount = num(s25['s25_03_additional_financial_amount'])
  const afRatio = afClaim && tdc > 0 ? afAmount / tdc : 0
  const afPts = afRatio >= 0.07 ? 4 : afRatio >= 0.04 ? 3 : afRatio >= 0.02 ? 2 : 0
  const sectionIII_calc = Math.min(SECTION_MAX.III, extAffordPts + govPts + parishPts + afPts)
  const sectionIII_crit = [
    line('III_A_ext_afford', 'A. Extended Affordability Agreement', extAffordPts, 7, extAffordPts > 0 ? (s25['s25_01_waiver_length'] ?? '') : (extClaim ? 'Requires written agreement + length' : 'Not claimed')),
    group('grp_III_B', 'B.i Governmental Priorities — located in DDA / QCT / RTO (max 2)', govPts, 2),
    line('III_B_dda', 'Difficult Development Area (DDA)', ddaPts, 2, dda ? 'Located in a DDA' : 'Not in a DDA'),
    line('III_B_qct', 'Qualified Census Tract (QCT)', qctPts, 2, qct ? 'Located in a QCT' : 'Not in a QCT'),
    line('III_B_rto', 'Federally / State recognized Tribal Organization (RTO)', rtoPts, 2, tribal ? 'Located in an RTO' : 'Not in an RTO'),
    line('III_B_parish', 'B.ii Preference Parish (Grant, La Salle, St. Charles, St. Helena)', parishPts, 2, parishPts > 0 ? (s12['parish'] ?? '') : 'Not a preference parish'),
    line('III_C_addl_financial', 'C. Additional Financial Support', afPts, 4, afClaim ? `${pct(afRatio)} of TDC` : 'Not claimed'),
  ]
  const sectionIII: SectionResult = {
    roman: 'III', title: 'Priority Development Areas & Other Preferences', max: SECTION_MAX.III,
    criteria: sectionIII_crit, calcSubtotal: sectionIII_calc, selfSubtotal: selfSum(sectionIII_crit),
  }

  // ── §IV. LOCATION CHARACTERISTICS (max 5) ────────────────────────────────────
  const isRural = q(s12, 'is_rural')
  let nhScore = 0
  for (const k of NEIGHBORHOOD_FEATURE_KEYS) nhScore += neighborhoodFeatureScore(s26[k] ?? '', isRural)
  const sectionIV_calc = Math.min(SECTION_MAX.IV, nhScore)
  const sectionIV_crit = [
    line('IV_A_neighborhood', 'A.i Neighborhood Features', sectionIV_calc, 5, `${nhScore.toFixed(1)} feature points (${isRural ? 'rural' : 'urban'} thresholds)`),
  ]
  const sectionIV: SectionResult = {
    roman: 'IV', title: 'Location Characteristics', max: SECTION_MAX.IV,
    criteria: sectionIV_crit, calcSubtotal: sectionIV_calc, selfSubtotal: selfSum(sectionIV_crit),
  }

  // ── §V. PROJECT CHARACTERISTICS (max 16) ──────────────────────────────────────
  const homeownership = q(s12, 'is_homeownership')
  const singleSite = q(s12, 'is_single_site')
  const commFac = q(s27, 's27_02_community_facilities')
  const claimedInfill = h32 > 0 || rehabUsedInfill
  const cfPts = !homeownership && singleSite && commFac && !claimedInfill ? 2 : 0
  const cfDetail = cfPts > 0 ? 'Qualifies'
    : !commFac ? 'No community facilities'
    : claimedInfill ? 'Not eligible — infill / scattered-site points claimed'
    : !singleSite ? 'Requires a single-site project'
    : homeownership ? 'Not available for homeownership' : ''
  const dishPts = q(s27, 's27_03_dishwashers') ? 1 : 0
  const a = (k: string) => (q(s27, k) ? 1 : 0)
  const amen = [a('s27_04_playground'), a('s27_04_computer_center'), a('s27_04_exercise_room'), a('s27_04_picnic_area'), a('s27_04_courtyard_seating')]
  const amenityCount = amen.reduce((s, x) => s + x, 0)
  const amenityPts = Math.min(amenityCount, 2)
  const mobility = num(s27['s27_06_mobility_units']), hv = num(s27['s27_07_hearing_vision_units'])
  const reqMob = totalUnits > 0 ? Math.ceil(totalUnits * 0.05) : 0
  const reqHv = totalUnits > 0 ? Math.ceil(totalUnits * 0.02) : 0
  const accPct = totalUnits > 0 ? ((mobility + hv) - (reqMob + reqHv)) / totalUnits : 0
  const accPts = accPct >= 0.20 ? 3 : accPct >= 0.10 ? 2 : 0
  const camPts = q(s27, 's27_08_security_cameras') ? 2 : 0
  const gatePts = q(s27, 's27_08_security_gate') ? 2 : 0
  const guardPts = q(s27, 's27_08_security_guard') ? 2 : 0
  const secI = Math.max(camPts, gatePts, guardPts)
  const secII = q(s27, 's27_08_cameras_surveillance') ? 1 : 0
  const hudPts = q(s27, 's27_03_hud_defensible_space') ? 2 : 0
  const fqhcPts = q(s27, 's27_03_fqhc') ? 1 : 0
  const sectionV_calc = Math.min(SECTION_MAX.V, cfPts + dishPts + amenityPts + accPts + secI + secII + hudPts + fqhcPts)
  const sectionV_crit = [
    line('V_A_community_fac', 'A. Community Facilities', cfPts, 2, cfDetail),
    line('V_B_dishwashers', 'B. Dishwashers in each unit (required)', dishPts, 1, dishPts ? 'Provided' : 'Not provided'),
    group('grp_V_C', 'C. Project Amenities (max 2)', amenityPts, 2, `${amenityCount} claimed`),
    line('V_C_playground', 'Playground', amen[0], 1),
    line('V_C_computer', 'Computer Center (min 5 computers)', amen[1], 1),
    line('V_C_exercise', 'Exercise Room (with equipment)', amen[2], 1),
    line('V_C_picnic', 'Picnic Area with Permanent Grill', amen[3], 1),
    line('V_C_courtyard', 'Courtyard with Seating', amen[4], 1),
    line('V_D_accessible', 'D. Additional Accessible Units', accPts, 3, totalUnits > 0 ? `${pct(accPct)} of units above the §504 minimum` : 'Enter unit mix'),
    group('grp_V_E', 'E. On-Site Security — i. highest of the three counts (max 2) + ii (max 3 total)', secI + secII, 3),
    line('V_E_cameras', 'i. Security Cameras', camPts, 2),
    line('V_E_gate', 'i. Security Gate', gatePts, 2),
    line('V_E_guard', 'i. On-Site Security Guard', guardPts, 2),
    line('V_E_surveillance', 'ii. Cameras connect to crime surveillance initiative', secII, 1),
    line('V_F_hud_defensible', 'F. HUD Defensible Space', hudPts, 2, hudPts ? 'Yes' : 'No'),
    line('V_G_fqhc', 'G. Federally Qualified Health Center (FQHC)', fqhcPts, 1, fqhcPts ? 'On-site (frequency tiers 2–3 pts not captured in §27)' : 'No'),
  ]
  const sectionV: SectionResult = {
    roman: 'V', title: 'Project Characteristics', max: SECTION_MAX.V,
    criteria: sectionV_crit, calcSubtotal: sectionV_calc, selfSubtotal: selfSum(sectionV_crit),
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
