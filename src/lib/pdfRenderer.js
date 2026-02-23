/**
 * pdf.js wrapper — renders PDF pages to canvas elements for OCR
 */
import * as pdfjsLib from 'pdfjs-dist'

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

/**
 * Render all pages of a PDF file to canvas elements
 * @param {File} file
 * @param {(page: number, total: number) => void} onProgress
 * @returns {Promise<HTMLCanvasElement[]>}
 */
export async function renderPdfToCanvases(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const canvases = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const scale = 2.0 // higher scale = better OCR
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height

    const ctx = canvas.getContext('2d')
    await page.render({ canvasContext: ctx, viewport }).promise

    canvases.push(canvas)
    onProgress?.(pageNum, pdf.numPages)
  }

  return canvases
}

/**
 * Get page count of a PDF file
 */
export async function getPdfPageCount(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  return pdf.numPages
}
