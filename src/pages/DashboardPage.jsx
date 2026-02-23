import React, { useState, useMemo, useCallback } from 'react'
import {
  Search, Filter, Download, ChevronUp, ChevronDown,
  RefreshCw, Eye, AlertCircle, CheckCircle2, Clock, XCircle,
  FileUp, Plus, ArrowUpDown, Layers, Building2, RotateCcw
} from 'lucide-react'
import { format, parseISO, startOfDay, endOfDay } from 'date-fns'
import { useClaimsStore } from '@/store/claimsStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { JUMUIA_FACILITIES, PAYMENT_POINTS } from '@/lib/seedData'
import SingleClaimModal from './SingleClaimModal'
import BulkClaimModal from './BulkClaimModal'

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  disbursed:   { label: 'Disbursed',   color: 'success', icon: CheckCircle2, dot: 'bg-green-500' },
  processing:  { label: 'Processing',  color: 'blue',    icon: Clock,        dot: 'bg-blue-500' },
  rejected:    { label: 'Rejected',    color: 'error',   icon: XCircle,      dot: 'bg-red-500' },
  unsubmitted: { label: 'Unsubmitted', color: 'gray',    icon: AlertCircle,  dot: 'bg-gray-400' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unsubmitted
  return <Badge variant={cfg.color}>{cfg.label}</Badge>
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────

function SortIcon({ field, sortState }) {
  if (sortState.field !== field)
    return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground ml-1 opacity-50" />
  return sortState.dir === 'asc'
    ? <ChevronUp className="h-3.5 w-3.5 ml-1 text-primary" />
    : <ChevronDown className="h-3.5 w-3.5 ml-1 text-primary" />
}

function SortableHeader({ field, label, sortState, onSort }) {
  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-foreground"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center">
        {label}
        <SortIcon field={field} sortState={sortState} />
      </span>
    </th>
  )
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function DetailDrawer({ claim, onClose }) {
  if (!claim) return null
  const cfg = STATUS_CONFIG[claim.status] || STATUS_CONFIG.unsubmitted

  const downloadRemittance = () => {
    const lines = [
      `JUMUIA HOSPITALS — CLAIMS REMITTANCE SUMMARY`,
      `=============================================`,
      `Claim ID:       ${claim.claimId || 'N/A'}`,
      `Invoice No:     ${claim.invoiceNumber}`,
      `Facility:       ${claim.facility || 'N/A'}`,
      `Payment Point:  ${claim.paymentPoint || 'N/A'}`,
      `Date:           ${claim.date || 'N/A'}`,
      `Submitted:      ${claim.submittedAt ? format(parseISO(claim.submittedAt), 'PPpp') : 'N/A'}`,
      `Status:         ${cfg.label}`,
      ``,
      `LINE ITEMS`,
      `----------`,
      ...(claim.items || []).map((it, i) =>
        `${String(i + 1).padStart(2)}. ${it.description.padEnd(40)} KES ${Number(it.amount).toLocaleString()}`
      ),
      ``,
      `TOTAL AMOUNT:   KES ${Number(claim.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
      ``,
      claim.rejectionReason ? `REJECTION REASON: ${claim.rejectionReason}` : '',
    ].filter((l) => l !== undefined).join('\n')

    const blob = new Blob([lines], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `remittance-${claim.invoiceNumber}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 bg-background w-full max-w-md h-full shadow-2xl flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div>
            <h3 className="font-semibold">{claim.invoiceNumber}</h3>
            <p className="text-sm text-muted-foreground">{claim.facility || 'Unknown facility'}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Status',        <StatusBadge key="s" status={claim.status} />],
              ['Claim ID',      claim.claimId || '—'],
              ['Facility',      claim.facility || '—'],
              ['Payment Point', claim.paymentPoint || '—'],
              ['Date',          claim.date || '—'],
              ['Submitted',     claim.submittedAt ? format(parseISO(claim.submittedAt), 'PP') : '—'],
              ['Total Amount',  `KES ${Number(claim.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {claim.rejectionReason && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <p className="font-medium text-xs mb-1">Rejection Reason</p>
              {claim.rejectionReason}
            </div>
          )}

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-2">Line Items ({claim.items?.length || 0})</h4>
            {claim.items?.length > 0 ? (
              <div className="space-y-1">
                {claim.items.map((item, i) => (
                  <div key={item.id || i} className="flex justify-between text-sm py-1 border-b last:border-0">
                    <span className="text-muted-foreground">{i + 1}. {item.description}</span>
                    {item.amount > 0 && (
                      <span>KES {Number(item.amount).toLocaleString()}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No line items</p>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t shrink-0">
          <Button variant="outline" size="sm" onClick={downloadRemittance} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Download Remittance Summary
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const claims        = useClaimsStore((s) => s.claims)
  const refreshClaims = useClaimsStore((s) => s.refreshClaims)
  const resetDemo     = useClaimsStore((s) => s.resetDemo)
  const isResetting   = useClaimsStore((s) => s.isResetting)
  const [resetDone, setResetDone] = useState(false)

  const handleReset = async () => {
    if (!window.confirm('Reset demo? This will restore all 100 seed claims and clear submitted invoices.')) return
    await resetDemo()
    setResetDone(true)
    setTimeout(() => setResetDone(false), 3000)
  }

  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [facilityFilter, setFacilityFilter] = useState('')
  const [paymentPointFilter, setPaymentPointFilter] = useState('')
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')
  const [sortState,    setSortState]    = useState({ field: 'date', dir: 'desc' })
  const [selectedClaim, setSelectedClaim] = useState(null)
  const [showSingleModal, setShowSingleModal] = useState(false)
  const [showBulkModal,   setShowBulkModal]   = useState(false)
  const [resubmitClaim,   setResubmitClaim]   = useState(null)
  const [currentPage,  setCurrentPage]  = useState(1)
  const PAGE_SIZE = 20

  const handleSort = useCallback((field) => {
    setSortState((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' }
    )
    setCurrentPage(1)
  }, [])

  const filtered = useMemo(() => {
    let result = claims

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((c) =>
        c.invoiceNumber?.toLowerCase().includes(q) ||
        c.facility?.toLowerCase().includes(q) ||
        c.paymentPoint?.toLowerCase().includes(q) ||
        c.claimId?.toLowerCase().includes(q)
      )
    }

    if (statusFilter)       result = result.filter((c) => c.status === statusFilter)
    if (facilityFilter)     result = result.filter((c) => c.facility === facilityFilter)
    if (paymentPointFilter) result = result.filter((c) => c.paymentPoint === paymentPointFilter)

    if (dateFrom) {
      const from = startOfDay(parseISO(dateFrom))
      result = result.filter((c) => { try { return parseISO(c.date) >= from } catch { return true } })
    }
    if (dateTo) {
      const to = endOfDay(parseISO(dateTo))
      result = result.filter((c) => { try { return parseISO(c.date) <= to } catch { return true } })
    }

    return [...result].sort((a, b) => {
      let va = a[sortState.field]
      let vb = b[sortState.field]
      if (sortState.field === 'amount') { va = parseFloat(va) || 0; vb = parseFloat(vb) || 0 }
      else { va = va?.toLowerCase?.() ?? ''; vb = vb?.toLowerCase?.() ?? '' }
      if (va < vb) return sortState.dir === 'asc' ? -1 : 1
      if (va > vb) return sortState.dir === 'asc' ? 1 : -1
      return 0
    })
  }, [claims, search, statusFilter, facilityFilter, paymentPointFilter, dateFrom, dateTo, sortState])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const stats = useMemo(() => ({
    total:       claims.length,
    disbursed:   claims.filter((c) => c.status === 'disbursed').length,
    processing:  claims.filter((c) => c.status === 'processing').length,
    rejected:    claims.filter((c) => c.status === 'rejected').length,
    unsubmitted: claims.filter((c) => c.status === 'unsubmitted').length,
    totalValue:  claims.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0),
  }), [claims])

  const clearFilters = () => {
    setSearch(''); setStatusFilter(''); setFacilityFilter(''); setPaymentPointFilter('')
    setDateFrom(''); setDateTo(''); setCurrentPage(1)
  }
  const hasFilters = search || statusFilter || facilityFilter || paymentPointFilter || dateFrom || dateTo

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">Jumuia Hospitals</h1>
            <p className="text-xs text-muted-foreground">Claims Management Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshClaims}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isResetting}
            className={resetDone ? 'border-green-500 text-green-700' : 'text-muted-foreground'}
          >
            {isResetting
              ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Resetting…</>
              : resetDone
              ? <><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Reset Done</>
              : <><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Reset Demo</>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowBulkModal(true)}>
            <FileUp className="h-3.5 w-3.5 mr-1.5" />
            Submit Bulk Claims
          </Button>
          <Button size="sm" onClick={() => { setResubmitClaim(null); setShowSingleModal(true) }}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Single Claim
          </Button>
        </div>
      </header>

      <main className="px-6 py-6 space-y-5 max-w-screen-2xl mx-auto">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Claims',  value: stats.total,       icon: Layers,       color: 'text-foreground' },
            { label: 'Disbursed',     value: stats.disbursed,   icon: CheckCircle2, color: 'text-green-600'  },
            { label: 'Processing',    value: stats.processing,  icon: Clock,        color: 'text-blue-600'   },
            { label: 'Rejected',      value: stats.rejected,    icon: XCircle,      color: 'text-red-600'    },
            { label: 'Unsubmitted',   value: stats.unsubmitted, icon: AlertCircle,  color: 'text-gray-500'   },
            { label: 'Total Value',   value: `KES ${(stats.totalValue / 1000).toFixed(0)}k`, icon: null, color: 'text-primary' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="shadow-none">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-start justify-between">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  {Icon && <Icon className={`h-4 w-4 ${color} opacity-70`} />}
                </div>
                <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 items-end">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search invoice #, facility, payment point, claim ID…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
              className="pl-8"
            />
          </div>

          <div className="w-36">
            <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}>
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
          </div>

          <div className="w-44">
            <Select value={facilityFilter} onChange={(e) => { setFacilityFilter(e.target.value); setCurrentPage(1) }}>
              <option value="">All Facilities</option>
              {JUMUIA_FACILITIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </Select>
          </div>

          <div className="w-40">
            <Select value={paymentPointFilter} onChange={(e) => { setPaymentPointFilter(e.target.value); setCurrentPage(1) }}>
              <option value="">All Payment Points</option>
              {PAYMENT_POINTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">From</span>
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1) }} className="w-36" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">To</span>
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1) }} className="w-36" />
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>
          )}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {paginated.length} of {filtered.length} claims
            {filtered.length !== claims.length && ` (filtered from ${claims.length})`}
          </span>
          <span>Page {currentPage} of {Math.max(1, totalPages)}</span>
        </div>

        {/* Claims Table */}
        <div className="rounded-xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <SortableHeader field="date"         label="Date"          sortState={sortState} onSort={handleSort} />
                  <SortableHeader field="invoiceNumber" label="Invoice #"     sortState={sortState} onSort={handleSort} />
                  <SortableHeader field="facility"     label="Facility"      sortState={sortState} onSort={handleSort} />
                  <SortableHeader field="paymentPoint" label="Payment Point" sortState={sortState} onSort={handleSort} />
                  <SortableHeader field="amount"       label="Amount (KES)"  sortState={sortState} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Items</th>
                  <SortableHeader field="status"       label="Status"        sortState={sortState} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((claim) => (
                  <ClaimRow
                    key={claim.id}
                    claim={claim}
                    onView={() => setSelectedClaim(claim)}
                    onSubmit={(c) => { setResubmitClaim(c); setShowSingleModal(true) }}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {paginated.length === 0 && (
            <div className="py-16 text-center text-muted-foreground">
              <Filter className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No claims match your filters.</p>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-primary mt-1 hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
              Previous
            </Button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                let page
                if (totalPages <= 7)             page = i + 1
                else if (currentPage <= 4)        page = i + 1
                else if (currentPage >= totalPages - 3) page = totalPages - 6 + i
                else                              page = currentPage - 3 + i
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    className="w-9"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                )
              })}
            </div>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </main>

      {selectedClaim  && <DetailDrawer claim={selectedClaim} onClose={() => setSelectedClaim(null)} />}
      {showSingleModal && <SingleClaimModal existingClaim={resubmitClaim} onClose={() => { setShowSingleModal(false); setResubmitClaim(null) }} />}
      {showBulkModal  && <BulkClaimModal onClose={() => setShowBulkModal(false)} />}
    </div>
  )
}

// ─── Claim Row ────────────────────────────────────────────────────────────────

function ClaimRow({ claim, onView, onSubmit }) {
  const canResubmit = claim.status === 'rejected' || claim.status === 'unsubmitted'

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{claim.date || '—'}</td>
      <td className="px-4 py-3">
        <span className="font-mono text-xs font-medium">{claim.invoiceNumber}</span>
      </td>
      <td className="px-4 py-3 text-sm max-w-[160px] truncate" title={claim.facility}>
        {claim.facility || '—'}
      </td>
      <td className="px-4 py-3 text-sm">
        {claim.paymentPoint
          ? <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">{claim.paymentPoint}</span>
          : '—'}
      </td>
      <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
        {Number(claim.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{claim.items?.length || 0}</td>
      <td className="px-4 py-3"><StatusBadge status={claim.status} /></td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" onClick={onView} className="h-7 px-2 text-xs">
            <Eye className="h-3.5 w-3.5 mr-1" /> View
          </Button>
          {canResubmit ? (
            <Button size="sm" onClick={() => onSubmit(claim)} className="h-7 px-2 text-xs">
              Submit Claim
            </Button>
          ) : (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              claim.status === 'processing' ? 'bg-blue-100 text-blue-700' :
              claim.status === 'disbursed'  ? 'bg-green-100 text-green-700' : ''
            }`}>
              {claim.status === 'processing' ? 'Processing' :
               claim.status === 'disbursed'  ? 'Disbursed'  : null}
            </span>
          )}
        </div>
      </td>
    </tr>
  )
}
