// Replacement Reserve Adequacy — mirrors the QAP "Reserve Adequacy" worksheet.
// A 15-year roll-forward of the replacement reserve fund that tests whether the
// per-unit ending balance stays at or above the QAP Minimum Reserve Balance each year.
// Required only when a Capital Needs Assessment (CNA) is required for the transaction.

export const RESERVE_YEARS = 15
export const INTEREST_RATE_DEFAULT = 1   // % — LHC standard (sheet B23 = 0.01)
export const INFLATION_RATE_DEFAULT = 2  // % — LHC standard (sheet B24 = 0.02)

export interface ReserveInputs {
  initialDeposit: number   // Development Costs · Replacement Reserve Deposit (DC!C101 → B20)
  annualDepositY1: number  // PD §29 reserve PUPA × total units (PD!H987 → B21)
  escalation: number       // PD §28 ADRR escalation rate, as a decimal (PD!H971 → B22)
  totalUnits: number       // Unit Mix total (Unit Mix!F41 → B25)
  interestRate: number     // decimal (B23)
  inflationRate: number    // decimal (B24)
  capitalNeeds: number[]   // uninflated anticipated capital needs, one per year (row 29)
}

export interface ReserveYear {
  year: number
  beginning: number  // row 10
  deposit: number    // row 11 (escalating annual deposit)
  needs: number      // row 12 magnitude (inflated anticipated needs)
  interest: number   // row 13
  ending: number     // row 15
  perUnit: number    // row 16
  problem: boolean   // row 17 (per-unit ending below minimum)
}

export interface ReserveResult {
  years: ReserveYear[]
  inflatedNeeds: number[]    // row 31
  minBalancePerUnit: number  // B26 (per QAP definition of Minimum Reserve Balance)
  shortfallYears: number[]   // 1-based year numbers flagged "Problem"
  lowestPerUnit: number      // worst per-unit ending balance across the term
  lowestPerUnitYear: number
  avgUninflated: number      // G21
  avgInflated: number        // L21
}
