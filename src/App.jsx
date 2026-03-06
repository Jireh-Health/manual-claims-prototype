import React, { useState } from 'react'
import {
  RefreshCw, RotateCcw, FileUp, Plus, HelpCircle,
  Building2, Wallet, Database, FolderOpen, RotateCw, ExternalLink, XCircle
} from 'lucide-react'
import { useClaimsStore } from '@/store/claimsStore'
import { useDisbursementsStore } from '@/store/disbursementsStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import DashboardPage from './pages/DashboardPage'
import WalletPage from './pages/WalletPage'
import SingleClaimModal from './pages/SingleClaimModal'
import BulkClaimModal from './pages/BulkClaimModal'

// ─── Instructions Modal ───────────────────────────────────────────────────────

const REPO = 'https://github.com/Jireh-Health/manual-claims-prototype'

function InstructionsModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative z-10 bg-background rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col"
        style={{ maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">How this prototype works</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted transition-colors">
            <XCircle className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm">

          <section>
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-primary shrink-0" />
              <h3 className="font-semibold text-base">localStorage — no server involved</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              This prototype runs entirely in your browser. There is no backend, no database, and
              no network calls for invoice data. Everything — all 100 seeded invoices, submitted invoices,
              and any changes you make — is stored in your browser's{' '}
              <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">localStorage</code>.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Closing and reopening the tab keeps your data. Clearing browser storage or opening in
              a different browser starts fresh. Each browser/device has its own independent copy.
            </p>
          </section>

          <hr className="border-border" />

          <section>
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-primary shrink-0" />
              <h3 className="font-semibold text-base">Seed data</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              On first load the app checks for a seed version key in localStorage. If absent or
              outdated it instantly writes 100 deterministic invoices from a built-in catalog —
              no network request required.
            </p>
            <div className="mt-3 rounded-lg border bg-muted/40 p-3 space-y-1.5 text-xs font-mono">
              <p><span className="text-green-600">3</span> &nbsp;Disbursed &nbsp;— INV-2026-001 … 003</p>
              <p><span className="text-yellow-600">3</span> &nbsp;Settled &nbsp;&nbsp;&nbsp;— INV-2026-004 … 006</p>
              <p><span className="text-blue-600">3</span> &nbsp;Processing — INV-2026-007 … 009</p>
              <p><span className="text-red-600">3</span> &nbsp;Rejected &nbsp;— INV-2026-010 … 012</p>
              <p><span className="text-gray-500">88</span>&nbsp;Unsubmitted — INV-2026-013 … 100</p>
            </div>
            <p className="text-muted-foreground leading-relaxed mt-2">
              The same catalog is the source of truth for the mock verification API, so invoice
              numbers, amounts, and line items always match — demos never break due to data drift.
            </p>
          </section>

          <hr className="border-border" />

          <section>
            <div className="flex items-center gap-2 mb-2">
              <RotateCw className="h-4 w-4 text-primary shrink-0" />
              <h3 className="font-semibold text-base">Reset Demo button</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              The <strong>Reset Demo</strong> button (top-right) rebuilds all 100 invoices from the
              built-in catalog, wipes the current invoices and submitted-invoice set from localStorage,
              and restores the 2 seeded disbursement records.
            </p>
          </section>

          <hr className="border-border" />

          <section>
            <div className="flex items-center gap-2 mb-2">
              <FolderOpen className="h-4 w-4 text-primary shrink-0" />
              <h3 className="font-semibold text-base">Sample invoice files</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-3">
              All sample files live in the <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">public/</code> folder
              of the repository and are served as static assets. They map 1-to-1 with invoices in the seed catalog.
            </p>

            <div className="space-y-3">
              <div className="rounded-lg border p-3">
                <p className="font-medium mb-1">Single-claim PDFs &nbsp;<span className="text-muted-foreground font-normal">(25 files)</span></p>
                <p className="text-muted-foreground text-xs mb-2">
                  One PDF per invoice, covering INV-2026-013 through INV-2026-037. Each PDF is a
                  single-page invoice rendered in Courier, ready for the OCR flow.
                </p>
                <a
                  href={`${REPO}/tree/main/public/samples/single`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                >
                  public/samples/single/ <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="rounded-lg border p-3">
                <p className="font-medium mb-1">Bulk-claim files &nbsp;<span className="text-muted-foreground font-normal">(6 files)</span></p>
                <div className="text-muted-foreground text-xs space-y-1 mb-2">
                  <p><code className="bg-muted rounded px-1 font-mono">bulk-batch-1.csv</code> — 10 rows, standard column headers (INV-2026-038…047)</p>
                  <p><code className="bg-muted rounded px-1 font-mono">bulk-batch-2-alt-headers.csv</code> — 10 rows, non-standard headers to trigger column mapping (INV-2026-048…057)</p>
                  <p><code className="bg-muted rounded px-1 font-mono">bulk-batch-mixed-scenarios.csv</code> — mix of valid, unknown, and amount-mismatch rows for error demos</p>
                  <p><code className="bg-muted rounded px-1 font-mono">bulk-batch-3.xlsx</code> — 10 rows Excel, standard headers (INV-2026-058…067)</p>
                  <p><code className="bg-muted rounded px-1 font-mono">bulk-batch-4-extra-columns.xlsx</code> — 10 rows Excel with extra decorator columns (INV-2026-068…077)</p>
                  <p><code className="bg-muted rounded px-1 font-mono">bulk-multipage.pdf</code> — 10-page PDF, one invoice per page (INV-2026-078…087)</p>
                </div>
                <a
                  href={`${REPO}/tree/main/public/samples/bulk`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                >
                  public/samples/bulk/ <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="rounded-lg border p-3">
                <p className="font-medium mb-1">General sample CSV</p>
                <p className="text-muted-foreground text-xs mb-2">
                  A standalone CSV you can drop into the bulk-claim flow. Items use the
                  <code className="bg-muted rounded px-1 mx-1 font-mono">Description:price|Description:price</code>
                  pipe-separated format so line-item prices tally to the invoice total.
                </p>
                <a
                  href={`${REPO}/blob/main/public/sample-claims.csv`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                >
                  public/sample-claims.csv <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t shrink-0 flex items-center justify-between">
          <a
            href={REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View repository on GitHub
          </a>
          <Button size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Nav Button ───────────────────────────────────────────────────────────────

function NavButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
      }`}
    >
      {children}
    </button>
  )
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [showInstructions, setShowInstructions] = useState(false)
  const [showSingleModal, setShowSingleModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [resubmitClaim, setResubmitClaim] = useState(null)
  const [resetDone, setResetDone] = useState(false)

  const claims        = useClaimsStore((s) => s.claims)
  const refreshClaims = useClaimsStore((s) => s.refreshClaims)
  const resetDemo     = useClaimsStore((s) => s.resetDemo)
  const isResetting   = useClaimsStore((s) => s.isResetting)
  const refreshDisbursements = useDisbursementsStore((s) => s.refreshDisbursements)

  const walletCount = claims.filter(
    (c) => c.status === 'settled' || c.status === 'disbursement_failed'
  ).length

  const handleReset = () => {
    if (!window.confirm('Reset demo? This will restore all seed invoices and disbursement records.')) return
    resetDemo()
    refreshDisbursements()
    setResetDone(true)
    setTimeout(() => setResetDone(false), 3000)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">Jumuia Hospitals</h1>
              <p className="text-xs text-muted-foreground">Invoice Management Portal</p>
            </div>
          </div>

          <nav className="flex items-center gap-1 ml-2 border rounded-lg p-1 bg-muted/50">
            <NavButton active={currentPage === 'dashboard'} onClick={() => setCurrentPage('dashboard')}>
              Dashboard
            </NavButton>
            <NavButton active={currentPage === 'wallet'} onClick={() => setCurrentPage('wallet')}>
              <Wallet className="h-3.5 w-3.5" />
              Wallet
              {walletCount > 0 && (
                <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-xs leading-none">
                  {walletCount}
                </Badge>
              )}
            </NavButton>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowInstructions(true)}>
            <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
            Instructions
          </Button>
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
            Submit Bulk Invoices
          </Button>
          <Button size="sm" onClick={() => { setResubmitClaim(null); setShowSingleModal(true) }}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Single Invoice
          </Button>
        </div>
      </header>

      {currentPage === 'dashboard' && (
        <DashboardPage
          onResubmitClaim={(c) => { setResubmitClaim(c); setShowSingleModal(true) }}
        />
      )}
      {currentPage === 'wallet' && <WalletPage />}

      {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}
      {showSingleModal && (
        <SingleClaimModal
          existingClaim={resubmitClaim}
          onClose={() => { setShowSingleModal(false); setResubmitClaim(null) }}
        />
      )}
      {showBulkModal && <BulkClaimModal onClose={() => setShowBulkModal(false)} />}
    </div>
  )
}
