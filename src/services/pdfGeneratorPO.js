// src/services/pdfGeneratorPO.js
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

function statusLabel(s) {
  const map = { DR: 'Draft', CO: 'Booked/Completed', CL: 'Closed', VO: 'Voided', IP: 'In Progress' }
  return map[s] || s || '-'
}

function terbilang(angka) {
  const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan',
    'sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas',
    'tujuh belas', 'delapan belas', 'sembilan belas']
  const puluhan = ['', '', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh',
    'enam puluh', 'tujuh puluh', 'delapan puluh', 'sembilan puluh']

  function spell(n) {
    if (n < 20) return satuan[n]
    if (n < 100) return (puluhan[Math.floor(n / 10)] + (n % 10 ? ' ' + satuan[n % 10] : '')).trim()
    if (n < 200) return 'seratus' + (n % 100 ? ' ' + spell(n % 100) : '')
    if (n < 1000) return satuan[Math.floor(n / 100)] + ' ratus' + (n % 100 ? ' ' + spell(n % 100) : '')
    if (n < 2000) return 'seribu' + (n % 1000 ? ' ' + spell(n % 1000) : '')
    if (n < 1000000) return spell(Math.floor(n / 1000)) + ' ribu' + (n % 1000 ? ' ' + spell(n % 1000) : '')
    if (n < 1000000000) return spell(Math.floor(n / 1000000)) + ' juta' + (n % 1000000 ? ' ' + spell(n % 1000000) : '')
    return spell(Math.floor(n / 1000000000)) + ' miliar' + (n % 1000000000 ? ' ' + spell(n % 1000000000) : '')
  }

  if (!angka || isNaN(angka)) return 'nol'
  const n = Math.round(Math.abs(angka))
  if (n === 0) return 'nol'
  const result = spell(n)
  return result.trim() + ' rupiah'
}

// ── Main Generator ─────────────────────────────────────────
export async function generatePOPDF(po, lines) {
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

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('PERSEROAN DAERAH PEMBANGUNAN INVESTASI TANGERANG', 46, 20)
  doc.text('SELATAN (PERSERODA PITS)', 46, 26)
  doc.text('KOTA TANGERANG SELATAN', 46, 32)

  doc.setLineWidth(0.6)
  doc.line(margin, 42, pageW - margin, 42)

  // ── 2. JUDUL ───────────────────────────────────────────────
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('PESANAN PEMBELIAN (PURCHASE ORDER)', pageW / 2, 50, { align: 'center' })
  doc.setLineWidth(0.3)
  doc.line(margin, 53, pageW - margin, 53)

  // ── 3. INFO HEADER (2 kolom) ───────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)

  const colLeft  = margin
  const colMid   = 65
  const colRight = 115
  const colRVal  = 155
  let y = 62
  const lh = 6.5

  const leftFields = [
    ['No. Pesanan',        po.documentNo || '-'],
    ['Tanggal Pesanan',    formatDate(po.orderDate)],
    ['Est. Kedatangan',    formatDate(po.scheduledDeliveryDate)],
    ['Status',             statusLabel(po.documentStatus)],
    ['Organisasi',         po['organization$_identifier'] || '-'],
  ]

  const rightFields = [
    ['Vendor',             po['businessPartner$_identifier'] || '-'],
    ['Alamat Mitra',       po['partnerAddress$_identifier'] || '-'],
    ['Gudang',             po['warehouse$_identifier'] || '-'],
    ['Daftar Harga',       po['priceList$_identifier'] || '-'],
    ['Syarat Pembayaran',  po['paymentTerms$_identifier'] || '-'],
  ]

  const maxRows = Math.max(leftFields.length, rightFields.length)
  for (let i = 0; i < maxRows; i++) {
    if (leftFields[i]) {
      doc.setFont('helvetica', 'bold')
      doc.text(leftFields[i][0], colLeft, y)
      doc.setFont('helvetica', 'normal')
      doc.text(': ' + String(leftFields[i][1]).substring(0, 50), colMid, y)
    }
    if (rightFields[i]) {
      doc.setFont('helvetica', 'bold')
      doc.text(rightFields[i][0], colRight, y)
      doc.setFont('helvetica', 'normal')
      doc.text(': ' + String(rightFields[i][1]).substring(0, 35), colRVal, y)
    }
    y += lh
  }

  // Metode pembayaran
  doc.setFont('helvetica', 'bold')
  doc.text('Metode Pembayaran', colLeft, y)
  doc.setFont('helvetica', 'normal')
  doc.text(': ' + (po['paymentMethod$_identifier'] || '-'), colMid, y)

  if (po.orderReference) {
    doc.setFont('helvetica', 'bold')
    doc.text('Ref. Pesanan', colRight, y)
    doc.setFont('helvetica', 'normal')
    doc.text(': ' + po.orderReference, colRVal, y)
  }
  y += lh

  if (po.description) {
    doc.setFont('helvetica', 'bold')
    doc.text('Deskripsi', colLeft, y)
    doc.setFont('helvetica', 'normal')
    const descLines = doc.splitTextToSize(': ' + po.description, pageW - colMid - margin)
    doc.text(descLines, colMid, y)
    y += lh * descLines.length
  }

  y += 4

  // ── 4. TABEL ITEM ──────────────────────────────────────────
  const tableBody = lines.map((ln, idx) => [
    { content: String(ln.lineNo || (idx + 1) * 10), styles: { halign: 'center' } },
    { content: ln['product$_identifier'] || '-' },
    { content: String(ln.orderedQuantity ?? '-'), styles: { halign: 'center' } },
    { content: ln['uOM$_identifier'] || '-', styles: { halign: 'center' } },
    { content: formatCurrency(ln.unitPrice), styles: { halign: 'right' } },
    { content: formatCurrency(ln.lineNetAmount), styles: { halign: 'right' } },
    { content: ln['tax$_identifier'] || '-', styles: { halign: 'center' } },
  ])

  // Kalkulasi subtotal & pajak
  const subtotal  = po.summedLineAmount ?? lines.reduce((s, l) => s + (l.lineNetAmount || 0), 0)
  const grandTotal = po.grandTotalAmount ?? 0
  const taxAmount  = grandTotal - subtotal

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
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
      0: { cellWidth: 10 },   // #
      1: { cellWidth: 65 },   // Produk
      2: { cellWidth: 15 },   // Qty
      3: { cellWidth: 14 },   // UOM
      4: { cellWidth: 28 },   // Harga Satuan
      5: { cellWidth: 28 },   // Jumlah Tetap
      6: { cellWidth: 20 },   // Pajak
    },
    didDrawCell: (data) => {
      doc.setDrawColor(0)
      doc.setLineWidth(0.2)
      if (data.section === 'head') {
        doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y)
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height)
      }
      if (data.section === 'foot') {
        if (data.row.index === 0) {
          doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y)
        }
        if (data.row.index === data.table.foot.length - 1) {
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height)
        }
      }
    },
    head: [[
      { content: '#', styles: { halign: 'center' } },
      'Produk',
      { content: 'Qty', styles: { halign: 'center' } },
      { content: 'UOM', styles: { halign: 'center' } },
      { content: 'Harga Satuan (Rp.)', styles: { halign: 'right' } },
      { content: 'Jumlah Tetap (Rp.)', styles: { halign: 'right' } },
      { content: 'Pajak', styles: { halign: 'center' } },
    ]],
    body: tableBody.length ? tableBody : [[
      { content: 'Tidak ada item.', colSpan: 7, styles: { halign: 'center', fontStyle: 'italic' } }
    ]],
    foot: [
      [
        { content: 'Subtotal (Rp.)', colSpan: 5, styles: { halign: 'right', fontStyle: 'normal' } },
        { content: formatCurrency(subtotal), styles: { halign: 'right' } },
        { content: '' },
      ],
      [
        { content: 'Pajak (Rp.)', colSpan: 5, styles: { halign: 'right', fontStyle: 'normal' } },
        { content: formatCurrency(taxAmount), styles: { halign: 'right' } },
        { content: '' },
      ],
      [
        { content: 'Grand Total (Rp.)', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatCurrency(grandTotal), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: '' },
      ],
    ],
  })

  // ── 5. TERBILANG ───────────────────────────────────────────
  const finalY = doc.lastAutoTable.finalY + 6
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'italic')
  const terbilangText = 'Terbilang: ' + terbilang(grandTotal)
  const terbilangLines = doc.splitTextToSize(terbilangText, pageW - margin * 2)
  doc.text(terbilangLines, margin, finalY)

  // ── 6. CATATAN ─────────────────────────────────────────────
  const noteY = finalY + terbilangLines.length * 5 + 6
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.text('* Dokumen ini digenerate secara otomatis oleh sistem.', margin, noteY)
  doc.text('* Harap konfirmasi kesanggupan pengiriman dalam 3 hari kerja setelah dokumen ini diterima.', margin, noteY + 5)

  // ── 7. TANDA TANGAN ────────────────────────────────────────
  const sigY      = noteY + 18
  const sigLabels  = ['Dibuat Oleh', 'Diperiksa Oleh', 'Disetujui Oleh', 'Vendor / Penerima']
  const sigBoxH   = 20
  const sigBoxW   = 40
  const sigCount  = 4
  const totalSigW = pageW - margin * 2
  const sigGap    = (totalSigW - sigBoxW * sigCount) / (sigCount - 1)


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

  // ── 8. SIMPAN ──────────────────────────────────────────────
  const safeDocNo = (po.documentNo || 'PO').replace(/[^a-zA-Z0-9-]/g, '_')
  doc.save(`PO_${safeDocNo}.pdf`)
}