// src/services/pdfGeneratorPR.js
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
  const map = { DR: 'Draft', CO: 'Completed', CL: 'Closed', VO: 'Voided', IN: 'In Progress' }
  return map[s] || s || '-'
}

function approvalLabel(s) {
  const map = { '0': 'Submit Approval', '1': 'Pending', '2': 'Approved', '3': 'Rejected' }
  return map[s] || s || '-'
}

function lineStatusLabel(s) {
  const map = { O: 'Open', C: 'Closed', CA: 'Cancelled', P: 'Processed' }
  return map[s] || s || '-'
}

// ── Main Generator ─────────────────────────────────────────
export async function generatePRPDF(pr, lines) {
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
  doc.text('PERMINTAAN PEMBELIAN (PURCHASE REQUISITION)', pageW / 2, 50, { align: 'center' })
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

  // Baris kiri
  const leftFields = [
    ['No. Dokumen',    pr.documentNo || '-'],
    ['Status',         statusLabel(pr.documentStatus)],
    ['Status Persetujuan', approvalLabel(pr.rapvStatus)],
    ['Organisasi',     pr['organization$_identifier'] || '-'],
    ['Pemohon',        pr['userContact$_identifier'] || '-'],
  ]
  // Baris kanan
  const rightFields = [
    ['Vendor',         bpName(pr['businessPartner$_identifier'])],
    ['Departemen',     pr['gmmDepartement$_identifier'] || '-'],
    ['Daftar Harga',   pr['priceList$_identifier'] || '-'],
    ['Mata Uang',      pr['currency$_identifier'] || '-'],
    ['Tanggal Dibuat', formatDate(pr.creationDate)],
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

  // Deskripsi full-width
  if (pr.description) {
    doc.setFont('helvetica', 'bold')
    doc.text('Deskripsi', colLeft, y)
    doc.setFont('helvetica', 'normal')
    const descLines = doc.splitTextToSize(': ' + pr.description, pageW - colMid - margin)
    doc.text(descLines, colMid, y)
    y += lh * descLines.length
  }

  y += 4

  // ── 4. TABEL LINES ─────────────────────────────────────────
  const tableBody = lines.map((ln, idx) => [
    { content: String(ln.lineNo || (idx + 1) * 10), styles: { halign: 'center' } },
    { content: ln['product$_identifier'] || '-' },
    { content: String(ln.quantity ?? '-'), styles: { halign: 'center' } },
    { content: ln['uOM$_identifier'] || '-', styles: { halign: 'center' } },
    { content: formatDate(ln.needByDate) },
    { content: bpName(ln['businessPartner$_identifier']) },
    { content: ln['bgtCBudgetline$_identifier'] || '-' },
    { content: formatCurrency(ln.unitPrice), styles: { halign: 'right' } },
    { content: formatCurrency(ln.lineNetAmount), styles: { halign: 'right' } },
    { content: lineStatusLabel(ln.requisitionLineStatus), styles: { halign: 'center' } },
  ])

  // Hitung grand total dari semua lines
  const grandTotal = lines.reduce((sum, ln) => sum + (ln.lineNetAmount || 0), 0)

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
      0: { cellWidth:  8 },  // No.
      1: { cellWidth: 32 },  // Produk
      2: { cellWidth: 10 },  // Qty
      3: { cellWidth: 11 },  // UOM
      4: { cellWidth: 18 },  // Tgl Butuh
      5: { cellWidth: 26 },  // Vendor
      6: { cellWidth: 19 },  // Anggaran
      7: { cellWidth: 22 },  // Harga Satuan
      8: { cellWidth: 20 },  // Jumlah Net
      9: { cellWidth: 14 },  // Status   → total = 180mm
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
      'Produk',
      { content: 'Qty', styles: { halign: 'center' } },
      { content: 'UOM', styles: { halign: 'center' } },
      'Tgl. Dibutuhkan',
      'Vendor',
      'Anggaran',
      { content: 'Harga Satuan (Rp.)', styles: { halign: 'right' } },
      { content: 'Jumlah Net (Rp.)', styles: { halign: 'right' } },
      { content: 'Status', styles: { halign: 'center' } },
    ]],
    body: tableBody.length ? tableBody : [[
      { content: 'Tidak ada detail.', colSpan: 10, styles: { halign: 'center', fontStyle: 'italic' } }
    ]],
    foot: [[
      {
        content: 'Total Keseluruhan (Rp.)',
        colSpan: 8,
        styles: { fontStyle: 'bold', halign: 'right' },
      },
      {
        content: formatCurrency(grandTotal),
        styles: { fontStyle: 'bold', halign: 'right' },
      },
      { content: '' },
    ]],
  })

  // ── 5. CATATAN & TANDA TANGAN ──────────────────────────────
  const finalY = doc.lastAutoTable.finalY + 14

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'italic')
  doc.text('* Dokumen ini digenerate secara otomatis oleh sistem.', margin, finalY)

  // Kolom tanda tangan
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

  // ── 6. SIMPAN ──────────────────────────────────────────────
  const safeDocNo = (pr.documentNo || 'PR').replace(/[^a-zA-Z0-9-]/g, '_')
  doc.save(`PR_${safeDocNo}.pdf`)
}