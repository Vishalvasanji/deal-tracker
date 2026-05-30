// QAP Pro Forma — cash-flow projection calc layer.
// Ports the "Proforma" sheet: a year-by-year operating projection that trends the
// Year-1 Revenues & Expenses figures, nets debt service, and produces the DSCR and
// surplus-cash series. We project the full 40-year term (cheap) and surface the
// 15-year compliance window plus the milestone DSCRs/cumulative-surplus the Summary
// and the §30/§31 "Serious Problems" DSCR checks need.
//
// Trend rules (Excel rows 12/14/26/30/36):
//   • Revenue + Property-Management Fee trend by Rent Inflation:
//       years 2–3 = §28 rent-infl (1–3); years 4–15 = §28 rent-infl (4–15); 16+ = 3%.
//   • All other operating expenses trend by §28 Expense Inflation (constant).
//   • Replacement reserve trends by the §28 ADRR escalation.
//   • Vacancy (rent loss %): years 1–3 = §28 vacancy (1–3); years 4+ = §28 vacancy (4+).

export const PROFORMA_TERM_YEARS = 40
export const PROFORMA_DISPLAY_YEARS = 15
export const LATE_RENT_INFLATION = 0.03   // §28 "3% thereafter" for years 16+

// §30/§31 DSCR guardrails (Excel M1014 / M1015 / B1025).
export const Y1_DSCR_MIN = 1.15
export const Y1_DSCR_MAX = 1.40
export const DSCR15_MIN = 1.00
export const DSCR15_MAX = 1.40

export interface ProformaInputs {
  grossRent1: number         // Rev/Exp Gross Potential Rents (year 1)
  otherRevenue1: number      // every other revenue line (year 1) = revenueTotal − grossRent1
  pmgmtFee1: number          // Property Management Fee (year 1) — trends with rent
  otherOpEx1: number         // Total Operating Expenses − Property Management Fee (year 1) — trends with expenses
  reserve1: number           // annual Replacement Reserve deposit (year 1)
  contingentAMFee1: number   // allowable contingent Asset-Management fee (year 1) — trends with expenses
  mustPayDebtService: number // §30 must-pay annual debt service (Proforma row 40)
  otherDebtService: number   // Proforma row 41 "Other" must-pay (usually 0)
  vacancyY13: number         // decimal
  vacancyY4: number          // decimal
  rentInflY13: number        // decimal (years 2–3)
  rentInflY415: number       // decimal (years 4–15)
  expenseInfl: number        // decimal
  reserveEscalation: number  // decimal
}

export interface ProformaYear {
  year: number
  grossRent: number
  rentLoss: number          // positive magnitude
  otherRevenue: number
  egi: number               // effective gross income
  pmgmtFee: number
  otherOpEx: number
  totalOpEx: number
  reserve: number
  noi: number
  debtService: number       // must-pay + other (DSCR denominator)
  cashFlow: number
  dscr: number
  contingentAM: number
  surplus: number
  cumSurplus: number
}

export interface ProformaResult {
  years: ProformaYear[]                       // 1..40
  year1Dscr: number
  futureDscr: { year: number; dscr: number }[] // 5,10,15,20,25,30,35
  minDscr15: number                            // MIN(DSCR yr 5,10,15)  (Excel M1021)
  maxDscr15: number                            // MAX(DSCR yr 5,10,15)  (Excel M1020)
  cumSurplus15: number
  cumSurplus35: number
  cumSurplus40: number
  totalDebtService: number                     // annual must-pay + other
  hasDebtService: boolean
  // DSCR guardrail evaluation (mirrors Excel C1015 / B1025)
  y1Below: boolean   // Year-1 DSCR < 1.15
  y1Above: boolean   // Year-1 DSCR > 1.40
  dscr15Above: boolean // any of yr 5/10/15 > 1.40
  dscr15Below: boolean // any of yr 5/10/15 < 1.00 (only when debt service exists)
}

const r0 = (n: number) => Math.round(n)

export function computeProforma(inp: ProformaInputs): ProformaResult {
  const totalDebtService = inp.mustPayDebtService + inp.otherDebtService
  const years: ProformaYear[] = []
  let prev: ProformaYear | null = null
  let cum = 0

  for (let y = 1; y <= PROFORMA_TERM_YEARS; y++) {
    const rentRate = y <= 1 ? 0 : y <= 3 ? inp.rentInflY13 : y <= 15 ? inp.rentInflY415 : LATE_RENT_INFLATION
    const expRate = y <= 1 ? 0 : inp.expenseInfl
    const resRate = y <= 1 ? 0 : inp.reserveEscalation
    const vacancy = y <= 3 ? inp.vacancyY13 : inp.vacancyY4

    const grossRent    = y === 1 ? r0(inp.grossRent1)       : r0(prev!.grossRent    * (1 + rentRate))
    const otherRevenue = y === 1 ? r0(inp.otherRevenue1)    : r0(prev!.otherRevenue * (1 + rentRate))
    const pmgmtFee     = y === 1 ? r0(inp.pmgmtFee1)        : r0(prev!.pmgmtFee     * (1 + rentRate))
    const otherOpEx    = y === 1 ? r0(inp.otherOpEx1)       : r0(prev!.otherOpEx    * (1 + expRate))
    const reserve      = y === 1 ? r0(inp.reserve1)         : r0(prev!.reserve      * (1 + resRate))
    const contingentAM = y === 1 ? r0(inp.contingentAMFee1) : r0(prev!.contingentAM * (1 + expRate))

    const rentLoss = r0(grossRent * vacancy)
    const egi = grossRent + otherRevenue - rentLoss
    const totalOpEx = pmgmtFee + otherOpEx
    const noi = egi - totalOpEx - reserve
    const cashFlow = noi - totalDebtService
    const dscr = totalDebtService > 0 ? noi / totalDebtService : 0
    const surplus = Math.max(0, cashFlow - contingentAM)
    cum += surplus

    const yr: ProformaYear = {
      year: y, grossRent, rentLoss, otherRevenue, egi, pmgmtFee, otherOpEx, totalOpEx,
      reserve, noi, debtService: totalDebtService, cashFlow, dscr, contingentAM, surplus, cumSurplus: cum,
    }
    years.push(yr)
    prev = yr
  }

  const dscrAt = (y: number) => years[y - 1].dscr
  const futureDscr = [5, 10, 15, 20, 25, 30, 35].map(y => ({ year: y, dscr: dscrAt(y) }))
  const sample15 = [dscrAt(5), dscrAt(10), dscrAt(15)]
  const minDscr15 = Math.min(...sample15)
  const maxDscr15 = Math.max(...sample15)
  const year1Dscr = years[0].dscr
  const hasDebtService = totalDebtService > 0

  return {
    years,
    year1Dscr,
    futureDscr,
    minDscr15,
    maxDscr15,
    cumSurplus15: years[14].cumSurplus,
    cumSurplus35: years[34].cumSurplus,
    cumSurplus40: years[39].cumSurplus,
    totalDebtService,
    hasDebtService,
    y1Below: hasDebtService && year1Dscr < Y1_DSCR_MIN,
    y1Above: hasDebtService && year1Dscr > Y1_DSCR_MAX,
    dscr15Above: hasDebtService && maxDscr15 > DSCR15_MAX,
    dscr15Below: hasDebtService && minDscr15 < DSCR15_MIN,
  }
}
