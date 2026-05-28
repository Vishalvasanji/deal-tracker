// QAP Selection Criteria — static config.
// Mirrors the visible (non-hidden) rows of the "Selection Criteria" sheet. The headline
// metric is TOTAL POINTS (sheet row 129 = sum of section totals I+II+III+IV+V, max 51).
// Each criterion is scored two ways: Calculated (auto-derived from Project Description /
// Unit Mix data) and Self-Score (the applicant's manual claim, "Points Claimed by Taxpayer").
// Hidden Excel rows (De-Concentration, Increased Unit Affordability, DEI, TDC-below-max,
// Green Building, Universal Design, washers/dryers) are intentionally excluded.

export const SECTION_MAX = { I: 11, II: 6, III: 13, IV: 5, V: 16 } as const
export const TOTAL_MAX = 51   // = 11 + 6 + 13 + 5 + 16 (sheet L129)

// §III.B.ii — parishes that have not received a LIHTC award in the last 20 years (+2 pts).
export const PREFERENCE_PARISHES = ['grant', 'lasalle', 'la salle', 'st. charles', 'st charles', 'st. helena', 'st helena']

// §III.A — extended affordability waiver length → points (Section 25 mirror).
export function extendedAffordPoints(waiverLength: string): number {
  if (waiverLength === 'Until after the 35th year') return 3
  if (waiverLength === 'Until after the 40th year') return 4
  if (waiverLength === 'Until after the 45th year') return 5
  return 0
}

// §IV.A — neighborhood feature score per amenity (Section 26 mirror): urban 1mi=1 / 2mi=0.5,
// rural 5mi=1; everything else 0.
export function neighborhoodFeatureScore(val: string, isRural: boolean): number {
  if (isRural) return val === 'Within 5 Mile Radius' ? 1 : 0
  return val === 'Within 1 Mile Radius' ? 1 : val === 'Within 2 Mile Radius' ? 0.5 : 0
}

export const NEIGHBORHOOD_FEATURE_KEYS = [
  's26_01_grocery_store', 's26_01_fresh_produce', 's26_01_hospital_clinic', 's26_01_bank',
  's26_01_school', 's26_01_college', 's26_01_pharmacy', 's26_01_public_transit',
  's26_01_day_care', 's26_01_public_park', 's26_01_police_fire',
]

export const PROJECT_AMENITY_KEYS = [
  's27_04_playground', 's27_04_computer_center', 's27_04_exercise_room',
  's27_04_picnic_area', 's27_04_courtyard_seating',
]

export const SPECIAL_NEEDS_UNIT_KEYS: { active: string; units: string }[] = [
  { active: 's24_02_homeless_active', units: 's24_02_homeless_units' },
  { active: 's24_02_disabled_active', units: 's24_02_disabled_units' },
  { active: 's24_02_single_parent_active', units: 's24_02_single_parent_units' },
  { active: 's24_02_veterans_active', units: 's24_02_veterans_units' },
]

// Threshold requirements (§VI) — acknowledgements, not points.
export interface ThresholdReq { key: string; label: string }
export const THRESHOLD_REQS: ThresholdReq[] = [
  { key: 'H', label: '30% AMI set-aside: at least 5% of units at or below 30% AMI' },
  { key: 'I', label: 'Resiliency: FORTIFIED roofs, windows and doors (required in Tier 1 / Tier 2 parishes)' },
  { key: 'J_evic', label: 'Eviction Prevention Plan' },
  { key: 'J_screen', label: 'Low-Barrier Tenant Screening' },
  { key: 'K', label: 'Development Wi-Fi (architect certification required)' },
]
