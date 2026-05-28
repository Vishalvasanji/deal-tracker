'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'
import { MANUAL_TEAM_ROLES, TEAM_FIELDS, teamKey } from '@/lib/qap-dev-team'
import { Building2, Mail, Phone, User } from 'lucide-react'

export interface PulledMember {
  role: string
  name: string
  line2?: string
  line3?: string
  contact?: string
  phone?: string
  email?: string
}

interface Props {
  dealId: string
  pulled: PulledMember[]
  manualInitial: Record<string, string>
  prefills: Record<string, string>
}

const labelCls = 'block text-[11px] font-medium text-muted-foreground mb-1'
const inputCls = 'w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const subHdr = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide'

export function DevelopmentTeamClient({ dealId, pulled, manualInitial, prefills }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const role of MANUAL_TEAM_ROLES) {
      for (const f of TEAM_FIELDS) {
        const k = teamKey(role.key, f)
        init[k] = manualInitial[k] ?? (f === 'name' ? (prefills[role.key] ?? '') : '')
      }
    }
    return init
  })
  const [isPending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<string | null>(null)

  function setField(k: string, v: string) {
    setValues(prev => ({ ...prev, [k]: v }))
  }
  function save(k: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'dev_team', k, values[k] ?? '')
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Development Team</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save on blur'}
        </span>
      </div>

      {/* ── Auto-pulled from Project Description §11 (read-only) ── */}
      <div className="space-y-2">
        <p className={subHdr}>From Project Description</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pulled.map(m => (
            <div key={m.role} className="rounded-xl border border-border bg-muted/20 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{m.role}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">§11</span>
              </div>
              {m.name ? (
                <div className="mt-1 space-y-0.5">
                  <p className="text-sm">{m.name}</p>
                  {m.line2 && <p className="text-xs text-muted-foreground">{m.line2}</p>}
                  {m.line3 && <p className="text-xs text-muted-foreground">{m.line3}</p>}
                  {(m.contact || m.phone || m.email) && (
                    <div className="pt-1.5 space-y-0.5 text-xs text-muted-foreground">
                      {m.contact && <p className="flex items-center gap-1.5"><User className="h-3 w-3" /> {m.contact}</p>}
                      {m.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {m.phone}</p>}
                      {m.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {m.email}</p>}
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground italic">Not yet entered — add in Project Description §11.</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Manual roster (stored in 'dev_team') ── */}
      <div className="space-y-2">
        <p className={subHdr}>Project Team</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MANUAL_TEAM_ROLES.map(role => {
            const prefilled = !manualInitial[teamKey(role.key, 'name')] && !!prefills[role.key]
            return (
              <div key={role.key} className="rounded-xl border border-border bg-card px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-semibold">{role.label}</span>
                  {role.note && <span className="text-[11px] text-muted-foreground">({role.note})</span>}
                </div>
                <div>
                  <label className={labelCls}>
                    Firm / Name
                    {prefilled && <span className="ml-1.5 text-emerald-600">· prefilled from deal</span>}
                  </label>
                  <input
                    className={inputCls}
                    value={values[teamKey(role.key, 'name')] ?? ''}
                    onChange={e => setField(teamKey(role.key, 'name'), e.target.value)}
                    onBlur={() => save(teamKey(role.key, 'name'))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Contact</label>
                    <input
                      className={inputCls}
                      value={values[teamKey(role.key, 'contact')] ?? ''}
                      onChange={e => setField(teamKey(role.key, 'contact'), e.target.value)}
                      onBlur={() => save(teamKey(role.key, 'contact'))}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input
                      className={inputCls}
                      value={values[teamKey(role.key, 'phone')] ?? ''}
                      onChange={e => setField(teamKey(role.key, 'phone'), e.target.value)}
                      onBlur={() => save(teamKey(role.key, 'phone'))}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    type="email"
                    className={inputCls}
                    value={values[teamKey(role.key, 'email')] ?? ''}
                    onChange={e => setField(teamKey(role.key, 'email'), e.target.value)}
                    onBlur={() => save(teamKey(role.key, 'email'))}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
