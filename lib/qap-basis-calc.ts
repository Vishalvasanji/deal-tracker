// QAP Basis Calculation — pure calc layer.
// Ports the "Basis Calculation" sheet: per building configuration, allocate the
// §38 adjusted basis by floor-area share, apply the basis boost, take the
// applicable fraction (min of unit- and sqft-fractions), add optional homeless/
// supportive-services basis, apply the credit rate, and sum to the project's
// Maximum Permitted Annual Credit. Includes the six reconciliation checks.

export interface BasisConfigInput {
  config_index: number
  label?: string | null
  num_buildings: number
  resid_staff_sqft: number   // row 13 — residential + staff unit floor area per building
  common_sqft: number        // row 14 — common-area floor area per building
  commercial_sqft: number    // row 15 — commercial floor area per building (BAS-4; excluded from basis)
  lihtc_units: number        // row 18
  resid_units: number        // row 19
  lihtc_sqft: number         // row 22
  resid_sqft: number         // row 23
  homeless_constr_adj: number // row 39 — §42(c)(1)(E) supportive-services add (construction)
  homeless_acq_adj: number    // row 40 — (acquisition)
}

export interface BasisDeps {
  adjustedConstructionBasis: number   // Dev Costs §38 C193
  adjustedAcquisitionBasis: number    // Dev Costs §38 C164
  constructionBoost: number            // decimal, e.g. 0.30 (§15.01)
  acquisitionBoost: number             // decimal (§15.01)
  constructionCreditRate: number       // decimal, e.g. 0.09
  acquisitionCreditRate: number        // decimal
  dealType: '9%' | '4%' | 'none'
  // Project totals for the reconciliation checks
  projTotalBuildings: number           // §20.09
  projResidStaffSqft: number           // Unit Mix resid sqft + staff sqft
  projLihtcUnits: number               // Unit Mix LIHTC units
  projResidUnits: number               // Unit Mix residential units
  projLihtcSqft: number                // Unit Mix LIHTC sqft
  projResidSqft: number                // Unit Mix residential sqft
}

export interface BasisConfigResult {
  config_index: number
  label: string
  totalSqft: number
  commercialSqft: number
  constructionBasis: number
  acquisitionBasis: number
  constrAfterBoost: number
  acqAfterBoost: number
  fracByUnits: number
  fracBySqft: number
  applicableFraction: number
  qualConstr: number
  qualAcq: number
  permittedConstrCredit: number
  permittedAcqCredit: number
}

export interface BasisError {
  note: number
  label: string
  perConfig: number
  projectTotal: number
}

export interface BasisResult {
  configs: BasisConfigResult[]
  projTotalSqft: number
  totals: {
    buildings: number
    residStaffSqft: number
    lihtcUnits: number
    residUnits: number
    lihtcSqft: number
    residSqft: number
    qualifiedConstructionBasis: number
    qualifiedAcquisitionBasis: number
    permittedConstructionCredit: number
    permittedAcquisitionCredit: number
    maximumPermittedCredit: number
  }
  errors: BasisError[]
}

const n = (v: number | null | undefined) => (typeof v === 'number' && !isNaN(v) ? v : 0)

export function computeBasis(inputs: BasisConfigInput[], deps: BasisDeps): BasisResult {
  // Project total building floor area (C16) = Σ (resid+staff + common) × #buildings
  const projTotalSqft = inputs.reduce(
    (s, c) => s + (n(c.resid_staff_sqft) + n(c.common_sqft)) * n(c.num_buildings), 0
  )

  const configs: BasisConfigResult[] = inputs.map(c => {
    const totalSqft = n(c.resid_staff_sqft) + n(c.common_sqft)
    // Allocate the project adjusted basis to this config by floor-area share
    const constructionBasis = projTotalSqft > 0
      ? Math.round((totalSqft / projTotalSqft) * deps.adjustedConstructionBasis) : 0
    const acquisitionBasis = projTotalSqft > 0
      ? Math.round((n(c.resid_staff_sqft) / projTotalSqft) * deps.adjustedAcquisitionBasis) : 0
    const constrAfterBoost = constructionBasis * (1 + n(deps.constructionBoost))
    const acqAfterBoost = acquisitionBasis * (1 + n(deps.acquisitionBoost))
    const fracByUnits = n(c.resid_units) > 0 ? n(c.lihtc_units) / n(c.resid_units) : 0
    const fracBySqft = n(c.resid_sqft) > 0 ? n(c.lihtc_sqft) / n(c.resid_sqft) : 0
    const applicableFraction = Math.min(fracByUnits, fracBySqft)
    const qualConstr = applicableFraction * constrAfterBoost + n(c.homeless_constr_adj)
    const qualAcq = applicableFraction * acqAfterBoost + n(c.homeless_acq_adj)
    const permittedConstrCredit = qualConstr * n(deps.constructionCreditRate)
    const permittedAcqCredit = qualAcq * n(deps.acquisitionCreditRate)
    return {
      config_index: c.config_index,
      label: c.label?.trim() || `Configuration ${c.config_index + 1}`,
      totalSqft, commercialSqft: n(c.commercial_sqft), constructionBasis, acquisitionBasis, constrAfterBoost, acqAfterBoost,
      fracByUnits, fracBySqft, applicableFraction, qualConstr, qualAcq,
      permittedConstrCredit, permittedAcqCredit,
    }
  })

  // Project aggregates = Σ (per-config × #buildings)
  const wsum = (fn: (c: BasisConfigInput, r: BasisConfigResult) => number) =>
    inputs.reduce((s, c, i) => s + fn(c, configs[i]) * n(c.num_buildings), 0)

  const qualifiedConstructionBasis = Math.round(wsum((_c, r) => r.qualConstr))
  const qualifiedAcquisitionBasis = Math.round(wsum((_c, r) => r.qualAcq))
  const permittedConstructionCredit = Math.round(wsum((_c, r) => r.permittedConstrCredit))
  const permittedAcquisitionCredit = Math.round(wsum((_c, r) => r.permittedAcqCredit))

  const totals = {
    buildings: inputs.reduce((s, c) => s + n(c.num_buildings), 0),
    residStaffSqft: wsum(c => n(c.resid_staff_sqft)),
    lihtcUnits: wsum(c => n(c.lihtc_units)),
    residUnits: wsum(c => n(c.resid_units)),
    lihtcSqft: wsum(c => n(c.lihtc_sqft)),
    residSqft: wsum(c => n(c.resid_sqft)),
    qualifiedConstructionBasis,
    qualifiedAcquisitionBasis,
    permittedConstructionCredit,
    permittedAcquisitionCredit,
    maximumPermittedCredit: permittedConstructionCredit + permittedAcquisitionCredit,
  }

  // Six reconciliation checks (only flag when configs exist and totals differ)
  const errors: BasisError[] = []
  const hasConfigs = inputs.length > 0
  const check = (note: number, label: string, perConfig: number, projectTotal: number) => {
    if (hasConfigs && Math.round(perConfig) !== Math.round(projectTotal)) {
      errors.push({ note, label, perConfig: Math.round(perConfig), projectTotal: Math.round(projectTotal) })
    }
  }
  check(1, 'Total number of buildings', totals.buildings, deps.projTotalBuildings)
  check(2, 'Total floor area (residential + staff units)', totals.residStaffSqft, deps.projResidStaffSqft)
  check(3, 'Total LIHTC units', totals.lihtcUnits, deps.projLihtcUnits)
  check(4, 'Total residential units', totals.residUnits, deps.projResidUnits)
  check(5, 'Total LIHTC-unit floor area', totals.lihtcSqft, deps.projLihtcSqft)
  check(6, 'Total residential floor area', totals.residSqft, deps.projResidSqft)

  return { configs, projTotalSqft, totals, errors }
}
