// Serious Problems — the app's centralized validation dashboard. Aggregates every
// error/warning the app computes across modules into one list, each linked back to its
// source module/section. Mirrors the QAP "Serious Problems" sheet, which references the
// IF-based error cells on each worksheet.
import type { DevCostResult } from './qap-dev-costs-calc'
import type { BasisResult } from './qap-basis-calc'
import type { RevExpResult } from './qap-rev-exp-calc'
import type { ReserveResult } from './qap-reserve-adequacy'
import type { SyndResult } from './qap-syndication-calc'

export type FlagSeverity = 'error' | 'warning'

export interface Flag {
  severity: FlagSeverity
  module: string    // source worksheet/module display name
  section?: string  // sub-section label, e.g. "§15.01 Basis Boost"
  message: string
  route: string     // app route slug for the deep link, e.g. "project-description"
}

type Sections = Record<string, Record<string, string>>

export interface FlagsInput {
  s: Sections                       // all qap_fields sections, keyed by section name
  devCosts?: DevCostResult | null
  basis?: BasisResult | null
  revExp?: RevExpResult | null
  reserve?: ReserveResult | null
  synd?: SyndResult | null
  devCostsSyndTotal?: number | null // Dev Costs "Syndication Costs" total (D106) — for the Part VI cross-check
  gapMethodCredit?: number | null   // annual LIHTC by the equity-gap method (Excel H686); null when not computable
  unitMix?: {
    setAsideElection: string
    setAsideMet: boolean
    totalUnits: number
    unitsUnder30: number
    rowFlagCount: number
  } | null
  // Cash-flow pro forma DSCRs (Excel C1015 / B1025) — populated once the Proforma module lands.
  proforma?: {
    hasCashFlow: boolean   // SUM(H1009:H1013) > 0 — only check once revenue/expenses are entered
    year1Dscr: number      // H1015
    minY1Dscr: number      // M1014 — Year-1 DSCR floor
    maxY1Dscr: number      // M1015 — Year-1 DSCR ceiling
    maxDscr15: number      // M1020 — highest DSCR through year 15
    minDscr15: number      // M1021 — lowest DSCR through year 15
  } | null
}

const PD = 'Project Description'
const num = (v: string | undefined) => {
  const x = parseFloat(String(v ?? '').replace(/[$,%\s]/g, ''))
  return isNaN(x) ? 0 : x
}
const yes = (v: string | undefined) => (v ?? '') === 'Yes'

// QNP/CHDO drops to $1M when rural; reprocessing has no cap (Controls C37 blank).
const POOL_LIHTC_CAP: Record<string, number> = {
  'Qualified Non-Profit/CHDO Set-Aside': 1_500_000,
  'Urban Area Pool': 1_500_000,
  'Rural Area Rehabilitation Pool': 1_000_000,
  'Rural Area New Construction Pool': 1_000_000,
  'Choice Neighborhood Initiative CNI Set-Aside': 1_500_000,
}

export function computeFlags(input: FlagsInput): Flag[] {
  const { s } = input
  const flags: Flag[] = []
  const add = (severity: FlagSeverity, module: string, route: string, message: string, section?: string) =>
    flags.push({ severity, module, route, message, section })

  const s10 = s['section_10'] ?? {}, s12 = s['section_12'] ?? {}, s13 = s['section_13'] ?? {}
  const s14 = s['section_14'] ?? {}, s15 = s['section_15'] ?? {}, s18 = s['section_18'] ?? {}
  const s23 = s['section_23'] ?? {}, s27 = s['section_27'] ?? {}, s28 = s['section_28'] ?? {}
  const s29 = s['section_29'] ?? {}
  const synd = s['syndication'] ?? {}

  // ── Project Description ──────────────────────────────────────────────────────
  // §10 — 9% LIHTCs cannot combine with tax-exempt bonds (Excel B24)
  if (yes(s10['lihtc_9pct']) && yes(s10['bond_financing']))
    add('error', PD, 'project-description', 'Cannot combine 9% LIHTCs and tax-exempt bond financing.', '§10 Project Funding')

  // §14 — LIHTCs requested exceed the pool cap (Excel B205)
  const pool = s13['funding_pool'] ?? ''
  const isRural = yes(s12['is_rural'])
  const poolCap = pool === 'Reprocessing' ? null
    : pool === 'Qualified Non-Profit/CHDO Set-Aside' && isRural ? 1_000_000
    : POOL_LIHTC_CAP[pool] ?? null
  const creditsReq = num(s14['credits_requested'])
  if (poolCap !== null && creditsReq > poolCap)
    add('error', PD, 'project-description', `LIHTCs requested ($${creditsReq.toLocaleString()}) exceed the $${poolCap.toLocaleString()} cap for the ${pool} pool.`, '§14 Requests for LIHTCs')

  // §15 — basis boost limits (Excel B222/B223)
  const cBoost = num(s15['construction_basis_boost'])
  if (yes(s10['lihtc_9pct']) && cBoost > 0.301)
    add('error', PD, 'project-description', 'A 9% project’s construction basis boost cannot exceed 30%.', '§15 Basis Boost')

  // §18.10 — Estimated LIHTC equity must match the Syndication gross equity invested (Excel B433)
  const equity1810 = num(s18['s18_10_amount'])
  const syndGross = num(synd['gross_equity'])
  if (equity1810 > 0 && syndGross > 0 && Math.round(equity1810) !== Math.round(syndGross))
    add('error', PD, 'project-description', `§18.10 LIHTC equity ($${Math.round(equity1810).toLocaleString()}) does not match the Syndication gross equity invested ($${Math.round(syndGross).toLocaleString()}).`, '§18 Permanent Sources')

  // §12 — veteran/disabled/elderly preference required (Excel B155); suppressed while "Missing"/blank
  const vetPref = s12['veteran_preference'] ?? ''
  if (vetPref.trim() !== '' && vetPref !== 'Yes' && vetPref !== 'Missing')
    add('error', PD, 'project-description', 'The QAP requires a preference for Veterans, Disabled, and Elderly applicants on the PHA waiting list.', '§12 Characteristics of the Project')

  // §23.01 — cannot use the national non-metropolitan income limit with tax-exempt bonds (Excel B703)
  if (yes(s23['s23_01_nonmetro_income_limit']) && yes(s10['bond_financing']))
    add('error', PD, 'project-description', 'Cannot use the national non-metropolitan income limit; tax-exempt bond financing is being used.', '§23 Rent Limits')

  // §27.06/.07 — Section 504 accessible-unit minimums (Excel B911/B914)
  const totalU = input.unitMix?.totalUnits ?? 0
  if (totalU > 0) {
    const mobReq = Math.ceil(totalU * 0.05), hvReq = Math.ceil(totalU * 0.02)
    if (num(s27['s27_06_mobility_units']) < mobReq)
      add('warning', PD, 'project-description', `At least ${mobReq} mobility-accessible units are required (5%); fewer are entered.`, '§27 Project Characteristics')
    if (num(s27['s27_07_hearing_vision_units']) < hvReq)
      add('warning', PD, 'project-description', `At least ${hvReq} hearing/vision-accessible units are required (2%); fewer are entered.`, '§27 Project Characteristics')
  }

  // §28 — trending-rate guardrails (Excel B958/B960/B962/B964/B968)
  const ri13 = parseFloat((s28['s28_rent_infl_y1_3'] ?? '').replace('%', ''))
  const ri415 = parseFloat((s28['s28_rent_infl_y4_15'] ?? '').replace('%', ''))
  const ei = parseFloat((s28['s28_expense_infl'] ?? '').replace('%', ''))
  if (!isNaN(ri13) && ri13 > 2.0) add('warning', PD, 'project-description', 'Rent Inflation (years 1–3) exceeds the LHC Standard 2.0%.', '§28 Trending Rates')
  if (!isNaN(ri415) && ri415 > 2.0) add('warning', PD, 'project-description', 'Rent Inflation (years 4+) exceeds the LHC Standard 2.0%.', '§28 Trending Rates')
  if (!isNaN(ei) && ei < 2.8) add('warning', PD, 'project-description', 'Expense Inflation is below the LHC Standard 2.8%.', '§28 Trending Rates')
  const notSoftMarket = yes(s28['s28_soft_market']) === false
  const vac13 = parseFloat((s28['s28_vacancy_y1_3'] ?? '').replace('%', ''))
  if (!isNaN(vac13) && notSoftMarket && vac13 < 7.0 && (s28['s28_vacancy_y1_3'] ?? '').trim() !== '')
    add('warning', PD, 'project-description', 'Normal-market vacancy (years 1–3) is below the LHC Standard 7%.', '§28 Trending Rates')
  const vac4 = parseFloat((s28['s28_vacancy_y4_plus'] ?? '').replace('%', ''))
  if (!isNaN(vac4) && notSoftMarket && vac4 < 7.0 && (s28['s28_vacancy_y4_plus'] ?? '').trim() !== '')
    add('warning', PD, 'project-description', 'Normal-market vacancy (years 4+) is below the LHC Standard 7%.', '§28 Trending Rates')

  // §29 — replacement-reserve deposit below the minimum PUPA (Excel B986)
  const projType = s29['s29_project_type'] ?? ''
  const minPupa = yes(s29['s29_hud_rd_mortgage']) ? null : projType === 'Seniors' ? 300 : projType === 'Family' ? 350 : 500
  const pupa = num(s29['s29_reserve_pupa'])
  if (minPupa !== null && (s29['s29_reserve_pupa'] ?? '').trim() !== '' && pupa < minPupa)
    add('warning', PD, 'project-description', `Replacement-reserve deposit ($${pupa}/unit) is below the $${minPupa} PUPA minimum.`, '§29 Replacement Reserve')

  // ── Unit Mix and Rents ───────────────────────────────────────────────────────
  if (input.unitMix) {
    const um = input.unitMix
    if (um.totalUnits > 0 && !um.setAsideMet && um.setAsideElection)
      add('error', 'Unit Mix and Rents', 'unit-mix', `The elected set-aside (${um.setAsideElection}) is not met by the unit mix.`)
    if (um.totalUnits > 0 && um.unitsUnder30 / um.totalUnits < 0.05)
      add('warning', 'Unit Mix and Rents', 'unit-mix', `Only ${((um.unitsUnder30 / um.totalUnits) * 100).toFixed(1)}% of units are affordable at or below 30% AMI; the QAP requires at least 5%.`)
    if (um.rowFlagCount > 0)
      add('warning', 'Unit Mix and Rents', 'unit-mix', `${um.rowFlagCount} unit row${um.rowFlagCount === 1 ? ' has' : 's have'} a rent, size, baths, PSH, or staff-unit issue.`)
  }

  // ── Development Costs (reuse computeDevCosts) ─────────────────────────────────
  if (input.devCosts) {
    const d = input.devCosts
    for (const v of d.violations) add('error', 'Development Costs', 'development-costs', v, '§41/§42 Fee Limits')
    if (d.sourcesUses.diff !== null && !d.sourcesUses.balanced && d.sourcesUses.message) add('warning', 'Development Costs', 'development-costs', d.sourcesUses.message, '§37 Sources & Uses')
    if (d.hudTdc.exceeds && d.hudTdc.message) add(d.hudTdc.hardError ? 'error' : 'warning', 'Development Costs', 'development-costs', d.hudTdc.message, '§40 HUD TDC Limit')
  }

  // ── Basis Calculation (reuse computeBasis reconciliation notes) ──────────────
  if (input.basis) {
    for (const e of input.basis.errors ?? []) add('warning', 'Basis Calculation', 'basis-calculation', e.label, 'Reconciliation')
    // §14 — Credit Request Too High (Excel B693 / H690 = MIN(basis method, equity-gap method)).
    const basisCredit = Math.round(input.basis.totals.maximumPermittedCredit)
    const creditsReq = num(s14['credits_requested'])
    const limits: number[] = []
    if (basisCredit > 0) limits.push(basisCredit)
    if (input.gapMethodCredit != null) limits.push(Math.round(input.gapMethodCredit))
    if (limits.length > 0) {
      const limit = Math.min(...limits)
      const method = limits.length > 1 ? 'the lower of the Basis and Equity-Gap methods'
        : input.gapMethodCredit != null ? 'the Equity-Gap method' : 'the Basis Calculation'
      if (creditsReq > limit)
        add('error', PD, 'project-description', `Total credits requested ($${creditsReq.toLocaleString()}) exceed the allowable LIHTCs ($${limit.toLocaleString()}) — ${method}.`, '§14 Requests for LIHTCs')
    }
  }

  // ── Revenues & Expenses ──────────────────────────────────────────────────────
  if (input.revExp?.belowMinimum)
    add('warning', 'Revenues and Expenses', 'revenues-expenses', `Total operating expenses are $${Math.round(input.revExp.shortfall).toLocaleString()} below the $4,500 PUPA minimum.`, '§44')

  // ── Reserve Adequacy ─────────────────────────────────────────────────────────
  if (input.reserve?.shortfallYears?.length)
    add('warning', 'Reserve Adequacy', 'reserve-adequacy', `The replacement reserve falls below the per-unit minimum in year(s) ${input.reserve.shortfallYears.join(', ')}.`)

  // ── Syndication ──────────────────────────────────────────────────────────────
  if (input.synd) {
    const y = input.synd
    if (y.costPctExceeds) add('error', 'Syndication', 'syndication', `Syndication costs (${(y.costsPctOfProceeds * 100).toFixed(1)}%) exceed the ${(y.costCap * 100).toFixed(0)}% cap.`, 'Part I')
    // Part VI (Excel D33) — costs paid by developer must match the Dev Costs syndication total (D106).
    // (The QAP "Serious Problems" sheet surfaces only this syndication check; the Part II installment
    // and Part V/Line-G reconciliations stay inside the Syndication module rather than the dashboard.)
    if (input.devCostsSyndTotal != null && Math.round(y.viTotal) !== Math.round(input.devCostsSyndTotal))
      add('warning', 'Syndication', 'syndication', `Part VI syndication costs ($${Math.round(y.viTotal).toLocaleString()}) do not match the Development Costs syndication total ($${Math.round(input.devCostsSyndTotal).toLocaleString()}).`, 'Part VI')
  }

  // ── Cash-Flow Pro Forma DSCRs (Excel C1015 / B1025) ──────────────────────────
  // Only meaningful once revenues/expenses produce a cash flow; populated by the Proforma module.
  if (input.proforma?.hasCashFlow) {
    const p = input.proforma
    if (p.year1Dscr > p.maxY1Dscr)
      add('error', 'Proforma', 'proforma', `Year 1 DSCR (${p.year1Dscr.toFixed(2)}) cannot exceed ${p.maxY1Dscr.toFixed(2)}.`, '§30 Cash Flow')
    else if (p.year1Dscr < p.minY1Dscr)
      add('error', 'Proforma', 'proforma', `Year 1 DSCR (${p.year1Dscr.toFixed(2)}) must be at least ${p.minY1Dscr.toFixed(2)}.`, '§30 Cash Flow')
    // B1025 — the ceiling (>1.40) takes priority over the floor (<1.00) through year 15.
    if (p.maxDscr15 > 1.4)
      add('error', 'Proforma', 'proforma', 'Projected DSCR must not exceed 1.40 through year 15.', '§31 15-Year Pro Forma')
    else if (p.minDscr15 < 1.0)
      add('error', 'Proforma', 'proforma', 'Projected DSCR must be at least 1.00 through year 15.', '§31 15-Year Pro Forma')
  }

  return flags
}
