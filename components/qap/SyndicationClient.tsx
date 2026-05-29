'use client'

import { useMemo, useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'
import {
  V_FIXED_ITEMS, VI_FIXED_ITEMS, type CostItem,
  type SyndEvent, type SyndLender, type SyndOther,
} from '@/lib/qap-syndication'
import { computeSyndication } from '@/lib/qap-syndication-calc'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'

interface Props {
  dealId: string
  taxCredits: number
  taxpayerName: string             // §11 taxpayer name (signs as Taxpayer)
  controllingPrincipalName: string // §11 controlling principal (first "By:")
  initialScalars: Record<string, string>
  initialEvents: SyndEvent[]
  initialLenders: SyndLender[]
  initialVOthers: SyndOther[]
  initialViOthers: SyndOther[]
}

const money = (v: number) => `$${Math.round(v).toLocaleString()}`
const pctStr = (v: number) => `${(v * 100).toFixed(1)}%`
const num = (s: string | undefined) => {
  const x = parseFloat(String(s ?? '').replace(/[$,%\s]/g, ''))
  return isNaN(x) ? 0 : x
}
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)

const inCls = 'w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const numCls = inCls + ' text-right tabular-nums'
const labelCls = 'block text-[11px] font-medium text-muted-foreground mb-1'
const subHdr = 'text-sm font-semibold'
const card = 'rounded-xl border border-border bg-card px-4 py-3 space-y-3'

export function SyndicationClient({ dealId, taxCredits, taxpayerName, controllingPrincipalName, initialScalars, initialEvents, initialLenders, initialVOthers, initialViOthers }: Props) {
  const [s, setS] = useState<Record<string, string>>(initialScalars)
  const [events, setEvents] = useState<SyndEvent[]>(initialEvents)
  const [lenders, setLenders] = useState<SyndLender[]>(initialLenders)
  const [vOthers, setVOthers] = useState<SyndOther[]>(initialVOthers)
  const [viOthers, setViOthers] = useState<SyndOther[]>(initialViOthers)
  const [isPending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<string | null>(null)

  function persist(key: string, value: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'syndication', key, value)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }
  function setScalar(key: string, v: string) { setS(prev => ({ ...prev, [key]: v })) }
  function saveScalar(key: string) { persist(key, s[key] ?? '') }
  function saveJson(key: string, arr: unknown) { persist(key, JSON.stringify(arr)) }

  // ── derived totals ──
  const vTotal = useMemo(() =>
    V_FIXED_ITEMS.reduce((t, it) => t + num(s[`${it.key}_amount`]), 0) + vOthers.reduce((t, o) => t + o.amount, 0),
    [s, vOthers])
  const viTotal = useMemo(() =>
    VI_FIXED_ITEMS.reduce((t, it) => t + num(s[`${it.key}_amount`]), 0) + viOthers.reduce((t, o) => t + o.amount, 0),
    [s, viOthers])

  const r = useMemo(() => computeSyndication({
    pctAcquired: num(s['pct_acquired']) / 100,
    proceeds: num(s['proceeds']),
    grossEquity: num(s['gross_equity']),
    taxCredits,
    isPublic: (s['is_public'] ?? 'Public') === 'Public',
    eventInstallments: events.map(e => e.installment),
    vCostTotal: vTotal,
    viCostTotal: viTotal,
    netCompounding: num(s['vii_compounding']),
    netDiscounting: num(s['vii_discounting']),
  }), [s, events, vTotal, viTotal, taxCredits])

  // ── add-as-needed helpers ──
  function addEvent() { setEvents(p => [...p, { id: uid(), event: '', date: '', percentage: 0, installment: 0 }]) }
  function updEvent(id: string, patch: Partial<SyndEvent>) { setEvents(p => p.map(e => e.id === id ? { ...e, ...patch } : e)) }
  function commitEvents(next: SyndEvent[]) { setEvents(next); saveJson('events__json', next) }

  function addLender() { setLenders(p => [...p, { id: uid(), name: '', address: '', phone: '', contact: '', loanAmount: 0, interestRate: 0, totalInterest: 0, security: '' }]) }
  function updLender(id: string, patch: Partial<SyndLender>) { setLenders(p => p.map(l => l.id === id ? { ...l, ...patch } : l)) }
  function commitLenders(next: SyndLender[]) { setLenders(next); saveJson('lenders__json', next) }

  function othersBlock(others: SyndOther[], setOthers: (v: SyndOther[]) => void, jsonKey: string) {
    const commit = (next: SyndOther[]) => { setOthers(next); saveJson(jsonKey, next) }
    return (
      <>
        {others.map(o => (
          <div key={o.id} className="grid grid-cols-[1fr_1fr_8rem_2rem] gap-2 items-center">
            <input className={inCls} placeholder="Other (identify)" value={o.item}
              onChange={e => setOthers(others.map(x => x.id === o.id ? { ...x, item: e.target.value } : x))}
              onBlur={() => commit(others)} />
            <input className={inCls} placeholder="Payee" value={o.payee}
              onChange={e => setOthers(others.map(x => x.id === o.id ? { ...x, payee: e.target.value } : x))}
              onBlur={() => commit(others)} />
            <input className={numCls} inputMode="decimal" placeholder="0" value={o.amount ? String(o.amount) : ''}
              onChange={e => setOthers(others.map(x => x.id === o.id ? { ...x, amount: num(e.target.value) } : x))}
              onBlur={() => commit(others)} />
            <button onClick={() => commit(others.filter(x => x.id !== o.id))} className="text-muted-foreground hover:text-rose-500 p-1" title="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        <button onClick={() => commit([...others, { id: uid(), item: '', payee: '', amount: 0 }])}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Plus className="h-4 w-4" /> Add other
        </button>
      </>
    )
  }

  function costTable(items: CostItem[], others: SyndOther[], setOthers: (v: SyndOther[]) => void, jsonKey: string, total: number) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_1fr_8rem_2rem] gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          <span>Item</span><span>Payee</span><span className="text-right">Amount</span><span />
        </div>
        {items.map(it => (
          <div key={it.key} className="grid grid-cols-[1fr_1fr_8rem_2rem] gap-2 items-center">
            <span className="text-sm">{it.label}</span>
            <input className={inCls} placeholder="Payee" value={s[`${it.key}_payee`] ?? ''}
              onChange={e => setScalar(`${it.key}_payee`, e.target.value)} onBlur={() => saveScalar(`${it.key}_payee`)} />
            <input className={numCls} inputMode="decimal" placeholder="0" value={s[`${it.key}_amount`] ?? ''}
              onChange={e => setScalar(`${it.key}_amount`, e.target.value)} onBlur={() => saveScalar(`${it.key}_amount`)} />
            <span />
          </div>
        ))}
        {othersBlock(others, setOthers, jsonKey)}
        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="text-sm font-semibold">Total</span>
          <span className="text-sm font-semibold tabular-nums">{money(total)}</span>
        </div>
      </div>
    )
  }

  function line(label: string, value: string, hint?: string) {
    return (
      <div className="flex items-center justify-between gap-3 py-1">
        <span className="text-sm text-muted-foreground">{label}{hint && <span className="ml-1 text-[11px]">{hint}</span>}</span>
        <span className="text-sm font-semibold tabular-nums">{value}</span>
      </div>
    )
  }
  function inputLine(label: string, key: string, suffix?: string) {
    return (
      <div className="flex items-center justify-between gap-3 py-1">
        <label className="text-sm text-muted-foreground">{label}</label>
        <div className="flex items-center gap-1">
          <input
            className="w-32 text-right rounded-lg border border-input bg-background px-2 py-1 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
            inputMode="decimal" placeholder="0" value={s[key] ?? ''}
            onChange={e => setScalar(key, e.target.value)} onBlur={() => saveScalar(key)}
          />
          <span className="text-xs text-muted-foreground w-3">{suffix ?? ''}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Syndication</h2>
        <span className="text-xs text-muted-foreground">{isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save on blur'}</span>
      </div>

      {/* ── I. Syndication Commitment ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className={subHdr}>I. Syndication Commitment</p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Type (cost cap):</span>
            <select className="rounded-lg border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              value={s['is_public'] ?? 'Public'} onChange={e => { setScalar('is_public', e.target.value); persist('is_public', e.target.value) }}>
              <option>Public</option>
              <option>Private</option>
            </select>
          </div>
        </div>
        <div className={card}>
          {/* A. Syndicator Information */}
          <div>
            <p className="text-sm font-medium">A. Syndicator Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
              {([['synd_name', 'Name'], ['synd_address', 'Address'], ['synd_address2', 'City, State & Zip'], ['synd_phone', 'Telephone'], ['synd_contact', 'Contact']] as const).map(([k, lbl]) => (
                <div key={k} className={k === 'synd_name' ? 'sm:col-span-2' : ''}>
                  <label className={labelCls}>{lbl}</label>
                  <input className={inCls} value={s[k] ?? ''} onChange={e => setScalar(k, e.target.value)} onBlur={() => saveScalar(k)} />
                </div>
              ))}
            </div>
          </div>

          {/* B–K, in order */}
          <div className="border-t border-border/60 pt-2 divide-y divide-border/30">
            {inputLine('B. % Interest acquired by Syndicator', 'pct_acquired', '%')}
            {line('C. % Interest retained by Sponsor / Developer', pctStr(r.pctRetained))}
            {line('D. Amount of Tax Credits in Commitment', money(taxCredits), '· from §14')}
            {inputLine('E. Syndication Proceeds Generated', 'proceeds')}
            {inputLine('F. Gross Equity invested by Syndicator', 'gross_equity')}
            {line('G. Syndication Costs Paid by Syndicator (E − F)', money(r.costsBySyndicator))}
            {line('H. Syndication Costs Paid by Developer (Part VI)', money(r.costsByDeveloper))}
            {line('I. Total Syndication Costs (G + H)', money(r.totalCosts))}
            {line('J. Total Syndication Costs as % of Proceeds (I / E)', pctStr(r.costsPctOfProceeds))}
            {line('K. Total Syndication Proceeds Available (F − H)', money(r.proceedsAvailable))}
          </div>
          {r.costPctExceeds && (
            <p className="text-xs text-amber-600 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Costs are {pctStr(r.costsPctOfProceeds)} of proceeds — above the {pctStr(r.costCap)} cap for a {(s['is_public'] ?? 'Public').toLowerCase()} syndication.
            </p>
          )}
        </div>
      </div>

      {/* ── II. Disbursement of Gross Equity by Installment ── */}
      <div className="space-y-3">
        <p className={subHdr}>II. Disbursement of Gross Equity by Installment</p>
        <div className={card}>
          <div className="grid grid-cols-[1fr_8rem_6rem_8rem_2rem] gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            <span>Event</span><span>Date</span><span className="text-right">%</span><span className="text-right">Installment</span><span />
          </div>
          {events.map(ev => (
            <div key={ev.id} className="grid grid-cols-[1fr_8rem_6rem_8rem_2rem] gap-2 items-center">
              <input className={inCls} placeholder="Event" value={ev.event} onChange={e => updEvent(ev.id, { event: e.target.value })} onBlur={() => commitEvents(events)} />
              <input className={inCls} placeholder="Date" value={ev.date} onChange={e => updEvent(ev.id, { date: e.target.value })} onBlur={() => commitEvents(events)} />
              <input className={numCls} inputMode="decimal" placeholder="0" value={ev.percentage ? String(ev.percentage) : ''} onChange={e => updEvent(ev.id, { percentage: num(e.target.value) })} onBlur={() => commitEvents(events)} />
              <input className={numCls} inputMode="decimal" placeholder="0" value={ev.installment ? String(ev.installment) : ''} onChange={e => updEvent(ev.id, { installment: num(e.target.value) })} onBlur={() => commitEvents(events)} />
              <button onClick={() => commitEvents(events.filter(x => x.id !== ev.id))} className="text-muted-foreground hover:text-rose-500 p-1" title="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <button onClick={addEvent} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"><Plus className="h-4 w-4" /> Add event</button>
          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="text-sm font-semibold">Total Installments</span>
            <span className="text-sm font-semibold tabular-nums">{money(r.eventsTotal)}</span>
          </div>
          {!r.eventsMatch && (
            <p className="text-xs text-amber-600 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> Installments ({money(r.eventsTotal)}) do not agree with Gross Equity ({money(num(s['gross_equity']))}) — Line F.
            </p>
          )}
        </div>
      </div>

      {/* ── III. Sources of Interim Financing From Commercial Lenders ── */}
      <div className="space-y-3">
        <p className={subHdr}>III. Sources of Interim Financing From Commercial Lenders</p>
        {lenders.map((l, idx) => (
          <div key={l.id} className={card}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Commercial Lender #{idx + 1}</span>
              <button onClick={() => commitLenders(lenders.filter(x => x.id !== l.id))} className="text-muted-foreground hover:text-rose-500 p-1" title="Remove lender"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="sm:col-span-2"><label className={labelCls}>Name</label><input className={inCls} value={l.name} onChange={e => updLender(l.id, { name: e.target.value })} onBlur={() => commitLenders(lenders)} /></div>
              <div className="sm:col-span-2"><label className={labelCls}>Address</label><input className={inCls} value={l.address} onChange={e => updLender(l.id, { address: e.target.value })} onBlur={() => commitLenders(lenders)} /></div>
              <div><label className={labelCls}>Telephone</label><input className={inCls} value={l.phone} onChange={e => updLender(l.id, { phone: e.target.value })} onBlur={() => commitLenders(lenders)} /></div>
              <div><label className={labelCls}>Contact</label><input className={inCls} value={l.contact} onChange={e => updLender(l.id, { contact: e.target.value })} onBlur={() => commitLenders(lenders)} /></div>
              <div><label className={labelCls}>Loan Amount</label><input className={numCls} inputMode="decimal" placeholder="0" value={l.loanAmount ? String(l.loanAmount) : ''} onChange={e => updLender(l.id, { loanAmount: num(e.target.value) })} onBlur={() => commitLenders(lenders)} /></div>
              <div><label className={labelCls}>Interest Rate (% per annum)</label><input className={numCls} inputMode="decimal" placeholder="0" value={l.interestRate ? String(l.interestRate) : ''} onChange={e => updLender(l.id, { interestRate: num(e.target.value) })} onBlur={() => commitLenders(lenders)} /></div>
              <div><label className={labelCls}>Estimated Total Interest</label><input className={numCls} inputMode="decimal" placeholder="0" value={l.totalInterest ? String(l.totalInterest) : ''} onChange={e => updLender(l.id, { totalInterest: num(e.target.value) })} onBlur={() => commitLenders(lenders)} /></div>
              <div><label className={labelCls}>Security for Interim Funds</label><input className={inCls} value={l.security} onChange={e => updLender(l.id, { security: e.target.value })} onBlur={() => commitLenders(lenders)} /></div>
            </div>
          </div>
        ))}
        <button onClick={addLender} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"><Plus className="h-4 w-4" /> Add commercial lender</button>
      </div>

      {/* ── V. Interim Funds from Syndicator and Syndication Costs ── */}
      <div className="space-y-3">
        <p className={subHdr}>V. Interim Funds from Syndicator &amp; Syndication Costs</p>
        <div className={card}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">A. Syndicator Interim Financing</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div><label className={labelCls}>Interim financing amount</label><input className={numCls} inputMode="decimal" placeholder="0" value={s['v_interim_amount'] ?? ''} onChange={e => setScalar('v_interim_amount', e.target.value)} onBlur={() => saveScalar('v_interim_amount')} /></div>
            <div><label className={labelCls}>Interest rate (% per annum)</label><input className={numCls} inputMode="decimal" placeholder="0" value={s['v_interim_rate'] ?? ''} onChange={e => setScalar('v_interim_rate', e.target.value)} onBlur={() => saveScalar('v_interim_rate')} /></div>
            <div><label className={labelCls}>Interest expected to receive</label><input className={numCls} inputMode="decimal" placeholder="0" value={s['v_interim_interest'] ?? ''} onChange={e => setScalar('v_interim_interest', e.target.value)} onBlur={() => saveScalar('v_interim_interest')} /></div>
          </div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-1">B. Syndication Expenses Paid by Syndicator</p>
          {costTable(V_FIXED_ITEMS, vOthers, setVOthers, 'v_others__json', vTotal)}
          {!r.vMatchesG && (
            <p className="text-xs text-amber-600 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> Total ({money(vTotal)}) doesn&apos;t match Section I, Line G ({money(r.costsBySyndicator)}).
            </p>
          )}
        </div>
      </div>

      {/* ── VI. Syndication Costs Paid by Taxpayer or Developer ── */}
      <div className="space-y-3">
        <p className={subHdr}>VI. Syndication Costs Paid by Taxpayer / Developer</p>
        <div className={card}>
          {costTable(VI_FIXED_ITEMS, viOthers, setViOthers, 'vi_others__json', viTotal)}
          <p className="text-[11px] text-muted-foreground">This total flows to Section I, Line H.</p>
        </div>
      </div>

      {/* ── VII. Net Equity ── */}
      <div className="space-y-3">
        <p className={subHdr}>VII. Net Equity</p>
        <div className={card}>
          <div className="divide-y divide-border/30">
            <div className="flex items-center justify-between gap-3 py-1">
              <label className="text-sm text-muted-foreground">Estimated Placed in Service Date</label>
              <div className="flex items-center gap-1">
                <input
                  className="w-32 rounded-lg border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="MM/DD/YYYY" value={s['vii_pis_date'] ?? ''}
                  onChange={e => setScalar('vii_pis_date', e.target.value)} onBlur={() => saveScalar('vii_pis_date')}
                />
                <span className="text-xs text-muted-foreground w-3" />
              </div>
            </div>
            {inputLine('(i) Compounding installments before PIS', 'vii_compounding')}
            {inputLine('(ii) Discounting installments after PIS', 'vii_discounting')}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="text-sm font-semibold">(iii) Net Equity at Placed in Service [(i) + (ii)]</span>
            <span className="text-base font-bold tabular-nums">{money(r.netEquity)}</span>
          </div>
        </div>
      </div>

      {/* ── Certification (signature blocks) ── */}
      <div className="space-y-3">
        <p className={subHdr}>Certification</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Taxpayer */}
          <div className={card}>
            <p className="text-sm font-medium">{taxpayerName || '—'} <span className="font-normal text-muted-foreground">(Taxpayer)</span></p>
            <p className="text-sm">
              <span className="text-muted-foreground">By: </span>
              {controllingPrincipalName
                ? <span className="font-medium">{controllingPrincipalName}</span>
                : <span className="italic text-muted-foreground">Controlling Principal — add in §11</span>}
            </p>
            <p className="text-[11px] text-muted-foreground">Controlling Principal · from §11</p>
          </div>
          {/* Syndicator */}
          <div className={card}>
            <p className="text-sm font-medium">{s['synd_name'] || '—'} <span className="font-normal text-muted-foreground">(Syndicator)</span></p>
            <p className="text-sm">
              <span className="text-muted-foreground">By: </span>
              {s['synd_contact']
                ? <span className="font-medium">{s['synd_contact']}</span>
                : <span className="italic text-muted-foreground">Syndicator Contact — see Part I.A</span>}
            </p>
            <p className="text-[11px] text-muted-foreground">Syndicator Contact · from Part I.A</p>
          </div>
        </div>
      </div>
    </div>
  )
}
