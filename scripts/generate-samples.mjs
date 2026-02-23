/**
 * generate-samples.mjs
 * Run once: node scripts/generate-samples.mjs
 *
 * Creates:
 *   public/seed-data.json              — 100 deterministic claims
 *   public/samples/single/             — 25 single-claim PDF files
 *   public/samples/bulk/               — 3 CSV + 2 XLSX + 1 multi-page PDF
 */

import fs   from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT    = path.join(__dirname, '..')
const SINGLE  = path.join(ROOT, 'public/samples/single')
const BULK    = path.join(ROOT, 'public/samples/bulk')

// ── Reproduce the invoice catalog inline (mirrors invoiceCatalog.js) ────────

const FACILITIES = [
  'Jumuia Huruma', 'Jumuia Kikuyu', 'Jumuia Huruma Annex',
  'Jumuia Masii',  'Jumuia Turbo',  'Jumuia Nangina', 'Jumuia Chogoria',
]

const PP = [
  { name: 'Consultation',  items: [['Consultation fee', 1800], ['Follow-up visit', 900],       ['Specialist referral', 600]] },
  { name: 'Laboratory',    items: [['Blood panel (FBC)', 1200], ['Urinalysis', 600],           ['Lipid profile', 1800], ['Renal function tests', 2000]] },
  { name: 'Pharmacy',      items: [['Prescription drugs', 3200], ['Medical supplies', 800],    ['IV fluids (1 L)', 600]] },
  { name: 'Radiology',     items: [['Chest X-Ray', 1500], ['Abdominal ultrasound', 3500],      ['CT scan (head)', 12000]] },
  { name: 'Theatre',       items: [['Surgical procedure', 25000], ['Anaesthesia', 8000],       ['Theatre consumables', 4000]] },
  { name: 'Physiotherapy', items: [['Assessment session', 1500], ['Exercise therapy (10)', 8000], ['Hydrotherapy session', 2000]] },
  { name: 'Dental',        items: [['Dental examination', 800], ['Tooth extraction', 2500],    ['Scaling and polishing', 1500]] },
  { name: 'Emergency',     items: [['Emergency assessment', 2500], ['Trauma care', 8000],      ['Observation 4 hrs', 3000]] },
  { name: 'Maternity',     items: [['Antenatal care', 2800], ['Normal delivery', 12000],       ['Postnatal care 3 days', 6000], ['Newborn examination', 1500]] },
  { name: 'Ophthalmology', items: [['Eye examination', 1500], ['Visual field test', 2800],     ['Lens prescription', 800]] },
  { name: 'Inpatient',     items: [['Ward charges 2 days', 7000], ['Nursing care', 2000],      ['Meals 2 days', 1600]] },
  { name: 'Nutrition',     items: [['Nutrition assessment', 1200], ['Dietary counselling', 800], ['Supplement provision', 2500]] },
]

const ITEM_COUNT_CYCLE  = [2, 3, 1, 2, 1, 3, 2, 3, 2, 1, 3, 2]
const PINNED_OFFSETS    = [0, 3, 6, 9, 12, 15, 31, 38, 45, 52, 59, 66]
const STATUS_CYCLE_TAIL = ['disbursed', 'processing', 'rejected', 'unsubmitted']

function dateFromOffset(daysAgo) {
  const d = new Date('2026-02-23T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

function buildInvoice(idx) {
  const seq  = idx + 1
  const pp   = PP[idx % 12]
  const cnt  = Math.min(ITEM_COUNT_CYCLE[idx % 12], pp.items.length)
  const items = pp.items.slice(0, cnt).map(([description, amount]) => ({
    id: `cat-${seq}-${description.slice(0, 6)}`,
    description,
    amount,
  }))
  const amount       = items.reduce((s, i) => s + i.amount, 0)
  const daysAgo      = idx < 12 ? PINNED_OFFSETS[idx] : 10 + (idx - 12) * 2
  return {
    invoiceNumber: `INV-2026-${String(seq).padStart(3, '0')}`,
    facility:      FACILITIES[idx % 7],
    paymentPoint:  pp.name,
    date:          dateFromOffset(daysAgo),
    amount,
    items,
  }
}

function seedStatus(idx) {
  if (idx <= 2)  return 'disbursed'
  if (idx <= 5)  return 'processing'
  if (idx <= 8)  return 'rejected'
  if (idx <= 86) return 'unsubmitted'
  return STATUS_CYCLE_TAIL[(idx - 87) % 4]
}

const CATALOG = Array.from({ length: 100 }, (_, i) => buildInvoice(i))

// ── Seed-data.json ───────────────────────────────────────────────────────────

function buildSeedClaims() {
  return CATALOG.map((inv, idx) => {
    const status = seedStatus(idx)
    return {
      id:            `claim-seed-${idx}`,
      invoiceNumber: inv.invoiceNumber,
      amount:        inv.amount,
      items:         inv.items,
      facility:      inv.facility,
      paymentPoint:  inv.paymentPoint,
      date:          inv.date,
      submittedAt:   (status === 'disbursed' || status === 'processing')
                       ? `${inv.date}T08:30:00` : null,
      status,
      claimId:       (status === 'disbursed' || status === 'processing')
                       ? `CLM-${200000 + idx}` : null,
      rejectionReason: status === 'rejected'
                       ? 'Amount mismatch — please review and resubmit.' : null,
    }
  })
}

// ── Minimal PDF builder ──────────────────────────────────────────────────────

/** Escape text for PDF string literals */
function pdfEsc(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r/g, '\\r')
}

/**
 * Build a valid single-page PDF from an array of text lines.
 * Uses Courier (Type1, always available) so text renders crisply for OCR.
 */
function buildSinglePagePDF(lines) {
  let y = 740
  const streamLines = ['BT', '/F1 11 Tf']
  for (const line of lines) {
    streamLines.push(`1 0 0 1 50 ${y} Tm`)
    streamLines.push(`(${pdfEsc(line)}) Tj`)
    y -= 15
  }
  streamLines.push('ET')
  const stream = streamLines.join('\n') + '\n'

  return assemblePDF([[stream]])
}

/**
 * Build a valid multi-page PDF. pageStreams: array of string (one per page).
 */
function buildMultiPagePDF(pageStreams) {
  return assemblePDF(pageStreams.map((s) => [s]))
}

/**
 * Core PDF assembler.
 * pageContents: string[][] — outer array = pages, inner = stream lines (already joined)
 */
function assemblePDF(pageContents) {
  // pageContents is array of [streamString]
  const objs = []     // { content: string }
  const offsets = []  // byte offsets per object (1-indexed)

  function addObj(content) {
    objs.push(content)
    return objs.length  // 1-indexed obj number
  }

  // Object 1: Catalog (placeholder — will patch after we know Pages id)
  // Object 2: Pages dictionary
  // Object 3+N: Page objects
  // Object 3+N+1: Font

  const pageCount = pageContents.length
  // We know pages obj = 2, font obj = last
  const firstPageObjId = 3
  const fontObjId = 3 + pageCount + pageCount  // each page has a content stream + page obj

  // Actually: per page we create 2 objects (Page dict + Content stream)
  // Layout: 1=Catalog, 2=Pages, [3,4]=page1(dict+stream), [5,6]=page2, ..., last=Font

  const pageObjIds  = []  // ids of Page dict objects
  const streamObjIds = [] // ids of stream objects
  let nextId = 3

  for (let p = 0; p < pageCount; p++) {
    pageObjIds.push(nextId++)    // page dict
    streamObjIds.push(nextId++)  // content stream
  }
  const fontId = nextId

  // Build object strings
  const catalogStr = `1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n`
  const pagesStr   = `2 0 obj\n<</Type /Pages /Kids [${pageObjIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageCount}>>\nendobj\n`

  const pageStrs   = []
  const streamStrs = []
  for (let p = 0; p < pageCount; p++) {
    const streamContent = pageContents[p][0]
    const streamLen     = Buffer.byteLength(streamContent, 'latin1')
    pageStrs.push(
      `${pageObjIds[p]} 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
      `/Resources <</Font <</F1 ${fontId} 0 R>>>> /Contents ${streamObjIds[p]} 0 R>>\nendobj\n`
    )
    streamStrs.push(
      `${streamObjIds[p]} 0 obj\n<</Length ${streamLen}>>\nstream\n${streamContent}endstream\nendobj\n`
    )
  }
  const fontStr = `${fontId} 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Courier>>\nendobj\n`

  // Compute byte offsets
  const header = '%PDF-1.4\n'
  let pos = header.length
  const allObjStrs = [catalogStr, pagesStr]
  for (let p = 0; p < pageCount; p++) {
    allObjStrs.push(pageStrs[p])
    allObjStrs.push(streamStrs[p])
  }
  allObjStrs.push(fontStr)

  const byteOffsets = []  // 1-indexed (obj 1 = byteOffsets[0])
  for (const s of allObjStrs) {
    byteOffsets.push(pos)
    pos += Buffer.byteLength(s, 'latin1')
  }
  const xrefStart = pos

  const totalObjs = allObjStrs.length + 1  // +1 for obj 0
  const xrefLines = [
    `xref\n0 ${totalObjs}`,
    `0000000000 65535 f \r`,
    ...byteOffsets.map(o => `${String(o).padStart(10, '0')} 00000 n \r`),
  ]
  const xref    = xrefLines.join('\n') + '\n'
  const trailer = `trailer\n<</Size ${totalObjs} /Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF\n`

  return Buffer.from(header + allObjStrs.join('') + xref + trailer, 'latin1')
}

/** Format a number as "KES X,XXX" */
function fmt(n) {
  return 'KES ' + Number(n).toLocaleString('en-US')
}

/** Build the text lines for one invoice page */
function invoiceLines(inv) {
  const divider = '-'.repeat(52)
  const lines = [
    'JUMUIA HOSPITALS',
    'Tax Invoice',
    '',
    divider,
    `Invoice Number : ${inv.invoiceNumber}`,
    `Date           : ${inv.date}`,
    `Facility       : ${inv.facility}`,
    `Payment Point  : ${inv.paymentPoint}`,
    divider,
    '',
    'LINE ITEMS',
    '',
  ]
  inv.items.forEach((item, i) => {
    const desc = `${i + 1}. ${item.description}`
    const amt  = fmt(item.amount)
    lines.push(`${desc.padEnd(38)}${amt}`)
  })
  lines.push('')
  lines.push(divider)
  lines.push(`${'TOTAL AMOUNT'.padEnd(38)}${fmt(inv.amount)}`)
  lines.push(divider)
  lines.push('')
  lines.push(`Reference: ${inv.invoiceNumber}`)
  return lines
}

// ── Generate single-claim PDFs (INV-2026-013 … INV-2026-037) ────────────────

function generateSinglePDFs() {
  for (let idx = 12; idx <= 36; idx++) {
    const inv  = CATALOG[idx]
    const lines = invoiceLines(inv)
    const buf  = buildSinglePagePDF(lines)
    const file = path.join(SINGLE, `${inv.invoiceNumber}.pdf`)
    fs.writeFileSync(file, buf)
    console.log(`  ✓ single: ${path.basename(file)}  (${fmt(inv.amount)})`)
  }
}

// ── Generate bulk CSV files ──────────────────────────────────────────────────

function invToCSVRow(inv) {
  const itemsCell = inv.items.map(i => `${i.description}:${i.amount}`).join('|')
  return { 'Invoice Number': inv.invoiceNumber, Amount: inv.amount, Description: itemsCell,
           Facility: inv.facility, 'Payment Point': inv.paymentPoint, Date: inv.date }
}

function generateBulkCSVs() {
  // batch-1: INV-2026-038..047 — standard column order
  const batch1 = CATALOG.slice(37, 47).map(invToCSVRow)
  fs.writeFileSync(path.join(BULK, 'bulk-batch-1.csv'), toCSV(batch1))
  console.log('  ✓ bulk: bulk-batch-1.csv (10 rows, standard headers)')

  // batch-2: INV-2026-048..057 — shuffled column order to test auto-mapping
  const batch2 = CATALOG.slice(47, 57).map(inv => {
    const r = invToCSVRow(inv)
    return { Date: r.Date, 'Ref No': inv.invoiceNumber, 'Total': r.Amount,
             'Dept': inv.paymentPoint, 'Branch': inv.facility, 'Services': r.Description }
  })
  fs.writeFileSync(path.join(BULK, 'bulk-batch-2-alt-headers.csv'), toCSV(batch2))
  console.log('  ✓ bulk: bulk-batch-2-alt-headers.csv (10 rows, non-standard headers)')

  // batch-mixed: for error-scenario demo — mix valid + unknown + intentional amount mismatch
  const mixedRows = [
    ...CATALOG.slice(57, 62).map(invToCSVRow),  // 5 valid rows from batch-3 range
    { 'Invoice Number': 'INV-UNKNOWN-001', Amount: 5000, Description: 'Unknown service:5000',
      Facility: 'Jumuia Huruma', 'Payment Point': 'Consultation', Date: '2026-01-10' },
    { ...invToCSVRow(CATALOG[62]), Amount: 99999 },  // amount mismatch
    ...CATALOG.slice(63, 67).map(invToCSVRow),
  ]
  fs.writeFileSync(path.join(BULK, 'bulk-batch-mixed-scenarios.csv'), toCSV(mixedRows))
  console.log('  ✓ bulk: bulk-batch-mixed-scenarios.csv (mixed valid/error rows)')
}

function toCSV(rows) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const lines   = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map(h => {
      const v = String(row[h] ?? '')
      return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v
    }).join(','))
  }
  return lines.join('\r\n')
}

// ── Generate bulk XLSX files ─────────────────────────────────────────────────

function generateBulkXLSX() {
  // XLSX 1: INV-2026-058..067 (but batch-3 CSV already used 058..066, so use 068..077)
  const batch3 = CATALOG.slice(57, 67).map(invToCSVRow)
  writeXLSX(path.join(BULK, 'bulk-batch-3.xlsx'), 'Claims', batch3)
  console.log('  ✓ bulk: bulk-batch-3.xlsx (10 rows)')

  // XLSX 2: INV-2026-068..077 — with extra decorator columns
  const batch4 = CATALOG.slice(67, 77).map(inv => ({
    'Claim Reference': inv.invoiceNumber,
    'Claim Amount':    inv.amount,
    'Services Rendered': inv.items.map(i => `${i.description}:${i.amount}`).join('|'),
    'Hospital Branch': inv.facility,
    'Service Unit':    inv.paymentPoint,
    'Service Date':    inv.date,
    'Submitted By':    'Finance Dept',
    'Approved':        '',
  }))
  writeXLSX(path.join(BULK, 'bulk-batch-4-extra-columns.xlsx'), 'Claims', batch4)
  console.log('  ✓ bulk: bulk-batch-4-extra-columns.xlsx (10 rows, extra columns)')
}

function writeXLSX(filePath, sheetName, rows) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filePath)
}

// ── Generate bulk multi-page PDF (INV-2026-078..087) ────────────────────────

function generateBulkPDF() {
  const pageStreams = CATALOG.slice(77, 87).map(inv => {
    const lines = invoiceLines(inv)
    let y = 740
    const parts = ['BT', '/F1 11 Tf']
    for (const line of lines) {
      parts.push(`1 0 0 1 50 ${y} Tm`)
      parts.push(`(${pdfEsc(line)}) Tj`)
      y -= 15
    }
    parts.push('ET')
    return parts.join('\n') + '\n'
  })
  const buf = buildMultiPagePDF(pageStreams)
  const file = path.join(BULK, 'bulk-multipage.pdf')
  fs.writeFileSync(file, buf)
  console.log(`  ✓ bulk: bulk-multipage.pdf (10 pages, INV-2026-078..087)`)
}

// ── Write seed-data.json ─────────────────────────────────────────────────────

function generateSeedJSON() {
  const claims = buildSeedClaims()
  const out = JSON.stringify({ version: '2.0.0', claims }, null, 2)
  fs.writeFileSync(path.join(ROOT, 'public/seed-data.json'), out)
  console.log(`  ✓ seed-data.json (${claims.length} claims)`)
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log('\nGenerating seed data…')
generateSeedJSON()

console.log('\nGenerating single-claim PDFs…')
generateSinglePDFs()

console.log('\nGenerating bulk CSV files…')
generateBulkCSVs()

console.log('\nGenerating bulk XLSX files…')
generateBulkXLSX()

console.log('\nGenerating bulk multi-page PDF…')
generateBulkPDF()

console.log('\n✅  All sample files generated.\n')
