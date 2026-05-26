'use client'

import { useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'

interface Props {
  dealId: string
  initial: Record<string, string>
}

const labelCls = 'block text-sm font-medium text-foreground mb-1'
const inputCls =
  'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const selectCls = inputCls
const sectionHeaderCls =
  'text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2'

function YesNoToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const base = 'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors'
  const active = 'bg-primary text-primary-foreground'
  const inactive = 'bg-muted text-muted-foreground hover:bg-muted/80'
  return (
    <div className="flex gap-2 mt-1">
      <button type="button" className={`${base} ${value === 'Yes' ? active : inactive}`} onClick={() => onChange('Yes')}>Yes</button>
      <button type="button" className={`${base} ${value === 'No' ? active : inactive}`} onClick={() => onChange('No')}>No</button>
    </div>
  )
}

export function Section11Form({ dealId, initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save(fieldKey: string, value: string) {
    startTransition(async () => {
      await upsertQapField(dealId, 'section_11', fieldKey, value)
      setSavedAt(new Date().toLocaleTimeString())
    })
  }

  function handleToggle(fieldKey: string, value: string) {
    setValues(v => ({ ...v, [fieldKey]: value }))
    save(fieldKey, value)
  }

  function handleSelect(fieldKey: string, value: string) {
    setValues(v => ({ ...v, [fieldKey]: value }))
    save(fieldKey, value)
  }

  function handleBlur(fieldKey: string, value: string) {
    save(fieldKey, value)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Characteristics of The Applicant</h2>
        <span className="text-xs text-muted-foreground">
          {isPending ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Changes save automatically'}
        </span>
      </div>

      {/* 11.01 */}
      <div className="space-y-4">
        <p className={sectionHeaderCls}>11.01 — Taxpayer</p>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className={labelCls}>Taxpayer Name <span className="text-rose-500">*</span></label>
            <input className={inputCls} value={values.taxpayer_name ?? ''} placeholder="e.g. Chicory Court Mickens, LP"
              onChange={e => setValues(v => ({ ...v, taxpayer_name: e.target.value }))}
              onBlur={e => handleBlur('taxpayer_name', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Taxpayer Address</label>
            <input className={inputCls} value={values.taxpayer_address ?? ''}
              onChange={e => setValues(v => ({ ...v, taxpayer_address: e.target.value }))}
              onBlur={e => handleBlur('taxpayer_address', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>City, State & Zip</label>
            <input className={inputCls} value={values.taxpayer_city_state_zip ?? ''}
              onChange={e => setValues(v => ({ ...v, taxpayer_city_state_zip: e.target.value }))}
              onBlur={e => handleBlur('taxpayer_city_state_zip', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Taxpayer is <span className="text-rose-500">*</span></label>
            <select className={selectCls} value={values.taxpayer_is ?? ''}
              onChange={e => handleSelect('taxpayer_is', e.target.value)}>
              <option value="">Select…</option>
              <option>Controlled by For-Profit</option>
              <option>Controlled by Non-Profit</option>
              <option>Missing</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Taxpayer is a <span className="text-rose-500">*</span></label>
            <select className={selectCls} value={values.taxpayer_is_a ?? ''}
              onChange={e => handleSelect('taxpayer_is_a', e.target.value)}>
              <option value="">Select…</option>
              <option>Limited Liability Company</option>
              <option>Limited Partnership</option>
              <option>{'\'S\' Corporation'}</option>
              <option>Other</option>
              <option>Missing</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Federal Tax ID / SSN</label>
            <input className={inputCls} value={values.taxpayer_tax_id ?? ''}
              onChange={e => setValues(v => ({ ...v, taxpayer_tax_id: e.target.value }))}
              onBlur={e => handleBlur('taxpayer_tax_id', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Controlling Principal Name</label>
            <input className={inputCls} value={values.controlling_principal_name ?? ''}
              onChange={e => setValues(v => ({ ...v, controlling_principal_name: e.target.value }))}
              onBlur={e => handleBlur('controlling_principal_name', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Controlling Principal is the</label>
            <select className={selectCls} value={values.controlling_principal_is ?? ''}
              onChange={e => handleSelect('controlling_principal_is', e.target.value)}>
              <option value="">Select…</option>
              <option>Managing Member</option>
              <option>Manager</option>
              <option>General Partner</option>
              <option>Managing General Partner</option>
              <option>President</option>
              <option>Other</option>
              <option>Missing</option>
            </select>
          </div>
        </div>

        <p className={sectionHeaderCls + ' pt-0'}>Taxpayer Contact *</p>
        <p className="text-xs text-muted-foreground -mt-2">
          This person will be LHC's single point of contact during underwriting.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Contact Name</label>
            <input className={inputCls} value={values.taxpayer_contact ?? ''}
              onChange={e => setValues(v => ({ ...v, taxpayer_contact: e.target.value }))}
              onBlur={e => handleBlur('taxpayer_contact', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input className={inputCls} value={values.taxpayer_phone ?? ''}
              onChange={e => setValues(v => ({ ...v, taxpayer_phone: e.target.value }))}
              onBlur={e => handleBlur('taxpayer_phone', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Email</label>
            <input className={inputCls} type="email" value={values.taxpayer_email ?? ''}
              onChange={e => setValues(v => ({ ...v, taxpayer_email: e.target.value }))}
              onBlur={e => handleBlur('taxpayer_email', e.target.value)} />
          </div>
        </div>
      </div>

      {/* 11.02 */}
      <div className="space-y-4">
        <p className={sectionHeaderCls}>11.02 — Developer / Sponsor</p>
        <div>
          <label className={labelCls}>Developer / Sponsor <span className="text-rose-500">*</span></label>
          <input className={inputCls} value={values.developer_name ?? ''}
            onChange={e => setValues(v => ({ ...v, developer_name: e.target.value }))}
            onBlur={e => handleBlur('developer_name', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Address</label>
          <input className={inputCls} value={values.developer_address ?? ''}
            onChange={e => setValues(v => ({ ...v, developer_address: e.target.value }))}
            onBlur={e => handleBlur('developer_address', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>City, State & Zip</label>
          <input className={inputCls} value={values.developer_city_state_zip ?? ''}
            onChange={e => setValues(v => ({ ...v, developer_city_state_zip: e.target.value }))}
            onBlur={e => handleBlur('developer_city_state_zip', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Does the Developer / Sponsor meet the requirements of QAP V.C.1? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.developer_meets_vc1 ?? ''} onChange={v => handleToggle('developer_meets_vc1', v)} />
        </div>
        <div>
          <label className={labelCls}>Is the Developer a New Developer as defined in the QAP? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.developer_is_new ?? ''} onChange={v => handleToggle('developer_is_new', v)} />
          {values.developer_is_new === 'Yes' && (
            <div className="mt-2">
              <label className={labelCls}>Comment</label>
              <textarea className={inputCls + ' min-h-[80px] resize-y'}
                value={values.developer_new_comment ?? ''}
                onChange={e => setValues(v => ({ ...v, developer_new_comment: e.target.value }))}
                onBlur={e => handleBlur('developer_new_comment', e.target.value)} />
            </div>
          )}
        </div>
        <div>
          <label className={labelCls}>Are you requesting credits for any other projects in this funding cycle? <span className="text-rose-500">*</span></label>
          <p className="text-xs text-muted-foreground mb-1">No single developer will be awarded credits in excess of $3,000,000</p>
          <YesNoToggle value={values.other_credits_requested ?? ''} onChange={v => handleToggle('other_credits_requested', v)} />
          {values.other_credits_requested === 'Yes' && (
            <div className="mt-2">
              <label className={labelCls}>Comment</label>
              <textarea className={inputCls + ' min-h-[80px] resize-y'}
                value={values.other_credits_comment ?? ''}
                onChange={e => setValues(v => ({ ...v, other_credits_comment: e.target.value }))}
                onBlur={e => handleBlur('other_credits_comment', e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {/* 11.03 */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>11.03 — Identity of Interest</p>
        <div>
          <label className={labelCls}>Is there an Identity of Interest between the Developer and the Builder? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.ioi_dev_builder ?? ''} onChange={v => handleToggle('ioi_dev_builder', v)} />
        </div>
      </div>

      {/* 11.04 */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>11.04 — Good Standing</p>
        <div>
          <label className={labelCls}>Is any member of the proposed project team "not in good standing" with the LHC, as defined in the QAP? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.not_in_good_standing ?? ''} onChange={v => handleToggle('not_in_good_standing', v)} />
          {values.not_in_good_standing === 'Yes' && (
            <div className="mt-2">
              <label className={labelCls}>Comment</label>
              <textarea className={inputCls + ' min-h-[80px] resize-y'}
                value={values.not_in_good_standing_comment ?? ''}
                onChange={e => setValues(v => ({ ...v, not_in_good_standing_comment: e.target.value }))}
                onBlur={e => handleBlur('not_in_good_standing_comment', e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {/* 11.05 */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>11.05 — Qualified Non-Profit</p>
        <div>
          <label className={labelCls}>Does the Applicant evidence material participation of a Qualified Non-Profit Organization (as defined in the Glossary)? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.qualified_nonprofit ?? ''} onChange={v => handleToggle('qualified_nonprofit', v)} />
          {values.qualified_nonprofit === 'Yes' && (
            <div className="mt-2">
              <label className={labelCls}>Comment</label>
              <textarea className={inputCls + ' min-h-[80px] resize-y'}
                value={values.qualified_nonprofit_details ?? ''}
                onChange={e => setValues(v => ({ ...v, qualified_nonprofit_details: e.target.value }))}
                onBlur={e => handleBlur('qualified_nonprofit_details', e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {/* 11.06 */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>11.06 — CHDO</p>
        <div>
          <label className={labelCls}>Is the Applicant a CHDO (Community Housing Development Organization) that (a) meets the definition in the Glossary and (b) is certified as a CHDO by the LHC? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.is_chdo ?? ''} onChange={v => handleToggle('is_chdo', v)} />
          {values.is_chdo === 'Yes' && (
            <div className="mt-2">
              <label className={labelCls}>Comment</label>
              <textarea className={inputCls + ' min-h-[80px] resize-y'}
                value={values.chdo_details ?? ''}
                onChange={e => setValues(v => ({ ...v, chdo_details: e.target.value }))}
                onBlur={e => handleBlur('chdo_details', e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {/* 11.07 */}
      <div className="space-y-4">
        <p className={sectionHeaderCls}>11.07 — Management Agent</p>
        <div>
          <label className={labelCls}>Management Agent <span className="text-rose-500">*</span></label>
          <input className={inputCls} value={values.mgmt_agent_name ?? ''}
            onChange={e => setValues(v => ({ ...v, mgmt_agent_name: e.target.value }))}
            onBlur={e => handleBlur('mgmt_agent_name', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Street Address</label>
          <input className={inputCls} value={values.mgmt_agent_address ?? ''}
            onChange={e => setValues(v => ({ ...v, mgmt_agent_address: e.target.value }))}
            onBlur={e => handleBlur('mgmt_agent_address', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>City, State, Zip</label>
          <input className={inputCls} value={values.mgmt_agent_city_state_zip ?? ''}
            onChange={e => setValues(v => ({ ...v, mgmt_agent_city_state_zip: e.target.value }))}
            onBlur={e => handleBlur('mgmt_agent_city_state_zip', e.target.value)} />
        </div>
      </div>

      {/* 11.08 */}
      <div className="space-y-3">
        <p className={sectionHeaderCls}>11.08 — Management Agent Identity of Interest</p>
        <div>
          <label className={labelCls}>Does the management agent have an identity of interest with the applicant or with the developer? <span className="text-rose-500">*</span></label>
          <YesNoToggle value={values.mgmt_agent_ioi ?? ''} onChange={v => handleToggle('mgmt_agent_ioi', v)} />
        </div>
      </div>
    </div>
  )
}
