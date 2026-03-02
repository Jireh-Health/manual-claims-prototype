export const DISBURSEMENTS_KEY = 'jireh_disbursements'

// claim-seed-0 (INV-2026-001, Consultation): KES 2,700
// claim-seed-1 (INV-2026-002, Laboratory):   KES 3,600
// claim-seed-2 (INV-2026-003, Pharmacy):     KES 3,200
export const SEED_DISBURSEMENTS = [
  {
    id: 'disb-seed-0',
    timestamp: '2026-02-10T10:30:00.000Z',
    channel: 'mpesa',
    channelLabel: 'M-Pesa',
    referenceNumber: 'QRT7ABC123',
    totalAmount: 6300,
    claimIds: ['claim-seed-0', 'claim-seed-1'],
    status: 'completed',
    initiator: 'Admin',
  },
  {
    id: 'disb-seed-1',
    timestamp: '2026-02-18T14:15:00.000Z',
    channel: 'kcb',
    channelLabel: 'KCB Bank',
    referenceNumber: 'TXN-892341',
    totalAmount: 3200,
    claimIds: ['claim-seed-2'],
    status: 'completed',
    initiator: 'Admin',
  },
]

export function getDisbursements() {
  try { return JSON.parse(localStorage.getItem(DISBURSEMENTS_KEY) || '[]') }
  catch { return [] }
}

export function saveDisbursements(records) {
  localStorage.setItem(DISBURSEMENTS_KEY, JSON.stringify(records))
}

export function addDisbursement(record) {
  const records = getDisbursements()
  records.unshift(record)
  saveDisbursements(records)
}

export function initializeDisbursements() {
  if (!localStorage.getItem(DISBURSEMENTS_KEY)) {
    saveDisbursements(SEED_DISBURSEMENTS)
  }
}
