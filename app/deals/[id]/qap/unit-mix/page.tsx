import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, qapUnitTypes, qapFields } from '@/lib/db/schema'
import { eq, or, asc, and } from 'drizzle-orm'
import { UnitMixTable } from '@/components/qap/UnitMixTable'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

// ── Parish 4-person AMI ────────────────────────────────────────────────────────
// Mirrors PARISH_AMI in Section23Form.tsx — keep in sync if LHC updates figures.
const PARISH_AMI: Record<string, number> = {
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

// Mirrors calcGrossRents in Section23Form.tsx
function calcGrossRents(ami4: number, amiPct: number): [number, number, number, number, number] {
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

const AMI_PCT_MAP: Record<string, number> = {
  '20': 0.20, '30': 0.30, '40': 0.40, '50': 0.50,
  '60': 0.60, '70': 0.70, '80': 0.80, '120': 1.20,
}

export default async function UnitMixPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [deal] = await db
    .select()
    .from(deals)
    .where(or(eq(deals.id, id), eq(deals.deal_id, id)))
    .limit(1)
  if (!deal) notFound()

  const [units, s12Fields, s23Fields, s14Fields] = await Promise.all([
    db.select().from(qapUnitTypes)
      .where(eq(qapUnitTypes.deal_id, deal.id))
      .orderBy(asc(qapUnitTypes.row_index)),
    db.select().from(qapFields)
      .where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_12'))),
    db.select().from(qapFields)
      .where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_23'))),
    db.select().from(qapFields)
      .where(and(eq(qapFields.deal_id, deal.id), eq(qapFields.section, 'section_14'))),
  ])

  const s12 = Object.fromEntries(s12Fields.map(f => [f.field_key, f.value ?? '']))
  const s23 = Object.fromEntries(s23Fields.map(f => [f.field_key, f.value ?? '']))
  const s14 = Object.fromEntries(s14Fields.map(f => [f.field_key, f.value ?? '']))

  // Market rents by bedroom count (0–4) — from §23.09
  const marketRents: Record<number, number> = {}
  for (let br = 0; br <= 4; br++) {
    const v = parseInt(s23[`s23_09_market_${br}br`] ?? '', 10)
    if (!isNaN(v) && v > 0) marketRents[br] = v
  }

  // HUD FMR by bedroom count (0–4) — from §23.10
  const fmrRents: Record<number, number> = {}
  for (let br = 0; br <= 4; br++) {
    const v = parseInt(s23[`s23_10_fmr_${br}br`] ?? '', 10)
    if (!isNaN(v) && v > 0) fmrRents[br] = v
  }

  // AMI contract rent limits by (ami_key, br) — from parish + §23.06 utility allowances
  const parish = s12['parish'] ?? ''
  const ami4   = PARISH_AMI[parish] ?? 0
  const ua     = [0, 1, 2, 3, 4].map(br =>
    parseInt(s23[`s23_06_ua_${br}br`] ?? '0', 10) || 0
  )

  const amiRentLimits: Record<string, Record<number, number>> = {}
  if (ami4 > 0) {
    for (const [key, pct] of Object.entries(AMI_PCT_MAP)) {
      const gross = calcGrossRents(ami4, pct)
      amiRentLimits[key] = Object.fromEntries(
        [0, 1, 2, 3, 4].map(br => [br, Math.max(0, gross[br] - ua[br])])
      )
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4 pb-20">
      <div className="flex items-center gap-3">
        <Link
          href={`/deals/${deal.id}/qap`}
          className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' rounded-xl text-muted-foreground'}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground font-mono">{deal.deal_id} / QAP</p>
          <h1 className="text-xl font-bold">Unit Mix & Rents</h1>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-black/[0.06] p-5 overflow-x-auto">
        <UnitMixTable
          dealId={deal.id}
          initialUnits={units}
          marketRents={Object.keys(marketRents).length > 0 ? marketRents : undefined}
          fmrRents={Object.keys(fmrRents).length > 0 ? fmrRents : undefined}
          amiRentLimits={Object.keys(amiRentLimits).length > 0 ? amiRentLimits : undefined}
          setAsideElection={s14['lihtc_set_aside_election'] || undefined}
        />
      </div>
    </div>
  )
}
