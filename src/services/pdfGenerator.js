import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoUrl from '@/assets/logo.png'

// Helper format angka & tanggal
function formatCurrency(v) {
  if (v == null || isNaN(v)) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export async function generateDocumentPDF(docType, headerProxy, linesProxy) {
  // CRITICAL FIX: Unwrapping Vue Proxy
  const headerData = JSON.parse(JSON.stringify(headerProxy))
  const linesData = JSON.parse(JSON.stringify(linesProxy))

  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  const primaryColor = [37, 99, 235]
  const textColor = [51, 65, 85]
  const lightGray = [241, 245, 249]

  // 1. LOGO & NAMA PERUSAHAAN
  const logoImg = await loadImage(logoUrl)
  if (logoImg) {
    doc.addImage(logoImg, 'PNG', 15, 15, 30, 15)
  }
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text(headerData['organization$_identifier'] || 'Perusahaan Anda', 15, 38)
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(textColor[0], textColor[1], textColor[2])
  doc.text('Dokumen Sistem Terintegrasi', 15, 43)

  // 2. JUDUL DOKUMEN & KOTAK INFO
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(docType.toUpperCase(), pageWidth - 15, 25, { align: 'right' })

  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(pageWidth - 90, 31, 75, 26, 2, 2, 'FD')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('No. Dokumen', pageWidth - 85, 37)
  doc.text('Tanggal', pageWidth - 85, 44)
  doc.text('Status', pageWidth - 85, 51)

  doc.setFont('helvetica', 'normal')
  doc.text(': ' + (headerData.documentNo || '-'), pageWidth - 50, 37)
  doc.text(': ' + formatDate(headerData.orderDate || headerData.invoiceDate), pageWidth - 50, 44)
  
  const sts = headerData.documentStatus
  const statusLabel = sts === 'DR' ? 'Draft' : (sts === 'CO' || sts === 'TE' ? 'Booked/Complete' : (sts === 'CL' ? 'Closed' : (sts === 'VO' ? 'Voided' : sts || '-')))
  doc.text(': ' + statusLabel, pageWidth - 50, 51)

  // 3. INFORMASI PARTNER
  let startY = 65
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  const partnerLabel = docType.includes('Purchase') || docType.includes('Vendor') ? 'Informasi Vendor:' : 'Informasi Pelanggan:'
  doc.text(partnerLabel, 15, startY)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const partnerName = headerData['businessPartner$_identifier'] || '-'
  const cleanPartnerName = partnerName.includes(' - ') ? partnerName.split(' - ').slice(1).join(' - ') : partnerName
  doc.text(cleanPartnerName, 15, startY + 6)

  doc.setFontSize(9)
  const address = headerData['partnerAddress$_identifier'] || '-'
  const addressLines = doc.splitTextToSize(address, 100)
  doc.text(addressLines, 15, startY + 11)

  startY = startY + 15 + (addressLines.length * 4)

  // 4. TABEL ITEM
  const isInvoice = docType.includes('Invoice')
  const headRow = isInvoice 
    ? [['No', 'Deskripsi Produk', 'Qty', 'Satuan', 'Harga Satuan', 'Pajak', 'Total']]
    : [['No', 'Deskripsi Produk', 'Qty', 'Satuan', 'Harga Satuan', 'Total Harga']]

  const bodyRows = linesData.map((line, index) => {
    const qty = parseFloat(line.orderedQuantity || line.invoicedQuantity || 0)
    const price = parseFloat(line.unitPrice || 0)
    const net = parseFloat(line.lineNetAmount || 0)
    let uom = String(line['uOM$_identifier'] || '-')
    if (uom.includes(' - ')) uom = uom.split(' - ')[1]

    const row = [
      String(index + 1),
      String(line['product$_identifier'] || '-'),
      String(qty),
      uom,
      formatCurrency(price)
    ]

    if (isInvoice) row.push(String(line['tax$_identifier'] || '-'))
    row.push(formatCurrency(net))
    
    return row
  })

  autoTable(doc, {
    startY: startY,
    head: headRow,
    body: bodyRows,
    theme: 'plain',
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 9,
      cellPadding: 5,
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 5,
      textColor: textColor,
      lineColor: [226, 232, 240],
      lineWidth: { bottom: 0.5 },
    },
    alternateRowStyles: {
      fillColor: [250, 252, 253]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 16 }, // <--- DIPERLEBAR LAGI (sebelumnya 12)
      1: { halign: 'left', cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 15 },
      3: { halign: 'center', cellWidth: 22 },
    },
    willDrawCell: function (data) {
      if (data.section === 'body' || data.section === 'head') {
        const totalIdx = isInvoice ? 6 : 5
        const taxIdx = isInvoice ? 5 : -1
        const priceIdx = 4

        if (data.column.index === priceIdx || data.column.index === totalIdx || data.column.index === taxIdx) {
          data.cell.styles.halign = 'right'
          // Lebar nominal dikunci
          if (data.column.index === priceIdx || data.column.index === totalIdx) {
             data.cell.styles.cellWidth = 32
          }
          if (data.column.index === taxIdx) {
             data.cell.styles.cellWidth = 25
          }
        }
      }
    },
    margin: { left: 15, right: 15 }
  })

  // 5. TOTAL & SUMMARY
  const finalY = doc.lastAutoTable.finalY + 15
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Catatan:', 15, finalY)
  
  doc.setFont('helvetica', 'normal')
  const descText = headerData.description || 'Dokumen ini sah dan diterbitkan secara elektronik oleh sistem. Tidak memerlukan tanda tangan basah.'
  const descLines = doc.splitTextToSize(descText, 90)
  doc.text(descLines, 15, finalY + 5)

  const summaryXText = pageWidth - 65
  const summaryXVal = pageWidth - 15
  let currentY = finalY

  const totalBoxHeight = isInvoice ? 26 : 14
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
  doc.roundedRect(pageWidth - 90, currentY - 5, 75, totalBoxHeight, 2, 2, 'F')

  if (isInvoice) {
    const subtotal = headerData.summedLineAmount || 0
    const grandTotal = headerData.grandTotalAmount || 0
    const tax = grandTotal - subtotal
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Subtotal', summaryXText, currentY + 1)
    doc.text(formatCurrency(subtotal), summaryXVal, currentY + 1, { align: 'right' })
    
    currentY += 7
    doc.text('Tax', summaryXText, currentY + 1)
    doc.text(formatCurrency(tax), summaryXVal, currentY + 1, { align: 'right' })
    
    currentY += 6
    doc.setLineWidth(0.5)
    doc.setDrawColor(200, 200, 200)
    doc.line(summaryXText, currentY, summaryXVal, currentY)
    
    currentY += 6
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Grand Total', summaryXText, currentY)
    doc.text(formatCurrency(grandTotal), summaryXVal, currentY, { align: 'right' })
  } else {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Grand Total', summaryXText, currentY + 3)
    doc.text(formatCurrency(headerData.grandTotalAmount), summaryXVal, currentY + 3, { align: 'right' })
  }

  // 6. FOOTER
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(150, 150, 150)
  doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 15, pageHeight - 10)
  
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 15, pageHeight - 10, { align: 'right' })
  }

  // 7. UNDUH
  const cleanDocNo = (headerData.documentNo || 'Doc').replace(/[^a-zA-Z0-9_-]/g, '')
  const filename = `${docType.replace(/\s+/g, '_')}_${cleanDocNo}.pdf`
  doc.save(filename)
}