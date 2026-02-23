import React, { useState, useEffect, useRef } from 'react'
import { CheckCircle, AlertCircle, AlertTriangle, Copy, RefreshCw, Send, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import InvoiceItemsEditor from './InvoiceItemsEditor'
import { verifyInvoice } from '@/lib/mockApi'
import { getDemoOcrData } from '@/lib/ocr'
import { JUMUIA_FACILITIES, PAYMENT_POINTS } from '@/lib/seedData'

const STATUS_CONFIG = {
  valid: {
    icon: CheckCircle,
    color: 'success',
    label: 'Verified',
    bg: 'bg-green-50 border-green-200',
  },
  amount_mismatch: {
    icon: AlertTriangle,
    color: 'warning',
    label: 'Amount Mismatch',
    bg: 'bg-yellow-50 border-yellow-200',
  },
  missing_items: {
    icon: AlertCircle,
    color: 'error',
    label: 'Missing Items',
    bg: 'bg-red-50 border-red-200',
  },
  unknown: {
    icon: AlertCircle,
    color: 'error',
    label: 'Unknown Invoice',
    bg: 'bg-red-50 border-red-200',
  },
  duplicate: {
    icon: Copy,
    color: 'orange',
    label: 'Duplicate',
    bg: 'bg-orange-50 border-orange-200',
  },
}

/**
 * @param {{
 *   ocrData: object,
 *   fileUrl: string | null,
 *   fileType: 'image' | 'pdf',
 *   ocrProgress: number,
 *   isOcrRunning: boolean,
 *   onSubmit: (data: object) => void,
 *   onClose: () => void,
 * }} props
 */
export default function SideBySideReview({
  ocrData: initialData,
  fileUrl,
  fileType,
  ocrProgress,
  isOcrRunning,
  onSubmit,
  onClose,
}) {
  const [data, setData] = useState(initialData || {
    invoiceNumber: '',
    amount: 0,
    date: '',
    provider: '',
    items: [],
  })
  const [verifyStatus, setVerifyStatus] = useState(null) // null | { status, message, expectedAmount }
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canvasRef = useRef(null)

  // When initial data arrives from OCR, update form
  useEffect(() => {
    if (initialData) setData(initialData)
  }, [initialData])

  // Recalculate total amount from items
  const itemsTotal = data.items?.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) || 0

  const handleItemsChange = (items) => {
    const total = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
    setData((d) => ({ ...d, items, amount: total }))
    setVerifyStatus(null) // reset verification when data changes
  }

  const handleFieldChange = (field, value) => {
    setData((d) => ({ ...d, [field]: value }))
    setVerifyStatus(null)
  }

  const handleVerify = async () => {
    setIsVerifying(true)
    try {
      const result = await verifyInvoice(data.invoiceNumber, data.amount, data.items)
      setVerifyStatus(result)
      if (result.status === 'amount_mismatch' && result.expectedAmount) {
        // Hint the expected amount
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onSubmit({ ...data })
    } finally {
      setIsSubmitting(false)
    }
  }

  const loadDemo = () => {
    const demo = getDemoOcrData()
    setData(demo)
    setVerifyStatus(null)
  }

  const statusCfg = verifyStatus ? STATUS_CONFIG[verifyStatus.status] : null
  const canSubmit = verifyStatus?.status === 'valid'

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* OCR Progress */}
      {isOcrRunning && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Running OCR…</span>
            <span>{ocrProgress}%</span>
          </div>
          <Progress value={ocrProgress} />
        </div>
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        {/* LEFT: Document Preview */}
        <div className="w-1/2 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Document Preview
            </span>
            <Button size="sm" variant="outline" onClick={loadDemo} type="button">
              <Wand2 className="h-3.5 w-3.5 mr-1" /> Load Demo
            </Button>
          </div>
          <div className="flex-1 min-h-[300px] rounded-lg border bg-muted/20 overflow-auto flex items-center justify-center">
            {fileUrl && fileType === 'image' ? (
              <img
                src={fileUrl}
                alt="Invoice"
                className="max-w-full max-h-full object-contain rounded"
              />
            ) : fileUrl && fileType === 'pdf' ? (
              <canvas ref={canvasRef} className="max-w-full" />
            ) : (
              <div className="text-center text-muted-foreground p-8">
                <p className="text-sm">No document loaded</p>
                <p className="text-xs mt-1">Drop a file in the previous step, or use "Load Demo"</p>
              </div>
            )}
          </div>
          {data.rawText && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Raw OCR text
              </summary>
              <pre className="mt-1 p-2 bg-muted rounded text-xs whitespace-pre-wrap max-h-32 overflow-auto">
                {data.rawText}
              </pre>
            </details>
          )}
        </div>

        {/* RIGHT: Editable Fields */}
        <div className="w-1/2 flex flex-col gap-3 overflow-y-auto pr-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Claim Details
          </span>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="invoiceNumber" className="text-xs">Invoice Number *</Label>
              <Input
                id="invoiceNumber"
                value={data.invoiceNumber || ''}
                onChange={(e) => handleFieldChange('invoiceNumber', e.target.value.toUpperCase())}
                placeholder="INV-2024-001"
                className={data.isDemo && 'border-orange-400'}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="date" className="text-xs">Invoice Date</Label>
              <Input
                id="date"
                type="date"
                value={data.date || ''}
                onChange={(e) => handleFieldChange('date', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="facility" className="text-xs">Facility</Label>
              <Select
                id="facility"
                value={data.facility || ''}
                onChange={(e) => handleFieldChange('facility', e.target.value)}
              >
                <option value="">Select facility…</option>
                {JUMUIA_FACILITIES.map((f) => <option key={f} value={f}>{f}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="paymentPoint" className="text-xs">Payment Point</Label>
              <Select
                id="paymentPoint"
                value={data.paymentPoint || ''}
                onChange={(e) => handleFieldChange('paymentPoint', e.target.value)}
              >
                <option value="">Select payment point…</option>
                {PAYMENT_POINTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="amount" className="text-xs">Total Amount (KES) *</Label>
            {itemsTotal > 0 ? (
              // Locked to item sum — edit via line items below
              <div className={`flex items-center justify-between h-9 rounded-md border px-3 text-sm bg-muted/40 ${data.isDemo ? 'border-orange-400' : 'border-input'}`}>
                <span className="font-semibold">
                  KES {itemsTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-muted-foreground bg-background border rounded-full px-2 py-0.5 ml-2 shrink-0">
                  computed from items ↓
                </span>
              </div>
            ) : (
              <Input
                id="amount"
                type="number"
                value={data.amount || ''}
                onChange={(e) => handleFieldChange('amount', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={data.isDemo ? 'border-orange-400' : ''}
              />
            )}
            {data.isDemo && (
              <p className="text-xs text-orange-600">
                Demo: OCR misread 3,200 as 320 — correct item amounts below (X-Rav → X-Ray: 1200, total → 3200)
              </p>
            )}
          </div>

          {/* Line Items */}
          <div className="border rounded-lg p-3 space-y-2">
            <InvoiceItemsEditor
              items={data.items || []}
              onChange={handleItemsChange}
            />
          </div>

          {/* Verification Status */}
          {verifyStatus && statusCfg && (
            <Alert className={statusCfg.bg}>
              <statusCfg.icon className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                <Badge variant={statusCfg.color}>{statusCfg.label}</Badge>
              </AlertTitle>
              <AlertDescription className="text-xs mt-1">
                {verifyStatus.message}
                {verifyStatus.status === 'amount_mismatch' && verifyStatus.expectedAmount && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-2 h-6 text-xs"
                    onClick={() => handleFieldChange('amount', verifyStatus.expectedAmount)}
                    type="button"
                  >
                    Use expected: KES {verifyStatus.expectedAmount.toLocaleString()}
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t shrink-0">
        <Button variant="outline" onClick={onClose} type="button">
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleVerify}
            disabled={isVerifying || isOcrRunning || !data.invoiceNumber}
            type="button"
          >
            {isVerifying ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Verifying…</>
            ) : (
              'Verify Invoice'
            )}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            type="button"
          >
            {isSubmitting ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Submitting…</>
            ) : (
              <><Send className="h-4 w-4 mr-2" /> Submit Claim</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
