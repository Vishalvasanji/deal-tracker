'use client'

import { useRef, useState, useTransition } from 'react'
import { upsertQapField } from '@/lib/qap-actions'
import { parseModelTdc, type TdcCandidate } from '@/lib/parse-model-tdc'
import { Upload, FileSpreadsheet, X, Check, Loader2 } from 'lucide-react'

interface Props {
  dealId: string
  initialTdc: number | null
  initialFilename: string
  initialSourceRef: string
  initialSources: number | null
  initialUploadedAt: string
  /** notify parent so the allocation tracker updates live */
  onChange: (tdc: number | null, sources: number | null) => void
}

const fmt = (v: number | null) => (v == null ? '—' : `$${v.toLocaleString()}`)

export function ModelUpload({
  dealId, initialTdc, initialFilename, initialSourceRef, initialSources, initialUploadedAt, onChange,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // persisted display state
  const [tdc, setTdc] = useState<number | null>(initialTdc)
  const [sources, setSources] = useState<number | null>(initialSources)
  const [filename, setFilename] = useState(initialFilename)
  const [sourceRef, setSourceRef] = useState(initialSourceRef)
  const [uploadedAt, setUploadedAt] = useState(initialUploadedAt)

  // in-progress parse state
  const [pendingFile, setPendingFile] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<TdcCandidate[]>([])
  const [selected, setSelected] = useState<TdcCandidate | null>(null)
  const [selectedSources, setSelectedSources] = useState<TdcCandidate | null>(null)
  const [manual, setManual] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setParsing(true)
    setPendingFile(file.name)
    try {
      const buf = await file.arrayBuffer()
      const parsed = await parseModelTdc(buf)
      setCandidates(parsed.tdcCandidates)
      setSelected(parsed.bestTdc)
      setSelectedSources(parsed.bestSources)
      setManual(parsed.bestTdc ? String(parsed.bestTdc.value) : '')
      if (!parsed.bestTdc) {
        setError('No total-development-cost figure detected automatically. Pick a sheet value or enter it manually below.')
      }
    } catch {
      setError('Could not read that file. Make sure it is an .xlsx or .xlsm workbook.')
    } finally {
      setParsing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function persist(newTdc: number | null, newSources: number | null, fname: string, ref: string) {
    const now = new Date().toLocaleString()
    setTdc(newTdc); setSources(newSources); setFilename(fname); setSourceRef(ref); setUploadedAt(now)
    onChange(newTdc, newSources)
    startTransition(async () => {
      await upsertQapField(dealId, 'development_costs', 'model_tdc', newTdc == null ? '' : String(newTdc))
      await upsertQapField(dealId, 'development_costs', 'model_total_sources', newSources == null ? '' : String(newSources))
      await upsertQapField(dealId, 'development_costs', 'model_filename', fname)
      await upsertQapField(dealId, 'development_costs', 'model_source_ref', ref)
      await upsertQapField(dealId, 'development_costs', 'model_uploaded_at', now)
    })
    // reset parse UI
    setPendingFile(null); setCandidates([]); setSelected(null); setSelectedSources(null)
  }

  function confirmParse() {
    const manualNum = parseInt(manual.replace(/[$,\s]/g, ''), 10)
    const chosenTdc = !isNaN(manualNum) && manualNum > 0
      ? manualNum
      : selected?.value ?? null
    if (chosenTdc == null) { setError('Enter a target TDC or pick a detected value.'); return }
    const ref = (!isNaN(manualNum) && manualNum > 0 && selected && manualNum !== selected.value)
      ? 'manual entry'
      : selected?.cell ?? 'manual entry'
    persist(chosenTdc, selectedSources?.value ?? null, pendingFile ?? filename, ref)
  }

  function clearAll() {
    persist(null, null, '', '')
    setManual('')
  }

  const cardCls = 'rounded-xl border border-border bg-card px-4 py-3'
  const lblCls = 'text-xs text-muted-foreground'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Underwriting Model</p>
        {isPending && <span className="text-xs text-muted-foreground">Saving…</span>}
      </div>

      {/* Saved state */}
      {tdc != null && candidates.length === 0 && !pendingFile && (
        <div className={cardCls}>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-sm font-medium">{filename || 'Manual entry'}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{fmt(tdc)}</p>
              <p className="text-xs text-muted-foreground">
                Target Total Development Cost
                {sourceRef && sourceRef !== 'manual entry' ? ` · from ${sourceRef}` : sourceRef === 'manual entry' ? ' · entered manually' : ''}
              </p>
              {sources != null && (
                <p className="text-xs text-muted-foreground">Total Sources detected: {fmt(sources)}</p>
              )}
              {uploadedAt && <p className="text-xs text-muted-foreground/70">Updated {uploadedAt}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <button onClick={() => fileRef.current?.click()}
                className="text-xs rounded-lg border border-border px-2.5 py-1 hover:bg-muted transition-colors">
                Re-upload
              </button>
              <button onClick={clearAll}
                className="text-xs rounded-lg border border-border px-2.5 py-1 text-rose-600 hover:bg-rose-50 transition-colors">
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state — prompt to upload */}
      {tdc == null && candidates.length === 0 && !pendingFile && (
        <div className={cardCls + ' border-dashed text-center py-6 space-y-3'}>
          <Upload className="h-6 w-6 text-muted-foreground mx-auto" />
          <div>
            <button onClick={() => fileRef.current?.click()}
              className="text-sm font-medium text-primary hover:underline">
              Upload your underwriting model
            </button>
            <p className="text-xs text-muted-foreground mt-1">
              Any .xlsx / .xlsm — we'll detect the Total Development Cost. Parsed in your browser; the file is not stored.
            </p>
          </div>
          <div className="flex items-center gap-2 max-w-xs mx-auto pt-1">
            <span className={lblCls}>or enter manually:</span>
            <input
              type="number"
              placeholder="$ TDC"
              value={manual}
              onChange={e => setManual(e.target.value)}
              className="flex-1 rounded-lg border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button onClick={confirmParse}
              className="text-xs rounded-lg bg-primary text-primary-foreground px-2.5 py-1.5 font-medium">
              Set
            </button>
          </div>
        </div>
      )}

      {/* Parsing */}
      {parsing && (
        <div className={cardCls + ' flex items-center gap-2'}>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Reading {pendingFile}…</span>
        </div>
      )}

      {/* Confirm/override after parse */}
      {!parsing && pendingFile && (candidates.length > 0 || error) && (
        <div className={cardCls + ' space-y-3'}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" /> {pendingFile}
            </span>
            <button onClick={() => { setPendingFile(null); setCandidates([]); setError(null) }}
              className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>

          {candidates.length > 0 && (
            <div className="space-y-1.5">
              <p className={lblCls}>Detected Total Development Cost candidates:</p>
              {candidates.slice(0, 6).map((c, i) => (
                <label key={i} className="flex items-center gap-2 text-sm cursor-pointer rounded-lg px-2 py-1 hover:bg-muted">
                  <input type="radio" name="tdc-cand" checked={selected?.cell === c.cell}
                    onChange={() => { setSelected(c); setManual(String(c.value)) }} />
                  <span className="font-medium tabular-nums">{fmt(c.value)}</span>
                  <span className="text-xs text-muted-foreground">{c.cell} · &ldquo;{c.label}&rdquo;</span>
                </label>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className={lblCls}>Use value:</span>
            <input
              type="number"
              value={manual}
              onChange={e => setManual(e.target.value)}
              className="flex-1 rounded-lg border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button onClick={confirmParse}
              className="text-xs rounded-lg bg-primary text-primary-foreground px-3 py-1.5 font-medium flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> Confirm
            </button>
          </div>

          {selectedSources && (
            <p className="text-xs text-muted-foreground">
              Total Sources detected: {fmt(selectedSources.value)} ({selectedSources.cell}) — used for the Sources &amp; Uses balance check.
            </p>
          )}
          {error && <p className="text-xs text-amber-600">{error}</p>}
        </div>
      )}

      <input ref={fileRef} type="file" accept=".xlsx,.xlsm,.xls" className="hidden" onChange={handleFile} />
    </div>
  )
}
