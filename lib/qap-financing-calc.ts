// QAP Financing — calc layer. Computes the values the Excel "Project Description"
// §18 (Sources of Funds) derives from the captured loan/source inputs:
//   • must-pay debt service  — Excel H994 = E304 + E329 + E354 (the three mortgage positions)
//   • total permanent sources — Excel H529 = SUM of every active source amount
//   • equity-gap inputs       — Excel H680 "Equity Gap before LIHTC Equity and LHC Funds"
// These feed the Pro Forma DSCR, the §37 Sources & Uses balance, and the credit-request
// (B693) check. The §18 form (components/qap/Section18Form.tsx) captures all the inputs;
// this just wires them into the computed outputs.

const num = (v: string | undefined): number => {
  const x = parseFloat(String(v ?? '').replace(/[$,%\s]/g, ''))
  return isNaN(x) ? 0 : x
}

const MORT_LABELS: Record<string, string> = {
  '01': 'New LHC Risk Sharing First Mortgage',
  '02': 'Existing / New First Mortgage',
  '03': 'Existing / New Second Mortgage',
}

/** Annual P+I payment on `principal` at `annualRatePct` (%) over `months` — Excel -PMT(r/12, n, pv) × 12. */
export function annualPmt(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0
  const r = annualRatePct / 100 / 12
  const monthly = r === 0 ? principal / months : (principal * r) / (1 - Math.pow(1 + r, -months))
  return monthly * 12
}

/** A mortgage position's computed annual payment — Excel M304 = CHOOSE(payment_type, IO, P+I, P+I+MIP, 0). */
export function loanAnnualPayment(amount: number, ratePct: number, amortMonths: number, mipPct: number, paymentType: string): number {
  const io = amount * (ratePct / 100)
  const pi = annualPmt(amount, ratePct, amortMonths)
  const mip = amount * (mipPct / 100)
  switch (paymentType) {
    case 'Interest Only': return io
    case 'P+I':           return pi
    case 'P+I+MIP':       return pi + mip
    default:              return 0   // "Missing"/blank → no payment (deferred)
  }
}

export interface FinancingResult {
  loans: { line: string; label: string; amount: number; paymentType: string; annualPayment: number }[]
  mustPayDebtService: number   // Σ over the three mortgage positions (Excel H994)
  totalSources: number         // Σ all active permanent sources (Excel H529)
  lihtcEquity: number          // §18.10 estimated LIHTC equity proceeds
  lhcFunds: number             // §13 HOME + NHTF + CDBG-DR requested
  gapFillingSources: number    // totalSources − LIHTC equity − LHC funds (what the equity gap subtracts)
}

export function computeFinancing(s18: Record<string, string>, s13: Record<string, string>): FinancingResult {
  const active = (n: string) => s18[`s18_${n}_active`] === 'Yes'
  // Current amount for a mortgage position: a new loan uses the loan amount; an existing loan
  // uses the estimated outstanding balance (falling back to the original amount).
  const mortAmount = (n: string) =>
    n === '01'
      ? num(s18['s18_01_loan_amount'])
      : num(s18[`s18_${n}_est_balance`]) || num(s18[`s18_${n}_original_amount`])

  // ── Debt service: the three mortgage positions only (Excel H994 = E304 + E329 + E354) ──
  const loans = ['01', '02', '03'].filter(active).map(n => {
    const amount = mortAmount(n)
    const paymentType = s18[`s18_${n}_payment_type`] ?? ''
    const annualPayment = loanAnnualPayment(
      amount, num(s18[`s18_${n}_interest_rate`]), num(s18[`s18_${n}_amort_term`]),
      num(s18[`s18_${n}_mtg_ins_premium`]), paymentType,
    )
    return { line: `18.${n}`, label: MORT_LABELS[n], amount, paymentType, annualPayment }
  })
  const mustPayDebtService = loans.reduce((s, l) => s + l.annualPayment, 0)

  // ── Total permanent sources (Excel H529 = SUM of each active source's amount) ──
  const amt = (n: string, key: string) => (active(n) ? num(s18[`s18_${n}_${key}`]) : 0)
  const lihtcEquity = amt('10', 'amount')
  const s18Sources =
    (active('01') ? mortAmount('01') : 0) +
    (active('02') ? mortAmount('02') : 0) +
    (active('03') ? mortAmount('03') : 0) +
    amt('07', 'amount') + amt('08', 'equity_amount') + amt('09', 'equity_amount') +
    lihtcEquity + amt('11', 'amount') + amt('12', 'amount') + amt('13', 'amount') +
    amt('14', 'funding_amount') + amt('15', 'funding_amount') + amt('16', 'funding_amount')
  // HOME / NHTF / CDBG-DR are requested in §13 (the §18 loan blocks carry only their terms).
  const lhcFunds = num(s13['home_requested']) + num(s13['nhtf_requested']) + num(s13['cdbg_requested'])
  const totalSources = s18Sources + lhcFunds

  // Equity gap (Excel H680 "before LIHTC Equity and LHC Funds") subtracts every source EXCEPT
  // the LIHTC equity (§18.10) and the LHC funds (HOME/NHTF/CDBG). gap = TDC − gapFillingSources.
  const gapFillingSources = totalSources - lihtcEquity - lhcFunds

  return { loans, mustPayDebtService, totalSources, lihtcEquity, lhcFunds, gapFillingSources }
}
