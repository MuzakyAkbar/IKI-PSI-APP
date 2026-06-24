// src/services/pdfGenerator.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoPits from '../../public/assets/logo-pits.png'

// Helper untuk format Rupiah
function formatCurrency(amount) {
  if (amount == null) return '0'
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount)
}

// Helper untuk format Bulan Tahun (misal: "Mei 2026")
function formatBulanTahun(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

export async function generateDocumentPDF(title, invoice, lines) {
  const doc = new jsPDF('p', 'mm', 'a4')

  // 1. HEADER (Logo & Nama Perusahaan)
  try {
    const img = new Image()
    img.src = logoPits
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = () => reject(new Error('Gagal meload gambar'))
    })
    doc.addImage(img, 'PNG', 15, 12, 28, 25)
  } catch (e) {
    console.warn('Gagal memuat logo:', e)
  }

  // Teks Header Perusahaan
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('PERSEROAN DAERAH PEMBANGUNAN INVESTASI TANGERANG', 46, 20)
  doc.text('SELATAN (PERSERODA PITS)', 46, 26)
  doc.text('KOTA TANGERANG SELATAN', 46, 32)

  // 2. JUDUL DOKUMEN
  doc.setFontSize(12)
  doc.text('INFORMASI TAGIHAN REKENING AIR PELANGGAN', 105, 48, { align: 'center' })
  doc.setLineWidth(0.4)
  doc.line(46, 49, 164, 49)

  // 3. INFORMASI PELANGGAN
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  const startYInfo = 60
  const lineH = 6

  let namaPelanggan = invoice['businessPartner$_identifier'] || '-'
  if (namaPelanggan.includes(' - ')) {
    namaPelanggan = namaPelanggan.split(' - ').slice(1).join(' - ')
  }

  const alamat = invoice['partnerAddress$_identifier'] || '-'
  
  // Mengambil No Sambung dari Code Customer dengan fallback yang aman
  const kodePelanggan = invoice.kodePelanggan || (invoice['businessPartner$_identifier']?.includes(' - ') ? invoice['businessPartner$_identifier'].split(' - ')[0] : '-')

  doc.text('No Sambung', 15, startYInfo)
  doc.text(': ' + kodePelanggan, 46, startYInfo)

  doc.text('Nama Pelanggan', 15, startYInfo + lineH)
  doc.text(': ' + namaPelanggan, 46, startYInfo + lineH)

  doc.text('Alamat Pelanggan', 15, startYInfo + (lineH * 2))
  doc.text(': ' + alamat, 46, startYInfo + (lineH * 2))

  doc.text('Tahun Tagihan', 15, startYInfo + (lineH * 3))
  doc.text(': ' + (invoice.invoiceDate ? new Date(invoice.invoiceDate).getFullYear() : '-'), 46, startYInfo + (lineH * 3))

  doc.text('Diproses Tanggal', 15, startYInfo + (lineH * 4))
  doc.text(': ' + new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }), 46, startYInfo + (lineH * 4))

  // 4. TABEL TAGIHAN
  // Map setiap item line (untuk M3) sebagai baris di body tabel
  const tableBody = lines && lines.length > 0 
    ? lines.map((line) => [
        { content: formatBulanTahun(invoice.invoiceDate), styles: { halign: 'center' } },
        { content: String(line.invoicedQuantity ?? '0'), styles: { halign: 'center' } },
        { content: formatCurrency(line.lineNetAmount), styles: { halign: 'right' } }
      ])
    : [
        // Fallback jika lines kosong/tidak dimuat
        [
          { content: formatBulanTahun(invoice.invoiceDate), styles: { halign: 'center' } },
          { content: '0', styles: { halign: 'center' } },
          { content: '0', styles: { halign: 'right' } }
        ]
      ]

  // Menghitung Subtotal dan PPN (Pajak)
  const subtotal = invoice.summedLineAmount || 0
  const taxAmount = (invoice.grandTotalAmount || 0) - subtotal
  
  // Mengambil nama pajak dari line pertama jika tersedia (Misal: "PPN 11%")
  let taxLabel = 'PPN / Pajak'
  if (lines && lines.length > 0 && lines[0]['tax$_identifier']) {
    taxLabel = lines[0]['tax$_identifier']
  }
  taxLabel += ' Rp.'

  autoTable(doc, {
    startY: startYInfo + (lineH * 4) + 8,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [0, 0, 0],
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 }
    },
    headStyles: {
      fontStyle: 'bold',
      valign: 'middle',
      halign: 'center'
    },
    didDrawCell: (data) => {
      if (data.section === 'head') {
        doc.setDrawColor(0)
        doc.setLineWidth(0.3)
        // Garis atas dan bawah untuk baris header
        doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y)
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height)
      }
      if (data.section === 'foot') {
        doc.setDrawColor(0)
        doc.setLineWidth(0.3)
        // Garis atas hanya untuk baris pertama footer (Subtotal)
        if (data.row.index === 0) {
          doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y)
        }
        // Garis bawah hanya untuk baris terakhir footer (Jumlah Tagihan)
        if (data.row.index === data.table.foot.length - 1) {
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height)
        }
      }
    },
    head: [
      [
        { content: 'Bulan - Tahun\nRekening' },
        { content: 'M3' },
        { content: 'Tagihan (Rp.)' }
      ]
    ],
    body: tableBody,
    foot: [
      [
        { content: 'Subtotal Rp.', colSpan: 2, styles: { halign: 'left' } },
        { content: formatCurrency(subtotal), styles: { halign: 'right' } }
      ],
      [
        { content: taxLabel, colSpan: 2, styles: { halign: 'left' } },
        { content: formatCurrency(taxAmount), styles: { halign: 'right' } }
      ],
      [
        { content: 'Jumlah Tagihan Rp.', colSpan: 2, styles: { fontStyle: 'bold', halign: 'left' } },
        { content: formatCurrency(invoice.grandTotalAmount), styles: { fontStyle: 'bold', halign: 'right' } }
      ]
    ],
  })

  // 5. KETERANGAN / FOOTER NOTES
  const finalY = doc.lastAutoTable.finalY + 12

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  doc.text('Keterangan :', 15, finalY)
  doc.text('Lembar informasi ini bukan merupakan bukti pembayaran', 15, finalY + 5)
  doc.text('Informasi tagihan rekening air yang belum dibayar tidak termasuk denda dan materai', 15, finalY + 10)
  doc.text('Keterlambatan Pembayaran rekening air selama 3 bulan berturut - turut akan di lakukan pemutusan sambungan air pelanggan tanpa', 15, finalY + 15)
  doc.text('pemberitahuan', 15, finalY + 20)

  // Simpan / Unduh PDF
  const safeDocNo = (invoice.documentNo || 'Invoice').replace(/[^a-zA-Z0-9-]/g, '_')
  doc.save(`Tagihan_Air_${safeDocNo}.pdf`)
}