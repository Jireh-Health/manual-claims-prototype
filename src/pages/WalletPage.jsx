import React, { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { AlertCircle, XCircle, CheckCircle2, ChevronRight } from 'lucide-react'
import { useClaimsStore } from '@/store/claimsStore'
import { useDisbursementsStore } from '@/store/disbursementsStore'
import { disburseFunds, MPESA_PAYBILL } from '@/lib/mockApi'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

// ─── Batch Detail Drawer ──────────────────────────────────────────────────────

function BatchDetailDrawer({ disbursement, claims, onClose }) {
  if (!disbursement) return null

  const batchClaims = claims.filter((c) => disbursement.claimIds.includes(c.id))

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 bg-background w-full max-w-md h-full shadow-2xl flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div>
            <h3 className="font-semibold">Disbursement Batch</h3>
            <p className="text-sm text-muted-foreground font-mono">{disbursement.referenceNumber}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Channel',     disbursement.channelLabel],
              ['Reference #', disbursement.referenceNumber],
              ['Date',        disbursement.timestamp ? format(parseISO(disbursement.timestamp), 'PPp') : '—'],
              ['Total',       `KES ${Number(disbursement.totalAmount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`],
              ['Initiator',   disbursement.initiator],
              ['Status',      <Badge key="st" variant={disbursement.status === 'completed' ? 'success' : 'error'}>{disbursement.status}</Badge>],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Invoices ({disbursement.claimIds.length})</h4>
            <div className="space-y-1">
              {disbursement.claimIds.map((id) => {
                const claim = batchClaims.find((c) => c.id === id)
                return (
                  <div key={id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <div>
                      <p className="font-mono text-xs font-medium">{claim?.invoiceNumber || id}</p>
                      <p className="text-xs text-muted-foreground">{claim?.facility || '—'}</p>
                    </div>
                    <span className="font-medium">
                      {claim ? `KES ${Number(claim.amount).toLocaleString()}` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Disburse Confirm Modal ───────────────────────────────────────────────────

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'DISB-'
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

function DisburseConfirmModal({ invoiceCount, totalAmount, onConfirm, onCancel }) {
  const [code] = useState(generateCode)
  const [input, setInput] = useState('')
  const matches = input === code

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div
        className="relative z-10 bg-background rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="text-base font-semibold">Confirm Disbursement</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {invoiceCount} invoice{invoiceCount !== 1 ? 's' : ''} · KES {totalAmount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Via {MPESA_PAYBILL.label} · {MPESA_PAYBILL.paybill} / {MPESA_PAYBILL.account}
          </p>
        </div>

        <div className="rounded-lg bg-muted/60 border px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Type this code to confirm</p>
          <p className="text-2xl font-bold font-mono tracking-widest">{code}</p>
        </div>

        <div className="space-y-1.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="Enter code…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="flex-1" disabled={!matches} onClick={onConfirm}>
            Confirm Disburse
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Wallet Page ─────────────────────────────────────────────────────────────

export default function WalletPage() {
  const claims        = useClaimsStore((s) => s.claims)
  const updateClaim   = useClaimsStore((s) => s.updateClaim)
  const { disbursements, addDisbursementRecord } = useDisbursementsStore()

  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showConfirm, setShowConfirm] = useState(false)
  const [isDisbursing, setIsDisbursing] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [selectedDisbursement, setSelectedDisbursement] = useState(null)

  // Claims eligible to show in wallet
  const walletClaims = useMemo(
    () => claims.filter((c) => c.status === 'settled' || c.status === 'disbursement_failed'),
    [claims]
  )

  const walletTotal = walletClaims.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0)

  const selectedTotal = useMemo(
    () => walletClaims
      .filter((c) => selectedIds.has(c.id))
      .reduce((s, c) => s + (parseFloat(c.amount) || 0), 0),
    [walletClaims, selectedIds]
  )

  const allSelected = walletClaims.length > 0 && selectedIds.size === walletClaims.length

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(walletClaims.map((c) => c.id)))
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openConfirm = () => {
    if (selectedIds.size === 0 || isDisbursing) return
    setErrorMessage(null)
    setShowConfirm(true)
  }

  const handleConfirmDisburse = async () => {
    setShowConfirm(false)
    const ids = [...selectedIds]
    const amountSnapshot = selectedTotal
    ids.forEach((id) => updateClaim(id, { status: 'disbursing', disbursementFailureReason: null }))
    setSelectedIds(new Set())
    setIsDisbursing(true)

    const result = await disburseFunds(ids)

    if (result.success) {
      ids.forEach((id) => updateClaim(id, { status: 'disbursed' }))
      addDisbursementRecord({
        id: `disb-${Date.now()}`,
        timestamp: result.timestamp,
        channelLabel: MPESA_PAYBILL.label,
        referenceNumber: result.referenceNumber,
        totalAmount: amountSnapshot,
        claimIds: ids,
        status: 'completed',
        initiator: 'Admin',
      })
    } else {
      ids.forEach((id) => updateClaim(id, { status: 'disbursement_failed', disbursementFailureReason: result.reason }))
      setErrorMessage(result.reason)
    }

    setIsDisbursing(false)
  }

  const canDisburse = selectedIds.size > 0 && !isDisbursing

  return (
    <main className="px-6 py-6 max-w-screen-2xl mx-auto space-y-5">
      <Tabs defaultValue="wallet">
        <TabsList>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* ── Wallet Tab ── */}
        <TabsContent value="wallet" className="mt-4 space-y-4">
          {/* Balance card */}
          <Card className="shadow-none">
            <CardContent className="pt-4 pb-3 px-5">
              <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
              <p className="text-3xl font-bold text-yellow-600">
                KES {walletTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{walletClaims.length} invoice{walletClaims.length !== 1 ? 's' : ''} pending disbursement</p>
            </CardContent>
          </Card>

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                disabled={walletClaims.length === 0}
                className="h-4 w-4 rounded border-gray-300"
              />
              Select All
            </label>

            <Button
              onClick={openConfirm}
              disabled={!canDisburse}
              size="sm"
            >
              {isDisbursing ? 'Disbursing…' : 'Disburse Selected'}
            </Button>

            {selectedIds.size > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} invoice{selectedIds.size !== 1 ? 's' : ''} selected · KES {selectedTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>

          {/* Table */}
          {walletClaims.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No settled invoices awaiting disbursement.</p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="w-10 px-4 py-3" />
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Invoice #</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Facility</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount (KES)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {walletClaims.map((claim) => (
                      <tr key={claim.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(claim.id)}
                            onChange={() => toggleSelect(claim.id)}
                            disabled={claim.status === 'disbursing' || isDisbursing}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-medium">{claim.invoiceNumber}</span>
                        </td>
                        <td className="px-4 py-3 text-sm max-w-[160px] truncate" title={claim.facility}>
                          {claim.facility || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{claim.date || '—'}</td>
                        <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                          {Number(claim.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1">
                            <Badge variant={claim.status === 'settled' ? 'warning' : claim.status === 'disbursement_failed' ? 'error' : 'blue'}>
                              {claim.status === 'settled' ? 'Settled' : claim.status === 'disbursement_failed' ? 'Failed' : 'Disbursing'}
                            </Badge>
                            {claim.disbursementFailureReason && (
                              <span className="text-xs text-red-600 flex items-start gap-1">
                                <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                                {claim.disbursementFailureReason}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── History Tab ── */}
        <TabsContent value="history" className="mt-4">
          {disbursements.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <p className="text-sm">No disbursements yet.</p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Channel</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Reference #</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Invoices</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount (KES)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="w-10 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {disbursements.map((disb) => (
                      <tr
                        key={disb.id}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedDisbursement(disb)}
                      >
                        <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                          {disb.timestamp ? format(parseISO(disb.timestamp), 'PP') : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm">{disb.channelLabel}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-medium">{disb.referenceNumber}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{disb.claimIds.length}</td>
                        <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                          {Number(disb.totalAmount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={disb.status === 'completed' ? 'success' : 'error'}>
                            {disb.status === 'completed' ? 'Completed' : 'Failed'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <ChevronRight className="h-4 w-4" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {showConfirm && (
        <DisburseConfirmModal
          invoiceCount={selectedIds.size}
          totalAmount={selectedTotal}
          onConfirm={handleConfirmDisburse}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {selectedDisbursement && (
        <BatchDetailDrawer
          disbursement={selectedDisbursement}
          claims={claims}
          onClose={() => setSelectedDisbursement(null)}
        />
      )}
    </main>
  )
}
