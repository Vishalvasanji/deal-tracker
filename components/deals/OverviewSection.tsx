'use client'

import { useState, useTransition } from 'react'
import ReactMarkdown from 'react-markdown'
import { updateDeal } from '@/lib/actions'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Save, Eye, Edit2 } from 'lucide-react'

interface Props { dealId: string; initial: string }

export function OverviewSection({ dealId, initial }: Props) {
  const [value, setValue] = useState(initial)
  const [preview, setPreview] = useState(!!initial)
  const [dirty, setDirty] = useState(false)
  const [isPending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      await updateDeal(dealId, { overview: value })
      setDirty(false)
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Overview</h2>
        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPreview((p) => !p)}
            className="h-7 text-xs"
          >
            {preview ? <Edit2 className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
            {preview ? 'Edit' : 'Preview'}
          </Button>
          {dirty && (
            <Button size="sm" className="h-7 text-xs" onClick={save} disabled={isPending}>
              <Save className="h-3.5 w-3.5 mr-1" />
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      {preview ? (
        <div
          className="prose prose-sm max-w-none border rounded-lg p-4 bg-card min-h-[100px] cursor-pointer"
          onClick={() => setPreview(false)}
        >
          {value ? (
            <ReactMarkdown>{value}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">No overview yet. Click to add one.</p>
          )}
        </div>
      ) : (
        <Textarea
          value={value}
          onChange={(e) => { setValue(e.target.value); setDirty(true) }}
          rows={8}
          placeholder="Describe the deal strategy, site details, key terms…"
          className="font-mono text-sm"
          autoFocus
        />
      )}
    </div>
  )
}
