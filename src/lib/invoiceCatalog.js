/**
 * Canonical invoice catalog — the single source of truth for all demo invoices.
 *
 * - 100 invoices, fully deterministic (no Math.random)
 * - Imported by mockApi.js (for verification) and seedData.js (for seeding)
 * - Also consumed by scripts/generate-samples.mjs to produce sample files
 *
 * Slot assignments:
 *   001–003  Disbursed  (dashboard display)
 *   004–006  Processing (dashboard display)
 *   007–009  Rejected   (dashboard display — resubmittable)
 *   010–012  Unsubmitted (dashboard display — submittable)
 *   013–037  Unsubmitted → single-claim PDF sample files (25)
 *   038–047  Unsubmitted → bulk CSV batch-1 (10)
 *   048–057  Unsubmitted → bulk CSV batch-2 (10)
 *   058–067  Unsubmitted → bulk XLSX batch-1 (10)
 *   068–077  Unsubmitted → bulk XLSX batch-2 (10)
 *   078–087  Unsubmitted → bulk multi-page PDF (10 pages)
 *   088–100  Mixed       (dashboard variety)
 */

const FACILITIES = [
  'Jumuia Huruma',
  'Jumuia Kikuyu',
  'Jumuia Huruma Annex',
  'Jumuia Masii',
  'Jumuia Turbo',
  'Jumuia Nangina',
  'Jumuia Chogoria',
]

// Each payment-point entry: name + ordered item [description, unitAmount] pairs
const PP = [
  { name: 'Consultation',  items: [['Consultation fee', 1800], ['Follow-up visit', 900],       ['Specialist referral', 600]] },
  { name: 'Laboratory',    items: [['Blood panel (FBC)', 1200], ['Urinalysis', 600],           ['Lipid profile', 1800], ['Renal function tests', 2000]] },
  { name: 'Pharmacy',      items: [['Prescription drugs', 3200], ['Medical supplies', 800],    ['IV fluids (1 L)', 600]] },
  { name: 'Radiology',     items: [['Chest X-Ray', 1500], ['Abdominal ultrasound', 3500],      ['CT scan (head)', 12000]] },
  { name: 'Theatre',       items: [['Surgical procedure', 25000], ['Anaesthesia', 8000],       ['Theatre consumables', 4000]] },
  { name: 'Physiotherapy', items: [['Assessment session', 1500], ['Exercise therapy (10)', 8000], ['Hydrotherapy session', 2000]] },
  { name: 'Dental',        items: [['Dental examination', 800], ['Tooth extraction', 2500],    ['Scaling & polishing', 1500]] },
  { name: 'Emergency',     items: [['Emergency assessment', 2500], ['Trauma care', 8000],      ['Observation (4 hrs)', 3000]] },
  { name: 'Maternity',     items: [['Antenatal care', 2800], ['Normal delivery', 12000],       ['Postnatal care (3 days)', 6000], ['Newborn examination', 1500]] },
  { name: 'Ophthalmology', items: [['Eye examination', 1500], ['Visual field test', 2800],     ['Lens prescription', 800]] },
  { name: 'Inpatient',     items: [['Ward charges (2 days)', 7000], ['Nursing care', 2000],    ['Meals (2 days)', 1600]] },
  { name: 'Nutrition',     items: [['Nutrition assessment', 1200], ['Dietary counselling', 800], ['Supplement provision', 2500]] },
]

// How many items each position uses (cycles through 12)
const ITEM_COUNT_CYCLE = [2, 3, 1, 2, 1, 3, 2, 3, 2, 1, 3, 2]

// Pre-computed day-offsets from 2026-02-23 for pinned slots 0–11
const PINNED_DAY_OFFSETS = [0, 3, 6, 9, 12, 15, 31, 38, 45, 52, 59, 66]

function dateFromOffset(daysAgo) {
  const d = new Date('2026-02-23T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

/**
 * Build one invoice record given its 0-based sequence index.
 */
function buildInvoice(idx) {
  const seq  = idx + 1                          // 1-indexed
  const pp   = PP[idx % 12]
  const cnt  = Math.min(ITEM_COUNT_CYCLE[idx % 12], pp.items.length)
  const items = pp.items.slice(0, cnt).map(([description, amount]) => ({
    id: `cat-${seq}-${description.slice(0, 6)}`,
    description,
    amount,
  }))
  const amount     = items.reduce((s, i) => s + i.amount, 0)
  const daysAgo    = idx < 12 ? PINNED_DAY_OFFSETS[idx] : 10 + (idx - 12) * 2
  const date       = dateFromOffset(daysAgo)
  const facility   = FACILITIES[idx % 7]
  const paymentPoint = pp.name
  const invoiceNumber = `INV-2026-${String(seq).padStart(3, '0')}`

  return { invoiceNumber, facility, paymentPoint, date, amount, items }
}

/** All 100 invoices */
export const INVOICE_CATALOG = Array.from({ length: 100 }, (_, i) => buildInvoice(i))

/**
 * Map consumed by mockApi for O(1) verification lookups.
 * Key: invoice number (upper-case). Value: { amount, itemDescriptions[] }
 */
export const KNOWN_INVOICE_MAP = Object.fromEntries(
  INVOICE_CATALOG.map((inv) => [
    inv.invoiceNumber,
    { amount: inv.amount, items: inv.items.map((i) => i.description) },
  ])
)

/** Status assignment by index */
export function seedStatus(idx) {
  if (idx <= 2)  return 'disbursed'
  if (idx <= 5)  return 'processing'
  if (idx <= 8)  return 'rejected'
  if (idx <= 11) return 'unsubmitted'
  if (idx <= 86) return 'unsubmitted'   // all demo-file slots
  // 87–99: variety
  const cycle = ['disbursed', 'processing', 'rejected', 'unsubmitted']
  return cycle[(idx - 87) % 4]
}

export { FACILITIES, PP as PAYMENT_POINTS_DATA }
