import { RESERVE_YEARS } from './qap-reserve-adequacy'
import type { ReserveInputs, ReserveResult, ReserveYear } from './qap-reserve-adequacy'

const r0 = (n: number) => Math.round(n)

export function computeReserveAdequacy(inp: ReserveInputs): ReserveResult {
  const N = RESERVE_YEARS
  const units = inp.totalUnits
  const needsRaw = Array.from({ length: N }, (_, i) => inp.capitalNeeds[i] ?? 0)

  // Annual deposit (row 11): year 1 is the proposed deposit; later years escalate.
  const deposits: number[] = []
  for (let i = 0; i < N; i++) {
    deposits[i] = i === 0 ? inp.annualDepositY1 : r0(deposits[i - 1] * (1 + inp.escalation))
  }

  // Inflation factor (row 30) compounds at the inflation rate; year 1 factor = 1.
  const inflFactor: number[] = []
  for (let i = 0; i < N; i++) {
    inflFactor[i] = i === 0 ? 1 : inflFactor[i - 1] * (1 + inp.inflationRate)
  }
  // Inflated anticipated needs (row 31).
  const inflatedNeeds = needsRaw.map((v, i) => r0(v * inflFactor[i]))

  // Minimum Reserve Balance per unit (B26): largest annual deposit / 6 / units.
  const maxDeposit = deposits.reduce((m, d) => Math.max(m, d), 0)
  const minBalancePerUnit = units === 0 ? 0 : r0(maxDeposit / 6 / units)

  const years: ReserveYear[] = []
  let prevEnding = 0
  for (let i = 0; i < N; i++) {
    const beginning = i === 0 ? inp.initialDeposit : prevEnding
    const deposit = deposits[i]
    const needs = inflatedNeeds[i]
    const net = deposit - needs
    // Interest accrues on the beginning balance, less any shortfall when needs exceed the deposit.
    const interest = r0((beginning + Math.min(0, net)) * inp.interestRate)
    const ending = beginning + deposit - needs + interest
    const perUnit = units === 0 ? 0 : ending / units
    const problem = perUnit < minBalancePerUnit
    years.push({ year: i + 1, beginning, deposit, needs, interest, ending, perUnit, problem })
    prevEnding = ending
  }

  const shortfallYears = years.filter(y => y.problem).map(y => y.year)
  let lowest = years[0]
  for (const y of years) if (y.perUnit < lowest.perUnit) lowest = y
  const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / (a.length || 1)

  return {
    years,
    inflatedNeeds,
    minBalancePerUnit,
    shortfallYears,
    lowestPerUnit: lowest.perUnit,
    lowestPerUnitYear: lowest.year,
    avgUninflated: avg(needsRaw),
    avgInflated: avg(inflatedNeeds),
  }
}
