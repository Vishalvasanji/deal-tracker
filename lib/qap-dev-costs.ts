// QAP Development Costs — static config + embedded lookup tables.
// Mirrors the "Development Costs" worksheet (Sections 36–42) of the 2025 QAP
// Application Model v1.1. Drives the input form, subtotals, and the Section
// 37–42 calculations.

// ─── Line-item config (Section 36 — Detail of Development Costs) ───────────────

export interface DevCostLine {
  key: string            // stable line_key stored in qap_cost_items
  label: string
  /** auto-pulls from a Project Description section in the Excel (manual input here for now) */
  autoPull?: string
  /** fee-limit checked in Section 41 */
  feeLimit?: boolean
}

export interface DevCostCategory {
  key: string            // category key stored in qap_cost_items
  label: string
  lines: DevCostLine[]
}

export const DEV_COST_CATEGORIES: DevCostCategory[] = [
  {
    key: 'acquisition',
    label: 'Acquisition',
    lines: [
      { key: 'building_acquisition', label: 'Building Acquisition' },
      { key: 'land_donated', label: 'Land Acquisition (value of donated land)' },
      { key: 'land_other', label: 'Land Acquisition (other)' },
      { key: 'acquisition_fee', label: 'Acquisition Fee' },
    ],
  },
  {
    key: 'cc_building',
    label: 'Construction Contract: Building Costs',
    lines: [
      { key: 'appliances', label: 'Appliances' },
      { key: 'community_facilities', label: 'Community Facilities', autoPull: '§20.06' },
      { key: 'community_service_facilities', label: 'Community Service Facilities', autoPull: '§20.07' },
      { key: 'excess_costs', label: 'Excess Costs', autoPull: '§20.08' },
      { key: 'residential_new', label: 'Residential Buildings - New Construction' },
      { key: 'residential_rehab', label: 'Residential Buildings - Rehabilitation' },
      { key: 'lead_paint', label: 'Lead-based paint controls or abatement' },
      { key: 'operate_self_owned_equip', label: 'Costs to Operate Self-Owned Equipment', autoPull: '§20.01' },
    ],
  },
  {
    key: 'cc_sitework',
    label: 'Construction Contract: Site Work',
    lines: [
      { key: 'demolition', label: 'Demolition Cost' },
      { key: 'earth_work', label: 'Earth Work' },
      { key: 'lawn_plantings', label: 'Lawn/Plantings' },
      { key: 'off_site_work', label: 'Off Site Work' },
      { key: 'roads_walks', label: 'Roads/Walks' },
      { key: 'site_utilities', label: 'Site Utilities' },
      { key: 'unusual_site', label: 'Unusual Site Conditions' },
      { key: 'extraordinary_site', label: 'Extraordinary Site Costs', autoPull: '§20.05' },
    ],
  },
  {
    key: 'cc_other',
    label: 'Construction Contract: Other Costs',
    lines: [
      { key: 'bond_premium_contractor', label: 'Bond Premium Paid by Contractor' },
      { key: 'general_requirements', label: 'General Requirements', feeLimit: true },
      { key: 'lease_self_owned_equip', label: 'Costs to Lease Self-Owned Equipment', autoPull: '§20.01' },
      { key: 'builders_overhead', label: "Builder's Overhead", feeLimit: true },
      { key: 'builders_profit', label: "Builder's Profit", feeLimit: true },
      { key: 'construction_manager_fee', label: "Construction Manager's Fee", autoPull: '§20.03' },
      { key: 'builders_risk_insurance', label: "Builder's Risk Insurance" },
      { key: 'builders_liability_insurance', label: "Builder's Liability Insurance" },
      { key: 'workers_comp_insurance', label: "Worker's Compensation Insurance" },
      { key: 'other_cc_1', label: 'Other' },
      { key: 'other_cc_2', label: 'Other' },
      { key: 'other_cc_3', label: 'Other' },
    ],
  },
  {
    key: 'hard_outside',
    label: 'Hard Costs Outside Construction Contract',
    lines: [
      { key: 'bond_premium_taxpayer', label: 'Bond Premium Paid by Taxpayer' },
      { key: 'other_hard_1', label: 'Other Hard Cost (describe)' },
      { key: 'other_hard_2', label: 'Other Hard Cost (describe)' },
      { key: 'other_hard_3', label: 'Other Hard Cost (describe)' },
    ],
  },
  {
    key: 'contingency',
    label: 'Construction Contingency',
    lines: [
      { key: 'construction_contingency', label: 'Construction Hard Cost Contingency' },
    ],
  },
  {
    key: 'interim',
    label: 'Construction Interim Costs',
    lines: [
      { key: 'bridge_loan_fees', label: 'Bridge Loan Fees' },
      { key: 'bridge_loan_legal', label: 'Bridge Loan Legal Fees' },
      { key: 'building_permits', label: 'Building Permits/Fees' },
      { key: 'construction_credit_enhancement', label: 'Construction Credit Enhancement' },
      { key: 'construction_financing_fees', label: 'Construction Financing Fees' },
      { key: 'construction_hazard_insurance', label: 'Construction Hazard Insurance' },
      { key: 'construction_interest', label: 'Construction Interest' },
      { key: 'construction_legal', label: 'Construction Legal Fees' },
      { key: 'construction_liability_insurance', label: 'Construction Liability Insurance' },
      { key: 'construction_loan_points', label: 'Construction Loan Points' },
      { key: 'construction_title_recording', label: 'Construction Title and Recording' },
      { key: 'other_construction_finance', label: 'Other Construction Finance Fees' },
    ],
  },
  {
    key: 'permanent_financing',
    label: 'Permanent Financing Costs',
    lines: [
      { key: 'permanent_credit_enhancement', label: 'Permanent Credit Enhancement' },
      { key: 'permanent_financing_fees', label: 'Permanent Financing Fees' },
      { key: 'permanent_legal', label: 'Permanent Legal Fee' },
      { key: 'permanent_loan_points', label: 'Permanent Loan Points' },
      { key: 'permanent_title_recording', label: 'Permanent Title and Recording' },
      { key: 'permanent_other_1', label: 'Other (describe)' },
      { key: 'permanent_other_2', label: 'Other (describe)' },
    ],
  },
  {
    key: 'lhc_risk_sharing',
    label: 'LHC Risk-Sharing Fees',
    lines: [
      { key: 'lhc_application_fee', label: 'Application Fee (3,000)' },
      { key: 'lhc_commitment_fee', label: 'Commitment Fee (3% of loan amount)' },
      { key: 'lhc_upfront_mip', label: 'Upfront MIP (.5% of loan amount)' },
      { key: 'lhc_closing_fee', label: 'Closing Fee (5,000)' },
    ],
  },
  {
    key: 'professional_fees',
    label: 'Professional Fees',
    lines: [
      { key: 'accounting_fees', label: 'Accounting Fees' },
      { key: 'architect_fees', label: 'Architect Fees', feeLimit: true },
      { key: 'engineering_fees', label: 'Engineering Fees' },
    ],
  },
  {
    key: 'reserves',
    label: 'Reserves',
    lines: [
      { key: 'escrows', label: 'Escrows' },
      { key: 'operating_deficit_reserve', label: 'Operating Deficit Reserve' },
      { key: 'rent_up_reserves', label: 'Rent Up Reserves' },
      { key: 'replacement_reserve_deposit', label: 'Replacement Reserve Deposit' },
      { key: 'reserves_other_1', label: 'Other' },
      { key: 'reserves_other_2', label: 'Other' },
      { key: 'reserves_other_3', label: 'Other' },
    ],
  },
  {
    key: 'syndication',
    label: 'Syndication Costs',
    lines: [
      { key: 'syndication_legal', label: 'Syndication Legal Fees' },
      { key: 'syndication_org_expenses', label: 'Syndication Organization Expenses' },
      { key: 'syndication_other', label: 'Other Syndication Expenses' },
    ],
  },
  {
    key: 'other_soft',
    label: 'Other Soft Costs',
    lines: [
      { key: 'relocation', label: 'Relocation Expenses' },
      { key: 'appraisal', label: 'Appraisal' },
      { key: 'market_study', label: 'Market Study' },
      { key: 'environmental_study', label: 'Environmental Study' },
      { key: 'environmental_review', label: 'Environmental Review (HOME/Risk Sharing)' },
      { key: 'lead_paint_assessment', label: 'Lead-Based Paint Assessment and Testing' },
      { key: 'survey', label: 'Survey' },
      { key: 'physical_needs_assessment', label: 'Physical Capital Needs Assessment' },
      { key: 'marketing', label: 'Marketing' },
      { key: 'property_taxes', label: 'Property Taxes' },
      { key: 'cost_certification', label: 'Cost Certification' },
      { key: 'asset_management_fee', label: 'Asset Management Fee' },
      { key: 'lhc_nontc_app_fee', label: 'LHC Non-Tax Credit Application Fee' },
      { key: 'lhc_tc_app_fee', label: 'LHC Tax Credit Application Fee' },
      { key: 'lhc_tc_reservation_fee', label: 'LHC Tax Credit Reservation Fee (5%)' },
      { key: 'lhc_fees_other', label: 'LHC Fees other' },
      { key: 'nonlhc_tc_fees', label: 'Non-LHC Tax Credit Fees' },
      { key: 'soft_other_1', label: 'Other' },
      { key: 'soft_other_2', label: 'Other' },
      { key: 'soft_other_3', label: 'Other' },
    ],
  },
  {
    key: 'developer_fee',
    label: "Developer's Fee",
    lines: [
      { key: 'consulting_fee', label: 'Consulting Fee' },
      { key: 'fees_chdos', label: 'Fees paid to CHDOs' },
      { key: 'fees_nonprofits', label: 'Fees paid to nonprofits' },
      { key: 'developer_fee', label: 'Developer Fee' },
      { key: 'other_developer_fee', label: 'Other developer fee' },
    ],
  },
]

/** Flat list of every line (for seeding) */
export const DEV_COST_LINES: { category: string; line_key: string; label: string }[] =
  DEV_COST_CATEGORIES.flatMap(cat =>
    cat.lines.map(l => ({ category: cat.key, line_key: l.key, label: l.label }))
  )

// ─── Fee-limit % constants (Section 41) ───────────────────────────────────────
export const FEE_LIMITS = {
  generalRequirements: 0.06, // of Builder Profit Fee Base
  generalOverhead:     0.02,
  builderProfit:       0.06,
  architect:           0.07, // of Construction Contract subtotal
  developerFeeStandard: 0.15, // of Developer Fee Base
  acqCostBaseHigh:     0.08, // of Acquisition Cost Base (existing LIHTC)
  acqCostBaseLow:      0.05,
  syndicationPrivate:  0.10, // of Gross Equity
  syndicationPublic:   0.15,
  contingencyCap:      0.10, // of Construction Contract subtotal
}

// ─── HUD 2024 Unit TDC Limits (embedded from 'HUD TDC Data' sheet) ─────────────
// [0BR, 1BR, 2BR, 3BR, 4BR] per cost area × building type.
export type HudBuildingType = 'Detached / Semi-Detached' | 'Row House' | 'Walkup' | 'Elevator'

export const HUD_TDC: Record<string, Record<HudBuildingType, number[]>> = {
  'Alexandria': {
    'Detached / Semi-Detached': [189946, 246451, 295485, 353332, 416823],
    'Row House': [164154, 215653, 262716, 323299, 385122],
    'Walkup': [148235, 201398, 254416, 334680, 414094],
    'Elevator': [153222, 214511, 275800, 367734, 459667],
  },
  'Baton Rouge': {
    'Detached / Semi-Detached': [192990, 250235, 299913, 358464, 422736],
    'Row House': [167482, 219776, 267505, 328760, 391384],
    'Walkup': [152046, 206801, 261412, 344058, 425863],
    'Elevator': [155694, 217971, 280249, 373665, 467081],
  },
  'Lafayette': {
    'Detached / Semi-Detached': [195259, 253241, 303557, 362882, 428000],
    'Row House': [169184, 222105, 270429, 332518, 395951],
    'Walkup': [153284, 208399, 263367, 346565, 428903],
    'Elevator': [157518, 220526, 283533, 378044, 472555],
  },
  'Lake Charles': {
    'Detached / Semi-Detached': [192990, 250235, 299913, 358464, 422736],
    'Row House': [167482, 219776, 267505, 328760, 391384],
    'Walkup': [152046, 206801, 261412, 344058, 425863],
    'Elevator': [155694, 217971, 280249, 373665, 467081],
  },
  'Monroe': {
    'Detached / Semi-Detached': [192305, 249637, 299388, 358124, 422583],
    'Row House': [165663, 217824, 265539, 327100, 389837],
    'Walkup': [148985, 202245, 255355, 335784, 415332],
    'Elevator': [155113, 217158, 279204, 372271, 465339],
  },
  'New Orleans': {
    'Detached / Semi-Detached': [199618, 258890, 310326, 370970, 437537],
    'Row House': [172976, 227077, 276477, 339946, 404791],
    'Walkup': [156737, 213098, 269309, 354388, 438588],
    'Elevator': [161035, 225448, 289862, 386483, 483104],
  },
  'Shreveport': {
    'Detached / Semi-Detached': [192036, 249094, 298610, 357003, 421096],
    'Row House': [166244, 218297, 265842, 326969, 389395],
    'Walkup': [150450, 204499, 258403, 339996, 420738],
    'Elevator': [154914, 216880, 278846, 371794, 464743],
  },
}

// Controls!A49:B58 — primary building type → HUD TDC building type.
export const BUILDING_TYPE_MAP: Record<string, HudBuildingType> = {
  'Detached': 'Detached / Semi-Detached',
  'Detached / Semi-Detached': 'Detached / Semi-Detached',
  'Elevator': 'Elevator',
  'Missing': 'Walkup',
  'Other': 'Walkup',
  'Row': 'Row House',
  'Row House': 'Row House',
  'Semi-Detached': 'Detached / Semi-Detached',
  'Walkup': 'Walkup',
  'Walk-Up': 'Walkup',
}

// Parishes!X — parish → cost area for TDC limit purposes.
export const PARISH_COST_AREA: Record<string, string> = {
  'Acadia': 'Lafayette', 'Allen': 'Lake Charles', 'Ascension': 'Baton Rouge',
  'Assumption': 'Lafayette', 'Avoyelles': 'Alexandria', 'Beauregard': 'Lake Charles',
  'Bienville': 'Shreveport', 'Bossier': 'Shreveport', 'Caddo': 'Shreveport',
  'Calcasieu': 'Lake Charles', 'Caldwell': 'Monroe', 'Cameron': 'Lake Charles',
  'Catahoula': 'Alexandria', 'Claiborne': 'Shreveport', 'Concordia': 'Alexandria',
  'Desoto': 'Shreveport', 'East Baton Rouge': 'Baton Rouge', 'East Carroll': 'Monroe',
  'East Feliciana': 'Baton Rouge', 'Evangeline': 'Lafayette', 'Franklin': 'Monroe',
  'Grant': 'Alexandria', 'Iberia': 'Lafayette', 'Iberville': 'Baton Rouge',
  'Jackson': 'Monroe', 'Jefferson': 'New Orleans', 'Jefferson Davis': 'Lake Charles',
  'Lafayette': 'Lafayette', 'Lafourche': 'Lafayette', 'Lasalle': 'Alexandria',
  'Lincoln': 'Shreveport', 'Livingston': 'Baton Rouge', 'Madison': 'Monroe',
  'Morehouse': 'Monroe', 'Natchitoches': 'Shreveport', 'Orleans': 'New Orleans',
  'Ouachita': 'Monroe', 'Plaquemines': 'New Orleans', 'Pointe Coupee': 'Baton Rouge',
  'Rapides': 'Alexandria', 'Red River': 'Shreveport', 'Richland': 'Monroe',
  'Sabine': 'Shreveport', 'St. Bernard': 'New Orleans', 'St. Charles': 'New Orleans',
  'St. Helena': 'Baton Rouge', 'St. James': 'New Orleans', 'St. John': 'New Orleans',
  'St. Landry': 'Lafayette', 'St. Martin': 'Lafayette', 'St. Mary': 'Lafayette',
  'St. Tammany': 'New Orleans', 'Tangipahoa': 'Baton Rouge', 'Tensas': 'Monroe',
  'Terrebonne': 'Lafayette', 'Union': 'Monroe', 'Vermilion': 'Lafayette',
  'Vernon': 'Alexandria', 'Washington': 'Baton Rouge', 'Webster': 'Shreveport',
  'West Baton Rouge': 'Baton Rouge', 'West Carroll': 'Monroe',
  'West Feliciana': 'Baton Rouge', 'Winn': 'Alexandria',
}

/** Resolve the per-BR HUD TDC limit array for a parish + primary building type. */
export function hudTdcLimits(parish: string, buildingType: string): number[] | null {
  const area = PARISH_COST_AREA[parish]
  const hudType = BUILDING_TYPE_MAP[buildingType] ?? 'Walkup'
  if (!area || !HUD_TDC[area]) return null
  return HUD_TDC[area][hudType] ?? null
}
