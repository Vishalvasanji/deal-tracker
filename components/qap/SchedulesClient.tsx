'use client'

import { useState, useTransition } from 'react'
import { ChevronDown } from 'lucide-react'
import { upsertQapField } from '@/lib/qap-actions'
import {
  SCHEDULES_SECTION, MATCHING_LINES, CEO_BLOCKS, CEO_FIELDS, NP_DEV_COLUMNS,
  ENV_GROUPS, SITE_CONTROL_METHODS, type SchedulesPulled,
} from '@/lib/qap-schedules'

const inputCls = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'block text-xs font-medium text-muted-foreground'
const activeBtn = 'bg-primary text-primary-foreground rounded-lg px-3 py-1 text-sm font-medium'
const inactiveBtn = 'bg-muted text-muted-foreground rounded-lg px-3 py-1 text-sm'
const subHead = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2'

const num = (s: string | undefined) => {
  const v = parseFloat(String(s ?? '').replace(/[$,%\s]/g, ''))
  return isNaN(v) ? 0 : v
}
const money = (n: number) => '$' + Math.round(n).toLocaleString()

type Row = Record<string, string>

function Accordion({ title, subtitle, defaultOpen, children }: {
  title: string; subtitle?: string; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <div className="rounded-2xl border border-black/[0.06] overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-muted/20 hover:bg-muted/30 transition-colors">
        <div className="text-left">
          <p className="font-semibold text-sm">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 py-4 space-y-3 border-t border-border">{children}</div>}
    </div>
  )
}

interface Props {
  dealId: string
  pulled: SchedulesPulled
  npGate: boolean
  existingLhcGate: boolean
  initialVals: Record<string, string>
  initialLists: Record<string, Row[]>
}

export function SchedulesClient({ dealId, pulled, npGate, existingLhcGate, initialVals, initialLists }: Props) {
  const [vals, setVals] = useState<Record<string, string>>(initialVals)
  const [lists, setLists] = useState<Record<string, Row[]>>(initialLists)
  const [isPending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const set = (k: string, v: string) => setVals(prev => ({ ...prev, [k]: v }))
  const save = (k: string, v: string) => startTransition(async () => {
    await upsertQapField(dealId, SCHEDULES_SECTION, k, v)
    setSavedAt(new Date().toLocaleTimeString())
  })
  const listOf = (k: string) => lists[k] ?? []
  const updateListLocal = (k: string, arr: Row[]) => setLists(prev => ({ ...prev, [k]: arr }))
  const persistList = (k: string) => save(`${k}__json`, JSON.stringify(lists[k] ?? []))
  const setList = (k: string, arr: Row[]) => { updateListLocal(k, arr); save(`${k}__json`, JSON.stringify(arr)) }

  // ── field render helpers (called as functions so inputs keep focus) ──
  type FT = 'text' | 'textarea' | 'number' | 'date' | 'select'
  const field = (k: string, label: string, opts?: { type?: FT; options?: readonly string[]; rows?: number; suffix?: string; ph?: string }) => {
    const t = opts?.type ?? 'text'
    const v = vals[k] ?? ''
    if (t === 'textarea') return (
      <div className="space-y-1" key={k}>
        <label className={labelCls}>{label}</label>
        <textarea className={inputCls} rows={opts?.rows ?? 3} value={v}
          onChange={e => set(k, e.target.value)} onBlur={e => save(k, e.target.value)} />
      </div>
    )
    if (t === 'select') return (
      <div className="space-y-1" key={k}>
        <label className={labelCls}>{label}</label>
        <select className={inputCls} value={v} onChange={e => { set(k, e.target.value); save(k, e.target.value) }}>
          <option value="">Select…</option>
          {opts!.options!.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    )
    return (
      <div className="space-y-1" key={k}>
        <label className={labelCls}>{label}</label>
        <div className="flex items-center gap-2">
          <input className={inputCls} type={t === 'date' ? 'date' : 'text'}
            inputMode={t === 'number' ? 'decimal' : undefined}
            value={v} placeholder={opts?.ph}
            onChange={e => set(k, e.target.value)} onBlur={e => save(k, e.target.value)} />
          {opts?.suffix && <span className="text-xs text-muted-foreground shrink-0">{opts.suffix}</span>}
        </div>
      </div>
    )
  }

  const yesno = (k: string, label: string) => {
    const v = vals[k] ?? ''
    return (
      <div className="flex items-center justify-between gap-3" key={k}>
        <label className="text-sm flex-1">{label}</label>
        <div className="flex gap-2 shrink-0">
          {['Yes', 'No'].map(o => (
            <button key={o} type="button" onClick={() => { set(k, o); save(k, o) }}
              className={v === o ? activeBtn : inactiveBtn}>{o}</button>
          ))}
        </div>
      </div>
    )
  }

  const ro = (label: string, value: string, note?: string) => (
    <div className="space-y-1">
      <label className={labelCls}>{label}</label>
      <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm">{value || '—'}</div>
      {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
    </div>
  )

  const signatory = (label = 'By:') => ro(label, pulled.controllingPrincipalName, 'Controlling Principal (auto)')

  const listEditor = (k: string, columns: readonly { key: string; label: string }[], addLabel: string) => {
    const rows = listOf(k)
    return (
      <div className="space-y-2">
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-muted-foreground border-b border-border">
                {columns.map(c => <th key={c.key} className="text-left font-medium py-1 pr-2">{c.label}</th>)}
                <th className="w-12" />
              </tr></thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-border/40">
                    {columns.map(c => (
                      <td key={c.key} className="py-1 pr-2">
                        <input className="w-full rounded-lg border border-input bg-background px-2 py-1 text-sm"
                          value={row[c.key] ?? ''}
                          onChange={e => { const next = [...rows]; next[i] = { ...next[i], [c.key]: e.target.value }; updateListLocal(k, next) }}
                          onBlur={() => persistList(k)} />
                      </td>
                    ))}
                    <td className="py-1">
                      <button type="button" onClick={() => setList(k, rows.filter((_, j) => j !== i))}
                        className="text-rose-500 text-xs px-1">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button type="button" onClick={() => setList(k, [...rows, {}])}
          className="text-xs text-primary font-medium">+ {addLabel}</button>
      </div>
    )
  }

  const method = vals['site_control_method'] ?? ''
  const matchTotal = MATCHING_LINES.reduce((s, l) => s + num(vals[l.key]), 0)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      {/* ── App 1: Ownership Information ── */}
      <Accordion title="Ownership Information" subtitle="Appendix 1" defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ro('Taxpayer Entity Name', pulled.taxpayerName, 'from §11')}
          {ro('Taxpayer Is', pulled.taxpayerIs, 'from §11')}
          {ro('Taxpayer Federal Tax ID', pulled.taxpayerTaxId, 'from §11')}
          {ro('Controlling Principal Entity Name', pulled.controllingPrincipalName, 'from §11')}
          {ro('Controlling Principal Role', pulled.controllingPrincipalRole, 'from §11')}
          {ro('Contact Person', pulled.taxpayerContact, 'from §11')}
          {ro('Email', pulled.taxpayerEmail, 'from §11')}
          {ro('Telephone', pulled.taxpayerPhone, 'from §11')}
        </div>
        {field('cp_ownership_pct', 'Controlling Principal % Ownership', { type: 'number', suffix: '%' })}

        <p className={subHead}>I. Previous Participation</p>
        <p className="text-xs text-muted-foreground">List all projects in which the Controlling Principal has requested or received a LIHTC allocation, or sold an allocated project.</p>
        {listEditor('prev_participation', [
          { key: 'project', label: 'Project Name and Location' },
          { key: 'date', label: 'Application Date' },
          { key: 'status', label: 'Status' },
        ], 'Add project')}

        <p className={subHead}>II. Identities of Interest — Related Parties</p>
        <p className="text-xs text-muted-foreground">Related Board Members and Staff:</p>
        {listEditor('ii_board', [{ key: 'name', label: 'Name' }], 'Add board member / staff')}
        <p className="text-xs text-muted-foreground">Related Affiliates, Employees, Consultants, etc.:</p>
        {listEditor('ii_affiliates', [{ key: 'name', label: 'Name' }], 'Add affiliate')}
        {ro('Builder related to Taxpayer or Controlling Principal?', pulled.builderRelated, 'from §11')}

        <p className={subHead}>Certification</p>
        {ro('', `${pulled.taxpayerName || '—'} (Taxpayer)`)}
        {signatory()}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {field('app1_cert_date', 'Date of Taxpayer Certification', { type: 'date' })}
          {field('app1_notary_date', 'Date of Notarization', { type: 'date' })}
          {field('app1_notary_state', 'State for Notary Public')}
        </div>
      </Accordion>

      {/* ── App 2: Site Control ── */}
      <Accordion title="Site Control" subtitle="Site Control Worksheet">
        {field('site_control_method', 'Method of site control', { type: 'select', options: SITE_CONTROL_METHODS })}

        {method === 'Purchase' && (
          <div className="space-y-3">
            <p className={subHead}>Purchase Information</p>
            {field('purchase_total_price', 'Total Purchase Price', { type: 'number' })}
            {field('purchase_paid_to_date', 'Paid to Date', { type: 'number' })}
            {field('purchase_site_area', 'Site Area', { type: 'number', suffix: 'sq ft' })}
            {field('purchase_date', 'Date of Purchase', { type: 'date' })}
            {field('purchase_comment', 'Comment for purchase price', { type: 'textarea' })}
          </div>
        )}
        {method === 'Option to Purchase' && (
          <div className="space-y-3">
            <p className={subHead}>Option Information</p>
            {field('option_explanation', 'Explain the purchase option (when purchased, amount paid, expiration, extensions)', { type: 'textarea' })}
            {field('option_total_price', 'Total Purchase Price (including cost of the option)', { type: 'number' })}
            {field('option_paid_to_date', 'Paid to Date', { type: 'number' })}
            {field('option_site_area', 'Site Area', { type: 'number', suffix: 'sq ft' })}
            {field('option_comment', 'Additional comment', { type: 'textarea' })}
          </div>
        )}
        {method === 'Lease' && (
          <div className="space-y-3">
            <p className={subHead}>Lease Information</p>
            {field('lease_amount_paid', 'Amount Paid for Leasehold Interest', { type: 'number' })}
            {field('lease_annual_rent', 'Annual Ground Rent', { type: 'number' })}
            {field('lease_term', 'Lease Term', { type: 'number', suffix: 'years' })}
            {field('lease_remaining', 'Remaining Years', { type: 'number', suffix: 'years' })}
            {field('lease_site_area', 'Site Area', { type: 'number', suffix: 'sq ft' })}
            {field('lease_date', 'Date of Lease', { type: 'date' })}
            <p className="text-[11px] text-muted-foreground">Annual Ground Rent must also be included as a Miscellaneous Tax &amp; Insurance Expense on Revenues &amp; Expenses.</p>
            {field('lease_comment', 'Comment for ground lease', { type: 'textarea' })}
          </div>
        )}
        {method === 'No Site Control Yet' && (
          <div className="space-y-3">
            <p className={subHead}>Applicant does not yet have site control</p>
            {field('nosc_est_price', 'Estimated Purchase Price for the site', { type: 'number' })}
            <p className="text-xs text-muted-foreground">Current legal owner:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('nosc_owner_name', 'Name')}
              {field('nosc_owner_address', 'Address')}
              {field('nosc_owner_city', 'City')}
              {field('nosc_owner_state', 'State')}
              {field('nosc_owner_zip', 'Zip')}
              {field('nosc_owner_phone', 'Telephone')}
            </div>
          </div>
        )}
      </Accordion>

      {/* ── App 3: Ownership History ── */}
      <Accordion title="Ownership History of Existing Buildings" subtitle="Complete if requesting credits for the purchase price of an existing building">
        {field('app3_date_acquired', 'I. Date the building was acquired by purchase (per §179(d)(2) IRC)', { type: 'date' })}
        <p className={subHead}>II. Previous owners and purchase price</p>
        {listEditor('prev_owners', [
          { key: 'owner', label: 'Owner' },
          { key: 'price', label: 'Purchase Price' },
        ], 'Add previous owner')}
        {yesno('app3_related_267', 'III. Do any previous owners bear a relationship to the Taxpayer under §267(b) or §707(b)?')}
        {vals['app3_related_267'] === 'Yes' && field('app3_related_267_who', 'Specify which previous owners are related persons', { type: 'textarea' })}
        {yesno('app3_common_control', 'IV. Are any previous owners and the Taxpayer under common control?')}
        {vals['app3_common_control'] === 'Yes' && field('app3_common_control_who', 'Specify which previous owners are under common control', { type: 'textarea' })}
        {ro('V. Is this a Distressed Property (per the QAP)?', pulled.isDistressed, 'from §12 — if yes, attach written HUD/RD certification')}
      </Accordion>

      {/* ── App 11: Non-Profit Participation (gated) ── */}
      <Accordion title="Non-Profit Participation" subtitle="Appendix 11">
        {!npGate ? (
          <p className="text-sm text-muted-foreground rounded-lg bg-muted/40 px-3 py-2">
            Shown when Project Description §11 “Is the Taxpayer a qualified nonprofit organization?” = Yes.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('np_created_date', 'Date the non-profit was created', { type: 'date' })}
              {field('np_name', 'Name of the non-profit')}
            </div>
            {field('np_participation', "Describe the non-profit's participation in the development and operation of the project", { type: 'textarea' })}
            {field('np_board', 'List names and addresses of Board Members; identify all paid full-time staff', { type: 'textarea' })}
            {field('np_ownership_pct', "Non-profit's ownership interest in the project / partnership", { type: 'number', suffix: '%' })}
            {yesno('np_is_local', 'Is the Non-profit "Local"?')}
            {yesno('np_is_chdo', 'Is the Non-profit a CHDO?')}
            {yesno('np_is_501c', 'Is the Non-profit a 501(c)(3) or 501(c)(4) organization?')}
            {field('np_charitable', 'Describe the charitable activities of the Non-profit over the last three calendar years', { type: 'textarea' })}
            <p className="text-xs text-muted-foreground">Affordable housing developments owned by the Non-profit:</p>
            {listEditor('np_developments', NP_DEV_COLUMNS, 'Add development')}
          </div>
        )}
      </Accordion>

      {/* ── App 35: Matching ── */}
      <Accordion title="Matching Certification" subtitle="Appendix 35">
        <p className="text-xs text-muted-foreground">Amounts that have been or will be made available to complete the project as matching funds:</p>
        {MATCHING_LINES.map((l, i) => field(l.key, `${i + 1}. ${l.label}`, { type: 'number' }))}
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2">
          <span className="text-sm font-semibold">TOTAL</span>
          <span className="text-sm font-bold tabular-nums">{money(matchTotal)}</span>
        </div>
        {signatory()}
        {field('match_date', 'Date', { type: 'date' })}
      </Accordion>

      {/* ── App 36: Environmental ── */}
      <Accordion title="Environmental Restrictions Checklist" subtitle="Appendix 36">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ro('Project Name', pulled.projectName, 'from §12')}
          {ro('Street Address', pulled.streetAddress, 'from §12')}
          {ro('City', pulled.city, 'from §12')}
          {ro('Parish', pulled.parish, 'from §12')}
          {ro('Zip Code', pulled.zip, 'from §12')}
          {ro('Owner Name', pulled.taxpayerName, 'from §11')}
        </div>
        {field('env_project_desc', 'Project Description', { type: 'textarea' })}
        {ENV_GROUPS.map(g => (
          <div key={g.title} className="space-y-2">
            <p className={subHead}>{g.title}</p>
            {g.items.map(it => it.type === 'yesno'
              ? yesno(it.key, it.label)
              : field(it.key, it.label))}
          </div>
        ))}
        {field('env_summary', 'For YES responses, summarize the restrictions', { type: 'textarea', rows: 4 })}
        <p className={subHead}>Checklist completed by</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field('env_completed_name', 'Name')}
          {field('env_completed_title', 'Title')}
        </div>
      </Accordion>

      {/* ── LHC-2: CEO Notification ── */}
      <Accordion title="CEO Notification Letter Information" subtitle="LHC-2 · State and Local Government Notification">
        {ro('Project Name', pulled.projectName, 'from §12')}
        {CEO_BLOCKS.map(b => (
          <div key={b.key} className="space-y-3">
            <p className={subHead}>{b.title}</p>
            {field(`ceo_${b.key}_name`, b.ceoLabel)}
            {CEO_FIELDS.map(f => field(`ceo_${b.key}_${f.key}`, f.label))}
          </div>
        ))}
      </Accordion>

      {/* ── Existing LHC Property (gated) ── */}
      <Accordion title="Existing LHC Property" subtitle="Acquisition of an existing LHC-funded property">
        {!existingLhcGate ? (
          <p className="text-sm text-muted-foreground rounded-lg bg-muted/40 px-3 py-2">
            Shown when Project Description §12 “Is this an existing LIHTC property?” = Yes.
          </p>
        ) : (
          <div className="space-y-3">
            {ro('Submitted by', pulled.taxpayerName, 'from §11')}
            {field('elhc_narrative', 'Existing LHC Property Narrative', { type: 'textarea', rows: 4 })}
            <p className={subHead}>Existing LHC-funded property</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('elhc_project_name', 'Project Name')}
              {field('elhc_funding_type', 'Type of LHC Funding')}
              {field('elhc_total_funding', 'Total LHC Funding', { type: 'number' })}
              {field('elhc_total_units', 'Total Units', { type: 'number' })}
              {field('elhc_total_buildings', 'Total Buildings', { type: 'number' })}
              {field('elhc_year_funded', 'Year Funded', { type: 'number' })}
              {field('elhc_orig_contact', 'Original Contact Name')}
            </div>
          </div>
        )}
      </Accordion>
    </div>
  )
}
