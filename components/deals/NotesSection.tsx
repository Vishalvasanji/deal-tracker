'use client'

import { useState, useTransition, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { appendNote } from '@/lib/actions'
import { parseNotes, type NoteEntry } from '@/lib/notes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'

interface Props { dealId: string; initialNotes: string }

function NoteCard({ entry }: { entry: NoteEntry }) {
  const [expanded, setExpanded] = useState(true)
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2 bg-muted/30 hover:bg-muted/60 transition-colors text-left"
      >
        <div>
          <span className="text-xs text-muted-foreground font-mono mr-2">{entry.date}</span>
          {entry.title && <span className="text-sm font-medium">{entry.title}</span>}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {expanded && entry.body && (
        <div className="px-4 py-3 prose prose-sm max-w-none">
          <ReactMarkdown>{entry.body}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}

export function NotesSection({ dealId, initialNotes }: Props) {
  const [notes, setNotes] = useState(initialNotes)
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
      // optimistic: re-fetch or reload; for simplicity, reload page data
      // The server action calls revalidatePath, Next.js will refresh server data
      formRef.current?.reset()
      setShowForm(false)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Notes & Thoughts
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add note
        </Button>
      </div>

      {showForm && (
        <form ref={formRef} onSubmit={handleAdd} className="border rounded-lg p-4 space-y-3 bg-muted/20">
          <div className="space-y-1.5">
            <Label htmlFor="note-title" className="text-xs">Title (optional)</Label>
            <Input id="note-title" name="title" placeholder="Site visit, LOI accepted, …" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-body" className="text-xs">Body *</Label>
            <Textarea
              id="note-body"
              name="body"
              placeholder="Markdown supported…"
              rows={4}
              required
              className="text-sm font-mono"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? 'Saving…' : 'Append note'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-4">No notes yet.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <NoteCard key={i} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
