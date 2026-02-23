import React, { useState, useCallback } from 'react'
import { X } from 'lucide-react'
import FileDropzone from '@/components/FileDropzone'
import ColumnMappingModal from '@/components/bulk-claim/ColumnMappingModal'
import StagingTable from '@/components/bulk-claim/StagingTable'
import { parseSpreadsheet, autoDetectMapping, applyMapping } from '@/lib/spreadsheetParser'
import { ocrCanvas, extractInvoiceData } from '@/lib/ocr'
import { renderPdfToCanvases } from '@/lib/pdfRenderer'
import { batchSubmit } from '@/lib/mockApi'
import { useClaimsStore } from '@/store/claimsStore'
import { format } from 'date-fns'
import { Progress } from '@/components/ui/progress'

const ACCEPT = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/pdf',
]

/**
 * Full bulk-claim flow in a modal.
 * @param {{ onClose: () => void }} props
 */
export default function BulkClaimModal({ onClose }) {
  const addSubmittedClaims = useClaimsStore((s) => s.addSubmittedClaims)

  const [step, setStep] = useState('upload') // 'upload' | 'mapping' | 'staging'
  const [parsedData, setParsedData] = useState(null)
  const [mappingState, setMappingState] = useState(null)
  const [stagingRows, setStagingRows] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [error, setError] = useState(null)

  const handleFile = useCallback(async (file) => {
    setError(null)
    setIsProcessing(true)
    setProgress(10)
    setProgressLabel('Reading file…')

    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        // PDF → multi-page OCR → staging rows
        setProgressLabel('Rendering PDF pages…')
        const canvases = await renderPdfToCanvases(file, (page, total) => {
          setProgress(10 + Math.round((page / total) * 50))
          setProgressLabel(`Rendering page ${page}/${total}…`)
        })

        const rows = []
        for (let i = 0; i < canvases.length; i++) {
          setProgressLabel(`OCR page ${i + 1}/${canvases.length}…`)
          setProgress(60 + Math.round((i / canvases.length) * 35))
          const text = await ocrCanvas(canvases[i])
          const extracted = extractInvoiceData(text)
          rows.push({
            id: crypto.randomUUID(),
            invoiceNumber: extracted.invoiceNumber || `PAGE-${i + 1}`,
            amount: extracted.amount || 0,
            items: extracted.items || [],
            provider: extracted.provider || '',
            date: extracted.date || '',
            patient: '',
            status: 'pending',
            verifyResult: null,
          })
        }
        setProgress(100)
        setStagingRows(rows)
        setStep('staging')
      } else {
        // CSV / XLSX
        setProgressLabel('Parsing spreadsheet…')
        const parsed = await parseSpreadsheet(file)
        setProgress(60)

        const autoMapping = autoDetectMapping(parsed.headers)
        const hasRequired = autoMapping.invoiceCol && autoMapping.amountCol

        if (hasRequired) {
          const rows = applyMapping(parsed.rows, autoMapping)
          setProgress(100)
          setStagingRows(rows)
          setStep('staging')
        } else {
          // Need manual mapping
          setParsedData(parsed)
          setMappingState(autoMapping)
          setProgress(100)
          setStep('mapping')
        }
      }
    } catch (err) {
      console.error('Bulk parse error:', err)
      setError('Failed to process the file. Please check the format and try again.')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleMappingConfirm = (mapping) => {
    const rows = applyMapping(parsedData.rows, mapping)
    setStagingRows(rows)
    setStep('staging')
  }

  const handleSubmitValid = async (validRows) => {
    const results = await batchSubmit(validRows)

    const claims = validRows.map((row, i) => ({
      id: `claim-${Date.now()}-${i}`,
      invoiceNumber: row.invoiceNumber,
      amount: row.amount,
      items: row.items || [],
      facility: row.facility || '',
      paymentPoint: row.paymentPoint || '',
      date: row.date || format(new Date(), 'yyyy-MM-dd'),
      submittedAt: new Date().toISOString(),
      status: 'processing',
      claimId: results[i]?.claimId,
    }))

    addSubmittedClaims(claims)

    // Remove submitted rows from staging
    const submittedIds = new Set(validRows.map((r) => r.id))
    const remaining = stagingRows.filter((r) => !submittedIds.has(r.id))
    setStagingRows(remaining)

    if (remaining.length === 0) {
      onClose()
    }
  }

  const stepLabels = { upload: 'Upload', mapping: 'Map Columns', staging: 'Review & Submit' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div
        className="relative z-10 bg-background rounded-2xl shadow-2xl w-full max-w-6xl mx-4 flex flex-col"
        style={{ maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Submit Bulk Claims</h2>
            <div className="flex items-center gap-2 mt-1">
              {Object.entries(stepLabels).map(([key, label], i, arr) => (
                <React.Fragment key={key}>
                  <span className={`text-xs ${step === key ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {label}
                  </span>
                  {i < arr.length - 1 && <span className="text-muted-foreground text-xs">›</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isProcessing && (
            <div className="mb-4 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progressLabel}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {step === 'upload' && (
            <div className="max-w-lg mx-auto">
              <FileDropzone
                accept={ACCEPT}
                onFile={handleFile}
                disabled={isProcessing}
                className="min-h-[220px]"
              />
              <p className="text-xs text-muted-foreground text-center mt-3">
                Accepts CSV, XLSX, or multi-page PDF. CSV/XLSX columns are auto-detected.
              </p>
            </div>
          )}

          {step === 'mapping' && parsedData && (
            <ColumnMappingModal
              headers={parsedData.headers}
              sampleRows={parsedData.sampleRows}
              initialMapping={mappingState}
              onConfirm={handleMappingConfirm}
              onCancel={() => setStep('upload')}
            />
          )}

          {step === 'staging' && (
            <StagingTable
              rows={stagingRows}
              onRowsChange={setStagingRows}
              onSubmitValid={handleSubmitValid}
            />
          )}
        </div>
      </div>
    </div>
  )
}
