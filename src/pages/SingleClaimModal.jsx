import React, { useState, useCallback } from 'react'
import { X, FileImage, FileText } from 'lucide-react'
import FileDropzone from '@/components/FileDropzone'
import SideBySideReview from '@/components/single-claim/SideBySideReview'
import { ocrImageFile, ocrCanvas, extractInvoiceData } from '@/lib/ocr'
import { renderPdfToCanvases } from '@/lib/pdfRenderer'
import { submitClaim } from '@/lib/mockApi'
import { useClaimsStore } from '@/store/claimsStore'
import { format } from 'date-fns'

const ACCEPT = [
  'image/jpeg',
  'image/png',
  'application/pdf',
]

/**
 * Full single-claim flow in a modal.
 * @param {{ onClose: () => void, claimId?: string }} props
 */
export default function SingleClaimModal({ onClose, existingClaim }) {
  const addSubmittedClaim = useClaimsStore((s) => s.addSubmittedClaim)
  const updateClaim = useClaimsStore((s) => s.updateClaim)

  const [step, setStep] = useState('upload') // 'upload' | 'review'
  const [fileUrl, setFileUrl] = useState(null)
  const [fileType, setFileType] = useState(null)
  const [ocrData, setOcrData] = useState(null)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [isOcrRunning, setIsOcrRunning] = useState(false)
  const [error, setError] = useState(null)

  const handleFile = useCallback(async (file) => {
    setError(null)
    setIsOcrRunning(true)
    setOcrProgress(5)

    try {
      const url = URL.createObjectURL(file)
      setFileUrl(url)

      let rawText = ''

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setFileType('pdf')
        const canvases = await renderPdfToCanvases(file, (page, total) => {
          setOcrProgress(Math.round((page / total) * 80))
        })
        // Use first page for single claim
        if (canvases.length > 0) {
          rawText = await ocrCanvas(canvases[0], (p) => setOcrProgress(80 + Math.round(p * 0.2)))
        }
      } else {
        setFileType('image')
        rawText = await ocrImageFile(file, (p) => setOcrProgress(p))
      }

      setOcrProgress(100)
      const extracted = extractInvoiceData(rawText)
      setOcrData(extracted)
      setStep('review')
    } catch (err) {
      console.error('OCR error:', err)
      setError('Failed to process the file. You can still enter claim details manually.')
      setStep('review')
      setOcrData({ invoiceNumber: '', amount: 0, date: '', provider: '', items: [] })
    } finally {
      setIsOcrRunning(false)
    }
  }, [])

  const handleSkipUpload = () => {
    setOcrData({ invoiceNumber: '', amount: 0, date: '', provider: '', items: [] })
    setStep('review')
  }

  const handleSubmit = async (data) => {
    const result = await submitClaim(data)

    const claim = {
      id: `claim-${Date.now()}`,
      invoiceNumber: data.invoiceNumber,
      amount: data.amount,
      items: data.items || [],
      facility: data.facility || '',
      paymentPoint: data.paymentPoint || '',
      date: data.date || format(new Date(), 'yyyy-MM-dd'),
      submittedAt: new Date().toISOString(),
      status: 'processing',
      claimId: result.claimId,
    }

    if (existingClaim?.id) {
      // Resubmission of a rejected/unsubmitted claim
      updateClaim(existingClaim.id, {
        status: 'processing',
        claimId: result.claimId,
        submittedAt: new Date().toISOString(),
        amount: data.amount,
        items: data.items,
        facility: data.facility,
        paymentPoint: data.paymentPoint,
        date: data.date,
        rejectionReason: null,
      })
    } else {
      addSubmittedClaim(claim)
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative z-10 bg-background rounded-2xl shadow-2xl w-full max-w-5xl mx-4 flex flex-col"
        style={{ maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-semibold">
              {existingClaim ? 'Resubmit Claim' : 'Submit Single Claim'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {step === 'upload' ? 'Upload an invoice to begin OCR extraction' : 'Review and correct extracted data before submitting'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' ? (
            <div className="max-w-lg mx-auto space-y-4">
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <FileDropzone
                accept={ACCEPT}
                onFile={handleFile}
                disabled={isOcrRunning}
                className="min-h-[200px]"
              />
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 border-t" />
              </div>
              <button
                onClick={handleSkipUpload}
                className="w-full text-sm text-center text-primary hover:underline"
              >
                Enter claim details manually
              </button>
            </div>
          ) : (
            <SideBySideReview
              ocrData={ocrData}
              fileUrl={fileUrl}
              fileType={fileType}
              ocrProgress={ocrProgress}
              isOcrRunning={isOcrRunning}
              onSubmit={handleSubmit}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  )
}
