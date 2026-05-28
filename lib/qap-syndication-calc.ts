// QAP Syndication — calc layer (Part I derived lines + cross-checks + Part VII net equity).

import { PUBLIC_COST_CAP, PRIVATE_COST_CAP } from './qap-syndication'

export interface SyndInputs {
  pctAcquired: number       // I.B — % interest acquired by syndicator (0..1)
  proceeds: number          // I.E — syndication proceeds generated
  grossEquity: number       // I.F — gross equity invested by syndicator
  taxCredits: number        // I.D — credits in commitment (pulled from §14)
  isPublic: boolean         // public vs private syndication (drives the cost cap)
  eventInstallments: number[] // II — disbursement installments
  vCostTotal: number        // V — total syndication costs paid by syndicator
  viCostTotal: number       // VI — total syndication costs paid by taxpayer/developer (= I.H)
  netCompounding: number    // VII (i)
  netDiscounting: number    // VII (ii)
}

export interface SyndResult {
  pctRetained: number          // I.C = 1 − B
  costsBySyndicator: number    // I.G = E − F
  costsByDeveloper: number     // I.H = Part VI total
  totalCosts: number           // I.I = G + H
  costsPctOfProceeds: number   // I.J = I / E
  proceedsAvailable: number    // I.K = F − H
  costCap: number              // 15% public / 10% private
  costPctExceeds: boolean      // J above the cap
  eventsTotal: number          // Σ installments
  eventsMatch: boolean         // Σ installments ≈ gross equity (rounded to $10)
  vTotal: number               // Part V total
  vMatchesG: boolean           // Part V total == I.G
  viTotal: number              // Part VI total (= I.H)
  netEquity: number            // VII (iii) = (i) + (ii)
}

const round10 = (v: number) => Math.round(v / 10) * 10

export function computeSyndication(i: SyndInputs): SyndResult {
  const costsBySyndicator = i.proceeds - i.grossEquity
  const costsByDeveloper = i.viCostTotal
  const totalCosts = costsBySyndicator + costsByDeveloper
  const costsPctOfProceeds = i.proceeds > 0 ? totalCosts / i.proceeds : 0
  const costCap = i.isPublic ? PUBLIC_COST_CAP : PRIVATE_COST_CAP
  const eventsTotal = i.eventInstallments.reduce((s, x) => s + x, 0)

  return {
    pctRetained: 1 - i.pctAcquired,
    costsBySyndicator,
    costsByDeveloper,
    totalCosts,
    costsPctOfProceeds,
    proceedsAvailable: i.grossEquity - costsByDeveloper,
    costCap,
    costPctExceeds: costsPctOfProceeds > costCap + 1e-9,
    eventsTotal,
    eventsMatch: i.grossEquity === 0 ? eventsTotal === 0 : round10(eventsTotal) === round10(i.grossEquity),
    vTotal: i.vCostTotal,
    vMatchesG: round10(i.vCostTotal) === round10(costsBySyndicator),
    viTotal: i.viCostTotal,
    netEquity: i.netCompounding + i.netDiscounting,
  }
}
