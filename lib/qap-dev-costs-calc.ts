// QAP Development Costs — calculation layer (Sections 37–42).
// Pure functions porting the Excel formulas. Inputs not yet captured in the web
// app are accepted as optional deps and surface as `pending` notes rather than
// blocking the computable parts.

import { DEV_COST_CATEGORIES, FEE_LIMITS, hudTdcLimits, PARISH_COST_AREA } from './qap-dev-costs'

export type Amounts = Record<string, number>

export interface DevCostDeps {
  parish?: string
  buildingType?: string
  /** unit counts by bedroom [0BR,1BR,2BR,3BR,4BR] from the Unit Mix */
  unitsByBr?: number[]
  totalUnits?: number
  /** Total permanent sources (from uploaded model or manual) — §37 */
  totalSources?: number | null
  /** PD §10.01 — transaction includes tax-exempt bond financing */
  bondFinanced?: boolean
  /** PD §11 — transaction includes 4% LIHTCs */
  is4pct?: boolean
  /** PD §10.03 costs of issuance — subtracted from construction basis when bond-financed (Dev Costs C185) */
  bondIssuanceCosts?: number
  /** DC-5: §18.14–16 amounts flagged as federal grants (reduce eligible basis) */
  federalGrants?: number
  /** DC-5: §18.04 HOME amount when the loan type is "Forgiven at maturity" */
  homeBasisReduction?: number
  /** §38 user adjustment rows (acquisition + construction basis) — list form */
  basisAdjustments?: BasisAdjustment[]
  /** §20-derived figures pulled read-only (out-of-basis portions, commercial, related-party) */
  outOfBasisCommunityFacilities?: number
  outOfBasisCommunityService?: number
  commercialDevCost?: number
  relatedPartyPayments?: number
  /** §40 TDC-limit exceptions — §12 is_sro (PD H161) and is_reallocated_credits (PD H162) */
  isSro?: boolean
  isAntiDiscrimination?: boolean
}

const n = (v: number | null | undefined) => (typeof v === 'number' && !isNaN(v) ? v : 0)

/** Sum the amounts of every line in a category. */
function catSum(amounts: Amounts, categoryKey: string): number {
  const cat = DEV_COST_CATEGORIES.find(c => c.key === categoryKey)
  if (!cat) return 0
  return cat.lines.reduce((s, l) => s + n(amounts[l.key]), 0)
}

export interface DevCostResult {
  subtotals: Record<string, number>
  total: number
  constructionContract: number
  // §37
  sourcesUses: { sources: number | null; tdc: number; diff: number | null; balanced: boolean; message: string }
  // §38
  basis: {
    adjustedAcquisitionBasis: number
    adjustedConstructionBasis: number
    acqBreakdown: BasisLine[]
    constrBreakdown: BasisLine[]
    pending: string[]
  }
  // §39
  perUnitSummary: { label: string; total: number; perUnit: number }[]
  // §40
  hudTdc: {
    available: boolean
    costArea: string | null
    maxTdcLimit: number | null
    adjustedTdc: number
    pctOfLimit: number | null
    exceeds: boolean
    hardError: boolean        // over the limit AND no SRO/anti-discrimination exception
    message: string           // over-limit message (exception note or hard error)
    note: string
  }
  // §41
  feeLimits: {
    builderProfitFeeBase: number
    developerFeeBase: number
    developerFeeException: boolean
    items: FeeLimitItem[]      // all five fees (GR, GO, Builder Profit, Developer, Architect)
    contingency: { amount: number; pct: number; over: boolean }
    pending: string[]
  }
  // §42
  violations: string[]
}

export interface FeeLimitItem {
  key: string
  label: string
  allowableLabel: string       // e.g. "6% of Builder Profit Fee Base"
  allowable: number | null     // null = no limit applies (e.g. bond-financed 4% developer fee)
  proposed: number
  over: number                 // proposed − allowable (0 when allowable is null)
  note?: string
  breakdown: BasisLine[]       // line-by-line derivation shown in the fee's modal
}

export interface BasisLine {
  label: string
  value: number
  pending?: boolean     // input not yet captured in the web app (treated as 0)
  header?: boolean      // render as a sub-group heading (no amount)
  indent?: boolean      // render indented under a heading
  strong?: boolean      // emphasize (subtotal / base line)
}

export interface BasisAdjustment {
  id: string
  basis_type: 'acq' | 'constr'
  explanation: string
  amount: number
}

export function computeDevCosts(amounts: Amounts, deps: DevCostDeps = {}): DevCostResult {
  // ── Category subtotals (Excel column D) ──
  const keys = DEV_COST_CATEGORIES.map(c => c.key)
  const subtotals: Record<string, number> = {}
  for (const k of keys) subtotals[k] = catSum(amounts, k)

  const total = keys.reduce((s, k) => s + subtotals[k], 0) // D140

  // Construction Contract subtotal (C270) = Building + Site Work + Other Costs
  const constructionContract =
    subtotals['cc_building'] + subtotals['cc_sitework'] + subtotals['cc_other']

  // ── §37 Sources & Uses Balance ──
  const sources = deps.totalSources ?? null
  const diff = sources === null ? null : sources - total
  const balanced = diff !== null && Math.round(diff) === 0
  const sourcesUses = {
    sources,
    tdc: total,
    diff,
    balanced,
    message:
      diff === null
        ? 'Enter total permanent sources (upload model or manual) to check balance.'
        : Math.round(diff) === 0
        ? 'Sources and Uses are in balance.'
        : diff < 0
        ? `Sources and Uses are out of balance: Sources Too Low by $${Math.abs(Math.round(diff)).toLocaleString()}.`
        : `Sources and Uses are out of balance: Excess Sources of $${Math.round(diff).toLocaleString()}.`,
  }

  // ── §38 Acquisition & Construction Basis ──
  const acqAdjs    = (deps.basisAdjustments ?? []).filter(a => a.basis_type === 'acq')
  const constrAdjs = (deps.basisAdjustments ?? []).filter(a => a.basis_type === 'constr')
  const acqAdjTotal    = acqAdjs.reduce((s, a) => s + n(a.amount), 0)
  const constrAdjTotal = constrAdjs.reduce((s, a) => s + n(a.amount), 0)

  const land = n(amounts['land_donated']) + n(amounts['land_other'])
  const adjustedAcquisitionBasis = n(amounts['building_acquisition']) + acqAdjTotal
  const lhcFees =
    n(amounts['lhc_nontc_app_fee']) + n(amounts['lhc_tc_app_fee']) +
    n(amounts['lhc_tc_reservation_fee']) + n(amounts['lhc_fees_other'])
  const outOfBasisCF  = n(deps.outOfBasisCommunityFacilities)
  const outOfBasisCSF = n(deps.outOfBasisCommunityService)
  const commercial    = n(deps.commercialDevCost)
  // DC-5: §38 basis reductions now computed (were previously pending/display-only)
  const federalGrants = n(deps.federalGrants)
  const homeReduction = n(deps.homeBasisReduction)
  const bondIssuance  = deps.bondFinanced ? Math.abs(deps.bondIssuanceCosts ?? 0) : 0
  const basisPending: string[] = []
  const adjustedConstructionBasis =
    total - adjustedAcquisitionBasis - land -
    outOfBasisCF - outOfBasisCSF - commercial -
    subtotals['permanent_financing'] - subtotals['reserves'] -
    subtotals['syndication'] - lhcFees -
    federalGrants - homeReduction - bondIssuance + constrAdjTotal

  const acqBreakdown: BasisLine[] = [
    { label: 'Building Acquisition', value: n(amounts['building_acquisition']) },
    ...(acqAdjs.length > 0 ? [{ label: 'Adjustments', value: 0, header: true } as BasisLine] : []),
    ...acqAdjs.map(a => ({
      label: a.explanation?.trim() || '(no explanation)',
      value: n(a.amount),
      indent: true,
    })),
  ]
  const constrBreakdown: BasisLine[] = [
    { label: 'Total Development Cost', value: total },
    {
      label: acqAdjs.length > 0
        ? 'Less: Adjusted Acquisition Basis (incl. acquisition adjustments)'
        : 'Less: Adjusted Acquisition Basis',
      value: -adjustedAcquisitionBasis,
    },
    { label: 'Less: Land Cost', value: -land },
    { label: 'Less: Out-of-basis Community Facilities', value: -outOfBasisCF },
    { label: 'Less: Out-of-basis Community Service Facilities', value: -outOfBasisCSF },
    { label: 'Less: Commercial Development Cost', value: -commercial },
    { label: 'Less: Permanent Financing Costs', value: -subtotals['permanent_financing'] },
    { label: 'Less: Reserves', value: -subtotals['reserves'] },
    { label: 'Less: Syndication Costs', value: -subtotals['syndication'] },
    { label: 'Less: LHC Fees', value: -lhcFees },
    { label: 'Less: Federal Grants', value: -federalGrants },
    { label: 'Less: HOME', value: -homeReduction },
    { label: 'Less: Tax-exempt Bond Issuance Costs', value: -bondIssuance },
    ...(constrAdjs.length > 0 ? [{ label: 'Construction Adjustments', value: 0, header: true } as BasisLine] : []),
    ...constrAdjs.map(a => ({
      label: a.explanation?.trim() || '(no explanation)',
      value: n(a.amount),
      indent: true,
    })),
  ]

  // ── §39 Per-unit summary ──
  const u = deps.totalUnits && deps.totalUnits > 0 ? deps.totalUnits : 0
  const perUnit = (v: number) => (u > 0 ? Math.round(v / u) : 0)
  const otherCcBuilding =
    subtotals['cc_building'] - n(amounts['residential_new']) - n(amounts['residential_rehab'])
  const otherCcOther =
    subtotals['cc_other'] - n(amounts['general_requirements']) -
    n(amounts['builders_overhead']) - n(amounts['builders_profit'])
  const perUnitSummary: { label: string; total: number; perUnit: number }[] = [
    { label: 'Building Acquisition', total: n(amounts['building_acquisition']) },
    { label: 'Land Acquisition', total: subtotals['acquisition'] - n(amounts['building_acquisition']) },
    { label: 'Construction Contract: New Construction', total: n(amounts['residential_new']) },
    { label: 'Construction Contract: Rehab', total: n(amounts['residential_rehab']) },
    { label: 'Other Construction Contract Building Costs', total: otherCcBuilding },
    { label: 'Construction Contract: Site Work', total: subtotals['cc_sitework'] },
    { label: 'General Requirements', total: n(amounts['general_requirements']) },
    { label: "Builder's Overhead", total: n(amounts['builders_overhead']) },
    { label: "Builder's Profit", total: n(amounts['builders_profit']) },
    { label: 'Other Construction Contract Costs', total: otherCcOther },
    { label: 'Hard Costs Outside Construction Contract', total: subtotals['hard_outside'] },
    { label: 'Construction Hard Cost Contingency', total: subtotals['contingency'] },
    { label: 'Total Construction Interim Costs', total: subtotals['interim'] },
    { label: 'Total Permanent Financing Costs', total: subtotals['permanent_financing'] },
    { label: 'Total LHC Risk-Sharing Fees', total: subtotals['lhc_risk_sharing'] },
    { label: 'Total Professional Fees', total: subtotals['professional_fees'] },
    { label: 'Reserves', total: subtotals['reserves'] },
    { label: 'Total Syndication Costs', total: subtotals['syndication'] },
    { label: 'Total Other Soft Costs', total: subtotals['other_soft'] },
    { label: "Developer's Fee", total: subtotals['developer_fee'] },
  ].map(r => ({ ...r, perUnit: perUnit(r.total) }))

  // ── §40 HUD TDC Per-Unit Limit ──
  const limits = deps.parish && deps.buildingType ? hudTdcLimits(deps.parish, deps.buildingType) : null
  const unitsByBr = deps.unitsByBr ?? [0, 0, 0, 0, 0]
  const maxTdcLimit = limits ? limits.reduce((s, lim, i) => s + lim * n(unitsByBr[i]), 0) : null
  const adjustedTdc =
    total -
    n(amounts['extraordinary_site']) -
    n(amounts['community_facilities']) -
    n(amounts['community_service_facilities']) -
    n(amounts['excess_costs']) -
    subtotals['reserves']
  const pctOfLimit = maxTdcLimit && maxTdcLimit > 0 ? adjustedTdc / maxTdcLimit : null
  const exceeds = pctOfLimit !== null && pctOfLimit > 1
  let tdcMessage = ''
  let tdcHardError = false
  if (exceeds) {
    if (deps.isSro) {
      tdcMessage = 'Adjusted TDC exceeds the Maximum TDC Limit, but this is an SRO Project — an exception may apply; a question will appear on the Checklist.'
    } else if (deps.isAntiDiscrimination) {
      tdcMessage = 'Adjusted TDC exceeds the Maximum TDC Limit, but this is an anti-discrimination (reallocated-credits) Project — an exception may apply; a question will appear on the Checklist.'
    } else {
      tdcMessage = 'Adjusted TDC exceeds the Maximum TDC Limit and no exception appears to be available under the QAP.'
      tdcHardError = true
    }
  }
  const hudTdc = {
    available: limits !== null,
    costArea: deps.parish ? (PARISH_COST_AREA[deps.parish] ?? null) : null,
    maxTdcLimit,
    adjustedTdc,
    pctOfLimit,
    exceeds,
    hardError: tdcHardError,
    message: tdcMessage,
    note: limits === null
      ? 'Select parish (§12.01) and primary building type (§12) to compute the HUD TDC limit.'
      : '',
  }

  // ── §41 Fee Limit Computations ──
  const gr = n(amounts['general_requirements'])
  const oh = n(amounts['builders_overhead'])
  const bp = n(amounts['builders_profit'])

  // §41.01 Builder Profit Fee Base = Construction Contract − GR − OH − Builder Profit
  const builderProfitFeeBase = constructionContract - gr - oh - bp
  const builderBaseLines: BasisLine[] = [
    { label: 'Construction Contract: Building Costs', value: subtotals['cc_building'] },
    { label: 'Construction Contract: Site Work', value: subtotals['cc_sitework'] },
    { label: 'Construction Contract: Other Costs', value: subtotals['cc_other'] },
    { label: 'Subtotal: Construction Contract', value: constructionContract, strong: true },
    { label: 'Less: Proposed General Requirements', value: -gr },
    { label: 'Less: Proposed General Overhead', value: -oh },
    { label: 'Less: Proposed Builder Fee / Profit', value: -bp },
    { label: 'Builder Profit Fee Base', value: builderProfitFeeBase, strong: true },
  ]

  // §41.05 Developer Fee Base
  const reservesExclEscrows = subtotals['reserves'] - n(amounts['escrows'])
  const relatedParty = n(deps.relatedPartyPayments)
  const developerFeeBase =
    total - subtotals['acquisition'] - n(amounts['lease_self_owned_equip']) - relatedParty -
    subtotals['developer_fee'] - reservesExclEscrows - subtotals['syndication'] -
    n(amounts['marketing']) - lhcFees
  const devFeeBaseLines: BasisLine[] = [
    { label: 'Proposed Total Development Cost', value: total },
    { label: 'Less: Total Acquisition Cost', value: -subtotals['acquisition'] },
    { label: 'Less: Lease Payments (Self-Owned Equip.)', value: -n(amounts['lease_self_owned_equip']) },
    { label: 'Less: Payments to Related Parties', value: -relatedParty },
    { label: "Less: Total Developer's Fee", value: -subtotals['developer_fee'] },
    { label: 'Less: Reserves (excl. Escrows)', value: -reservesExclEscrows },
    { label: 'Less: Syndication Costs', value: -subtotals['syndication'] },
    { label: 'Less: Marketing', value: -n(amounts['marketing']) },
    { label: 'Less: LHC Fees', value: -lhcFees },
    { label: 'Developer Fee Base', value: developerFeeBase, strong: true },
  ]

  const developerFeeException = !!(deps.bondFinanced && deps.is4pct)
  // QAP caps the allowable developer fee at 15% of base OR $2,000,000, whichever is lower
  // (non-bond/9% deals). Bond-financed 4% transactions have no limit.
  const devAllow = developerFeeException ? null : Math.min(2_000_000, Math.round(developerFeeBase * FEE_LIMITS.developerFeeStandard))
  const grAllow = Math.round(builderProfitFeeBase * FEE_LIMITS.generalRequirements)
  const ohAllow = Math.round(builderProfitFeeBase * FEE_LIMITS.generalOverhead)
  const bpAllow = Math.round(builderProfitFeeBase * FEE_LIMITS.builderProfit)
  const archAllow = Math.round(constructionContract * FEE_LIMITS.architect)
  const archProposed = n(amounts['architect_fees'])
  const devProposed = subtotals['developer_fee']

  const items: FeeLimitItem[] = [
    { key: 'gr', label: 'General Requirements', allowableLabel: '6% of Builder Profit Fee Base',
      allowable: grAllow, proposed: gr, over: Math.round(gr - grAllow), breakdown: builderBaseLines },
    { key: 'oh', label: 'General Overhead', allowableLabel: '2% of Builder Profit Fee Base',
      allowable: ohAllow, proposed: oh, over: Math.round(oh - ohAllow), breakdown: builderBaseLines },
    { key: 'bp', label: 'Builder Fee / Profit', allowableLabel: '6% of Builder Profit Fee Base',
      allowable: bpAllow, proposed: bp, over: Math.round(bp - bpAllow), breakdown: builderBaseLines },
    { key: 'dev', label: 'Developer Fee',
      allowableLabel: developerFeeException ? 'no limit (bond-financed 4%)' : '15% of Developer Fee Base, max $2,000,000',
      allowable: devAllow, proposed: devProposed, over: devAllow === null ? 0 : Math.round(devProposed - devAllow),
      note: developerFeeException ? 'Bond-financed 4% transaction — the developer fee limit does not apply.' : undefined,
      breakdown: devFeeBaseLines },
    { key: 'arch', label: 'Architect Fee', allowableLabel: '7% of Construction Contract',
      allowable: archAllow, proposed: archProposed, over: Math.round(archProposed - archAllow),
      breakdown: [{ label: 'Subtotal: Construction Contract', value: constructionContract, strong: true }] },
  ]

  const contingencyAmt = subtotals['contingency']
  const contingencyPct = constructionContract > 0 ? contingencyAmt / constructionContract : 0

  const feePending: string[] = [
    'Acquisition-based developer fee % (existing LIHTC, §12)',
    'Excess syndication costs (Syndication worksheet — not yet built)',
    'Subcontractor limits (§20.02)',
  ]

  // ── §42 Fee Limit Violations ──
  const violations: string[] = []
  for (const it of items) {
    if (it.allowable !== null && it.over > 0) {
      violations.push(`${it.label}: proposed is $${it.over.toLocaleString()} above the limit.`)
    }
  }
  if (contingencyPct > FEE_LIMITS.contingencyCap) {
    violations.push(`Construction Contingency is above the ${Math.round(FEE_LIMITS.contingencyCap * 100)}% limit.`)
  }

  return {
    subtotals,
    total,
    constructionContract,
    sourcesUses,
    basis: { adjustedAcquisitionBasis, adjustedConstructionBasis, acqBreakdown, constrBreakdown, pending: basisPending },
    perUnitSummary,
    hudTdc,
    feeLimits: {
      builderProfitFeeBase,
      developerFeeBase,
      developerFeeException,
      items,
      contingency: { amount: contingencyAmt, pct: contingencyPct, over: contingencyPct > FEE_LIMITS.contingencyCap },
      pending: feePending,
    },
    violations,
  }
}
