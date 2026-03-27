<template>
  <div class="layout">
    <main class="main">
      <div class="content-card">

        <div class="page-header">
          <h2 class="page-title">Profit &amp; Loss</h2>
          <p class="page-subtitle">Laporan Laba Rugi dan Penghasilan Komprehensif Lainnya</p>
        </div>

        <!-- ══ FILTER PANEL ══ -->
        <div class="filter-panel">
          <div class="filter-section">
            <div class="filter-section-title">Parameter Laporan</div>
            <div class="filter-grid">
              <div class="filter-group">
                <label>Tanggal Mulai</label>
                <input type="date" v-model="filters.startDate" class="form-input form-input--date" />
              </div>
              <div class="filter-group">
                <label>Tanggal Akhir</label>
                <input type="date" v-model="filters.endDate" class="form-input form-input--date" />
              </div>
              <div class="filter-group">
                <label>Organisasi</label>
                <select v-model="filters.organization" class="form-input">
                  <option value="">* All</option>
                  <option v-for="o in organizations" :key="o.id" :value="o.id">{{ o.name }}</option>
                </select>
              </div>
              <div class="filter-group">
                <label>General Ledger</label>
                <select v-model="filters.accountingSchema" class="form-input">
                  <option value="">All</option>
                  <option v-for="s in accountingSchemas" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Advanced Filters -->
          <div class="filter-section">
            <div class="filter-section-title adv-toggle" @click="showAdvanced = !showAdvanced">
              Filter Lanjutan
              <svg :class="['adv-chevron', showAdvanced && 'adv-chevron--open']" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div v-if="showAdvanced" class="filter-grid" style="margin-top:12px">
              <div class="filter-group">
                <label>Tanggal Mulai Pembanding</label>
                <input type="date" v-model="filters.refStartDate" class="form-input form-input--date" />
              </div>
              <div class="filter-group">
                <label>Tanggal Akhir Pembanding</label>
                <input type="date" v-model="filters.refEndDate" class="form-input form-input--date" />
              </div>
              <div class="filter-group">
                <label>Tampilkan Pembanding</label>
                <div class="check-row">
                  <input type="checkbox" v-model="filters.showComparison" class="checkbox" id="showComparison" />
                  <label for="showComparison" class="check-label">Tampilkan kolom periode pembanding</label>
                </div>
              </div>
              <div class="filter-group">
                <label>Tipe Posting</label>
                <select v-model="filters.postingType" class="form-input">
                  <option value="A">Actual</option>
                  <option value="B">Budget</option>
                  <option value="E">Encumbrance</option>
                  <option value="S">Statistical</option>
                </select>
              </div>
              <div class="filter-group">
                <label>Tampilkan Saldo Nol</label>
                <div class="check-row">
                  <input type="checkbox" v-model="filters.includeZero" class="checkbox" id="includeZero" />
                  <label for="includeZero" class="check-label">Tampilkan akun dengan saldo nol</label>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="filter-actions">
            <button class="btn btn--search" :disabled="loading" @click="runSearch">
              <span v-if="loading" class="spinner"></span>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              {{ loading ? 'Memuat...' : 'Cari' }}
            </button>
            <button class="btn btn--ghost" @click="resetFilters">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Reset
            </button>
            <template v-if="searched && report">
              <div class="btn-sep"></div>
              <button class="btn btn--print" @click="printReport">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print
              </button>
              <button class="btn btn--xlsx" :disabled="exporting === 'xlsx'" @click="exportXlsx">
                <span v-if="exporting === 'xlsx'" class="spinner spinner--dark"></span>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m8 13 3 3 3-3"/><path d="M11 16V11"/></svg>
                {{ exporting === 'xlsx' ? 'Exporting...' : 'Export Excel' }}
              </button>
              <button class="btn btn--pdf" :disabled="exporting === 'pdf'" @click="exportPdf">
                <span v-if="exporting === 'pdf'" class="spinner spinner--dark"></span>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                {{ exporting === 'pdf' ? 'Exporting...' : 'Export PDF' }}
              </button>
            </template>
          </div>
        </div>

        <!-- ══ ERROR ══ -->
        <div v-if="error" class="tb-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ error }}
        </div>

        <!-- ══ RESULTS ══ -->
        <div v-if="searched && !loading && report">

          <!-- Summary Cards -->
          <div class="summary-cards">

            <div class="summary-card">
              <span class="summary-label">Periode</span>
              <span class="summary-value summary-value--period">{{ formatDate(filters.startDate) }} – {{ formatDate(filters.endDate) }}</span>
            </div>
            <div class="summary-card">
              <span class="summary-label">Pendapatan</span>
              <span class="summary-value summary-value--income">{{ formatCurrency(report.pendapatan.total) }}</span>
            </div>
            <div class="summary-card">
              <span class="summary-label">Laba Kotor</span>
              <span class="summary-value" :class="report.labaKotor >= 0 ? 'summary-value--income' : 'summary-value--loss'">
                {{ formatCurrency(report.labaKotor) }}
              </span>
            </div>
            <div class="summary-card">
              <span class="summary-label">Laba (Rugi) Usaha</span>
              <span class="summary-value" :class="report.labaUsaha >= 0 ? 'summary-value--income' : 'summary-value--loss'">
                {{ formatCurrency(report.labaUsaha) }}
              </span>
            </div>
          </div>

          <!-- ══ PRINT AREA ══ -->
          <div id="pl-print-area">

            <!-- Print Header (hanya tampil saat print) -->
            <div class="print-header">
              <div class="print-company">Profit &amp; Loss</div>
              <div class="print-subtitle">Laporan Laba Rugi dan Penghasilan Komprehensif Lainnya</div>
              <div class="print-period">Periode: {{ periodLabel(filters.startDate, filters.endDate) }}</div>
              <div class="print-currency">(Dalam Rupiah)</div>
            </div>

          <!-- ══ TABLE ══ -->
          <div class="table-wrap">
            <table class="table pl-table" id="pl-table">
              <thead>
                <tr>
                  <th class="pl-col-account">Akun</th>
                  <th class="pl-col-amt tb-num">{{ periodLabel(filters.startDate, filters.endDate) }}</th>
                  <th v-if="showRef" class="pl-col-amt tb-num">{{ periodLabel(filters.refStartDate, filters.refEndDate) }}</th>
                  <th v-if="showRef" class="pl-col-diff tb-num">Selisih</th>
                </tr>
              </thead>
              <tbody>

                <!-- ── PENDAPATAN ── -->
                <tr class="tr-section-header">
                  <td colspan="99">
                    <div class="section-header-content section-revenue">
                      <span class="section-name">PENDAPATAN</span>
                    </div>
                  </td>
                </tr>
                <template v-for="line in visibleLines(report.pendapatan.lines)" :key="line.id">
                  <tr class="tr-data tr-line">
                    <td class="pl-line-cell">
                      <div class="line-content">
                        <span class="acc-code acc-code--rev">{{ line.searchKey }}</span>
                        <span class="line-name">{{ line.name }}</span>
                      </div>
                    </td>
                    <td class="tb-num tb-income">{{ fmt(line.amount) }}</td>
                    <td v-if="showRef" class="tb-num tb-income">{{ fmt(line.refAmount) }}</td>
                    <td v-if="showRef" class="tb-num" :class="diffClass(line.amount - line.refAmount)">{{ fmt(line.amount - line.refAmount) }}</td>
                  </tr>
                </template>
                <tr class="tr-subtotal subtotal-rev">
                  <td class="subtotal-label">Total Pendapatan</td>
                  <td class="tb-num subtotal-val tb-income">{{ fmt(report.pendapatan.total) }}</td>
                  <td v-if="showRef" class="tb-num subtotal-val tb-income">{{ fmt(report.pendapatan.refTotal) }}</td>
                  <td v-if="showRef" class="tb-num" :class="diffClass(report.pendapatan.total - report.pendapatan.refTotal)">{{ fmt(report.pendapatan.total - report.pendapatan.refTotal) }}</td>
                </tr>

                <!-- ── BEBAN POKOK PENJUALAN ── -->
                <tr class="tr-section-header">
                  <td colspan="99">
                    <div class="section-header-content section-cogs">
                      <span class="section-name">BEBAN POKOK PENJUALAN</span>
                    </div>
                  </td>
                </tr>
                <template v-for="line in visibleLines(report.bpp.lines)" :key="line.id">
                  <tr class="tr-data tr-line">
                    <td class="pl-line-cell">
                      <div class="line-content">
                        <span class="acc-code acc-code--cogs">{{ line.searchKey }}</span>
                        <span class="line-name">{{ line.name }}</span>
                      </div>
                    </td>
                    <td class="tb-num tb-expense">{{ fmt(line.amount) }}</td>
                    <td v-if="showRef" class="tb-num tb-expense">{{ fmt(line.refAmount) }}</td>
                    <td v-if="showRef" class="tb-num" :class="diffClass(line.amount - line.refAmount)">{{ fmt(line.amount - line.refAmount) }}</td>
                  </tr>
                </template>
                <tr class="tr-subtotal subtotal-cogs">
                  <td class="subtotal-label">Total Beban Pokok Penjualan</td>
                  <td class="tb-num subtotal-val tb-expense">{{ fmt(report.bpp.total) }}</td>
                  <td v-if="showRef" class="tb-num subtotal-val tb-expense">{{ fmt(report.bpp.refTotal) }}</td>
                  <td v-if="showRef" class="tb-num" :class="diffClass(report.bpp.total - report.bpp.refTotal)">{{ fmt(report.bpp.total - report.bpp.refTotal) }}</td>
                </tr>

                <!-- ── LABA KOTOR ── -->
                <tr class="tr-laba-kotor">
                  <td class="laba-label">LABA BRUTO</td>
                  <td class="tb-num laba-val" :class="report.labaKotor >= 0 ? 'tb-income' : 'tb-loss'">{{ fmt(report.labaKotor) }}</td>
                  <td v-if="showRef" class="tb-num laba-val" :class="report.refLabaKotor >= 0 ? 'tb-income' : 'tb-loss'">{{ fmt(report.refLabaKotor) }}</td>
                  <td v-if="showRef" class="tb-num" :class="diffClass(report.labaKotor - report.refLabaKotor)">{{ fmt(report.labaKotor - report.refLabaKotor) }}</td>
                </tr>

                <!-- ── BEBAN UMUM & ADMINISTRASI ── -->
                <tr class="tr-section-header">
                  <td colspan="99">
                    <div class="section-header-content section-opex">
                      <span class="section-name">BEBAN UMUM DAN ADMINISTRASI</span>
                    </div>
                  </td>
                </tr>
                <template v-for="line in visibleLines(report.buaAdmin.lines)" :key="line.id">
                  <tr class="tr-data tr-line">
                    <td class="pl-line-cell">
                      <div class="line-content">
                        <span class="acc-code acc-code--opex">{{ line.searchKey }}</span>
                        <span class="line-name">{{ line.name }}</span>
                      </div>
                    </td>
                    <td class="tb-num tb-expense">{{ fmt(line.amount) }}</td>
                    <td v-if="showRef" class="tb-num tb-expense">{{ fmt(line.refAmount) }}</td>
                    <td v-if="showRef" class="tb-num" :class="diffClass(line.amount - line.refAmount)">{{ fmt(line.amount - line.refAmount) }}</td>
                  </tr>
                </template>
                <tr class="tr-subtotal subtotal-opex">
                  <td class="subtotal-label">Total Beban Umum &amp; Administrasi</td>
                  <td class="tb-num subtotal-val tb-expense">{{ fmt(report.buaAdmin.total) }}</td>
                  <td v-if="showRef" class="tb-num subtotal-val tb-expense">{{ fmt(report.buaAdmin.refTotal) }}</td>
                  <td v-if="showRef" class="tb-num" :class="diffClass(report.buaAdmin.total - report.buaAdmin.refTotal)">{{ fmt(report.buaAdmin.total - report.buaAdmin.refTotal) }}</td>
                </tr>

              </tbody>
              <tfoot>
                <tr class="tr-laba-usaha">
                  <td class="laba-usaha-label">LABA (RUGI) USAHA</td>
                  <td class="tb-num laba-usaha-val" :class="report.labaUsaha >= 0 ? 'tb-income-inv' : 'tb-loss-inv'">{{ fmt(report.labaUsaha) }}</td>
                  <td v-if="showRef" class="tb-num laba-usaha-val" :class="report.refLabaUsaha >= 0 ? 'tb-income-inv' : 'tb-loss-inv'">{{ fmt(report.refLabaUsaha) }}</td>
                  <td v-if="showRef" class="tb-num laba-usaha-diff">{{ fmt(report.labaUsaha - report.refLabaUsaha) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          </div><!-- end pl-print-area -->
        </div>

        <!-- ══ LOADING ══ -->
        <div v-else-if="loading" class="tb-empty-state">
          <div class="loading-dots"><span></span><span></span><span></span></div>
          <p style="margin-top:16px">Memuat data profit &amp; loss...</p>
        </div>

        <!-- ══ EMPTY / INITIAL ══ -->
        <div v-else-if="!searched" class="tb-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="color:#cbd5e1;margin:0 auto 12px;display:block"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
          <p>Isi <strong>Tanggal Mulai</strong> dan <strong>Tanggal Akhir</strong>, lalu klik <strong>Cari</strong> untuk melihat laporan.</p>
        </div>

        <div v-else-if="searched && !loading && !report" class="tb-empty-state">
          <p>Tidak ada data pada periode yang dipilih.</p>
        </div>

      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  buildProfitLoss,
  fetchOrganizations,
  fetchAccountingSchemas,
} from '@/services/profitAndLoss.js'

// ── lookups
const organizations     = ref([])
const accountingSchemas = ref([])

// ── filters
const today = () => new Date().toISOString().slice(0, 10)
const firstDayOfYear = () => `${new Date().getFullYear()}-01-01`

const defaultFilters = () => ({
  startDate:        firstDayOfYear(),
  endDate:          today(),
  refStartDate:     '',
  refEndDate:       '',
  organization:     '',
  accountingSchema: '',
  postingType:      'A',
  showComparison:   false,
  includeZero:      false,
})
const filters      = ref(defaultFilters())
const showAdvanced = ref(false)

// ── state
const loading   = ref(false)
const error     = ref('')
const searched  = ref(false)
const report    = ref(null)
const exporting = ref('')

// ── computed
const showRef = computed(() =>
  filters.value.showComparison &&
  !!filters.value.refStartDate &&
  !!filters.value.refEndDate
)

function visibleLines(lines) {
  if (filters.value.includeZero) return lines
  return lines.filter(l => l.amount !== 0 || l.refAmount !== 0)
}

// ── file name helper: PnL_YYYYMMDD-YYYYMMDD
function pnlFileName(ext) {
  const s = (filters.value.startDate || '').replace(/-/g, '')
  const e = (filters.value.endDate   || '').replace(/-/g, '')
  return `PnL_${s}-${e}.${ext}`
}

// ── formatters
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
function periodLabel(s, e) {
  if (!s || !e) return '—'
  return `${formatDate(s)} s.d. ${formatDate(e)}`
}
function formatCurrency(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)
}
function fmt(v) {
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v) || 0)
}
function diffClass(v) {
  const n = Number(v) || 0
  return n > 0 ? 'tb-diff-pos' : n < 0 ? 'tb-diff-neg' : ''
}

onMounted(async () => {
  try {
    const [orgs, schemas] = await Promise.all([
      fetchOrganizations(),
      fetchAccountingSchemas(),
    ])
    organizations.value     = orgs
    accountingSchemas.value = schemas
  } catch (e) {
    console.warn('Lookup load error:', e)
  }
})

// ── search
async function runSearch() {
  if (!filters.value.startDate) { error.value = 'Tanggal Mulai wajib diisi.'; return }
  if (!filters.value.endDate)   { error.value = 'Tanggal Akhir wajib diisi.';  return }
  loading.value = true; error.value = ''; searched.value = true; report.value = null
  try {
    const opts = {
      organization:     filters.value.organization,
      accountingSchema: filters.value.accountingSchema,
      postingType:      filters.value.postingType,
    }
    const result = await buildProfitLoss(
      filters.value.startDate,
      filters.value.endDate,
      filters.value.showComparison ? filters.value.refStartDate : '',
      filters.value.showComparison ? filters.value.refEndDate   : '',
      opts,
    )
    const hasData = result.pendapatan.lines.length > 0 || result.bpp.lines.length > 0 || result.buaAdmin.lines.length > 0
    report.value = hasData ? result : null
  } catch (e) {
    error.value = 'Gagal memuat data: ' + (e.message || e)
    console.error(e)
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.value = defaultFilters()
  searched.value = false
  report.value   = null
  error.value    = ''
}

// ════════════════════════════════════════════════════
// PRINT
// ════════════════════════════════════════════════════
function printReport() {
  window.print()
}

// ════════════════════════════════════════════════════
// EXPORT EXCEL — ExcelJS styled (same template as GL)
// ════════════════════════════════════════════════════
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src; s.onload = resolve; s.onerror = reject
    document.head.appendChild(s)
  })
}

async function exportXlsx() {
  if (!report.value) return
  exporting.value = 'xlsx'
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js')
    const ExcelJS = window.ExcelJS

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'NexERP Financial Management'
    workbook.created = new Date()

    const col1     = periodLabel(filters.value.startDate, filters.value.endDate)
    const col2     = showRef.value ? periodLabel(filters.value.refStartDate, filters.value.refEndDate) : null
    const orgName  = organizations.value.find(o => o.id === filters.value.organization)?.name || 'All'
    const yearLabel = new Date(filters.value.startDate).getFullYear().toString()
    const LAST_COL  = col2 ? 'E' : 'C'
    const NUM_COLS  = col2 ? 5 : 3

    // ── Color palette (same as GL) ──
    const C = {
      headerBg:    '1E3A5F',
      headerFg:    'FFFFFF',
      subHeaderBg: '2563EB',
      subHeaderFg: 'FFFFFF',
      metaBg:      'F8FAFC',
      borderColor: 'CBD5E1',
      white:       'FFFFFF',
    }

    const numFmt = '#,##0.00'
    const thinBorder = (color = C.borderColor) => ({
      top:    { style: 'thin',   color: { argb: color } },
      bottom: { style: 'thin',   color: { argb: color } },
      left:   { style: 'thin',   color: { argb: color } },
      right:  { style: 'thin',   color: { argb: color } },
    })
    const medBorder = (color = C.borderColor) => ({
      top:    { style: 'medium', color: { argb: color } },
      bottom: { style: 'medium', color: { argb: color } },
      left:   { style: 'medium', color: { argb: color } },
      right:  { style: 'medium', color: { argb: color } },
    })
    const solidFill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
    const applyStyle = (row, style) => {
      row.eachCell({ includeEmpty: true }, cell => {
        if (style.fill)      cell.fill      = style.fill
        if (style.font)      cell.font      = { ...cell.font, ...style.font }
        if (style.border)    cell.border    = style.border
        if (style.alignment) cell.alignment = style.alignment
      })
    }

    const ws = workbook.addWorksheet('Profit & Loss', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
      views: [{ state: 'frozen', xSplit: 0, ySplit: 7 }],
    })

    // Column widths
    ws.columns = [
      { key: 'kode',  width: 14 },
      { key: 'nama',  width: 46 },
      { key: 'col1',  width: 22 },
      ...(col2 ? [{ key: 'col2', width: 22 }, { key: 'selisih', width: 18 }] : []),
    ]

    // ══ ROW 1: Big Title ══
    const r1 = ws.addRow([`LAPORAN LABA RUGI  ·  ${orgName}  ·  IDR`])
    ws.mergeCells(`A1:${LAST_COL}1`)
    r1.height = 32
    applyStyle(r1, {
      fill:      solidFill(C.headerBg),
      font:      { name: 'Calibri', bold: true, size: 14, color: { argb: C.headerFg } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border:    thinBorder(C.headerBg),
    })

    // ══ ROW 2: Meta label row ══
    const r2labels = ['Period', '', 'Fiscal Year', ...(col2 ? ['', ''] : [])]
    const r2 = ws.addRow(r2labels)
    r2.height = 16
    applyStyle(r2, {
      fill:      solidFill(C.metaBg),
      font:      { name: 'Calibri', bold: true, size: 9, color: { argb: '64748B' } },
      alignment: { vertical: 'middle' },
      border:    thinBorder(),
    })
    ws.mergeCells(`A2:B2`)
    ws.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    ws.getCell('C2').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

    // ══ ROW 3: Meta value row ══
    const r3vals = [col1, '', yearLabel, ...(col2 ? ['', ''] : [])]
    const r3 = ws.addRow(r3vals)
    r3.height = 18
    applyStyle(r3, {
      fill:      solidFill(C.white),
      font:      { name: 'Calibri', bold: true, size: 10, color: { argb: '1E293B' } },
      border:    thinBorder(),
      alignment: { vertical: 'middle' },
    })
    ws.mergeCells(`A3:B3`)
    ws.getCell('A3').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    ws.getCell('C3').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

    // ══ ROW 4: Generated info ══
    const r4vals = ['Generated', '', new Date().toLocaleDateString('en-GB'), ...(col2 ? ['', ''] : [])]
    const r4 = ws.addRow(r4vals)
    r4.height = 16
    applyStyle(r4, {
      fill:      solidFill(C.metaBg),
      font:      { name: 'Calibri', size: 9, color: { argb: '64748B' } },
      border:    thinBorder(),
      alignment: { vertical: 'middle' },
    })
    ws.mergeCells(`A4:B4`)
    ws.getCell('A4').font      = { name: 'Calibri', bold: true, size: 9, color: { argb: '64748B' } }
    ws.getCell('A4').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    ws.getCell('C4').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

    // ══ ROW 5: Subtitle ══
    const r5 = ws.addRow(['Laporan Laba Rugi dan Penghasilan Komprehensif Lainnya'])
    ws.mergeCells(`A5:${LAST_COL}5`)
    r5.height = 16
    applyStyle(r5, {
      fill:      solidFill(C.white),
      font:      { name: 'Calibri', italic: true, size: 9, color: { argb: '64748B' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border:    thinBorder(C.white),
    })

    // ══ ROW 6: Spacer ══
    const r6 = ws.addRow([])
    r6.height = 8
    applyStyle(r6, { fill: solidFill(C.white), border: thinBorder(C.white) })

    // ══ ROW 7: Column Headers ══
    const r7vals = ['Kode', 'Nama Akun', col1, ...(col2 ? [col2, 'Selisih'] : [])]
    const r7 = ws.addRow(r7vals)
    r7.height = 28
    applyStyle(r7, {
      fill:      solidFill(C.subHeaderBg),
      font:      { name: 'Calibri', bold: true, size: 10, color: { argb: C.subHeaderFg } },
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
      border:    thinBorder(C.subHeaderBg),
    })
    ;['A7','B7'].forEach(addr => {
      ws.getCell(addr).alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: false }
    })

    // ── current sheet row tracker (1-indexed, already at 8)
    let rowNum = 7

    const addSectionHeader = (label, bgArgb, fgArgb) => {
      rowNum++
      const secRow = ws.addRow([label, '', '', ...(col2 ? ['', ''] : [])])
      ws.mergeCells(`A${rowNum}:${LAST_COL}${rowNum}`)
      secRow.height = 20
      applyStyle(secRow, {
        fill:      solidFill(bgArgb),
        font:      { name: 'Calibri', bold: true, size: 10, color: { argb: fgArgb } },
        alignment: { vertical: 'middle', horizontal: 'left', indent: 1 },
        border:    thinBorder(),
      })
    }

    const addLine = (kode, nama, amt, refAmt) => {
      rowNum++
      const lineRow = ws.addRow([kode, nama, amt || 0, ...(col2 ? [refAmt || 0, (amt || 0) - (refAmt || 0)] : [])])
      lineRow.height = 18
      applyStyle(lineRow, {
        fill:      solidFill(C.white),
        font:      { name: 'Calibri', size: 10, color: { argb: '374151' } },
        border:    thinBorder(),
        alignment: { vertical: 'middle' },
      })
      ws.getCell(`A${rowNum}`).font      = { name: 'Courier New', size: 9, bold: true, color: { argb: '475569' } }
      ws.getCell(`A${rowNum}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      ws.getCell(`B${rowNum}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      ;['C','D','E'].forEach(col => {
        const cell = ws.getCell(`${col}${rowNum}`)
        if (cell.value !== undefined) {
          cell.numFmt    = numFmt
          cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
        }
      })
    }

    const addSubtotal = (label, total, refTotal, bgArgb = 'F1F5F9', fgArgb = '0F172A') => {
      rowNum++
      const subRow = ws.addRow(['', label, total || 0, ...(col2 ? [refTotal || 0, (total || 0) - (refTotal || 0)] : [])])
      subRow.height = 20
      applyStyle(subRow, {
        fill:      solidFill(bgArgb),
        font:      { name: 'Calibri', bold: true, size: 10, color: { argb: fgArgb } },
        border:    medBorder('CBD5E1'),
        alignment: { vertical: 'middle' },
      })
      ws.getCell(`B${rowNum}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      ;['C','D','E'].forEach(col => {
        const cell = ws.getCell(`${col}${rowNum}`)
        if (cell.value !== undefined) {
          cell.numFmt    = numFmt
          cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
        }
      })
    }

    const addSpacer = () => {
      rowNum++
      const spRow = ws.addRow([])
      spRow.height = 6
      applyStyle(spRow, { fill: solidFill(C.white), border: thinBorder(C.white) })
    }

    // ══ PENDAPATAN
    addSectionHeader('PENDAPATAN', 'F0FDF4', '15803D')
    for (const l of visibleLines(report.value.pendapatan.lines)) addLine(l.searchKey, l.name, l.amount, l.refAmount)
    addSubtotal('Total Pendapatan', report.value.pendapatan.total, report.value.pendapatan.refTotal, 'DCFCE7', '15803D')
    addSpacer()

    // ══ BEBAN POKOK PENJUALAN
    addSectionHeader('BEBAN POKOK PENJUALAN', 'FFFBEB', 'B45309')
    for (const l of visibleLines(report.value.bpp.lines)) addLine(l.searchKey, l.name, l.amount, l.refAmount)
    addSubtotal('Total Beban Pokok Penjualan', report.value.bpp.total, report.value.bpp.refTotal, 'FEF9C3', 'B45309')
    addSpacer()

    // ══ LABA BRUTO
    addSubtotal('LABA BRUTO', report.value.labaKotor, report.value.refLabaKotor, 'BBF7D0', '166534')
    addSpacer()

    // ══ BEBAN UMUM & ADMIN
    addSectionHeader('BEBAN UMUM DAN ADMINISTRASI', 'F5F3FF', '7C3AED')
    for (const l of visibleLines(report.value.buaAdmin.lines)) addLine(l.searchKey, l.name, l.amount, l.refAmount)
    addSubtotal('Total Beban Umum & Administrasi', report.value.buaAdmin.total, report.value.buaAdmin.refTotal, 'EDE9FE', '7C3AED')
    addSpacer()

    // ══ LABA (RUGI) USAHA — Final row, navy dark
    rowNum++
    const finalVals = ['', 'LABA (RUGI) USAHA', report.value.labaUsaha, ...(col2 ? [report.value.refLabaUsaha, report.value.labaUsaha - report.value.refLabaUsaha] : [])]
    const finalRow  = ws.addRow(finalVals)
    finalRow.height = 26
    applyStyle(finalRow, {
      fill:      solidFill('1E3A5F'),
      font:      { name: 'Calibri', bold: true, size: 12, color: { argb: 'FFFFFF' } },
      border:    medBorder('FFFFFF'),
      alignment: { vertical: 'middle' },
    })
    ws.getCell(`B${rowNum}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    ;['C','D','E'].forEach(col => {
      const cell = ws.getCell(`${col}${rowNum}`)
      if (cell.value !== undefined) {
        cell.numFmt    = numFmt
        cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
      }
    })

    // ── Write & download ──
    const buffer = await workbook.xlsx.writeBuffer()
    const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a')
    a.href       = url
    a.download   = pnlFileName('xlsx')
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    alert('Export Excel gagal: ' + e.message)
    console.error(e)
  } finally {
    exporting.value = ''
  }
}

// ════════════════════════════════════════════════════
// EXPORT PDF — menggunakan jsPDF + autoTable
// ════════════════════════════════════════════════════
async function exportPdf() {
  if (!report.value) return
  exporting.value = 'pdf'
  try {
    // ── load jsPDF
    const jsPDFmod = await import('jspdf')
    const jsPDF = jsPDFmod.default || jsPDFmod.jsPDF || jsPDFmod
    // ── load autoTable (patches jsPDF.prototype)
    const autoTableMod = await import('jspdf-autotable')
    const autoTable = autoTableMod.default || autoTableMod

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    // ── header teks
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('LAPORAN LABA RUGI', 105, 14, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Laporan Laba Rugi dan Penghasilan Komprehensif Lainnya', 105, 20, { align: 'center' })
    doc.text(`Periode: ${periodLabel(filters.value.startDate, filters.value.endDate)}`, 105, 25, { align: 'center' })
    doc.text('(Dalam Rupiah)', 105, 30, { align: 'center' })

    const col1 = periodLabel(filters.value.startDate, filters.value.endDate)
    const col2 = showRef.value ? periodLabel(filters.value.refStartDate, filters.value.refEndDate) : null

    const head = [
      col2
        ? [{ content: 'Kode', styles: { halign: 'left' } }, { content: 'Nama Akun', styles: { halign: 'left' } }, { content: col1, styles: { halign: 'right' } }, { content: col2, styles: { halign: 'right' } }, { content: 'Selisih', styles: { halign: 'right' } }]
        : [{ content: 'Kode', styles: { halign: 'left' } }, { content: 'Nama Akun', styles: { halign: 'left' } }, { content: col1, styles: { halign: 'right' } }],
    ]

    const body = []
    const colSpan = col2 ? 5 : 3

    const addSecHeader = (label, fillRgb, textRgb) => {
      body.push([{
        content: label,
        colSpan,
        styles: { fontStyle: 'bold', fillColor: fillRgb, textColor: textRgb, cellPadding: { top: 4, bottom: 4, left: 6, right: 6 } },
      }])
    }

    const addLine = (l) => {
      const row = [
        { content: l.searchKey, styles: { fontSize: 7.5, fontStyle: 'bold', textColor: [71, 85, 105], halign: 'left' } },
        { content: l.name,      styles: { fontSize: 8,   halign: 'left', cellPadding: { left: 10 } } },
        { content: fmt(l.amount), styles: { halign: 'right' } },
      ]
      if (col2) {
        row.push({ content: fmt(l.refAmount),          styles: { halign: 'right' } })
        row.push({ content: fmt(l.amount - l.refAmount), styles: { halign: 'right' } })
      }
      body.push(row)
    }

    const addSubtot = (label, total, refTotal, fillRgb, textRgb) => {
      const row = [
        { content: '', styles: { fillColor: fillRgb } },
        { content: label, styles: { fontStyle: 'bold', fillColor: fillRgb, textColor: textRgb, halign: 'left' } },
        { content: fmt(total), styles: { fontStyle: 'bold', fillColor: fillRgb, textColor: textRgb, halign: 'right' } },
      ]
      if (col2) {
        row.push({ content: fmt(refTotal || 0),                    styles: { fontStyle: 'bold', fillColor: fillRgb, textColor: textRgb, halign: 'right' } })
        row.push({ content: fmt((total||0) - (refTotal||0)), styles: { fontStyle: 'bold', fillColor: fillRgb, textColor: textRgb, halign: 'right' } })
      }
      body.push(row)
    }

    const addSpacer = () => {
      body.push([{ content: '', colSpan, styles: { fillColor: [255, 255, 255], cellPadding: 2 } }])
    }

    // ══ PENDAPATAN
    addSecHeader('PENDAPATAN', [240, 253, 244], [21, 128, 61])
    for (const l of visibleLines(report.value.pendapatan.lines)) addLine(l)
    addSubtot('Total Pendapatan', report.value.pendapatan.total, report.value.pendapatan.refTotal, [220, 252, 231], [22, 101, 52])
    addSpacer()

    // ══ BEBAN POKOK PENJUALAN
    addSecHeader('BEBAN POKOK PENJUALAN', [255, 251, 235], [180, 83, 9])
    for (const l of visibleLines(report.value.bpp.lines)) addLine(l)
    addSubtot('Total Beban Pokok Penjualan', report.value.bpp.total, report.value.bpp.refTotal, [254, 249, 195], [120, 53, 15])
    addSpacer()

    // ══ LABA BRUTO
    addSubtot('LABA BRUTO', report.value.labaKotor, report.value.refLabaKotor, [187, 247, 208], [22, 101, 52])
    addSpacer()

    // ══ BEBAN UMUM & ADMIN
    addSecHeader('BEBAN UMUM DAN ADMINISTRASI', [245, 243, 255], [124, 58, 237])
    for (const l of visibleLines(report.value.buaAdmin.lines)) addLine(l)
    addSubtot('Total Beban Umum & Administrasi', report.value.buaAdmin.total, report.value.buaAdmin.refTotal, [237, 233, 254], [109, 40, 217])
    addSpacer()

    // ══ LABA (RUGI) USAHA — baris biru gelap
    const luRow = [
      { content: '', styles: { fillColor: [30, 58, 138], textColor: [255,255,255], fontStyle: 'bold' } },
      { content: 'LABA (RUGI) USAHA', styles: { fillColor: [30, 58, 138], textColor: [255,255,255], fontStyle: 'bold', halign: 'left', fontSize: 9 } },
      { content: fmt(report.value.labaUsaha), styles: { fillColor: [30, 58, 138], textColor: [255,255,255], fontStyle: 'bold', halign: 'right', fontSize: 9 } },
    ]
    if (col2) {
      luRow.push({ content: fmt(report.value.refLabaUsaha),                                    styles: { fillColor: [30, 58, 138], textColor: [255,255,255], fontStyle: 'bold', halign: 'right', fontSize: 9 } })
      luRow.push({ content: fmt(report.value.labaUsaha - report.value.refLabaUsaha), styles: { fillColor: [30, 58, 138], textColor: [255,255,255], fontStyle: 'bold', halign: 'right', fontSize: 9 } })
    }
    body.push(luRow)

    // ── column widths (mm)
    const colStyles = col2
      ? { 0: { cellWidth: 18 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 34, halign: 'right' }, 3: { cellWidth: 34, halign: 'right' }, 4: { cellWidth: 26, halign: 'right' } }
      : { 0: { cellWidth: 18 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 46, halign: 'right' } }

    // ── call autoTable — support both .default plugin style and instance style
    const tableOpts = {
      head,
      body,
      startY: 35,
      styles:          { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
      headStyles:      { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columnStyles:    colStyles,
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin:          { left: 10, right: 10 },
      tableLineColor:  [226, 232, 240],
      tableLineWidth:  0.1,
    }

    if (typeof doc.autoTable === 'function') {
      doc.autoTable(tableOpts)
    } else {
      autoTable(doc, tableOpts)
    }

    // ── footer halaman
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7.5)
      doc.setTextColor(148, 163, 184)
      doc.text(`Halaman ${i} dari ${pageCount}`, 105, 290, { align: 'center' })
      doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })}`, 195, 290, { align: 'right' })
    }

    doc.save(pnlFileName('pdf'))
  } catch (e) {
    alert('Export PDF gagal: ' + e.message)
    console.error(e)
  } finally {
    exporting.value = ''
  }
}
</script>

<style scoped>
:root {
  --font: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --accent: #2563eb; --accent-light: #eff6ff;
  --danger: #dc2626; --bg: #f1f5f9;
  --surface: #fff; --surface2: #f8fafc;
  --border: #e2e8f0; --text-primary: #0f172a;
  --text-secondary: #475569; --text-muted: #94a3b8;
  --radius: 12px; --radius-sm: 7px;
  --shadow-md: 0 4px 20px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,.04);
}

.layout { display: flex; min-height: 100vh; background: var(--bg); font-family: var(--font); }
.main { flex: 1; padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.content-card { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); overflow: hidden; }
.page-header { padding: 20px 20px 0; }
.page-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0 0 2px; }
.page-subtitle { font-size: 12px; color: var(--text-muted); margin: 0; }

/* Filter */
.filter-panel { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 16px; }
.filter-section { display: flex; flex-direction: column; gap: 8px; }
.filter-section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); padding: 6px 10px; background: var(--surface2); border-radius: var(--radius-sm); border-left: 3px solid var(--accent); cursor: default; display: flex; align-items: center; gap: 6px; }
.filter-section-title.adv-toggle { cursor: pointer; user-select: none; }
.adv-chevron { transition: transform .2s; color: var(--text-muted); }
.adv-chevron--open { transform: rotate(180deg); }
.filter-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.filter-group { display: flex; flex-direction: column; gap: 4px; }
.filter-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-input { width: 100%; height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.form-input:focus { border-color: var(--accent); background: #fff; }
.form-input--date { padding: 0 8px; cursor: pointer; }
.form-input--date::-webkit-calendar-picker-indicator { cursor: pointer; opacity: .6; }
.form-input--date::-webkit-calendar-picker-indicator:hover { opacity: 1; }
.check-row { display: flex; align-items: center; gap: 8px; height: 36px; }
.check-label { font-size: 13px; color: var(--text-secondary); font-weight: 400; cursor: pointer; }
.checkbox { width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; }

/* Buttons */
.filter-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.btn { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: var(--radius-sm); font-size: 12.5px; font-weight: 600; cursor: pointer; border: none; transition: background .15s, opacity .15s; font-family: var(--font); }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.btn-sep { width: 1px; height: 28px; background: var(--border); margin: 0 4px; }
.btn--search { background: var(--accent); color: #fff; }
.btn--search:hover:not(:disabled) { background: #1d4ed8; }
.btn--ghost { background: var(--surface2); color: var(--text-secondary); border: 1px solid var(--border); }
.btn--ghost:hover { background: var(--border); }
.btn--xlsx { background: #16a34a; color: #fff; }
.btn--xlsx:hover:not(:disabled) { background: #15803d; }
.btn--pdf { background: #dc2626; color: #fff; }
.btn--pdf:hover:not(:disabled) { background: #b91c1c; }
.btn--print { background: #475569; color: #fff; }
.btn--print:hover { background: #334155; }

/* Error */
.tb-error { margin: 16px 20px 0; padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; }

/* Summary Cards */
.summary-cards { display: flex; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.summary-card { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; min-width: 130px; flex: 1; }
.summary-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); }
.summary-value { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.summary-value--period { color: var(--text-secondary); font-size: 12px; font-weight: 500; }
.summary-value--income { color: #15803d; }
.summary-value--loss   { color: #dc2626; }

/* Table */
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.pl-table thead th { background: #1e3a8a; border-bottom: 2px solid #1e40af; padding: 10px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #fff; white-space: nowrap; }
.pl-table thead th:first-child { text-align: left; }
.pl-col-account { width: auto; min-width: 300px; }
.pl-col-amt  { width: 160px; text-align: right !important; }
.pl-col-diff { width: 130px; text-align: right !important; }

/* Section headers */
.tr-section-header td { padding: 0; border-bottom: none; }
.section-header-content { display: flex; align-items: center; gap: 10px; padding: 9px 14px 7px; margin-top: 6px; border-left: 4px solid; }
.section-revenue { background: linear-gradient(90deg,#f0fdf4,transparent); border-left-color: #16a34a; }
.section-cogs    { background: linear-gradient(90deg,#fffbeb,transparent); border-left-color: #d97706; }
.section-opex    { background: linear-gradient(90deg,#f5f3ff,transparent); border-left-color: #7c3aed; }
.section-badge { font-size: 10px; font-weight: 700; color: #fff; border-radius: 4px; padding: 2px 7px; font-family: var(--font-mono); }
.revenue-badge { background: #15803d; }
.cogs-badge    { background: #b45309; }
.opex-badge    { background: #7c3aed; }
.section-name  { font-size: 12.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
.section-revenue .section-name { color: #15803d; }
.section-cogs    .section-name { color: #b45309; }
.section-opex    .section-name { color: #7c3aed; }

/* Data rows */
.tr-data td { padding: 7px 14px; border-bottom: 1px solid #f1f5f9; }
.tr-data:hover td { background: #f8faff; }
.pl-line-cell { padding: 7px 14px; }
.line-content { display: flex; align-items: center; gap: 8px; }
.line-name { font-size: 13px; color: var(--text-primary); }

/* Account codes */
.acc-code      { font-family: var(--font-mono); font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; white-space: nowrap; }
.acc-code--rev  { color: #15803d; background: #f0fdf4; }
.acc-code--cogs { color: #b45309; background: #fffbeb; }
.acc-code--opex { color: #7c3aed; background: #f5f3ff; }

/* Subtotals */
.tr-subtotal td { padding: 8px 14px; border-top: 1px solid var(--border); border-bottom: 2px solid var(--border); }
.subtotal-rev  td { background: #dcfce7; }
.subtotal-cogs td { background: #fef9c3; }
.subtotal-opex td { background: #ede9fe; }
.subtotal-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; padding-left: 32px !important; }
.subtotal-rev  .subtotal-label { color: #15803d; }
.subtotal-cogs .subtotal-label { color: #92400e; }
.subtotal-opex .subtotal-label { color: #6d28d9; }
.subtotal-val { font-weight: 700; }

/* Laba Kotor */
.tr-laba-kotor td { padding: 10px 14px; background: #bbf7d0; border-top: 2px solid #4ade80; border-bottom: 2px solid #4ade80; }
.laba-label { font-size: 13px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: .04em; }
.laba-val   { font-weight: 800; }

/* Laba Usaha */
.tr-laba-usaha td { padding: 13px 14px; background: #1e3a8a; }
.laba-usaha-label { font-size: 13px; font-weight: 800; color: #fff; text-transform: uppercase; letter-spacing: .05em; }
.laba-usaha-val   { font-weight: 800; }
.laba-usaha-diff  { text-align: right; font-family: var(--font-mono); font-size: 12.5px; font-weight: 700; color: #bfdbfe; }

/* Number colors */
.tb-num       { text-align: right; font-family: var(--font-mono); font-size: 12.5px; }
.tb-income    { color: #15803d; }
.tb-income-inv{ color: #86efac; }
.tb-expense   { color: #b45309; }
.tb-loss      { color: #dc2626; }
.tb-loss-inv  { color: #fca5a5; }
.tb-diff-pos  { color: #1d4ed8; }
.tb-diff-neg  { color: #dc2626; }

/* Empty / Loading */
.tb-empty-state { padding: 56px 24px; text-align: center; color: var(--text-muted); font-size: 13.5px; line-height: 1.6; }
.tb-empty-state strong { color: var(--text-secondary); }
.loading-dots { display: flex; justify-content: center; gap: 6px; }
.loading-dots span { width: 7px; height: 7px; background: var(--accent); border-radius: 50%; animation: bounce 1.2s infinite ease-in-out; }
.loading-dots span:nth-child(2) { animation-delay: .2s; }
.loading-dots span:nth-child(3) { animation-delay: .4s; }
.spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
.spinner--dark { border-color: rgba(0,0,0,.12); border-top-color: currentColor; }
@keyframes bounce { 0%, 80%, 100% { transform: scale(0); opacity: .5; } 40% { transform: scale(1); opacity: 1; } }
@keyframes spin { to { transform: rotate(360deg); } }

/* Print header (hanya tampil saat print) */
.print-header { display: none; }

/* ════════════════════════════════════════════════════
   PRINT STYLES
   ════════════════════════════════════════════════════ */
@media print {
  .layout { background: #fff !important; }
  .main { padding: 0 !important; }
  .content-card { box-shadow: none !important; border-radius: 0 !important; }
  .page-header,
  .filter-panel,
  .summary-cards,
  .tb-error { display: none !important; }

  .print-header {
    display: block !important;
    text-align: center;
    padding: 12px 0 8px;
    border-bottom: 2px solid #1e3a8a;
    margin-bottom: 8px;
  }
  .print-company  { font-size: 15pt; font-weight: 800; color: #1e3a8a; }
  .print-subtitle { font-size: 9pt; color: #475569; margin-top: 2px; }
  .print-period   { font-size: 9pt; color: #0f172a; margin-top: 4px; font-weight: 600; }
  .print-currency { font-size: 8pt; color: #94a3b8; font-style: italic; }

  .table-wrap { overflow: visible !important; }
  .pl-table { font-size: 8pt !important; }
  .pl-table thead th { font-size: 8pt !important; padding: 5px 8px !important; }
  .tr-data td { padding: 4px 8px !important; }
  .section-header-content { padding: 4px 8px !important; }
  .tr-subtotal td { padding: 4px 8px !important; }
  .tr-laba-kotor td { padding: 5px 8px !important; }
  .tr-laba-usaha td { padding: 6px 8px !important; }
  .acc-code { font-size: 7pt !important; }
  .line-name { font-size: 8pt !important; }

  @page { size: A4 portrait; margin: 12mm 10mm; }
  tr { page-break-inside: avoid; }
}
</style>