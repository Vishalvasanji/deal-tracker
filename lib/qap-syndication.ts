// QAP Syndication — static config.
// Mirrors the "Syndication" sheet (Parts I–VII). Scalar fields are stored in qap_fields
// (section 'syndication', field_key below); add-as-needed rows are stored as JSON arrays:
//   events__json   — Part II disbursement installments
//   lenders__json  — Part III commercial lenders
//   v_others__json — Part V "Other" syndication-cost rows (paid by Syndicator)
//   vi_others__json— Part VI "Other" syndication-cost rows (paid by Taxpayer/Developer)

export interface CostItem { key: string; label: string }

// Part V — syndication costs paid by the Syndicator (fixed line items; "Other" rows are dynamic).
export const V_FIXED_ITEMS: CostItem[] = [
  { key: 'v_accountant', label: "Accountant's Fee Paid by Syndicator" },
  { key: 'v_synd_fee', label: "Syndicator's Fee" },
  { key: 'v_attorney', label: "Attorney's Fee Paid by Syndicator" },
  { key: 'v_broker', label: 'Broker Fees Paid by Syndicator' },
  { key: 'v_org', label: 'Organizational Expense of Syndication' },
]

// Part VI — syndication costs paid by the Taxpayer / Developer.
export const VI_FIXED_ITEMS: CostItem[] = [
  { key: 'vi_accountant', label: "Accountant's Fee Paid by Taxpayer" },
  { key: 'vi_taxpayer_fee', label: "Taxpayer's Fee" },
  { key: 'vi_attorney', label: "Attorney's Fee Paid by Taxpayer" },
  { key: 'vi_broker', label: 'Broker Fees Paid by Taxpayer' },
  { key: 'vi_org', label: 'Organizational Expense of Syndication' },
]

// Public syndications may not exceed 15% costs/proceeds; private may not exceed 10%.
export const PUBLIC_COST_CAP = 0.15
export const PRIVATE_COST_CAP = 0.10

export interface SyndEvent { id: string; event: string; date: string; percentage: number; installment: number }
export interface SyndLender {
  id: string; name: string; address: string; phone: string; contact: string
  loanAmount: number; interestRate: number; totalInterest: number; security: string
}
export interface SyndOther { id: string; item: string; payee: string; amount: number }
