// src/services/pdfGeneratorVendorInvoice.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoPits from '../../public/assets/logo-pits.png'

// ── Helpers ───────────────────────────────────────────────
function formatCurrency(amount) {
  if (amount == null) return '0'
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount)
}

function formatDate(d) {
  if (!d) return '-'
  const dt = new Date(d)
  if (isNaN(dt)) return d
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

function bpName(identifier) {
  if (!identifier) return '-'
  return identifier.includes(' - ') ? identifier.split(' - ').slice(1).join(' - ') : identifier
}

function statusLabel(s) {
  const map = { DR: 'Draft', CO: 'Completed', CL: 'Closed', VO: 'Voided', RE: 'Reversed' }
  return map[s] || s || '-'
}

// ── Main Generator ─────────────────────────────────────────
export async function generateVendorInvoicePDF(invoice, lines) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 15

  // ── 1. HEADER ─────────────────────────────────────────────
  try {
    const img = new Image()
    img.src = logoPits
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = () => reject(new Error('Gagal memuat logo'))
    })
    doc.addImage(img, 'PNG', margin, 12, 28, 25)
  } catch (e) {
    console.warn('Gagal memuat logo:', e)
  }

  // Nama perusahaan
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('PERSEROAN DAERAH PEMBANGUNAN INVESTASI TANGERANG', 46, 20)
  doc.text('SELATAN (PERSERODA PITS)', 46, 26)
  doc.text('KOTA TANGERANG SELATAN', 46, 32)

  // Garis pembatas header
  doc.setLineWidth(0.6)
  doc.line(margin, 42, pageW - margin, 42)

  // ── 2. JUDUL DOKUMEN ───────────────────────────────────────
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('FAKTUR VENDOR (VENDOR INVOICE)', pageW / 2, 50, { align: 'center' })
  doc.setLineWidth(0.3)
  doc.line(margin, 53, pageW - margin, 53)

  // ── 3. INFO HEADER ─────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)

  const colLeft  = margin
  const colMid   = 75
  const colRight = 120
  const colRVal  = 155
  let y = 62
  const lh = 6.5

  const leftFields = [
    ['No. Faktur',         invoice.documentNo || '-'],
    ['Tanggal Faktur',     formatDate(invoice.invoiceDate)],
    ['Tanggal Akuntansi',  formatDate(invoice.accountingDate)],
    ['Status',             statusLabel(invoice.documentStatus)],
    ['Organisasi',         invoice['organization$_identifier'] || '-'],
  ]

  const rightFields = [
    ['Vendor',              bpName(invoice['businessPartner$_identifier'])],
    ['Alamat Vendor',       invoice['partnerAddress$_identifier'] || '-'],
    ['Term Pembayaran',     invoice['paymentTerms$_identifier'] || '-'],
    ['Metode Pembayaran',   invoice['paymentMethod$_identifier'] || '-'],
    ['Referensi Order',     invoice.orderReference || '-'],
  ]

  const maxRows = Math.max(leftFields.length, rightFields.length)
  for (let i = 0; i < maxRows; i++) {
    if (leftFields[i]) {
      doc.setFont('helvetica', 'bold')
      doc.text(leftFields[i][0], colLeft, y)
      doc.setFont('helvetica', 'normal')
      doc.text(': ' + leftFields[i][1], colMid, y)
    }
    if (rightFields[i]) {
      doc.setFont('helvetica', 'bold')
      doc.text(rightFields[i][0], colRight, y)
      doc.setFont('helvetica', 'normal')
      doc.text(': ' + rightFields[i][1], colRVal, y)
    }
    y += lh
  }

  // Deskripsi full-width (jika ada)
  if (invoice.description) {
    doc.setFont('helvetica', 'bold')
    doc.text('Deskripsi', colLeft, y)
    doc.setFont('helvetica', 'normal')
    const descLines = doc.splitTextToSize(': ' + invoice.description, pageW - colMid - margin)
    doc.text(descLines, colMid, y)
    y += lh * descLines.length
  }

  y += 4

  // ── 4. TABEL LINES ─────────────────────────────────────────
  const subtotal   = lines.reduce((s, l) => s + (Number(l.lineNetAmount) || 0), 0)
  const grandTotal = Number(invoice.grandTotalAmount) || subtotal
  const totalTax   = grandTotal - subtotal

  const tableBody = lines.map((ln, idx) => [
    { content: String(ln.lineNo || (idx + 1) * 10), styles: { halign: 'center' } },
    { content: ln['product$_identifier'] || '-' },
    { content: String(ln.invoicedQuantity ?? '-'), styles: { halign: 'center' } },
    { content: ln['uOM$_identifier'] || '-', styles: { halign: 'center' } },
    { content: formatCurrency(ln.unitPrice), styles: { halign: 'right' } },
    { content: ln['tax$_identifier'] || '-', styles: { halign: 'center' } },
    { content: formatCurrency(ln.lineNetAmount), styles: { halign: 'right' } },
  ])

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: [0, 0, 0],
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
      overflow: 'linebreak',
    },
    headStyles: {
      fontStyle: 'bold',
      halign: 'center',
      fillColor: [240, 240, 240],
    },
    columnStyles: {
      0: { cellWidth: 12 },   // No.
      1: { cellWidth: 60 },   // Produk
      2: { cellWidth: 16 },   // Qty
      3: { cellWidth: 18 },   // UOM
      4: { cellWidth: 30 },   // Harga Satuan
      5: { cellWidth: 22 },   // Pajak
      6: { cellWidth: 22 },   // Jumlah Net
    },
    didDrawCell: (data) => {
      doc.setDrawColor(0)
      doc.setLineWidth(0.2)
      if (data.section === 'head') {
        doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y)
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height)
      }
      if (data.section === 'foot' && data.row.index === 0) {
        doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y)
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height)
      }
    },
    head: [[
      { content: 'No.', styles: { halign: 'center' } },
      'Produk / Jasa',
      { content: 'Qty', styles: { halign: 'center' } },
      { content: 'UOM', styles: { halign: 'center' } },
      { content: 'Harga Satuan (Rp.)', styles: { halign: 'right' } },
      { content: 'Pajak', styles: { halign: 'center' } },
      { content: 'Jumlah Net (Rp.)', styles: { halign: 'right' } },
    ]],
    body: tableBody.length ? tableBody : [[
      { content: 'Tidak ada item.', colSpan: 7, styles: { halign: 'center', fontStyle: 'italic' } }
    ]],
    foot: [[
      {
        content: 'Subtotal (Rp.)',
        colSpan: 6,
        styles: { fontStyle: 'bold', halign: 'right' },
      },
      {
        content: formatCurrency(subtotal),
        styles: { fontStyle: 'bold', halign: 'right' },
      },
    ]],
  })

  // ── 5. RINGKASAN TOTAL ─────────────────────────────────────
  const summaryY = doc.lastAutoTable.finalY + 4
  const sumLabelX = pageW - margin - 70
  const sumColonX = pageW - margin - 28
  const sumValX   = pageW - margin

  doc.setFontSize(9)
  const summaryRows = [
    ['Subtotal',   formatCurrency(subtotal)],
    ['Total Pajak', formatCurrency(totalTax)],
  ]

  let sy = summaryY
  summaryRows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal')
    doc.text(label, sumLabelX, sy)
    doc.text(':', sumColonX, sy)
    doc.text('Rp. ' + val, sumValX, sy, { align: 'right' })
    sy += 6
  })

  // Grand total — kotak tersendiri
  doc.setLineWidth(0.4)
  doc.line(sumLabelX - 2, sy - 1, sumValX + 1, sy - 1)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Total Invoice', sumLabelX, sy + 5)
  doc.text(':', sumColonX, sy + 5)
  doc.text('Rp. ' + formatCurrency(grandTotal), sumValX, sy + 5, { align: 'right' })
  doc.setLineWidth(0.4)
  doc.line(sumLabelX - 2, sy + 8, sumValX + 1, sy + 8)

  // ── 6. CATATAN & TANDA TANGAN ──────────────────────────────
  const finalY = sy + 22

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'italic')
  doc.text('* Dokumen ini digenerate secara otomatis oleh sistem.', margin, finalY)

  const sigY      = finalY + 10
  const sigBoxH   = 20
  const sigBoxW   = 40
  const sigCount  = 4
  const totalSigW = pageW - margin * 2
  const sigGap    = (totalSigW - sigBoxW * sigCount) / (sigCount - 1)
  const sigLabels  = ['Dibuat Oleh', 'Diperiksa Oleh', 'Disetujui Oleh', 'Penerima']

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  sigLabels.forEach((label, i) => {
    const x = margin + i * (sigBoxW + sigGap)
    // Label di atas kotak
    doc.text(label, x + sigBoxW / 2, sigY, { align: 'center' })
    // Kotak tanda tangan
    doc.rect(x, sigY + 4, sigBoxW, sigBoxH)
    // Tanda tangan dalam kurung
    doc.text('(________________)', x + sigBoxW / 2, sigY + 4 + sigBoxH + 6, { align: 'center' })
    // Jabatan (kosong)
    doc.text('', x + sigBoxW / 2, sigY + 4 + sigBoxH + 12, { align: 'center' })
  })

  // ── 7. SIMPAN ──────────────────────────────────────────────
  const safeDocNo = (invoice.documentNo || 'VI').replace(/[^a-zA-Z0-9-]/g, '_')
  doc.save(`VendorInvoice_${safeDocNo}.pdf`)
}