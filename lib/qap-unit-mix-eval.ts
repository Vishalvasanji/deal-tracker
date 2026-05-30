// Unit Mix & Rents — shared evaluation layer (single source of truth).
// Ports the Excel "Unit Mix and Rents" per-row flag formulas (cols AM–AS), the
// AMI thresholds, and the §14 set-aside eligibility test. Used by both the Unit
// Mix module (UnitMixTable) and the Serious Problems dashboard so the two never
// drift. If you change a rule here, both surfaces update together.

// LHC minimums — Excel AE44:AI44 (sqft) and AE45:AI45 (baths), indexed by bedroom count.
export const MIN_SQFT  = [450, 650, 800, 1100, 1400] // 0BR–4BR
export const MIN_BATHS = [1, 1, 1, 2, 2.5]           // 0BR–4BR

export interface UnitRowLike {
  bedrooms: number | null
  baths: number | null
  sqft: number | null
  num_units: number | null
  is_lihtc: number | null
  is_staff: number | null
  is_psh: number | null
  ami_restriction: string | null
  monthly_rent: number | null
}

export interface RentLimits {
  amiRentLimits?: Record<string, Record<number, number>>
  marketRents?:   Record<number, number>
  fmrRents?:      Record<number, number>
}

/**
 * Validation messages for a single unit row.
 * Self-contained checks (sqft/baths/PSH/staff/LIHTC) always run; rent-limit checks
 * run when Section 23 data is supplied via rentLimits. Mirrors the Excel row flags.
 */
export function getUnitRowFlags(row: UnitRowLike, rentLimits?: RentLimits): string[] {
  const flags: string[] = []
  const hasUnits = (row.num_units ?? 0) > 0
  if (!hasUnits) return flags

  const br = row.bedrooms
  const inBrRange = br != null && br >= 0 && br <= 4

  // LIHTC + Staff mutual conflict (Excel counts staff only when LIHTC ≠ Yes)
  if (row.is_lihtc === 1 && row.is_staff === 1) {
    flags.push('Unit is checked both LIHTC and Staff — it will be counted as LIHTC only, not Staff')
  }

  // Flag 3 — Sqft below LHC minimum (Excel AO: IF(E<AJ,3,""))
  if (inBrRange && row.sqft != null && row.sqft < MIN_SQFT[br!]) {
    flags.push(`Sqft ${row.sqft.toLocaleString()} is below the LHC minimum of ${MIN_SQFT[br!].toLocaleString()} for ${br}BR`)
  }

  // Flag 4 — Baths below LHC minimum (Excel AP: IF(D<AK,4,""))
  if (inBrRange && row.baths != null && row.baths < MIN_BATHS[br!]) {
    flags.push(`${row.baths} baths is below the LHC minimum of ${MIN_BATHS[br!]} for ${br}BR`)
  }

  // Flag 5 — PSH rule: must be 0BR or 1BR at 20% AMI (Excel AQ10 → Controls!A144 = "20% AMI")
  if (row.is_psh === 1) {
    const validBr = br === 0 || br === 1
    const valid20 = row.ami_restriction === '20'
    if (!validBr || !valid20) {
      const issues: string[] = []
      if (!validBr) issues.push('must be 0BR or 1BR')
      if (!valid20) issues.push('must be at 20% AMI')
      flags.push(`PSH rule violation: ${issues.join(' and ')}`)
    }
  }

  // Flag 7 — Staff unit rule: not LIHTC, not PSH, Not AMI Restricted, rent = $0 (Excel AS10)
  if (row.is_staff === 1) {
    const issues: string[] = []
    if (row.is_lihtc === 1)                     issues.push('cannot also be LIHTC')
    if (row.is_psh === 1)                       issues.push('cannot also be PSH')
    if (row.ami_restriction !== 'unrestricted') issues.push('AMI must be Not Restricted')
    if ((row.monthly_rent ?? 0) !== 0)          issues.push('rent must be $0')
    if (issues.length > 0) flags.push(`Staff unit issue: ${issues.join(', ')}`)
  }

  const rent = row.monthly_rent
  if (rent != null && inBrRange) {
    // Flag 1 — Rent > AMI contract rent limit (Excel AM: IF(L>AG,1,""))
    const amiKey = row.ami_restriction
    if (amiKey && amiKey !== 'unrestricted' && rentLimits?.amiRentLimits) {
      const limit = rentLimits.amiRentLimits[amiKey]?.[br!]
      if (limit !== undefined && rent > limit) {
        flags.push(`Rent $${rent.toLocaleString()} exceeds the ${amiKey}% AMI contract rent limit of $${limit.toLocaleString()} for ${br}BR`)
      }
    }
    // Flag 2 — Rent > Market rate (Excel AN: IF(L>AI,2,""))
    if (rentLimits?.marketRents) {
      const market = rentLimits.marketRents[br!]
      if (market !== undefined && rent > market) {
        flags.push(`Rent $${rent.toLocaleString()} exceeds estimated market rent of $${market.toLocaleString()} for ${br}BR`)
      }
    }
    // Flag 6 — Rent > FMR (Excel AR: IF(L>AH,6,""))
    if (rentLimits?.fmrRents) {
      const fmr = rentLimits.fmrRents[br!]
      if (fmr !== undefined && rent > fmr) {
        flags.push(`Rent $${rent.toLocaleString()} exceeds HUD Fair Market Rent of $${fmr.toLocaleString()} for ${br}BR`)
      }
    }
  }

  return flags
}

// ── Rent-limit derivation (Section 12 parish + Section 23 inputs) ────────────────
// Parish 4-person AMI — mirrors PARISH_AMI in Section23Form / unit-mix page.
export const PARISH_AMI: Record<string, number> = {
  'Acadia': 69200, 'Allen': 65200, 'Ascension': 91700, 'Assumption': 77200,
  'Avoyelles': 54700, 'Beauregard': 85000, 'Bienville': 55300, 'Bossier': 81700,
  'Caddo': 81700, 'Calcasieu': 91100, 'Caldwell': 86800, 'Cameron': 91100,
  'Catahoula': 65700, 'Claiborne': 47300, 'Concordia': 54000, 'Desoto': 81700,
  'East Baton Rouge': 91700, 'East Carroll': 39900, 'East Feliciana': 91700,
  'Evangeline': 58100, 'Franklin': 58700, 'Grant': 78000, 'Iberia': 75500,
  'Iberville': 79000, 'Jackson': 60400, 'Jefferson': 89800,
  'Jefferson Davis': 80600, 'Lafayette': 84700, 'Lafourche': 75700,
  'Lasalle': 92200, 'Lincoln': 70800, 'Livingston': 91700, 'Madison': 50400,
  'Morehouse': 54100, 'Natchitoches': 72600, 'Orleans': 89800,
  'Ouachita': 73400, 'Plaquemines': 89800, 'Pointe Coupee': 91700,
  'Rapides': 78000, 'Red River': 63400, 'Richland': 69100, 'Sabine': 68600,
  'St. Bernard': 89800, 'St. Charles': 89800, 'St. Helena': 91700,
  'St. James': 94700, 'St. John': 89800, 'St. Landry': 62800,
  'St. Martin': 84700, 'St. Mary': 70600, 'St. Tammany': 98000,
  'Tangipahoa': 80400, 'Tensas': 54900, 'Terrebonne': 75700,
  'Union': 73400, 'Vermilion': 80300, 'Vernon': 71800, 'Washington': 64900,
  'Webster': 53200, 'West Baton Rouge': 91700, 'West Carroll': 77000,
  'West Feliciana': 91700, 'Winn': 68000,
}

export const AMI_PCT_MAP: Record<string, number> = {
  '20': 0.20, '30': 0.30, '40': 0.40, '50': 0.50,
  '60': 0.60, '70': 0.70, '80': 0.80, '120': 1.20,
}

// Mirrors calcGrossRents in Section23Form / unit-mix page.
export function calcGrossRents(ami4: number, amiPct: number): [number, number, number, number, number] {
  const inc4 = Math.round(ami4 * amiPct)
  const inc1 = Math.round(inc4 * 0.70 / 50) * 50
  const inc2 = Math.round(inc4 * 0.80 / 50) * 50
  const inc3 = Math.round(inc4 * 0.90 / 50) * 50
  const inc5 = Math.round(inc4 * 1.08 / 50) * 50
  const inc6 = Math.round(inc4 * 1.16 / 50) * 50
  return [
    Math.floor(inc1 * 0.3 / 12),
    Math.floor(((inc1 + inc2) / 2) * 0.3 / 12),
    Math.floor(inc3 * 0.3 / 12),
    Math.floor(((inc4 + inc5) / 2) * 0.3 / 12),
    Math.floor(inc6 * 0.3 / 12),
  ]
}

/** Build the rent-limit context from Section 12 (parish) + Section 23 inputs. */
export function deriveRentLimits(
  s12: Record<string, string>,
  s23: Record<string, string>,
): { marketRents?: Record<number, number>; fmrRents?: Record<number, number>; amiRentLimits?: Record<string, Record<number, number>> } {
  const marketRents: Record<number, number> = {}
  for (let br = 0; br <= 4; br++) {
    const v = parseInt(s23[`s23_09_market_${br}br`] ?? '', 10)
    if (!isNaN(v) && v > 0) marketRents[br] = v
  }
  const fmrRents: Record<number, number> = {}
  for (let br = 0; br <= 4; br++) {
    const v = parseInt(s23[`s23_10_fmr_${br}br`] ?? '', 10)
    if (!isNaN(v) && v > 0) fmrRents[br] = v
  }
  const parish = s12['parish'] ?? ''
  const ami4   = PARISH_AMI[parish] ?? 0
  const ua     = [0, 1, 2, 3, 4].map(br => parseInt(s23[`s23_06_ua_${br}br`] ?? '0', 10) || 0)
  const amiRentLimits: Record<string, Record<number, number>> = {}
  if (ami4 > 0) {
    for (const [key, pct] of Object.entries(AMI_PCT_MAP)) {
      const gross = calcGrossRents(ami4, pct)
      amiRentLimits[key] = Object.fromEntries([0, 1, 2, 3, 4].map(br => [br, Math.max(0, gross[br] - ua[br])]))
    }
  }
  return {
    marketRents: Object.keys(marketRents).length > 0 ? marketRents : undefined,
    fmrRents: Object.keys(fmrRents).length > 0 ? fmrRents : undefined,
    amiRentLimits: Object.keys(amiRentLimits).length > 0 ? amiRentLimits : undefined,
  }
}

// AMI levels in display order (matches the Unit Mix table).
export const AMI_LEVELS = ['20', '30', '40', '50', '60', '70', '80', '120', 'unrestricted'] as const
export const AMI_LEVEL_LABELS: Record<string, string> = {
  '20': '20% AMI', '30': '30% AMI', '40': '40% AMI', '50': '50% AMI', '60': '60% AMI',
  '70': '70% AMI', '80': '80% AMI', '120': '120% AMI', 'unrestricted': 'Not Restricted',
}

/** AMI-level × bedroom (0–4) unit-count matrix + totals, for the Summary roll-up. */
export function unitMixMatrix(rows: UnitRowLike[]): {
  levels: { ami: string; label: string; byBr: number[]; total: number }[]
  brTotals: number[]
  grandTotal: number
} {
  const levels = AMI_LEVELS.map(ami => {
    const byBr = [0, 1, 2, 3, 4].map(br =>
      rows.reduce((s, r) => s + (r.ami_restriction === ami && r.bedrooms === br ? (r.num_units ?? 0) : 0), 0))
    return { ami, label: AMI_LEVEL_LABELS[ami], byBr, total: byBr.reduce((s, v) => s + v, 0) }
  }).filter(l => l.total > 0)
  const brTotals = [0, 1, 2, 3, 4].map(br =>
    rows.reduce((s, r) => s + (r.bedrooms === br ? (r.num_units ?? 0) : 0), 0))
  const grandTotal = rows.reduce((s, r) => s + (r.num_units ?? 0), 0)
  return { levels, brTotals, grandTotal }
}

// ── Aggregate evaluation (set-aside eligibility, AMI thresholds, row-flag count) ─
export interface UnitMixEval {
  totalUnits: number
  residentialUnits: number
  lihtcUnits: number
  unitsUnder30: number
  under30Pct: number
  lihtcIncomeAvg: number
  setAsideElection: string
  setAsideMet: boolean
  rowFlagCount: number
}

/**
 * Aggregate the unit rows: AMI thresholds, the §14 set-aside eligibility test
 * (40/60, 20/50, or Average Income ≤ 60% AMI), and the total row-flag count.
 */
export function evaluateUnitMix(
  rows: UnitRowLike[],
  setAsideElection: string,
  rentLimits?: RentLimits,
): UnitMixEval {
  const totalUnits = rows.reduce((s, r) => s + (r.num_units ?? 0), 0)
  const staffUnits = rows.reduce((s, r) => s + (r.is_staff && !r.is_lihtc ? (r.num_units ?? 0) : 0), 0)
  const lihtcUnits = rows.reduce((s, r) => s + (r.is_lihtc ? (r.num_units ?? 0) : 0), 0)
  const residentialUnits = totalUnits - staffUnits

  const amiAtOrBelow = (keys: string[]) =>
    rows.reduce((s, r) => s + (keys.includes(r.ami_restriction ?? '') ? (r.num_units ?? 0) : 0), 0)
  const unitsUnder30 = amiAtOrBelow(['20', '30'])
  const unitsUnder50 = amiAtOrBelow(['20', '30', '40', '50'])
  const unitsUnder60 = amiAtOrBelow(['20', '30', '40', '50', '60'])
  const under30Pct = totalUnits > 0 ? unitsUnder30 / totalUnits : 0

  const pct4060 = totalUnits > 0 ? unitsUnder60 / totalUnits : 0
  const meets4060 = pct4060 >= 0.40
  const pct2050 = totalUnits > 0 ? unitsUnder50 / totalUnits : 0
  const meets2050 = pct2050 >= 0.20

  // LIHTC Income Average — weighted AMI of LIHTC units (Excel guard excludes 120% & Not-Restricted).
  const lihtcWtdAmi = rows.reduce((s, r) => {
    if (!r.is_lihtc || r.ami_restriction === 'unrestricted') return s
    const ami = parseInt(r.ami_restriction ?? '', 10)
    if (isNaN(ami) || ami >= 120) return s
    return s + ami * (r.num_units ?? 0)
  }, 0)
  const lihtcIncomeAvg = lihtcUnits > 0 ? lihtcWtdAmi / lihtcUnits : 0

  const el = (setAsideElection ?? '').toLowerCase()
  const is4060 = el.includes('40') && el.includes('60')
  const is2050 = el.includes('20') && el.includes('50')
  const isAvg = el.includes('average') || el.includes('averaging')
  const avgOk = lihtcIncomeAvg > 0 && lihtcIncomeAvg <= 60
  // Only meaningful when an election is present; default true so no spurious flag fires.
  const setAsideMet = is4060 ? meets4060 : is2050 ? meets2050 : isAvg ? avgOk : true

  const rowFlagCount = rows.reduce((s, r) => s + getUnitRowFlags(r, rentLimits).length, 0)

  return {
    totalUnits, residentialUnits, lihtcUnits, unitsUnder30, under30Pct,
    lihtcIncomeAvg, setAsideElection, setAsideMet, rowFlagCount,
  }
}
