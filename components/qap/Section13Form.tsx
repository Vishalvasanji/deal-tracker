'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

interface Props {
  dealId: string
  initial: Record<string, string>
  /** is_rural from section_12, used for QNP/CHDO cap adjustment */
  isRural?: boolean
  /** is_chdo from section_11, used for HOME eligibility */
  isChdo?: boolean
}

// ─── Pool lookup table (mirrors Controls!A32:F36) ────────────────────────────
const POOLS: Record<string, {
  advisory: string
  lihtcCap: number        // base cap; QNP/CHDO rural drops to $1M
  nhtfCap: number
  homeCap: number
  cdbgCap: number
}> = {
  'Qualified Non-Profit/CHDO Set-Aside': {
    advisory:
      'Requires the material participation of a qualified non-profit organization; see the QAP for documentation requirements.',
    lihtcCap: 1_500_000,
    nhtfCap: 0,
    homeCap: 0,
    cdbgCap: 0,
  },
  'Urban Area Pool': {
    advisory:
      'The project must be located in EBR, Orleans, Caddo, Ouachita, Calcasieu, Lafayette, St. Tammany, or Jefferson parishes.',
    lihtcCap: 1_500_000,
    nhtfCap: 0,
    homeCap: 0,
    cdbgCap: 0,
  },
  'Rural Area Rehabilitation Pool': {
    advisory:
      'The Rural project must be 50% or less new construction (by number of units).',
    lihtcCap: 1_000_000,
    nhtfCap: 0,
    homeCap: 0,
    cdbgCap: 0,
  },
  'Rural Area New Construction Pool': {
    advisory:
      'The Rural project must be more than 50% new construction (by number of units).',
    lihtcCap: 1_000_000,
    nhtfCap: 0,
    homeCap: 0,
    cdbgCap: 0,
  },
  'Choice Neighborhood Initiative CNI Set-Aside': {
    advisory: 'The project must be located in a CNI.',
    lihtcCap: 1_500_000,
    nhtfCap: 0,
    homeCap: 0,
    cdbgCap: 0,
  },
  // C-2: Reprocessing pool
  'Reprocessing': {
    advisory: 'Reprocessing projects are previously approved LIHTC projects that did not close. Contact LHC for specific eligibility requirements.',
    lihtcCap: 1_500_000,
    nhtfCap: 0,
    homeCap: 0,
    cdbgCap: 0,
  },
}

const POOL_OPTIONS = Object.keys(POOLS)

const labelCls = 'block text-sm font-medium text-foreground mb-1'
const inputCls =
  'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const selectCls = inputCls
const sectionHeaderCls =
  'text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2'

function fmt(n: number) {
  return '$' + n.toLocaleString()
}

function parseDollar(s: string): number {
  const n = parseFloat(s.replace(/[$,]/g, ''))
  return isNaN(n) ? 0 : n
}

/** Returns an array of { type: 'error'|'warning'|'info', text } messages */
function getFundingAlerts(
  amount: number,
  cap: number,
  fundName: string,
  isChdo: boolean,
): { type: 'error' | 'warning' | 'info'; text: string }[] {
  const alerts: { type: 'error' | 'warning' | 'info'; text: string }[] = []

  if (cap === 0) {
    // Special HOME rule: CHDO can still access HOME even when pool cap = 0
    if (fundName === 'HOME' && isChdo) {
      alerts.push({
        type: 'info',
        text: 'HOME funds are available only for CHDO applicants in the selected pool.',
      })
    } else {
      alerts.push({
        type: 'warning',
        text: `No ${fundName} funds are available for award to projects in the pool you selected.`,
      })
    }
  }

  if (amount < 0) {
    alerts.push({ type: 'error', text: `Negative ${fundName} amount not allowed.` })
  } else if (cap > 0 && amount > cap) {
    alerts.push({
      type: 'error',
      text: `${fundName} request of ${fmt(amount)} exceeds the maximum allowable amount of ${fmt(cap)}.`,
    })
  }

  if (amount > 0) {
    alerts.push({
      type: 'info',
      text: `Note: Any project receiving ${fundName} funding will require Environmental Review, which can take up to 120 days to complete.`,
    })
  }

  return alerts
}

function AlertBadge({ alerts }: { alerts: { type: 'error' | 'warning' | 'info'; text: string }[] }) {
  if (alerts.length === 0) return null
  return (
    <div className="space-y-1 mt-2">
      {alerts.map((a, i) => {
        const cls =
          a.type === 'error'
            ? 'bg-rose-50 border border-rose-200 text-rose-700'
            : a.type === 'warning'
            ? 'bg-amber-50 border border-amber-200 text-amber-700'
            : 'bg-sky-50 border border-sky-200 text-sky-700'
        return (
          <p key={i} className={`text-xs rounded-lg px-3 py-2 ${cls}`}>
            {a.text}
          </p>
        )
      })}
    </div>
  )
}

export function Section13Form({ dealId, initial, isRural = false, isChdo = false }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save(fieldKey: string, value: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_13', fieldKey, value)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  function handleSelect(fieldKey: string, value: string) {
    setValues(v => ({ ...v, [fieldKey]: value }))
    save(fieldKey, value)
  }

  function handleBlur(fieldKey: string, value: string) {
    save(fieldKey, value)
  }

  // ── Derived state ────────────────────────────────────────────────────────────
  const selectedPool = values.funding_pool ?? ''
  const poolData = POOLS[selectedPool] ?? null

  // QNP/CHDO cap: $1M if rural, $1.5M otherwise
  const lihtcCap = !poolData
    ? null
    : selectedPool === 'Reprocessing'
      ? null // Excel Controls!C37 is blank — no per-project LIHTC cap for Reprocessing
      : selectedPool === 'Qualified Non-Profit/CHDO Set-Aside' && isRural
        ? 1_000_000
        : poolData.lihtcCap

  const nhtfAmount = parseDollar(values.nhtf_requested ?? '0')
  const homeAmount = parseDollar(values.home_requested ?? '0')
  const cdbgAmount = parseDollar(values.cdbg_requested ?? '0')

  const nhtfAlerts = poolData ? getFundingAlerts(nhtfAmount, poolData.nhtfCap, 'NHTF', isChdo) : []
  const homeAlerts = poolData ? getFundingAlerts(homeAmount, poolData.homeCap, 'HOME', isChdo) : []
  const cdbgAlerts = poolData ? getFundingAlerts(cdbgAmount, poolData.cdbgCap, 'CDBG-DR', isChdo) : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Selection of Funding Pool; Requests for Funding Other Than LIHTCs</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      {/* 13.01 — Funding Pool */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>13.01 — Funding Pool</p>
        <div>
          <label className={labelCls}>
            For which funding pool are you applying? <span className="text-rose-500">*</span>
          </label>
          <select
            className={selectCls}
            value={values.funding_pool ?? ''}
            onChange={e => handleSelect('funding_pool', e.target.value)}
          >
            <option value="">Select…</option>
            {POOL_OPTIONS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Advisory message */}
          {poolData && (
            <p className="mt-2 text-xs rounded-lg px-3 py-2 bg-sky-50 border border-sky-200 text-sky-700">
              {poolData.advisory}
            </p>
          )}

          {/* Per-project LIHTC cap */}
          {lihtcCap !== null && (
            <p className="mt-1 text-xs text-muted-foreground">
              Per-project LIHTC cap for this pool:{' '}
              <span className="font-semibold text-foreground">{fmt(lihtcCap)}</span>
              {selectedPool === 'Qualified Non-Profit/CHDO Set-Aside' && (
                <span className="ml-1 text-muted-foreground">
                  ({isRural ? '$1,000,000 — rural project' : '$1,500,000 — non-rural project'})
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* 13.02 — NHTF */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>13.02 — National Housing Trust Fund (NHTF)</p>
        <div>
          <label className={labelCls}>Amount of NHTF funds requested ($)</label>
          <input
            className={inputCls}
            value={values.nhtf_requested ?? ''}
            placeholder="0"
            onChange={e => setValues(v => ({ ...v, nhtf_requested: e.target.value }))}
            onBlur={e => handleBlur('nhtf_requested', e.target.value)}
          />
          {poolData && <AlertBadge alerts={nhtfAlerts} />}
        </div>
      </div>

      {/* 13.03 — HOME */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>13.03 — HOME Investment Partnership Program Funds (HOME)</p>
        <div>
          <label className={labelCls}>Amount of HOME funds requested ($)</label>
          <input
            className={inputCls}
            value={values.home_requested ?? ''}
            placeholder="0"
            onChange={e => setValues(v => ({ ...v, home_requested: e.target.value }))}
            onBlur={e => handleBlur('home_requested', e.target.value)}
          />
          {poolData && <AlertBadge alerts={homeAlerts} />}
        </div>
      </div>

      {/* 13.04 — CDBG-DR */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>13.04 — CDBG Disaster Recovery Funds (CDBG-DR)</p>
        <div>
          <label className={labelCls}>Amount of CDBG-DR funds requested ($)</label>
          <input
            className={inputCls}
            value={values.cdbg_requested ?? ''}
            placeholder="0"
            onChange={e => setValues(v => ({ ...v, cdbg_requested: e.target.value }))}
            onBlur={e => handleBlur('cdbg_requested', e.target.value)}
          />
          {poolData && <AlertBadge alerts={cdbgAlerts} />}
        </div>
      </div>
    </div>
  )
}
