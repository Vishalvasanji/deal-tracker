// LHC fee tier schedules from the QAP "Controls" sheet. Shared so the §32 fee table
// and the Revenues & Expenses LHC Asset Management Fee stay in sync (single source).

// Controls!A187 (Application Fee) / A195 (Analysis Fee) — same tier, by TOTAL units.
export function calcApplicationFee(units: number): number {
  if (units <= 4) return 100
  if (units <= 32) return 1000
  if (units <= 60) return 1500
  if (units <= 100) return 2500
  return 5000
}

// Controls!A230 (Asset Management Fee) — by LIHTC units.
export function calcAssetMgmtFee(lihtcUnits: number): number {
  if (lihtcUnits <= 4) return 250
  if (lihtcUnits <= 10) return 500
  if (lihtcUnits <= 20) return 1000
  if (lihtcUnits <= 50) return 2000
  if (lihtcUnits <= 100) return 2500
  return 3000
}

export const MARKET_STUDY_FEE = 4800
export const COMPLIANCE_FEE_PER_UNIT = 40
