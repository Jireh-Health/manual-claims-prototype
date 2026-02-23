/**
 * SheetJS + CSV parser with auto column-mapping.
 * Item format in spreadsheets: "Description:price|Description:price" (pipe or semicolon separated)
 */
import * as XLSX from 'xlsx'

// Column header synonyms for auto-mapping
const INVOICE_SYNONYMS   = ['invoice', 'invoice number', 'invoice no', 'invoice_number', 'inv no', 'inv_no', 'inv #', 'reference', 'ref', 'invoice_no']
const AMOUNT_SYNONYMS    = ['amount', 'total', 'total amount', 'grand total', 'net amount', 'value', 'cost', 'price', 'sum', 'claim_amount', 'claimed_amount']
const ITEMS_SYNONYMS     = ['items', 'description', 'services', 'line items', 'details', 'treatment', 'procedure', 'service description', 'item_description']
const FACILITY_SYNONYMS  = ['facility', 'hospital', 'clinic', 'branch', 'site', 'location', 'facility name']
const PAYMENT_SYNONYMS   = ['payment point', 'payment_point', 'department', 'service point', 'point', 'section', 'unit']
const DATE_SYNONYMS      = ['date', 'invoice date', 'service date', 'claim date', 'date_of_service', 'visit_date']

function normalize(str) {
  return str?.toString().toLowerCase().replace(/[^a-z0-9]/g, ' ').trim() || ''
}

function findColumn(headers, synonyms) {
  const normHeaders = headers.map(normalize)
  // Exact match first
  for (const syn of synonyms) {
    const idx = normHeaders.findIndex((h) => h === normalize(syn))
    if (idx !== -1) return headers[idx]
  }
  // Partial match
  for (const syn of synonyms) {
    const idx = normHeaders.findIndex((h) => h.includes(normalize(syn)))
    if (idx !== -1) return headers[idx]
  }
  return null
}

export function autoDetectMapping(headers) {
  return {
    invoiceCol:      findColumn(headers, INVOICE_SYNONYMS),
    amountCol:       findColumn(headers, AMOUNT_SYNONYMS),
    itemsCol:        findColumn(headers, ITEMS_SYNONYMS),
    facilityCol:     findColumn(headers, FACILITY_SYNONYMS),
    paymentPointCol: findColumn(headers, PAYMENT_SYNONYMS),
    dateCol:         findColumn(headers, DATE_SYNONYMS),
  }
}

/**
 * Parse item cells that may contain "Description:price" pairs separated by | or ;
 * Falls back to description-only (amount: 0) if no colon is found.
 */
function parseItemsCell(raw) {
  if (!raw) return []
  return String(raw)
    .split(/[|;]/)
    .map((s) => {
      const trimmed = s.trim()
      if (!trimmed) return null
      const colonIdx = trimmed.lastIndexOf(':')
      if (colonIdx > 0) {
        const desc   = trimmed.slice(0, colonIdx).trim()
        const amount = parseFloat(trimmed.slice(colonIdx + 1).replace(/[^0-9.]/g, '')) || 0
        return { id: crypto.randomUUID(), description: desc, amount }
      }
      return { id: crypto.randomUUID(), description: trimmed, amount: 0 }
    })
    .filter(Boolean)
}

/**
 * Apply column mapping to raw rows.
 * If items have priced entries, their sum overwrites the amount column value.
 */
export function applyMapping(rows, mapping) {
  return rows.map((row) => {
    const items = mapping.itemsCol ? parseItemsCell(row[mapping.itemsCol]) : []

    // Derive total: prefer sum of item prices if any item is priced, else use amount column
    const itemsTotal = items.reduce((s, i) => s + i.amount, 0)
    const colAmount  = parseFloat(String(row[mapping.amountCol] || '0').replace(/[^0-9.]/g, '')) || 0
    const amount     = itemsTotal > 0 ? itemsTotal : colAmount

    return {
      id:           crypto.randomUUID(),
      invoiceNumber: row[mapping.invoiceCol] || '',
      amount,
      items,
      facility:     mapping.facilityCol     ? (row[mapping.facilityCol]     || '') : '',
      paymentPoint: mapping.paymentPointCol ? (row[mapping.paymentPointCol] || '') : '',
      date:         mapping.dateCol         ? (row[mapping.dateCol]         || '') : '',
      rawRow:       row,
      status:       'pending',
      verifyResult: null,
    }
  })
}

/**
 * Parse a CSV file → { headers, rows, sampleRows }
 */
export async function parseCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'string', raw: false })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
        const headers = rows.length > 0 ? Object.keys(rows[0]) : []
        resolve({ headers, rows, sampleRows: rows.slice(0, 3) })
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

/**
 * Parse an XLSX file → { headers, rows, sampleRows }
 */
export async function parseXLSX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
        const headers = rows.length > 0 ? Object.keys(rows[0]) : []
        resolve({ headers, rows, sampleRows: rows.slice(0, 3) })
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

export async function parseSpreadsheet(file) {
  const name = file.name.toLowerCase()
  const mime = file.type
  const isCsv = name.endsWith('.csv') || mime === 'text/csv'
  return isCsv ? parseCSV(file) : parseXLSX(file)
}
