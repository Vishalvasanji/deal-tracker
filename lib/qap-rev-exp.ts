// QAP Revenues & Expenses — static config.
// Mirrors the "Revenues and Expenses" sheet (Sections 43–45). Fixed line amounts
// are stored in qap_fields (section 'rev_exp', field_key = line key); each group's
// add-as-needed "Other" lines are stored as a JSON array in field_key
// `${group}__others`. The headline metric is Total Operating Expenses vs the LHC
// minimum of $4,500 PUPA (QAP IV.D.9).

export const LHC_MIN_PUPA = 4500          // §44 — LHC minimum operating expenses (per unit per annum)
export const ASSET_MGMT_MAX = 5000        // §45 — max combined asset-management fee allowable as op. expense
export const LHC_COMPLIANCE_FEE_PER_UNIT = 40  // §44.06 — LHC Annual Compliance/Monitoring Fee = $40 × total units
                                               // (Project Description H1043 = M1042 × M1043 = units × 40)

export interface RevExpLine {
  key: string
  label: string
  /** read-only, pulled from another sheet (e.g. Gross Potential Rents from Unit Mix) */
  autoPull?: string
}

export interface RevExpGroup {
  key: string
  label: string            // '' for an unlabeled lead group
  lines: RevExpLine[]
  allowsOthers?: boolean   // supports add-as-needed "Other (identify)" lines
  pupa?: boolean           // show a per-unit-per-annum subtotal
}

// ── §43 Revenues ──────────────────────────────────────────────────────────────
export const REVENUE_GROUPS: RevExpGroup[] = [
  {
    key: 'rev_main', label: '',
    lines: [
      { key: 'gross_potential_rents', label: 'Gross Potential Rents (excluding utilities)', autoPull: 'Unit Mix annual rent' },
      { key: 'commercial_rent', label: 'Rent from Commercial Space' },
      { key: 'interest_income', label: 'Interest Income' },
      { key: 'laundry_income', label: 'Laundry Income' },
      { key: 'parking_income', label: 'Parking Income' },
      { key: 'tenant_charges', label: 'Tenant Charges (e.g. late fees)' },
    ],
  },
  { key: 'operating_subsidies', label: 'Operating Subsidies', lines: [], allowsOthers: true },
  { key: 'other_revenue', label: 'Other Revenue', lines: [], allowsOthers: true },
]

// ── §44 Must-Pay Operating Expenses (these four groups sum to Total Operating Expenses) ──
export const EXPENSE_GROUPS: RevExpGroup[] = [
  {
    key: 'admin', label: 'Administrative Expenses', pupa: true, allowsOthers: true,
    lines: [
      { key: 'accounting_services', label: 'Accounting Services' },
      { key: 'admin_rent_free', label: 'Administrative Rent Free Unit(s)' },
      { key: 'bad_debt', label: 'Bad Debt' },
      { key: 'rent_concessions', label: 'Rent Concessions' },
      { key: 'advertising', label: 'Advertising' },
      { key: 'lhc_compliance_monitoring', label: 'LHC Compliance Monitoring Fee', autoPull: 'Project Description · $40/unit' },
      { key: 'compliance_fees_other', label: 'Compliance Fees (Other)' },
      { key: 'lhc_asset_mgmt', label: 'LHC Asset Management Fee' },
      { key: 'asset_mgmt_other', label: 'Asset Management Fee (Other)' },
      { key: 'legal_auditing', label: 'Legal Auditing' },
      { key: 'management_fee', label: 'Management Fee' },
      { key: 'manager_salaries', label: 'Manager(s) Salaries' },
      { key: 'office_salaries', label: 'Office Salaries' },
      { key: 'office_supplies', label: 'Office Supplies' },
      { key: 'telephone', label: 'Telephone' },
      { key: 'supportive_services', label: 'Supportive Services Expense' },
    ],
  },
  {
    key: 'opmaint', label: 'Operating / Maintenance Expenses', pupa: true, allowsOthers: true,
    lines: [
      { key: 'elevator_maint', label: 'Elevator Maintenance / Contract' },
      { key: 'exterminating', label: 'Exterminating Contract' },
      { key: 'grounds', label: 'Grounds Expense' },
      { key: 'janitorial', label: 'Janitorial Services' },
      { key: 'repairs_maint', label: 'Repairs / Maintenance' },
      { key: 'security', label: 'Security Payroll / Contract' },
      { key: 'waste_collection', label: 'Waste Collection' },
    ],
  },
  {
    key: 'utilities', label: 'Utilities Expenses', pupa: true, allowsOthers: true,
    lines: [
      { key: 'electricity', label: 'Electricity' },
      { key: 'gas', label: 'Gas' },
      { key: 'sewer', label: 'Sewer' },
      { key: 'water', label: 'Water' },
    ],
  },
  {
    key: 'taxins', label: 'Tax and Insurance Expenses', pupa: true, allowsOthers: true,
    lines: [
      { key: 'property_insurance', label: 'Property Insurance' },
      { key: 'other_insurance', label: 'Other Insurance' },
      { key: 'payroll_taxes', label: 'Payroll Taxes' },
      { key: 'real_estate_taxes', label: 'Real Estate Taxes' },
      { key: 'workmens_comp', label: "Workmen's Compensation" },
    ],
  },
]

// ── §45 Contingent Operating Expenses ──────────────────────────────────────────
export const CONTINGENT_GROUPS: RevExpGroup[] = [
  {
    key: 'contingent', label: 'Contingent Operating Expenses', allowsOthers: true,
    lines: [
      { key: 'asset_mgmt_fee', label: 'Asset Management Fee' },
      { key: 'investor_service_fee', label: 'Investor Service Fee' },
    ],
  },
]

export const ALL_GROUPS: RevExpGroup[] = [...REVENUE_GROUPS, ...EXPENSE_GROUPS, ...CONTINGENT_GROUPS]

/** Field key for a group's add-as-needed "Other" lines JSON array. */
export const othersKey = (groupKey: string) => `${groupKey}__others`
