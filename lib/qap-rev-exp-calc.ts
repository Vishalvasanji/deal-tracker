// QAP Revenues & Expenses — calc layer.
// Sums the §43/§44/§45 line items, computes per-category and total PUPA
// (per unit per annum), and runs the headline check: Total Operating Expenses
// vs the LHC minimum of $4,500 PUPA (QAP IV.D.9).

import {
  REVENUE_GROUPS, EXPENSE_GROUPS, CONTINGENT_GROUPS, LHC_MIN_PUPA, ASSET_MGMT_MAX,
  LHC_COMPLIANCE_FEE_PER_UNIT,
  type RevExpGroup,
} from './qap-rev-exp'

export interface OtherLine { id: string; label: string; amount: number }

export interface RevExpDeps {
  totalUnits: number
  annualGrossRent: number   // Unit Mix monthly rent × 12 → Gross Potential Rents
}

export interface GroupResult {
  key: string
  label: string
  subtotal: number
  pupa: number
}

export interface RevExpResult {
  groupSubtotals: Record<string, number>
  revenueTotal: number
  expenseCategories: GroupResult[]      // admin / opmaint / utilities / taxins
  totalOperatingExpenses: number
  opexPupa: number
  lhcMinPupa: number
  lhcMinTotal: number
  belowMinimum: boolean
  shortfall: number                     // lhcMinTotal − totalOperatingExpenses (0 if not below)
  contingentSubtotal: number
  assetMgmt: {
    other: number               // §44 must-pay "Asset Management Fee (Other)" (C40)
    contingent: number          // §45 "Asset Management Fee" (C102)
    combined: number            // C40 + C102 (J102)
    max: number                 // $5,000 cap (J103)
    overCap: number             // amount above $5,000 (combined − max, floored at 0)
    allowableAsOpEx: number     // MIN(max, combined) (J104)
    allowableAsContingent: number // allowableAsOpEx − other (J105)
    otherFlagged: boolean       // C40 > 0 → generally not permitted as a must-pay expense (row 93)
  }
  useForUnderwriting: number            // = Total Operating Expenses (C89)
  operatingDeficitReserveMin: number    // C89 / 2 (feeds §36 Operating Deficit Reserve minimum)
  lhcComplianceMonitoringFee: number    // §44.06 auto-pulled value ($40 × units)
}

const n = (v: number | null | undefined) => (typeof v === 'number' && !isNaN(v) ? v : 0)

function groupSubtotal(
  group: RevExpGroup,
  amounts: Record<string, number>,
  others: Record<string, OtherLine[]>,
  deps: RevExpDeps,
): number {
  let s = 0
  for (const line of group.lines) {
    // Gross Potential Rents is read-only, pulled from the Unit Mix annual rent.
    if (line.key === 'gross_potential_rents') s += n(deps.annualGrossRent)
    // LHC Annual Compliance/Monitoring Fee is read-only ($40 × total units; PD H1043).
    else if (line.key === 'lhc_compliance_monitoring') s += LHC_COMPLIANCE_FEE_PER_UNIT * n(deps.totalUnits)
    else s += n(amounts[line.key])
  }
  for (const o of others[group.key] ?? []) s += n(o.amount)
  return s
}

export function computeRevExp(
  amounts: Record<string, number>,
  others: Record<string, OtherLine[]>,
  deps: RevExpDeps,
): RevExpResult {
  const units = n(deps.totalUnits)
  const groupSubtotals: Record<string, number> = {}
  for (const g of [...REVENUE_GROUPS, ...EXPENSE_GROUPS, ...CONTINGENT_GROUPS]) {
    groupSubtotals[g.key] = groupSubtotal(g, amounts, others, deps)
  }

  const revenueTotal = REVENUE_GROUPS.reduce((s, g) => s + groupSubtotals[g.key], 0)

  const expenseCategories: GroupResult[] = EXPENSE_GROUPS.map(g => ({
    key: g.key,
    label: g.label,
    subtotal: groupSubtotals[g.key],
    pupa: units > 0 ? groupSubtotals[g.key] / units : 0,
  }))

  const totalOperatingExpenses = expenseCategories.reduce((s, c) => s + c.subtotal, 0)
  const opexPupa = units > 0 ? totalOperatingExpenses / units : 0
  const lhcMinTotal = LHC_MIN_PUPA * units
  const belowMinimum = units > 0 && totalOperatingExpenses < lhcMinTotal
  const shortfall = belowMinimum ? lhcMinTotal - totalOperatingExpenses : 0

  const contingentSubtotal = CONTINGENT_GROUPS.reduce((s, g) => s + groupSubtotals[g.key], 0)

  // §45 — combined asset-management fee (must-pay "Asset Management Fee (Other)" C40 + contingent
  // "Asset Management Fee" C102) is capped at $5,000 as an operating expense (J103). J104 = the
  // allowable operating-expense portion; J105 = the remainder allowable as a contingent expense.
  const assetMgmtOther = n(amounts['asset_mgmt_other'])
  const assetMgmtContingent = n(amounts['asset_mgmt_fee'])
  const combinedAssetMgmt = assetMgmtOther + assetMgmtContingent
  const allowableAsOpEx = Math.min(ASSET_MGMT_MAX, combinedAssetMgmt)
  const assetMgmt = {
    other: assetMgmtOther,
    contingent: assetMgmtContingent,
    combined: combinedAssetMgmt,
    max: ASSET_MGMT_MAX,
    overCap: Math.max(0, combinedAssetMgmt - ASSET_MGMT_MAX),
    allowableAsOpEx,
    allowableAsContingent: allowableAsOpEx - assetMgmtOther,
    otherFlagged: assetMgmtOther > 0,
  }

  return {
    groupSubtotals,
    revenueTotal,
    expenseCategories,
    totalOperatingExpenses,
    opexPupa,
    lhcMinPupa: LHC_MIN_PUPA,
    lhcMinTotal,
    belowMinimum,
    shortfall,
    contingentSubtotal,
    assetMgmt,
    useForUnderwriting: totalOperatingExpenses,
    operatingDeficitReserveMin: totalOperatingExpenses / 2,
    lhcComplianceMonitoringFee: LHC_COMPLIANCE_FEE_PER_UNIT * units,
  }
}
