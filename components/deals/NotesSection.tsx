'use client'

import { useState, useTransition, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { appendNote } from '@/lib/actions'
import { parseNotes, type NoteEntry } from '@/lib/notes'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'

interface Props { dealId: string; initialNotes: string }

function NoteCard({ entry }: { entry: NoteEntry }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-xl border border-black/[0.06] overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-black/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">{entry.date}</span>
          {entry.title && <span className="text-sm font-semibold text-foreground">{entry.title}</span>}
        </div>
        {open
          ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      </button>
      {open && entry.body && (
        <div className="px-4 pb-4 pt-1 prose prose-sm max-w-none prose-p:text-muted-foreground prose-p:leading-relaxed prose-headings:text-foreground prose-strong:text-foreground prose-li:text-muted-foreground border-t border-black/[0.04]">
          <ReactMarkdown>{entry.body}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}

export function NotesSection({ dealId, initialNotes }: Props) {
  const [notes] = useState(initialNotes)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const entries = parseNotes(notes)

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body = (fd.get('body') as string)?.trim()
    if (!body) return
    startTransition(async () => {
      await appendNote(dealId, fd)
      formRef.current?.reset()
      setShowForm(false)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Notes & Thoughts</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-black/[0.04] transition-all border border-black/[0.06]"
        >
          <Plus className="h-3 w-3" />
          Add note
        </button>
      </div>

      {showForm && (
        <form ref={formRef} onSubmit={handleAdd} className="rounded-xl border border-primary/20 bg-primary/[0.02] p-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Title (optional)</label>
            <input
              name="title"
              placeholder="Site visit, LOI accepted, call recap…"
              className="w-full h-9 px-3 rounded-xl bg-white border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Body *</label>
            <textarea
              name="body"
              placeholder="Markdown supported…"
              rows={4}
              required
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-border text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="h-8 px-4 rounded-xl bg-primary text-white text-xs font-medium transition-all hover:bg-primary/90 active:scale-[0.97] disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Append note'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="h-8 px-3 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-black/[0.04] transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-6 text-center">No notes yet.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => <NoteCard key={i} entry={entry} />)}
        </div>
      )}
    </div>
  )
}
