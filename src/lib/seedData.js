/**
 * localStorage helpers + seed initialization.
 * Seed data is built deterministically from the invoice catalog.
 */
import { INVOICE_CATALOG, seedStatus, FACILITIES, PAYMENT_POINTS_DATA } from './invoiceCatalog.js'
import { DISBURSEMENTS_KEY, SEED_DISBURSEMENTS, saveDisbursements, initializeDisbursements } from './disbursementsData.js'

export const STORAGE_KEY      = 'jireh_claims'
export const SEED_VERSION_KEY = 'jireh_seed_version'
export const CURRENT_SEED_VERSION = '3.0.0'  // bump → forces re-seed on next load

// Re-export for use in components
export { FACILITIES as JUMUIA_FACILITIES }
export const PAYMENT_POINTS = PAYMENT_POINTS_DATA.map((p) => p.name)

// ── Build claims from the catalog ────────────────────────────────────────────

export function buildClaimsFromCatalog() {
  return INVOICE_CATALOG.map((inv, idx) => {
    const status = seedStatus(idx)
    const hasBeenSubmitted = ['disbursed', 'processing', 'settled'].includes(status)
    return {
      id:             `claim-seed-${idx}`,
      invoiceNumber:  inv.invoiceNumber,
      amount:         inv.amount,
      items:          inv.items,
      facility:       inv.facility,
      paymentPoint:   inv.paymentPoint,
      date:           inv.date,
      submittedAt:    hasBeenSubmitted ? `${inv.date}T08:30:00` : null,
      status,
      claimId:        hasBeenSubmitted ? `CLM-${200000 + idx}` : null,
      rejectionReason: status === 'rejected' ? 'Amount mismatch — please review and resubmit.' : null,
      disbursementFailureReason: null,
    }
  })
}

// ── Initialization ────────────────────────────────────────────────────────────

export function initializeStorage() {
  const existing = localStorage.getItem(SEED_VERSION_KEY)
  if (existing === CURRENT_SEED_VERSION) {
    // Still call this in case disbursements haven't been initialized yet
    initializeDisbursements()
    return
  }

  // Populate from catalog
  const claims = buildClaimsFromCatalog()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(claims))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
  initializeDisbursements()
}

/**
 * Reset all localStorage to seed state. Returns the fresh claims array.
 */
export function resetToSeedFile() {
  const claims = buildClaimsFromCatalog()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(claims))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
  localStorage.removeItem('jireh_claimed_set')
  localStorage.removeItem(DISBURSEMENTS_KEY)
  saveDisbursements(SEED_DISBURSEMENTS)
  return claims
}

// ── CRUD helpers ─────────────────────────────────────────────────────────────

export function getClaims() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

export function saveClaims(claims) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(claims))
}

export function addClaim(claim) {
  const claims = getClaims()
  claims.unshift(claim)
  saveClaims(claims)
}

export function addClaims(newClaims) {
  saveClaims([...newClaims, ...getClaims()])
}

export function updateClaim(id, updates) {
  const claims = getClaims()
  const idx = claims.findIndex((c) => c.id === id)
  if (idx !== -1) { claims[idx] = { ...claims[idx], ...updates }; saveClaims(claims) }
}
