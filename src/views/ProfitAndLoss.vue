<template>
  <div class="layout">
    <main class="main">
      <div class="content-card">

        <div class="page-header">
          <h2 class="page-title">Laba &amp; Rugi</h2>
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
                  <option value="">* Semua</option>
                  <option v-for="o in organizations" :key="o.id" :value="o.id">{{ o.name }}</option>
                </select>
              </div>
              <div class="filter-group">
                <label>Buku Besar</label>
                <select v-model="filters.accountingSchema" class="form-input">
                  <option value="">Semua</option>
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

          <!-- ══ PRINT AREA ══ -->
          <div id="pl-print-area">

            <!-- ── Print Header (hanya tampil saat print) ── -->
            <div class="print-header">
              <div class="print-company">PERSERODA PEMBANGUNAN INVESTASI TANGERANG SELATAN</div>
              <div class="print-title">Laba/Rugi (Standar)</div>
              <div class="print-period">Dari {{ formatDateLong(filters.startDate) }} ke {{ formatDateLong(filters.endDate) }}</div>
            </div>

            <!-- ── Screen Header ── -->
            <div class="screen-header">
              <div class="sh-left">
                <span class="sh-label">Periode</span>
                <span class="sh-value">{{ formatDate(filters.startDate) }} – {{ formatDate(filters.endDate) }}</span>
              </div>
              <div class="sh-stats">
                <div class="sh-stat">
                  <span class="sh-stat-label">Pendapatan</span>
                  <span class="sh-stat-val income">{{ formatCurrency(report.pendapatan.total) }}</span>
                </div>
                <div class="sh-stat">
                  <span class="sh-stat-label">Laba Kotor</span>
                  <span class="sh-stat-val" :class="report.labaKotor >= 0 ? 'income' : 'loss'">{{ formatCurrency(report.labaKotor) }}</span>
                </div>
                <div class="sh-stat">
                  <span class="sh-stat-label">Pend. Operasi</span>
                  <span class="sh-stat-val" :class="report.pendapatanOperasi >= 0 ? 'income' : 'loss'">{{ formatCurrency(report.pendapatanOperasi) }}</span>
                </div>
                <div class="sh-stat sh-stat--highlight">
                  <span class="sh-stat-label">Laba Bersih</span>
                  <span class="sh-stat-val" :class="report.labaBersih >= 0 ? 'income' : 'loss'">{{ formatCurrency(report.labaBersih) }}</span>
                </div>
              </div>
            </div>

            <!-- ══ TABLE ══ -->
            <div class="table-wrap">
              <table class="pl-table" id="pl-table">
                <thead>
                  <tr>
                    <th class="col-desc">Description</th>
                    <th class="col-amt">{{ periodLabel(filters.startDate, filters.endDate) }}</th>
                    <th v-if="showRef" class="col-amt">{{ periodLabel(filters.refStartDate, filters.refEndDate) }}</th>
                  </tr>
                </thead>
                <tbody>

                  <!-- ══════════════ PENDAPATAN ══════════════ -->
                  <tr class="tr-group-l1">
                    <td colspan="99">Pendapatan</td>
                  </tr>
                  <tr class="tr-group-l2">
                    <td colspan="99">PENDAPATAN</td>
                  </tr>
                  <template v-for="line in visibleLines(report.pendapatan.lines)" :key="line.id">
                    <tr class="tr-detail">
                      <td class="td-name indent-2">{{ line.name }}</td>
                      <td class="td-num">{{ fmt(line.amount) }}</td>
                      <td v-if="showRef" class="td-num">{{ fmt(line.refAmount) }}</td>
                    </tr>
                  </template>
                  <tr class="tr-subtotal">
                    <td class="td-name indent-1 bold">Jumlah Pendapatan</td>
                    <td class="td-num bold">{{ fmt(report.pendapatan.total) }}</td>
                    <td v-if="showRef" class="td-num bold">{{ fmt(report.pendapatan.refTotal) }}</td>
                  </tr>

                  <!-- ══════════════ HARGA POKOK PENJUALAN ══════════════ -->
                  <tr class="tr-group-l1">
                    <td colspan="99">Harga Pokok Penjualan</td>
                  </tr>
                  <tr class="tr-group-l2">
                    <td colspan="99">BEBAN POKOK USAHA</td>
                  </tr>
                  <template v-for="line in visibleLines(report.bpp.lines)" :key="line.id">
                    <tr class="tr-detail">
                      <td class="td-name indent-2">{{ line.name }}</td>
                      <td class="td-num">{{ fmt(line.amount) }}</td>
                      <td v-if="showRef" class="td-num">{{ fmt(line.refAmount) }}</td>
                    </tr>
                  </template>
                  <tr class="tr-subtotal">
                    <td class="td-name indent-1 bold">Jumlah Harga Pokok Penjualan</td>
                    <td class="td-num bold">{{ fmt(report.bpp.total) }}</td>
                    <td v-if="showRef" class="td-num bold">{{ fmt(report.bpp.refTotal) }}</td>
                  </tr>

                  <!-- ══════════════ LABA KOTOR ══════════════ -->
                  <tr class="tr-laba-kotor">
                    <td class="td-name bold">LABA KOTOR</td>
                    <td class="td-num bold" :class="report.labaKotor >= 0 ? 'text-income' : 'text-loss'">{{ fmt(report.labaKotor) }}</td>
                    <td v-if="showRef" class="td-num bold" :class="report.refLabaKotor >= 0 ? 'text-income' : 'text-loss'">{{ fmt(report.refLabaKotor) }}</td>
                  </tr>

                  <!-- ══════════════ BEBAN OPERASI ══════════════ -->
                  <tr class="tr-group-l1">
                    <td colspan="99">Beban Operasi</td>
                  </tr>
                  <tr class="tr-group-l2">
                    <td colspan="99">BEBAN PEMASARAN, UMUM &amp; ADM</td>
                  </tr>
                  <template v-for="line in visibleLines(report.bebanOperasi.lines)" :key="line.id">
                    <tr class="tr-detail">
                      <td class="td-name indent-2">{{ line.name }}</td>
                      <td class="td-num">{{ fmt(line.amount) }}</td>
                      <td v-if="showRef" class="td-num">{{ fmt(line.refAmount) }}</td>
                    </tr>
                  </template>
                  <tr class="tr-subtotal">
                    <td class="td-name indent-1 bold">Jumlah Beban Operasi</td>
                    <td class="td-num bold">{{ fmt(report.bebanOperasi.total) }}</td>
                    <td v-if="showRef" class="td-num bold">{{ fmt(report.bebanOperasi.refTotal) }}</td>
                  </tr>

                  <!-- ══════════════ PENDAPATAN OPERASI ══════════════ -->
                  <tr class="tr-pendapatan-operasi">
                    <td class="td-name bold">PENDAPATAN OPERASI</td>
                    <td class="td-num bold" :class="report.pendapatanOperasi >= 0 ? 'text-income' : 'text-loss'">{{ fmt(report.pendapatanOperasi) }}</td>
                    <td v-if="showRef" class="td-num bold" :class="report.refPendapatanOperasi >= 0 ? 'text-income' : 'text-loss'">{{ fmt(report.refPendapatanOperasi) }}</td>
                  </tr>

                  <!-- ══════════════ PENDAPATAN & BEBAN LAIN ══════════════ -->
                  <tr class="tr-group-l1">
                    <td colspan="99">Pendapatan dan Beban Lain</td>
                  </tr>

                  <!-- Pendapatan lain -->
                  <tr class="tr-group-l2">
                    <td colspan="99">Pendapatan lain</td>
                  </tr>
                  <tr class="tr-group-l3">
                    <td colspan="99">PENDAPATAN DILUAR USAHA</td>
                  </tr>
                  <template v-for="line in visibleLines(report.pendapatanLain.lines)" :key="line.id">
                    <tr class="tr-detail">
                      <td class="td-name indent-3">{{ line.name }}</td>
                      <td class="td-num">{{ fmt(line.amount) }}</td>
                      <td v-if="showRef" class="td-num">{{ fmt(line.refAmount) }}</td>
                    </tr>
                  </template>
                  <tr v-if="report.pendapatanLain.lines.length === 0" class="tr-detail tr-empty">
                    <td class="td-name indent-3 text-muted">–</td>
                    <td class="td-num text-muted">–</td>
                    <td v-if="showRef" class="td-num text-muted">–</td>
                  </tr>
                  <tr class="tr-subtotal-l2">
                    <td class="td-name indent-2 bold">Jumlah Pendapatan lain</td>
                    <td class="td-num bold">{{ fmt(report.pendapatanLain.total) }}</td>
                    <td v-if="showRef" class="td-num bold">{{ fmt(report.pendapatanLain.refTotal) }}</td>
                  </tr>

                  <!-- Beban lain-lain -->
                  <tr class="tr-group-l2">
                    <td colspan="99">Beban lain-lain</td>
                  </tr>
                  <tr class="tr-group-l3">
                    <td colspan="99">BEBAN DILUAR USAHA</td>
                  </tr>
                  <template v-for="line in visibleLines(report.bebanLain.lines)" :key="line.id">
                    <tr class="tr-detail">
                      <td class="td-name indent-3">{{ line.name }}</td>
                      <td class="td-num">{{ fmt(line.amount) }}</td>
                      <td v-if="showRef" class="td-num">{{ fmt(line.refAmount) }}</td>
                    </tr>
                  </template>
                  <tr v-if="report.bebanLain.lines.length === 0" class="tr-detail tr-empty">
                    <td class="td-name indent-3 text-muted">–</td>
                    <td class="td-num text-muted">–</td>
                    <td v-if="showRef" class="td-num text-muted">–</td>
                  </tr>
                  <tr class="tr-subtotal-l2">
                    <td class="td-name indent-2 bold">Jumlah Beban lain-lain</td>
                    <td class="td-num bold">{{ fmt(report.bebanLain.total) }}</td>
                    <td v-if="showRef" class="td-num bold">{{ fmt(report.bebanLain.refTotal) }}</td>
                  </tr>

                  <!-- Jumlah Pendapatan dan Beban Lain -->
                  <tr class="tr-subtotal">
                    <td class="td-name indent-1 bold">Jumlah Pendapatan dan Beban Lain</td>
                    <td class="td-num bold">{{ fmt(report.pendapatanLain.total - report.bebanLain.total) }}</td>
                    <td v-if="showRef" class="td-num bold">{{ fmt(report.pendapatanLain.refTotal - report.bebanLain.refTotal) }}</td>
                  </tr>

                  <!-- ══════════════ LABA BERSIH ══════════════ -->
                  <tr class="tr-laba-bersih">
                    <td class="td-name bold">LABA(RUGI) BERSIH (Before Tax)</td>
                    <td class="td-num bold" :class="report.labaBersih >= 0 ? 'text-income' : 'text-loss'">{{ fmt(report.labaBersih) }}</td>
                    <td v-if="showRef" class="td-num bold" :class="report.refLabaBersih >= 0 ? 'text-income' : 'text-loss'">{{ fmt(report.refLabaBersih) }}</td>
                  </tr>
                  <tr class="tr-laba-bersih-after">
                    <td class="td-name bold">LABA(RUGI) BERSIH (After Tax)</td>
                    <td class="td-num bold" :class="report.labaBersih >= 0 ? 'text-income' : 'text-loss'">{{ fmt(report.labaBersih) }}</td>
                    <td v-if="showRef" class="td-num bold" :class="report.refLabaBersih >= 0 ? 'text-income' : 'text-loss'">{{ fmt(report.refLabaBersih) }}</td>
                  </tr>

                </tbody>
              </table>
            </div>

            <!-- Print footer -->
            <div class="print-footer">
              <span>ACCURATE Accounting System Report</span>
              <span>Cetak di {{ printDateLabel }}</span>
            </div>

          </div><!-- end pl-print-area -->
        </div>

        <!-- ══ LOADING ══ -->
        <div v-else-if="loading" class="tb-empty-state">
          <div class="loading-dots"><span></span><span></span><span></span></div>
          <p style="margin-top:16px">Memuat data profit &amp; loss...</p>
        </div>

        <!-- ══ EMPTY ══ -->
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

const printDateLabel = computed(() => {
  return new Date().toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
})

function visibleLines(lines) {
  if (filters.value.includeZero) return lines
  return lines.filter(l => l.amount !== 0 || l.refAmount !== 0)
}

function pnlFileName(ext) {
  const s = (filters.value.startDate || '').replace(/-/g, '')
  const e = (filters.value.endDate   || '').replace(/-/g, '')
  return `PnL_${s}-${e}.${ext}`
}

// ── formatters
const MONTHS_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateLong(d) {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00')
  return `${String(dt.getDate()).padStart(2,'0')} ${MONTHS_ID[dt.getMonth()]} ${dt.getFullYear()}`
}

function periodLabel(s, e) {
  if (!s || !e) return '—'
  const sd = new Date(s + 'T00:00:00')
  const ed = new Date(e + 'T00:00:00')
  const fmt2 = dt => `${String(dt.getDate()).padStart(2,'0')} ${MONTHS_ID[dt.getMonth()]} ${dt.getFullYear()}`
  return `${fmt2(sd)} - ${fmt2(ed)}`
}

function formatCurrency(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)
}

function fmt(v) {
  const n = Number(v) || 0
  if (n === 0) return '-'
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
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
    const hasData =
      result.pendapatan.lines.length > 0 ||
      result.bpp.lines.length > 0 ||
      result.bebanOperasi.lines.length > 0 ||
      result.pendapatanLain.lines.length > 0 ||
      result.bebanLain.lines.length > 0
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
// EXPORT EXCEL
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
    const col1     = periodLabel(filters.value.startDate, filters.value.endDate)
    const col2     = showRef.value ? periodLabel(filters.value.refStartDate, filters.value.refEndDate) : null
    const LAST_COL  = col2 ? 'D' : 'C'
    const NUM_COLS  = col2 ? 4 : 3

    const C = { headerBg: '1E3A5F', headerFg: 'FFFFFF', white: 'FFFFFF', border: 'CBD5E1' }
    const numFmt = '#,##0.00'
    const solidFill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
    const thinBorder = (color = C.border) => ({
      top:    { style: 'thin', color: { argb: color } },
      bottom: { style: 'thin', color: { argb: color } },
      left:   { style: 'thin', color: { argb: color } },
      right:  { style: 'thin', color: { argb: color } },
    })

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
    })
    ws.columns = [
      { key: 'desc', width: 56 },
      { key: 'col1', width: 24 },
      ...(col2 ? [{ key: 'col2', width: 24 }] : []),
    ]

    // Title
    const r1 = ws.addRow(['PERSERODA PEMBANGUNAN INVESTASI TANGERANG SELATAN'])
    ws.mergeCells(`A1:${LAST_COL}1`)
    r1.height = 28
    applyStyle(r1, { fill: solidFill(C.headerBg), font: { name: 'Calibri', bold: true, size: 13, color: { argb: C.headerFg } }, alignment: { vertical: 'middle', horizontal: 'center' } })

    const r2 = ws.addRow(['Laba/Rugi (Standar)'])
    ws.mergeCells(`A2:${LAST_COL}2`)
    r2.height = 20
    applyStyle(r2, { fill: solidFill(C.headerBg), font: { name: 'Calibri', bold: true, size: 11, color: { argb: C.headerFg } }, alignment: { vertical: 'middle', horizontal: 'center' } })

    const r3 = ws.addRow([`Dari ${formatDateLong(filters.value.startDate)} ke ${formatDateLong(filters.value.endDate)}`])
    ws.mergeCells(`A3:${LAST_COL}3`)
    r3.height = 16
    applyStyle(r3, { fill: solidFill('F8FAFC'), font: { name: 'Calibri', size: 10, color: { argb: '475569' } }, alignment: { vertical: 'middle', horizontal: 'center' } })

    // Spacer
    ws.addRow([]).height = 6

    // Column headers
    const rh = ws.addRow(['Description', col1, ...(col2 ? [col2] : [])])
    rh.height = 22
    applyStyle(rh, { fill: solidFill('EFF6FF'), font: { name: 'Calibri', bold: true, size: 10, color: { argb: '1E3A8A' } }, border: thinBorder('BFDBFE'), alignment: { vertical: 'middle', horizontal: 'center' } })
    ws.getCell('A5').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

    let rowNum = 5

    const addGroupL1 = (label) => {
      rowNum++
      const r = ws.addRow([label])
      ws.mergeCells(`A${rowNum}:${LAST_COL}${rowNum}`)
      r.height = 18
      applyStyle(r, { font: { name: 'Calibri', bold: true, size: 10, color: { argb: '0F172A' } }, alignment: { vertical: 'middle', horizontal: 'left', indent: 1 } })
    }

    const addGroupL2 = (label) => {
      rowNum++
      const r = ws.addRow([label])
      ws.mergeCells(`A${rowNum}:${LAST_COL}${rowNum}`)
      r.height = 16
      applyStyle(r, { font: { name: 'Calibri', bold: true, size: 10, color: { argb: '1E40AF' } }, alignment: { vertical: 'middle', horizontal: 'left', indent: 2 } })
    }

    const addGroupL3 = (label) => {
      rowNum++
      const r = ws.addRow([label])
      ws.mergeCells(`A${rowNum}:${LAST_COL}${rowNum}`)
      r.height = 15
      applyStyle(r, { font: { name: 'Calibri', bold: true, size: 9, color: { argb: '4B5563' } }, alignment: { vertical: 'middle', horizontal: 'left', indent: 3 } })
    }

    const addDetail = (name, amt, refAmt, indent = 4) => {
      rowNum++
      const vals = [name, amt || 0, ...(col2 ? [refAmt || 0] : [])]
      const r = ws.addRow(vals)
      r.height = 16
      ws.getCell(`A${rowNum}`).font      = { name: 'Calibri', size: 10, color: { argb: '374151' } }
      ws.getCell(`A${rowNum}`).alignment = { vertical: 'middle', horizontal: 'left', indent }
      ws.getCell(`B${rowNum}`).numFmt    = numFmt
      ws.getCell(`B${rowNum}`).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
      if (col2) {
        ws.getCell(`C${rowNum}`).numFmt    = numFmt
        ws.getCell(`C${rowNum}`).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
      }
    }

    const addSubtotal = (label, total, refTotal, bgArgb, fgArgb, indent = 2) => {
      rowNum++
      const vals = [label, total || 0, ...(col2 ? [refTotal || 0] : [])]
      const r = ws.addRow(vals)
      r.height = 18
      applyStyle(r, { fill: solidFill(bgArgb), font: { name: 'Calibri', bold: true, size: 10, color: { argb: fgArgb } }, border: thinBorder('CBD5E1'), alignment: { vertical: 'middle' } })
      ws.getCell(`A${rowNum}`).alignment = { vertical: 'middle', horizontal: 'left', indent }
      ws.getCell(`B${rowNum}`).numFmt    = numFmt
      ws.getCell(`B${rowNum}`).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
      if (col2) {
        ws.getCell(`C${rowNum}`).numFmt    = numFmt
        ws.getCell(`C${rowNum}`).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
      }
    }

    const addHighlight = (label, total, refTotal, bgArgb, fgArgb) => {
      rowNum++
      const vals = [label, total || 0, ...(col2 ? [refTotal || 0] : [])]
      const r = ws.addRow(vals)
      r.height = 22
      applyStyle(r, { fill: solidFill(bgArgb), font: { name: 'Calibri', bold: true, size: 11, color: { argb: fgArgb } }, border: thinBorder(bgArgb), alignment: { vertical: 'middle' } })
      ws.getCell(`A${rowNum}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      ws.getCell(`B${rowNum}`).numFmt    = numFmt
      ws.getCell(`B${rowNum}`).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
      if (col2) {
        ws.getCell(`C${rowNum}`).numFmt    = numFmt
        ws.getCell(`C${rowNum}`).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
      }
    }

    const r = report.value

    // Pendapatan
    addGroupL1('Pendapatan')
    addGroupL2('PENDAPATAN')
    for (const l of visibleLines(r.pendapatan.lines)) addDetail(l.name, l.amount, l.refAmount)
    addSubtotal('Jumlah Pendapatan', r.pendapatan.total, r.pendapatan.refTotal, 'F0FDF4', '15803D')

    // HPP
    addGroupL1('Harga Pokok Penjualan')
    addGroupL2('BEBAN POKOK USAHA')
    for (const l of visibleLines(r.bpp.lines)) addDetail(l.name, l.amount, l.refAmount)
    addSubtotal('Jumlah Harga Pokok Penjualan', r.bpp.total, r.bpp.refTotal, 'FEF9C3', 'B45309')

    // Laba Kotor
    addHighlight('LABA KOTOR', r.labaKotor, r.refLabaKotor, 'BBF7D0', '166534')

    // Beban Operasi
    addGroupL1('Beban Operasi')
    addGroupL2('BEBAN PEMASARAN, UMUM & ADM')
    for (const l of visibleLines(r.bebanOperasi.lines)) addDetail(l.name, l.amount, l.refAmount)
    addSubtotal('Jumlah Beban Operasi', r.bebanOperasi.total, r.bebanOperasi.refTotal, 'EDE9FE', '7C3AED')

    // Pendapatan Operasi
    addHighlight('PENDAPATAN OPERASI', r.pendapatanOperasi, r.refPendapatanOperasi, 'DBEAFE', '1D4ED8')

    // Pendapatan & Beban Lain
    addGroupL1('Pendapatan dan Beban Lain')
    addGroupL2('Pendapatan lain')
    addGroupL3('PENDAPATAN DILUAR USAHA')
    for (const l of visibleLines(r.pendapatanLain.lines)) addDetail(l.name, l.amount, l.refAmount, 5)
    addSubtotal('Jumlah Pendapatan lain', r.pendapatanLain.total, r.pendapatanLain.refTotal, 'F0FDF4', '15803D', 3)

    addGroupL2('Beban lain-lain')
    addGroupL3('BEBAN DILUAR USAHA')
    for (const l of visibleLines(r.bebanLain.lines)) addDetail(l.name, l.amount, l.refAmount, 5)
    addSubtotal('Jumlah Beban lain-lain', r.bebanLain.total, r.bebanLain.refTotal, 'FEE2E2', 'B91C1C', 3)

    addSubtotal('Jumlah Pendapatan dan Beban Lain', r.pendapatanLain.total - r.bebanLain.total, r.pendapatanLain.refTotal - r.bebanLain.refTotal, 'F1F5F9', '0F172A')

    // Laba Bersih
    addHighlight('LABA(RUGI) BERSIH (Before Tax)', r.labaBersih, r.refLabaBersih, '1E3A5F', 'FFFFFF')
    addHighlight('LABA(RUGI) BERSIH (After Tax)',  r.labaBersih, r.refLabaBersih, '1E3A5F', 'FFFFFF')

    // Footer
    rowNum++
    const rf = ws.addRow([`ACCURATE Accounting System Report`, `Cetak di ${printDateLabel.value}`])
    ws.mergeCells(`A${rowNum}:${LAST_COL}${rowNum}`)
    applyStyle(rf, { font: { name: 'Calibri', italic: true, size: 8, color: { argb: '94A3B8' } }, alignment: { vertical: 'middle', horizontal: 'center' } })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a')
    a.href = url; a.download = pnlFileName('xlsx'); a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    alert('Export Excel gagal: ' + e.message)
    console.error(e)
  } finally {
    exporting.value = ''
  }
}

// ════════════════════════════════════════════════════
// EXPORT PDF
// ════════════════════════════════════════════════════
async function exportPdf() {
  if (!report.value) return
  exporting.value = 'pdf'
  try {
    const jsPDFmod   = await import('jspdf')
    const jsPDF      = jsPDFmod.default || jsPDFmod.jsPDF || jsPDFmod
    const atMod      = await import('jspdf-autotable')
    const autoTable  = atMod.default || atMod

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const col1 = periodLabel(filters.value.startDate, filters.value.endDate)
    const col2 = showRef.value ? periodLabel(filters.value.refStartDate, filters.value.refEndDate) : null
    const colSpan = col2 ? 3 : 2

    // Header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('PERSERODA PEMBANGUNAN INVESTASI TANGERANG SELATAN', 105, 12, { align: 'center' })
    doc.setFontSize(13)
    doc.text('Laba/Rugi (Standar)', 105, 19, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Dari ${formatDateLong(filters.value.startDate)} ke ${formatDateLong(filters.value.endDate)}`, 105, 25, { align: 'center' })

    const head = [
      col2
        ? [{ content: 'Description', styles: { halign: 'left' } }, { content: col1, styles: { halign: 'right' } }, { content: col2, styles: { halign: 'right' } }]
        : [{ content: 'Description', styles: { halign: 'left' } }, { content: col1, styles: { halign: 'right' } }],
    ]

    const body = []
    const r = report.value

    const addGroupL1 = (label) => body.push([{ content: label, colSpan, styles: { fontStyle: 'bold', fontSize: 9, fillColor: [255,255,255], textColor: [15,23,42], cellPadding: { top: 4, bottom: 2, left: 4, right: 4 } } }])
    const addGroupL2 = (label) => body.push([{ content: label, colSpan, styles: { fontStyle: 'bold', fontSize: 9, fillColor: [248,250,252], textColor: [30,58,138], cellPadding: { top: 3, bottom: 2, left: 10, right: 4 } } }])
    const addGroupL3 = (label) => body.push([{ content: label, colSpan, styles: { fontStyle: 'bold', fontSize: 8, fillColor: [248,250,252], textColor: [75,85,99], cellPadding: { top: 2, bottom: 2, left: 16, right: 4 } } }])

    const addDetail = (name, amt, refAmt, indent = 22) => {
      const row = [
        { content: name, styles: { fontSize: 8, halign: 'left', cellPadding: { top: 1.5, bottom: 1.5, left: indent, right: 4 } } },
        { content: amt !== 0 ? fmt(amt) : '-', styles: { fontSize: 8, halign: 'right' } },
      ]
      if (col2) row.push({ content: refAmt !== 0 ? fmt(refAmt) : '-', styles: { fontSize: 8, halign: 'right' } })
      body.push(row)
    }

    const addSubtotal = (label, total, refTotal, fillRgb, textRgb, indent = 10) => {
      const row = [
        { content: label, styles: { fontStyle: 'bold', fontSize: 8, fillColor: fillRgb, textColor: textRgb, halign: 'left', cellPadding: { top: 2.5, bottom: 2.5, left: indent, right: 4 } } },
        { content: fmt(total), styles: { fontStyle: 'bold', fontSize: 8, fillColor: fillRgb, textColor: textRgb, halign: 'right' } },
      ]
      if (col2) row.push({ content: fmt(refTotal), styles: { fontStyle: 'bold', fontSize: 8, fillColor: fillRgb, textColor: textRgb, halign: 'right' } })
      body.push(row)
    }

    const addHighlight = (label, total, refTotal, fillRgb, textRgb) => {
      const row = [
        { content: label, styles: { fontStyle: 'bold', fontSize: 9, fillColor: fillRgb, textColor: textRgb, halign: 'left', cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 } } },
        { content: fmt(total), styles: { fontStyle: 'bold', fontSize: 9, fillColor: fillRgb, textColor: textRgb, halign: 'right' } },
      ]
      if (col2) row.push({ content: fmt(refTotal), styles: { fontStyle: 'bold', fontSize: 9, fillColor: fillRgb, textColor: textRgb, halign: 'right' } })
      body.push(row)
    }

    // Pendapatan
    addGroupL1('Pendapatan')
    addGroupL2('PENDAPATAN')
    for (const l of visibleLines(r.pendapatan.lines)) addDetail(l.name, l.amount, l.refAmount)
    addSubtotal('Jumlah Pendapatan', r.pendapatan.total, r.pendapatan.refTotal, [220,252,231], [22,101,52])
    body.push([{ content: '', colSpan, styles: { fillColor: [255,255,255], cellPadding: 1.5 } }])

    // HPP
    addGroupL1('Harga Pokok Penjualan')
    addGroupL2('BEBAN POKOK USAHA')
    for (const l of visibleLines(r.bpp.lines)) addDetail(l.name, l.amount, l.refAmount)
    addSubtotal('Jumlah Harga Pokok Penjualan', r.bpp.total, r.bpp.refTotal, [254,249,195], [180,83,9])
    body.push([{ content: '', colSpan, styles: { fillColor: [255,255,255], cellPadding: 1.5 } }])

    // Laba Kotor
    addHighlight('LABA KOTOR', r.labaKotor, r.refLabaKotor, [187,247,208], [22,101,52])
    body.push([{ content: '', colSpan, styles: { fillColor: [255,255,255], cellPadding: 1.5 } }])

    // Beban Operasi
    addGroupL1('Beban Operasi')
    addGroupL2('BEBAN PEMASARAN, UMUM & ADM')
    for (const l of visibleLines(r.bebanOperasi.lines)) addDetail(l.name, l.amount, l.refAmount)
    addSubtotal('Jumlah Beban Operasi', r.bebanOperasi.total, r.bebanOperasi.refTotal, [237,233,254], [124,58,237])
    body.push([{ content: '', colSpan, styles: { fillColor: [255,255,255], cellPadding: 1.5 } }])

    // Pendapatan Operasi
    addHighlight('PENDAPATAN OPERASI', r.pendapatanOperasi, r.refPendapatanOperasi, [219,234,254], [29,78,216])
    body.push([{ content: '', colSpan, styles: { fillColor: [255,255,255], cellPadding: 1.5 } }])

    // Pendapatan & Beban Lain
    addGroupL1('Pendapatan dan Beban Lain')
    addGroupL2('Pendapatan lain')
    addGroupL3('PENDAPATAN DILUAR USAHA')
    for (const l of visibleLines(r.pendapatanLain.lines)) addDetail(l.name, l.amount, l.refAmount, 28)
    addSubtotal('Jumlah Pendapatan lain', r.pendapatanLain.total, r.pendapatanLain.refTotal, [240,253,244], [21,128,61], 16)

    addGroupL2('Beban lain-lain')
    addGroupL3('BEBAN DILUAR USAHA')
    for (const l of visibleLines(r.bebanLain.lines)) addDetail(l.name, l.amount, l.refAmount, 28)
    addSubtotal('Jumlah Beban lain-lain', r.bebanLain.total, r.bebanLain.refTotal, [254,226,226], [185,28,28], 16)

    addSubtotal('Jumlah Pendapatan dan Beban Lain', r.pendapatanLain.total - r.bebanLain.total, r.pendapatanLain.refTotal - r.bebanLain.refTotal, [241,245,249], [15,23,42])
    body.push([{ content: '', colSpan, styles: { fillColor: [255,255,255], cellPadding: 1.5 } }])

    // Laba Bersih
    addHighlight('LABA(RUGI) BERSIH (Before Tax)', r.labaBersih, r.refLabaBersih, [30,58,95], [255,255,255])
    addHighlight('LABA(RUGI) BERSIH (After Tax)',  r.labaBersih, r.refLabaBersih, [30,58,95], [255,255,255])

    const colStyles = col2
      ? { 0: { cellWidth: 'auto' }, 1: { cellWidth: 38, halign: 'right' }, 2: { cellWidth: 38, halign: 'right' } }
      : { 0: { cellWidth: 'auto' }, 1: { cellWidth: 50, halign: 'right' } }

    const tableOpts = {
      head, body,
      startY: 30,
      styles:       { fontSize: 8, cellPadding: 2, overflow: 'linebreak', lineColor: [226,232,240], lineWidth: 0.1 },
      headStyles:   { fillColor: [30,58,138], textColor: [255,255,255], fontStyle: 'bold', fontSize: 8.5, halign: 'center', cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      columnStyles: colStyles,
      margin:       { left: 10, right: 10 },
    }

    if (typeof doc.autoTable === 'function') doc.autoTable(tableOpts)
    else autoTable(doc, tableOpts)

    // Page footer
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7.5)
      doc.setTextColor(148,163,184)
      doc.text('ACCURATE Accounting System Report', 105, 289, { align: 'center' })
      doc.text(`Cetak di ${printDateLabel.value}`, 10, 289)
      doc.text(`(${i})`, 200, 289, { align: 'right' })
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
  --accent: #2563eb;
  --danger: #dc2626;
  --bg: #f1f5f9;
  --surface: #fff;
  --surface2: #f8fafc;
  --border: #e2e8f0;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --radius: 12px;
  --radius-sm: 7px;
  --shadow-md: 0 4px 20px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,.04);
}

.layout { display: flex; min-height: 100vh; background: var(--bg); font-family: var(--font); }
.main   { flex: 1; padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.content-card { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); overflow: hidden; }
.page-header  { padding: 20px 20px 0; }
.page-title   { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0 0 2px; }
.page-subtitle{ font-size: 12px; color: var(--text-muted); margin: 0; }

/* Filter */
.filter-panel         { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 16px; }
.filter-section       { display: flex; flex-direction: column; gap: 8px; }
.filter-section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); padding: 6px 10px; background: var(--surface2); border-radius: var(--radius-sm); border-left: 3px solid var(--accent); cursor: default; display: flex; align-items: center; gap: 6px; }
.filter-section-title.adv-toggle { cursor: pointer; user-select: none; }
.adv-chevron          { transition: transform .2s; color: var(--text-muted); }
.adv-chevron--open    { transform: rotate(180deg); }
.filter-grid  { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.filter-group { display: flex; flex-direction: column; gap: 4px; }
.filter-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-input   { width: 100%; height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.form-input:focus { border-color: var(--accent); background: #fff; }
.form-input--date { padding: 0 8px; cursor: pointer; }
.check-row    { display: flex; align-items: center; gap: 8px; height: 36px; }
.check-label  { font-size: 13px; color: var(--text-secondary); font-weight: 400; cursor: pointer; }
.checkbox     { width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; }

/* Buttons */
.filter-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.btn            { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: var(--radius-sm); font-size: 12.5px; font-weight: 600; cursor: pointer; border: none; transition: background .15s, opacity .15s; font-family: var(--font); }
.btn:disabled   { opacity: .6; cursor: not-allowed; }
.btn-sep        { width: 1px; height: 28px; background: var(--border); margin: 0 4px; }
.btn--search    { background: var(--accent); color: #fff; }
.btn--search:hover:not(:disabled) { background: #1d4ed8; }
.btn--ghost     { background: var(--surface2); color: var(--text-secondary); border: 1px solid var(--border); }
.btn--ghost:hover { background: var(--border); }
.btn--xlsx      { background: #16a34a; color: #fff; }
.btn--xlsx:hover:not(:disabled) { background: #15803d; }
.btn--pdf       { background: #dc2626; color: #fff; }
.btn--pdf:hover:not(:disabled)  { background: #b91c1c; }
.btn--print     { background: #475569; color: #fff; }
.btn--print:hover { background: #334155; }

/* Error */
.tb-error { margin: 16px 20px 0; padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; }

/* Screen Header (summary bar) */
.screen-header       { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 20px; border-bottom: 1px solid var(--border); background: var(--surface2); flex-wrap: wrap; }
.sh-left             { display: flex; flex-direction: column; gap: 2px; }
.sh-label            { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); }
.sh-value            { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.sh-stats            { display: flex; gap: 12px; flex-wrap: wrap; }
.sh-stat             { display: flex; flex-direction: column; gap: 2px; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 14px; min-width: 120px; }
.sh-stat--highlight  { border-color: #3b82f6; background: #eff6ff; }
.sh-stat-label       { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); }
.sh-stat-val         { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.sh-stat-val.income  { color: #15803d; }
.sh-stat-val.loss    { color: #dc2626; }

/* Table wrapper */
.table-wrap { overflow-x: auto; }

/* Main P&L Table — ACCURATE style */
.pl-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font);
  font-size: 13px;
}
.pl-table thead th {
  background: #eff6ff;
  border-bottom: 2px solid #bfdbfe;
  padding: 8px 14px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: #1e3a8a;
  white-space: nowrap;
}
.pl-table thead th:first-child { text-align: left; }
.col-desc { text-align: left; min-width: 340px; }
.col-amt  { text-align: right !important; width: 160px; }

/* Group rows */
.tr-group-l1 td {
  padding: 10px 14px 4px;
  font-weight: 700;
  font-size: 13px;
  color: #0f172a;
  background: #fff;
  border-top: 6px solid #f1f5f9;
}
.tr-group-l2 td {
  padding: 5px 14px 3px 28px;
  font-weight: 700;
  font-size: 12px;
  color: #1e40af;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}
.tr-group-l3 td {
  padding: 4px 14px 3px 42px;
  font-weight: 700;
  font-size: 11.5px;
  color: #4b5563;
  background: #f8fafc;
  letter-spacing: .02em;
}

/* Detail rows */
.tr-detail td { padding: 5px 14px; border-bottom: 1px solid #f8fafc; background: #fff; }
.tr-detail:hover td { background: #f8faff; }
.tr-empty td { color: #94a3b8; font-style: italic; }

/* td helpers */
.td-name        { text-align: left; }
.td-num         { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.indent-1       { padding-left: 14px !important; }
.indent-2       { padding-left: 28px !important; }
.indent-3       { padding-left: 42px !important; }
.bold           { font-weight: 700; }
.text-income    { color: #15803d; }
.text-loss      { color: #dc2626; }
.text-muted     { color: #94a3b8; }

/* Subtotal rows */
.tr-subtotal td {
  padding: 6px 14px;
  background: #f0fdf4;
  border-top: 1px solid #bbf7d0;
  border-bottom: 1px solid #bbf7d0;
  font-weight: 700;
  font-size: 12.5px;
  color: #166534;
}
.tr-subtotal-l2 td {
  padding: 5px 14px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 600;
  font-size: 12px;
  color: #374151;
}

/* Highlight rows */
.tr-laba-kotor td {
  padding: 9px 14px;
  background: #bbf7d0;
  border-top: 2px solid #4ade80;
  border-bottom: 2px solid #4ade80;
}
.tr-pendapatan-operasi td {
  padding: 9px 14px;
  background: #dbeafe;
  border-top: 2px solid #93c5fd;
  border-bottom: 2px solid #93c5fd;
}
.tr-laba-bersih td {
  padding: 10px 14px;
  background: #1e3a5f;
  color: #fff;
  border-top: 3px solid #1e40af;
}
.tr-laba-bersih td { color: #fff; }
.tr-laba-bersih .td-num { color: #fff; }
.tr-laba-bersih-after td {
  padding: 10px 14px;
  background: #1e3a5f;
  color: #fff;
  border-top: 1px solid #2d4f80;
  border-bottom: 3px solid #1e40af;
}
.tr-laba-bersih-after .td-num { color: #fff; }

/* Print footer (screen) — hidden */
.print-footer { display: none; }

/* ══════════════════════════════════════
   PRINT STYLES — matches ACCURATE PDF
   ══════════════════════════════════════ */
.print-header { display: none; }
@media print {
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

  .layout { background: #fff !important; }
  .main   { padding: 0 !important; }
  .content-card { box-shadow: none !important; border-radius: 0 !important; }
  .page-header,
  .filter-panel,
  .screen-header,
  .tb-error { display: none !important; }

  /* Print header block */
  .print-header {
    display: block !important;
    text-align: center;
    padding: 10px 0 6px;
    border-bottom: 1.5px solid #1e3a8a;
    margin-bottom: 4px;
  }
  .print-company { font-size: 11pt; font-weight: 800; color: #0f172a; letter-spacing: .01em; }
  .print-title   { font-size: 14pt; font-weight: 800; color: #1e3a8a; margin-top: 2px; }
  .print-period  { font-size: 9pt;  color: #374151; margin-top: 3px; font-weight: 600; }

  /* Print footer */
  .print-footer {
    display: flex !important;
    justify-content: space-between;
    padding: 4px 0 0;
    border-top: 1px solid #e2e8f0;
    margin-top: 4px;
    font-size: 7pt;
    color: #94a3b8;
    font-style: italic;
  }

  .table-wrap { overflow: visible !important; }
  .pl-table   { font-size: 8pt !important; }
  .pl-table thead th { font-size: 8pt !important; padding: 4px 8px !important; background: #eff6ff !important; }

  .tr-group-l1 td { padding: 6px 8px 2px !important; font-size: 8pt !important; border-top-width: 4px !important; }
  .tr-group-l2 td { padding: 3px 8px 2px 20px !important; font-size: 8pt !important; }
  .tr-group-l3 td { padding: 2px 8px 2px 30px !important; font-size: 7.5pt !important; }
  .tr-detail td   { padding: 2px 8px !important; font-size: 8pt !important; }
  .indent-2       { padding-left: 20px !important; }
  .indent-3       { padding-left: 30px !important; }
  .tr-subtotal td         { padding: 3px 8px !important; font-size: 8pt !important; }
  .tr-subtotal-l2 td      { padding: 3px 8px !important; font-size: 8pt !important; }
  .tr-laba-kotor td        { padding: 4px 8px !important; font-size: 8pt !important; background: #bbf7d0 !important; }
  .tr-pendapatan-operasi td{ padding: 4px 8px !important; font-size: 8pt !important; background: #dbeafe !important; }
  .tr-laba-bersih td      { padding: 4px 8px !important; font-size: 8.5pt !important; background: #1e3a5f !important; color: #fff !important; }
  .tr-laba-bersih-after td{ padding: 4px 8px !important; font-size: 8.5pt !important; background: #1e3a5f !important; color: #fff !important; }

  @page { size: A4 portrait; margin: 10mm 10mm 15mm; }
  tr { page-break-inside: avoid; }
}

/* Loading / Empty */
.tb-empty-state { padding: 56px 24px; text-align: center; color: var(--text-muted); font-size: 13.5px; line-height: 1.6; }
.tb-empty-state strong { color: var(--text-secondary); }
.loading-dots { display: flex; justify-content: center; gap: 6px; }
.loading-dots span { width: 7px; height: 7px; background: var(--accent); border-radius: 50%; animation: bounce 1.2s infinite ease-in-out; }
.loading-dots span:nth-child(2) { animation-delay: .2s; }
.loading-dots span:nth-child(3) { animation-delay: .4s; }
.spinner        { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
.spinner--dark  { border-color: rgba(0,0,0,.12); border-top-color: currentColor; }
@keyframes bounce { 0%, 80%, 100% { transform: scale(0); opacity: .5; } 40% { transform: scale(1); opacity: 1; } }
@keyframes spin   { to { transform: rotate(360deg); } }
</style>