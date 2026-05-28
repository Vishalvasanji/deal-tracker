// QAP Development Team — static config.
// The "Development Team" sheet is a contact roster. Four members auto-pull from data the
// app already holds — Developer, Taxpayer, and Controlling Principal from Project Description
// §11, and Management Co. from §11.07 (the Excel leaves it blank, but we have it). The
// remaining roles are entered here and stored in qap_fields (section 'dev_team',
// field_key = `${role}__${field}`). Builder / lenders / fiscal partner names prefill from the
// deal record (gc / lender / partner) when present.

export interface TeamRole {
  key: string
  label: string
  note?: string
  /** column on the `deals` record whose value prefills this member's name */
  dealField?: 'gc' | 'lender' | 'partner'
}

// Manual-entry members (in Excel sheet order). Syndicator is pulled from the Syndication sheet
// in Excel, which the app does not model, so it is entered here.
export const MANUAL_TEAM_ROLES: TeamRole[] = [
  { key: 'sponsor', label: 'Sponsor' },
  { key: 'consultant', label: 'Consultant' },
  { key: 'fiscal_partner', label: 'Fiscal Member / Partner', dealField: 'partner' },
  { key: 'syndicator', label: 'Syndicator' },
  { key: 'attorney', label: 'Attorney' },
  { key: 'accountant', label: 'Accountant', note: 'Independent 3rd party' },
  { key: 'constr_lender', label: 'Construction Mortgage Lender', dealField: 'lender' },
  { key: 'perm_lender', label: 'Permanent Mortgage Lender', dealField: 'lender' },
  { key: 'architect', label: 'Architect' },
  { key: 'builder', label: 'Builder / Contractor', dealField: 'gc' },
]

export const TEAM_FIELDS = ['name', 'contact', 'phone', 'email'] as const
export type TeamField = (typeof TEAM_FIELDS)[number]

export const teamKey = (role: string, field: TeamField) => `${role}__${field}`
