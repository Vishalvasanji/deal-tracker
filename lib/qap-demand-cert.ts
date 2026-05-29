// Demand Certification — "Certification of Demand for New Units" (Demand Cert sheet).
// Completed by the qualified housing consultant / market analyst from the market study.
// Fully manual entry; the "By:" signatory is a free input (the consultant, not the principal).

export const DEMAND_CERT_SECTION = 'demand_cert'

export const UNIT_ROWS = [
  { key: 'eff', label: 'Efficiency' },
  { key: 'br1', label: '1 BR' },
  { key: 'br2', label: '2 BR' },
  { key: 'br3', label: '3 BR' },
  { key: 'br4', label: '4 BR' },
] as const

// (3) Market study data, by unit size.
export const MARKET_STUDY_COLS = [
  { key: 'config', label: 'Project Configuration No. of Units' },
  { key: 'total_area', label: 'Total Market Area Units' },
  { key: 'substandard', label: 'Substandard Units' },
  { key: 'vacancy', label: 'Vacancy Rate' },
  { key: 'projected_need', label: 'Projected Need for New Units' },
  { key: 'need_50', label: 'Need at 50% AMI' },
  { key: 'need_60', label: 'Need at 60% AMI' },
] as const

// (4) Vacancy rates & market rents.
export const VACANCY_COLS = [
  { key: 'vac_sub', label: 'Vacancy Rate (Subsidized)' },
  { key: 'vac_mkt', label: 'Vacancy Rate (Market)' },
  { key: 'market_rents', label: 'Market Rents (Non-Subsidized)' },
] as const

// (5) Income-eligible households by household income level.
export const INCOME_COLS = [
  { key: 'inc_0_30', label: '0–30%' },
  { key: 'inc_31_40', label: '31–40%' },
  { key: 'inc_41_50', label: '41–50%' },
  { key: 'inc_51_60', label: '51–60%' },
] as const

// (6) Expected occupancy ramp.
export const OCCUPANCY_ROWS = [
  { key: 'occ_10', label: '10%' },
  { key: 'occ_50', label: '50%' },
  { key: 'occ_75', label: '75%' },
  { key: 'occ_90', label: '90%' },
  { key: 'occ_100', label: '100%' },
] as const

// (7)/(8) Special-needs households by unit size. Elderly is N/A for 2 BR and larger.
export const SPECIAL_NEEDS_COLS = [
  { key: 'elderly', label: 'Elderly' },
  { key: 'homeless', label: 'Homeless' },
  { key: 'handicapped', label: 'Handicapped' },
] as const

// Unit rows where "Elderly" special-needs is marked N/A on the worksheet.
export const ELDERLY_NA_ROWS = ['br2', 'br3', 'br4']
