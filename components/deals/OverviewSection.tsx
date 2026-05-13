'use client'

import { useState, useTransition } from 'react'
import ReactMarkdown from 'react-markdown'
import { updateDeal } from '@/lib/actions'
import { Eye, Pencil, Check } from 'lucide-react'

interface Props { dealId: string; initial: string }

export function OverviewSection({ dealId, initial }: Props) {
  const [value, setValue] = useState(initial)
  const [preview, setPreview] = useState(!!initial)
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      await updateDeal(dealId, { overview: value })
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Overview</h2>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
          {dirty && (
            <button
              onClick={save}
              disabled={isPending}
              className="h-7 px-3 rounded-lg bg-primary text-white text-xs font-medium transition-all hover:bg-primary/90 active:scale-[0.97] disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
          )}
          <button
            onClick={() => setPreview((p) => !p)}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-black/[0.04] transition-all"
          >
            {preview
              ? <><Pencil className="h-3 w-3" /> Edit</>
              : <><Eye className="h-3 w-3" /> Preview</>}
          </button>
        </div>
      </div>

      {preview ? (
        <div
          className="min-h-[100px] cursor-pointer rounded-xl bg-muted/30 p-4 prose prose-sm max-w-none prose-p:text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground hover:bg-muted/50 transition-colors"
          onClick={() => setPreview(false)}
        >
          {value
            ? <ReactMarkdown>{value}</ReactMarkdown>
            : <p className="text-muted-foreground italic text-sm">No overview yet. Click to add one.</p>
          }
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => { setValue(e.target.value); setDirty(true) }}
          rows={8}
          placeholder="Describe the deal strategy, site details, key terms…"
          autoFocus
          className="w-full px-4 py-3 rounded-xl bg-muted/40 border border-border text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none"
        />
      )}
    </div>
  )
}
