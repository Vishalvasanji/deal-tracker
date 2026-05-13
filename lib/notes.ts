export interface NoteEntry {
  date: string
  title: string | null
  body: string
  raw: string
}

export function parseNotes(raw: string): NoteEntry[] {
  if (!raw?.trim()) return []
  const blocks = raw.split(/\n---\n|\n---$/)
  const entries: NoteEntry[] = []
  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) continue
    const lines = trimmed.split('\n')
    const header = lines[0]
    const match = header.match(/^###\s+(\d{4}-\d{2}-\d{2})(?:\s+—\s+(.+))?/)
    if (!match) continue
    const body = lines.slice(1).join('\n').trim()
    entries.push({
      date: match[1],
      title: match[2]?.trim() ?? null,
      body,
      raw: trimmed,
    })
  }
  return entries.reverse()
}

export function formatCurrency(val: number | null | undefined): string {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
}
