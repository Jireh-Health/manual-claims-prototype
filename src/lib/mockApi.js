/**
 * Mock Jireh Claims API
 * Verification checks against the canonical invoice catalog (100 invoices).
 * Submission and claimed-set tracking live entirely in localStorage.
 */
import { KNOWN_INVOICE_MAP } from './invoiceCatalog.js'

const delay = (ms) => new Promise((res) => setTimeout(res, ms))

function getClaimedSet() {
  try { return new Set(JSON.parse(localStorage.getItem('jireh_claimed_set') || '[]')) }
  catch { return new Set() }
}
function saveClaimedSet(set) {
  localStorage.setItem('jireh_claimed_set', JSON.stringify([...set]))
}

/**
 * Verify a single invoice.
 * Returns: valid | amount_mismatch | missing_items | unknown | duplicate
 */
export async function verifyInvoice(invoiceNumber, amount, items) {
  await delay(600 + Math.random() * 300)

  const key   = invoiceNumber?.trim()?.toUpperCase()
  const known = KNOWN_INVOICE_MAP[key]
  const claimed = getClaimedSet()

  if (!known) {
    return { status: 'unknown', message: `Invoice ${invoiceNumber} not found in Jireh system.` }
  }
  if (claimed.has(key)) {
    return { status: 'duplicate', message: `Invoice ${invoiceNumber} has already been submitted.` }
  }

  const hasItems    = Array.isArray(items) && items.length > 0
  const parsedAmt   = parseFloat(amount)
  const amountOk    = Math.abs(parsedAmt - known.amount) < 0.01

  if (!hasItems) {
    return { status: 'missing_items',
      message: `Invoice ${invoiceNumber} requires at least one line item.`,
      expectedAmount: known.amount }
  }
  if (!amountOk) {
    return { status: 'amount_mismatch',
      message: `Amount mismatch: submitted KES ${parsedAmt.toLocaleString()}, expected KES ${known.amount.toLocaleString()}.`,
      expectedAmount: known.amount }
  }
  return { status: 'valid', message: `Invoice ${invoiceNumber} verified successfully.`, expectedAmount: known.amount }
}

export async function batchVerify(rows) {
  return Promise.all(rows.map((r) => verifyInvoice(r.invoiceNumber, r.amount, r.items)))
}

export async function submitClaim(claim) {
  await delay(400 + Math.random() * 300)
  const claimed = getClaimedSet()
  claimed.add(claim.invoiceNumber?.trim()?.toUpperCase())
  saveClaimedSet(claimed)
  return { success: true, claimId: `CLM-${Date.now()}`, status: 'processing' }
}

export async function batchSubmit(claims) {
  return Promise.all(claims.map((c) => submitClaim(c)))
}

export const PAYMENT_CHANNELS = [
  { value: 'mpesa',  label: 'M-Pesa' },
  { value: 'kcb',    label: 'KCB Bank' },
  { value: 'equity', label: 'Equity Bank' },
  { value: 'coop',   label: 'Co-op Bank' },
]

// Deterministic hash for reproducible failure mode
function simpleHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

export async function disburseFunds(claimIds, channel) {
  await delay(1500 + Math.random() * 500)
  // Equity Bank: ~30% failure, deterministic on first claimId
  if (channel === 'equity' && simpleHash(claimIds[0] || 'x') % 10 < 3) {
    return { success: false, reason: 'Bank timeout. Please try again or use a different channel.' }
  }
  const ref = channel === 'mpesa'
    ? `QRT${Math.random().toString(36).slice(2, 9).toUpperCase()}`
    : `TXN-${Math.floor(Math.random() * 900000) + 100000}`
  return { success: true, referenceNumber: ref, timestamp: new Date().toISOString() }
}
