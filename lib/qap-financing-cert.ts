// Financing Certification (At Time of Application) — Financing Cert sheet.
// Mostly a roll-up of values entered on other sheets. We pull the values we hold
// (Syndication: gross/net equity, syndicator info) and capture the rest as manual
// inputs, since the permanent-financing Source-of-Funds details live in Project
// Description sections we don't store. The "By:" signatory is the Controlling Principal.

export const FINANCING_CERT_SECTION = 'financing_cert'

export interface FinCertPulled {
  controllingPrincipalName: string
  syndName: string
  syndAddress: string
  syndPhone: string
  grossEquity: number
  netEquity: number
}

// A. Source of Funds. `terms` rows also carry debt service / rate / amortization.
export interface SourceRow { key: string; label: string; terms?: boolean }
export const SOURCE_ROWS: SourceRow[] = [
  { key: 'src_first_mortgage',    label: '1st Mortgage', terms: true },
  { key: 'src_second_mortgage',   label: '2nd Mortgage', terms: true },
  { key: 'src_lhc_risk_sharing',  label: 'LHC Risk Sharing Loan', terms: true },
  { key: 'src_lhc_home_nhtf',     label: 'LHC HOME / NHTF' },
  { key: 'src_cdbg_dr',           label: 'CDBG-DR' },
  { key: 'src_deferred_dev_fee',  label: 'Deferred Developer Fee' },
  { key: 'src_donated_items',     label: 'Donated Items' },
  { key: 'src_other',             label: 'Other' },
  { key: 'src_lihtc_proceeds',    label: 'Proceeds from Low-Income Tax Credits' },
  { key: 'src_historic_proceeds', label: 'Proceeds from Historic Tax Credits' },
]

// C. Subsidies — five tables, each with three date columns and a per-column total.
export type SubRow = { key: string; label: string } | { subhead: string }
export interface SubsidyTable { key: string; title: string; rows: SubRow[] }
export const SUBSIDY_COLS = [
  { key: 'res', label: 'Reservation Date' },
  { key: 'alloc', label: 'Allocation Date' },
  { key: 'pis', label: 'Placed-in-Service' },
] as const
export const SUBSIDY_TABLES: SubsidyTable[] = [
  { key: 'grants', title: 'I. Non-Repayable Grants', rows: [
    { key: 'cdbg_state', label: 'CDBG (State)' }, { key: 'cdbg_local', label: 'CDBG (Local)' },
    { key: 'home', label: 'HOME' }, { key: 'rental_rehab', label: 'Rental Rehab' },
    { key: 'state', label: 'State' }, { key: 'local', label: 'Local' }, { key: 'other', label: 'Other' },
  ] },
  { key: 'secondary', title: 'II. Secondary Financing', rows: [
    { key: 'cdbg_state', label: 'CDBG (State)' }, { key: 'cdbg_local', label: 'CDBG (Local)' },
    { key: 'home', label: 'HOME' }, { key: 'hope_vi', label: 'HOPE VI' }, { key: 'state', label: 'State' },
    { key: 'local', label: 'Local' }, { key: 'other1', label: 'Other' }, { key: 'other2', label: 'Other' }, { key: 'other3', label: 'Other' },
  ] },
  { key: 'other_subsidies', title: 'III. Value Other Subsidies', rows: [
    { key: 'tax_abatement', label: 'Tax Abatement' }, { key: 'historic_credit', label: 'Historic Rehab Credit' },
    { key: 'land_donation', label: 'Land Donation' }, { key: 'other', label: 'Other' },
  ] },
  { key: 'credit_enh', title: 'IV. Credit Enhancements', rows: [
    { key: 'fha', label: 'FHA Section #' }, { key: 'pmi', label: 'Private Mortgage Insurance' },
    { key: 'loc', label: 'Letters of Credit' }, { key: 'other', label: 'Other' },
  ] },
  { key: 'rental_assist', title: 'V. Rental Assistance Anticipated', rows: [
    { subhead: 'Tenant Based' },
    { key: 'tb_sec8', label: 'Section 8' }, { key: 'tb_other1', label: 'Other' }, { key: 'tb_other2', label: 'Other' },
    { subhead: 'Project Based' },
    { key: 'pb_sec8', label: 'Section 8' }, { key: 'pb_rdra', label: 'RD/RA' }, { key: 'pb_state_pba', label: 'State PBA' }, { key: 'pb_other', label: 'Other' },
  ] },
]

// D. Uses of funds.
export const USE_ROWS = [
  { key: 'use_rehab_hard', label: 'Rehabilitation Hard Costs' },
  { key: 'use_constr_hard', label: 'Construction Hard Costs' },
  { key: 'use_soft', label: 'Total Soft Costs' },
  { key: 'use_acq_land', label: 'Acquisition — Land Only' },
  { key: 'use_acq_buildings', label: 'Acquisition — Buildings Only' },
  { key: 'use_acq_other', label: 'Acquisition — Other' },
  { key: 'use_other_not_basis', label: 'Other Fund Uses NOT in Basis' },
  { key: 'use_demolition', label: 'Demolition' },
  { key: 'use_other', label: 'Other' },
  { key: 'use_temp_loan_payoff', label: 'Temporary Construction Loan Payoff' },
  { key: 'use_initial_op_reserve', label: 'Initial Operating Reserve' },
  { key: 'use_initial_replacement_reserve', label: 'Initial Deposit to Replacement Reserve' },
] as const

// E. Funds available for cash requirements — sources of cash, then fees & grants.
export const CASH_SOURCE_ROWS = [
  { key: 'cash_syndication', label: 'Syndication Proceeds' },
  { key: 'cash_owner_contrib', label: 'Owner Contribution' },
  { key: 'cash_other', label: 'Other' },
] as const
export const FEES_GRANTS_ROWS = [
  { key: 'fg_home', label: 'Home Funds' },
  { key: 'fg_other1', label: 'Other' },
  { key: 'fg_other2', label: 'Other' },
] as const

// "Items which vary from terms" grid (rows 38–51): Application/Reservation vs Placed-in-Service.
export const VARIANCE_ROWS = [
  { key: 'land_costs', label: 'Land Costs' },
  { key: 'tdc', label: 'TDC' },
  { key: 'tdc_unit', label: 'TDC / Unit' },
  { key: 'soft_costs_unit', label: 'Soft Costs / Unit' },
  { key: 'first_mtg_principal', label: '1st Mortgage Principal' },
  { key: 'first_mtg_interest', label: '1st Mortgage Interest' },
  { key: 'first_mtg_term', label: '1st Mortgage Term' },
  { key: 'second_mtg_principal', label: '2nd Mortgage Principal' },
  { key: 'second_mtg_interest', label: '2nd Mortgage Interest' },
  { key: 'second_mtg_term', label: '2nd Mortgage Term' },
  { key: 'deferred_dev_fee', label: 'Deferred Developer Fee' },
  { key: 'dev_fee_paid', label: 'Developer Fee Paid' },
  { key: 'gross_equity', label: 'Gross Equity' },
  { key: 'net_equity', label: 'Net Equity' },
] as const
