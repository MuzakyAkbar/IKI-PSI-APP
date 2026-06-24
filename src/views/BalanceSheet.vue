<template>
  <div class="layout">
    <main class="main">
      <div class="content-card">

        <div class="page-header">
          <h2 class="page-title">Neraca</h2>
          <p class="page-subtitle">Laporan Posisi Keuangan (Neraca)</p>
        </div>

        <div class="filter-panel">
          <div class="filter-section">
            <div class="filter-section-title">Parameter Laporan</div>
            <div class="filter-grid">
              <div class="filter-group">
                <label>Per Tanggal</label>
                <input
                  type="date"
                  v-model="filters.asOfDate"
                  class="form-input form-input--date"
                />
              </div>
              <div class="filter-group">
                <label>Organisasi</label>
                <select v-model="filters.organization" class="form-input">
                  <option value="">* (Semua)</option>
                  <option v-for="o in organizations" :key="o.id" :value="o.id">{{ o.name }}</option>
                </select>
              </div>
              <div class="filter-group">
                <label>General Ledger</label>
                <select v-model="filters.accountingSchema" class="form-input">
                  <option value="">Semua</option>
                  <option v-for="s in accountingSchemas" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
              </div>
            </div>
          </div>

          <div class="filter-section">
            <div class="filter-section-title adv-toggle" @click="showAdvanced = !showAdvanced">
              Filter Lanjutan
              <svg :class="['adv-chevron', showAdvanced && 'adv-chevron--open']" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div v-if="showAdvanced" class="filter-grid" style="margin-top:12px">
              <div class="filter-group">
                <label>Tanggal Pembanding</label>
                <input
                  type="date"
                  v-model="filters.asOfRefDate"
                  class="form-input form-input--date"
                />
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
            <template v-if="searched && reportGroups.length > 0">
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

        <div v-if="error" class="tb-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ error }}
        </div>

        <div v-if="searched && !loading">
          <div class="summary-cards">
            <div class="summary-card">
              <span class="summary-label">Per Tanggal</span>
              <span class="summary-value summary-value--period">{{ formatDate(filters.asOfDate) }}</span>
            </div>
            <div class="summary-card summary-card--asset">
              <span class="summary-label">Total Aset</span>
              <span class="summary-value summary-value--asset">{{ formatCurrency(totalAset) }}</span>
            </div>
            <div class="summary-card summary-card--liab">
              <span class="summary-label">Total Liabilitas</span>
              <span class="summary-value summary-value--liab">{{ formatCurrency(totalLiabilitas) }}</span>
            </div>
            <div class="summary-card summary-card--equity">
              <span class="summary-label">Total Ekuitas</span>
              <span class="summary-value summary-value--equity">{{ formatCurrency(totalEkuitas) }}</span>
            </div>
            <div class="summary-card">
              <span class="summary-label">Cek Neraca</span>
              <span class="summary-value" :class="isBalanced ? 'summary-value--balanced' : 'summary-value--unbalanced'">
                {{ isBalanced ? '✓ Balanced' : '✗ Not Balanced' }}
              </span>
              <span v-if="!isBalanced" class="summary-diff">
                Selisih: {{ formatCurrency(Math.abs(totalAset - (totalLiabilitas + totalEkuitas))) }}
              </span>
            </div>
          </div>

          <div id="bs-print-area">

            <!-- Print Header (hanya tampil saat print / export PDF) -->
            <div class="print-header">
              <div class="print-company">{{ orgName || 'PERSERODA PEMBANGUNAN INVESTASI TANGERANG SELATAN' }}</div>
              <div class="print-title">Neraca (Standar)</div>
              <div class="print-period">Per Tgl. {{ formatDateShort(filters.asOfDate) }}</div>
            </div>

            <div class="table-wrap" v-if="reportGroups.length > 0">
              <table class="table bs-table" id="bs-table">
                <thead>
                  <tr>
                    <th class="bs-col-account">Description</th>
                    <th class="bs-col-bal">Balance</th>
                    <th v-if="showRef" class="bs-col-bal">{{ formatDate(filters.asOfRefDate) }}</th>
                    <th v-if="showRef" class="bs-col-diff">Selisih</th>
                  </tr>
                </thead>
                <tbody>

                  <!-- ═══ AKTIVA ═══ -->
                  <template v-if="assetGroups.length > 0">
                    <tr class="tr-section-lv1">
                      <td colspan="99" class="td-section-lv1">Aktiva</td>
                    </tr>
                    <template v-for="group in assetGroups" :key="group.id">
                      <!-- Nama group = "Aktiva Lancar", "Aktiva Tetap", dll -->
                      <tr class="tr-section-lv2">
                        <td colspan="99" class="td-section-lv2">{{ group.name }}</td>
                      </tr>
                      <!-- Sub-group nodes — ditampilkan flat, indented -->
                      <tr v-for="node in group.nodes" :key="node.id" class="tr-detail">
                        <td class="td-detail">{{ node.name }}</td>
                        <td class="tb-num td-bal">{{ fmt(node.balance) }}</td>
                        <td v-if="showRef" class="tb-num td-bal">{{ fmt(node.refBalance) }}</td>
                        <td v-if="showRef" class="tb-num td-bal" :class="diffClass(node.balance - node.refBalance)">{{ fmt(node.balance - node.refBalance) }}</td>
                      </tr>
                      <!-- Subtotal group -->
                      <tr class="tr-subtotal">
                        <td class="td-subtotal">Jumlah {{ group.name }}</td>
                        <td class="tb-num td-subtotal-val">{{ fmt(group.total) }}</td>
                        <td v-if="showRef" class="tb-num td-subtotal-val">{{ fmt(group.refTotal) }}</td>
                        <td v-if="showRef" class="tb-num td-subtotal-val" :class="diffClass(group.total - group.refTotal)">{{ fmt(group.total - group.refTotal) }}</td>
                      </tr>
                    </template>
                    <!-- Total Aktiva -->
                    <tr class="tr-total-section">
                      <td class="td-total-section">Jumlah Aktiva</td>
                      <td class="tb-num td-total-section-val">{{ fmt(totalAset) }}</td>
                      <td v-if="showRef" class="tb-num td-total-section-val">{{ fmt(refTotalAset) }}</td>
                      <td v-if="showRef" class="tb-num td-total-section-val" :class="diffClass(totalAset - refTotalAset)">{{ fmt(totalAset - refTotalAset) }}</td>
                    </tr>
                  </template>

                  <!-- ═══ KEWAJIBAN DAN EKUITAS ═══ -->
                  <template v-if="liabGroups.length > 0 || equityGroups.length > 0">
                    <tr class="tr-spacer-row"><td colspan="99"></td></tr>
                    <tr class="tr-section-lv1">
                      <td colspan="99" class="td-section-lv1">Kewajiban dan Ekuitas</td>
                    </tr>
                  </template>

                  <!-- Kewajiban -->
                  <template v-if="liabGroups.length > 0">
                    <tr class="tr-section-lv2">
                      <td colspan="99" class="td-section-lv2">Kewajiban</td>
                    </tr>
                    <template v-for="group in liabGroups" :key="group.id">
                      <tr class="tr-section-lv3">
                        <td colspan="99" class="td-section-lv3">{{ group.name }}</td>
                      </tr>
                      <tr v-for="node in group.nodes" :key="node.id" class="tr-detail">
                        <td class="td-detail">{{ node.name }}</td>
                        <td class="tb-num td-bal">{{ fmt(node.balance) }}</td>
                        <td v-if="showRef" class="tb-num td-bal">{{ fmt(node.refBalance) }}</td>
                        <td v-if="showRef" class="tb-num td-bal" :class="diffClass(node.balance - node.refBalance)">{{ fmt(node.balance - node.refBalance) }}</td>
                      </tr>
                      <tr class="tr-subtotal">
                        <td class="td-subtotal">Jumlah {{ group.name }}</td>
                        <td class="tb-num td-subtotal-val">{{ fmt(group.total) }}</td>
                        <td v-if="showRef" class="tb-num td-subtotal-val">{{ fmt(group.refTotal) }}</td>
                        <td v-if="showRef" class="tb-num td-subtotal-val" :class="diffClass(group.total - group.refTotal)">{{ fmt(group.total - group.refTotal) }}</td>
                      </tr>
                    </template>
                    <!-- Total Kewajiban -->
                    <tr class="tr-total-subsection">
                      <td class="td-total-subsection">Jumlah Kewajiban</td>
                      <td class="tb-num td-total-subsection-val">{{ fmt(totalLiabilitas) }}</td>
                      <td v-if="showRef" class="tb-num td-total-subsection-val">{{ fmt(refTotalLiabilitas) }}</td>
                      <td v-if="showRef" class="tb-num td-total-subsection-val" :class="diffClass(totalLiabilitas - refTotalLiabilitas)">{{ fmt(totalLiabilitas - refTotalLiabilitas) }}</td>
                    </tr>
                  </template>

                  <!-- Ekuitas -->
                  <template v-if="equityGroups.length > 0">
                    <tr class="tr-section-lv2">
                      <td colspan="99" class="td-section-lv2">Ekuitas</td>
                    </tr>
                    <template v-for="group in equityGroups" :key="group.id">
                      <tr v-for="node in group.nodes" :key="node.id" class="tr-detail">
                        <td class="td-detail">{{ node.name }}</td>
                        <td class="tb-num td-bal">{{ fmt(node.balance) }}</td>
                        <td v-if="showRef" class="tb-num td-bal">{{ fmt(node.refBalance) }}</td>
                        <td v-if="showRef" class="tb-num td-bal" :class="diffClass(node.balance - node.refBalance)">{{ fmt(node.balance - node.refBalance) }}</td>
                      </tr>
                    </template>
                    <!-- Total Ekuitas -->
                    <tr class="tr-total-subsection">
                      <td class="td-total-subsection">Jumlah Ekuitas</td>
                      <td class="tb-num td-total-subsection-val">{{ fmt(totalEkuitas) }}</td>
                      <td v-if="showRef" class="tb-num td-total-subsection-val">{{ fmt(refTotalEkuitas) }}</td>
                      <td v-if="showRef" class="tb-num td-total-subsection-val" :class="diffClass(totalEkuitas - refTotalEkuitas)">{{ fmt(totalEkuitas - refTotalEkuitas) }}</td>
                    </tr>
                  </template>

                </tbody>
                <tfoot>
                  <!-- Total Kewajiban dan Ekuitas -->
                  <tr class="tr-grand-total">
                    <td class="td-grand-total">Jumlah Kewajiban dan Ekuitas</td>
                    <td class="tb-num td-grand-total-val">{{ fmt(totalLiabilitas + totalEkuitas) }}</td>
                    <td v-if="showRef" class="tb-num td-grand-total-val">{{ fmt(refTotalLiabilitas + refTotalEkuitas) }}</td>
                    <td v-if="showRef" class="tb-num td-grand-total-val" :class="diffClass((totalLiabilitas + totalEkuitas) - (refTotalLiabilitas + refTotalEkuitas))">{{ fmt((totalLiabilitas + totalEkuitas) - (refTotalLiabilitas + refTotalEkuitas)) }}</td>
                  </tr>
                  <!-- Balance check (hanya screen) -->
                  <tr class="tr-balance-check screen-only" :class="isBalanced ? 'tr-balanced' : 'tr-unbalanced'">
                    <td class="balance-check-label" colspan="99">
                      <span v-if="isBalanced">✓ Neraca Seimbang &nbsp;(Aktiva = Kewajiban + Ekuitas)</span>
                      <span v-else>✗ Neraca Tidak Seimbang — selisih: {{ formatCurrency(Math.abs(totalAset - (totalLiabilitas + totalEkuitas))) }}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div v-else class="tb-empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="color:#cbd5e1;margin:0 auto 12px;display:block"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              <p>Tidak ada data neraca untuk parameter yang dipilih.</p>
            </div>

          </div></div>

        <div v-else-if="loading" class="tb-empty-state">
          <div class="loading-dots"><span></span><span></span><span></span></div>
          <p style="margin-top:16px">Memuat data balance sheet...</p>
        </div>

        <div v-else-if="!searched" class="tb-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="color:#cbd5e1;margin:0 auto 12px;display:block"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
          <p>Pilih <strong>Per Tanggal</strong> dan klik <strong>Cari</strong> untuk melihat balance sheet.</p>
        </div>

      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  fetchCoaList,
  fetchBalanceMap,
  buildBalanceSheetFromCoa,
  fetchOrganizations,
  fetchAccountingSchemas,
} from '@/services/balanceSheet.js'

// ── lookups
const organizations     = ref([])
const accountingSchemas = ref([])

// ── filters
const today = () => new Date().toISOString().slice(0, 10)
const defaultFilters = () => ({
  asOfDate:         today(),
  asOfRefDate:      '',
  organization:     '',
  accountingSchema: '',
  postingType:      'A',
  includeZero:      false,
  showComparison:   false,
})
const filters      = ref(defaultFilters())
const showAdvanced = ref(false)

// ── state
const loading      = ref(false)
const error        = ref('')
const searched     = ref(false)
const reportGroups = ref([])
const exporting    = ref('')

// ── computed: pisahkan grup berdasarkan tipe neraca
const showRef       = computed(() => filters.value.showComparison && !!filters.value.asOfRefDate)
const assetGroups   = computed(() => reportGroups.value.filter(g => g.balanceSheetType === 'asset'))
const liabGroups    = computed(() => reportGroups.value.filter(g => g.balanceSheetType === 'liability'))
const equityGroups  = computed(() => reportGroups.value.filter(g => g.balanceSheetType === 'equity'))

// ── totals
const totalAset          = computed(() => assetGroups.value.reduce((s, g)  => s + g.total,    0))
const totalLiabilitas    = computed(() => liabGroups.value.reduce((s, g)   => s + g.total,    0))
const totalEkuitas       = computed(() => equityGroups.value.reduce((s, g) => s + g.total,    0))
const refTotalAset       = computed(() => assetGroups.value.reduce((s, g)  => s + g.refTotal, 0))
const refTotalLiabilitas = computed(() => liabGroups.value.reduce((s, g)   => s + g.refTotal, 0))
const refTotalEkuitas    = computed(() => equityGroups.value.reduce((s, g) => s + g.refTotal, 0))

// ── cek keseimbangan
const isBalanced = computed(() =>
  Math.abs(totalAset.value - (totalLiabilitas.value + totalEkuitas.value)) < 1
)

// ── orgName: nama organisasi yang dipilih (untuk header print)
const orgName = computed(() => {
  if (!filters.value.organization) return ''
  const found = organizations.value.find(o => o.id === filters.value.organization)
  return found ? found.name : ''
})

// ── formatters
function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatDateShort(d) {
  // "08 May 2026" style sesuai PDF ACCURATE
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
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
function bsFileName(ext) {
  const d = (filters.value.asOfDate || '').replace(/-/g, '')
  return `BalanceSheet_${d}.${ext}`
}

// ── onMounted
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
  if (!filters.value.asOfDate) { error.value = 'Per Tanggal wajib diisi.'; return }
  loading.value = true; error.value = ''; searched.value = true; reportGroups.value = []
  try {
    const opts = {
      organization:     filters.value.organization,
      accountingSchema: filters.value.accountingSchema,
      postingType:      filters.value.postingType,
    }

    const [coaList, balMap, refBalMap] = await Promise.all([
      fetchCoaList(),
      fetchBalanceMap(filters.value.asOfDate, opts),
      showRef.value
        ? fetchBalanceMap(filters.value.asOfRefDate, opts)
        : Promise.resolve(new Map()),
    ])

    reportGroups.value = buildBalanceSheetFromCoa(
      coaList,
      balMap,
      refBalMap,
      filters.value.includeZero,
    )
  } catch (e) {
    error.value = e?.response?.data?.response?.error?.message || e.message
    reportGroups.value = []
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.value = defaultFilters()
  reportGroups.value = []
  searched.value = false
  error.value = ''
}

// ════════════════════════════════════════════════════
// PRINT
// ════════════════════════════════════════════════════
function printReport() {
  window.print()
}

// ════════════════════════════════════════════════════
// EXPORT EXCEL (Menggunakan ExcelJS & Template Kustom)
// ════════════════════════════════════════════════════
async function exportXlsx() {
  exporting.value = 'xlsx'
  try {
    // Load ExcelJS from CDN
    await loadScript('https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js')
    const ExcelJS = window.ExcelJS

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'NexERP System' // Sesuaikan jika perlu
    workbook.created = new Date()

    const ws = workbook.addWorksheet('Balance Sheet', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
      views: [{ state: 'frozen', xSplit: 0, ySplit: 6 }], // Bekukan baris header
    })

    const hasRef = showRef.value
    const col1Date = formatDate(filters.value.asOfDate)
    const col2Date = hasRef ? formatDate(filters.value.asOfRefDate) : ''
    
    // ── Columns Setup ──
    if (hasRef) {
      ws.columns = [
        { key: 'akun', width: 45 },
        { key: 'bal1', width: 22 },
        { key: 'bal2', width: 22 },
        { key: 'diff', width: 22 },
      ]
    } else {
      ws.columns = [
        { key: 'akun', width: 55 },
        { key: 'bal1', width: 30 },
      ]
    }

    const lastCol = hasRef ? 'D' : 'B'
    const numCols = hasRef ? 4 : 2

    // ── Color Palette ──
    const C = {
      titleBg:    '1E3A8A', titleFg:    'FFFFFF',
      metaBg:     'F8FAFC', metaLabel:  '64748B', metaVal: '1E293B',
      hdrBg:      '2563EB', hdrFg:      'FFFFFF',
      
      assetCatBg: 'DBEAFE', assetCatFg: '1E3A8A', assetGrpBg: 'EFF6FF', assetGrpFg: '1D4ED8',
      liabCatBg:  'FEE2E2', liabCatFg:  '991B1B', liabGrpBg:  'FFF1F2', liabGrpFg:  'DC2626',
      eqCatBg:    'D1FAE5', eqCatFg:    '065F46', eqGrpBg:    'ECFDF5', eqGrpFg:    '059669',
      
      secTotalBg: '1E3A8A', secTotalFg: 'FFFFFF',
      border:     'CBD5E1', white:      'FFFFFF', text: '374151'
    }

    // ── Helpers ──
    const numFmt = '#,##0.00'
    const solidFill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
    const thinBorder = () => ({
      top: { style: 'thin', color: { argb: C.border } }, bottom: { style: 'thin', color: { argb: C.border } },
      left: { style: 'thin', color: { argb: C.border } }, right: { style: 'thin', color: { argb: C.border } }
    })
    const applyStyle = (row, style) => {
      row.eachCell({ includeEmpty: true }, cell => {
        if (style.fill) cell.fill = style.fill
        if (style.font) cell.font = { ...cell.font, ...style.font }
        if (style.border) cell.border = style.border
        if (style.alignment) cell.alignment = style.alignment
      })
    }

    // ══ ROW 1 & 2: Main Title ══
    const r1 = ws.addRow(['BALANCE SHEET'])
    ws.mergeCells(`A1:${lastCol}1`)
    r1.height = 24
    applyStyle(r1, {
      fill: solidFill(C.titleBg),
      font: { name: 'Calibri', bold: true, size: 14, color: { argb: C.titleFg } },
      alignment: { vertical: 'middle', horizontal: 'center' },
    })

    const r2 = ws.addRow(['Laporan Posisi Keuangan (Neraca)'])
    ws.mergeCells(`A2:${lastCol}2`)
    r2.height = 18
    applyStyle(r2, {
      fill: solidFill(C.titleBg),
      font: { name: 'Calibri', bold: false, size: 11, color: { argb: 'BFDBFE' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
    })

    // ══ ROW 3 & 4: Meta Info ══
    const r3 = ws.addRow(hasRef ? ['Per Tanggal', 'Pembanding', 'Mata Uang', ''] : ['Per Tanggal', 'Mata Uang'])
    r3.height = 16
    applyStyle(r3, { fill: solidFill(C.metaBg), font: { name: 'Calibri', bold: true, size: 9, color: { argb: C.metaLabel } }, alignment: { vertical: 'middle', horizontal: 'center' }, border: thinBorder() })

    const r4 = ws.addRow(hasRef ? [col1Date, col2Date, 'IDR (Rupiah)', ''] : [col1Date, 'IDR (Rupiah)'])
    r4.height = 20
    applyStyle(r4, { fill: solidFill(C.white), font: { name: 'Calibri', bold: true, size: 11, color: { argb: C.metaVal } }, alignment: { vertical: 'middle', horizontal: 'center' }, border: thinBorder() })
    if (hasRef) ws.mergeCells('C4:D4')

    // ══ ROW 5: Spacer ══
    const r5 = ws.addRow([])
    r5.height = 8

    // ══ ROW 6: Table Headers ══
    const headers = hasRef ? ['Akun', col1Date, col2Date, 'Selisih'] : ['Akun', col1Date]
    const r6 = ws.addRow(headers)
    r6.height = 22
    applyStyle(r6, {
      fill: solidFill(C.hdrBg),
      font: { name: 'Calibri', bold: true, size: 11, color: { argb: C.hdrFg } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: thinBorder()
    })
    ws.getCell('A6').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

    let rowIdx = 7

    // ── Function to render sections ──
    const addCategoryHdr = (name, bg, fg) => {
      const row = ws.addRow([name])
      ws.mergeCells(`A${rowIdx}:${lastCol}${rowIdx}`)
      row.height = 22
      applyStyle(row, { fill: solidFill(bg), font: { name: 'Calibri', bold: true, size: 11, color: { argb: fg } }, alignment: { vertical: 'middle', horizontal: 'left', indent: 1 }, border: thinBorder() })
      rowIdx++
    }

    const addGroupHdr = (name, desc, bg, fg) => {
      const title = desc ? `${name} — ${desc}` : name
      const row = ws.addRow([title])
      ws.mergeCells(`A${rowIdx}:${lastCol}${rowIdx}`)
      row.height = 18
      applyStyle(row, { fill: solidFill(bg), font: { name: 'Calibri', bold: true, size: 10, color: { argb: fg } }, alignment: { vertical: 'middle', horizontal: 'left', indent: 2 }, border: thinBorder() })
      rowIdx++
    }

    const addNodeLine = (node) => {
      const data = hasRef 
        ? [`${node.searchKey}  ${node.name}`, node.balance || 0, node.refBalance || 0, (node.balance || 0) - (node.refBalance || 0)]
        : [`${node.searchKey}  ${node.name}`, node.balance || 0]
      const row = ws.addRow(data)
      row.height = 16
      applyStyle(row, { fill: solidFill(C.white), font: { name: 'Calibri', size: 10, color: { argb: C.text } }, alignment: { vertical: 'middle' }, border: thinBorder() })
      
      ws.getCell(`A${rowIdx}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 3 }
      ;['B','C','D'].slice(0, numCols - 1).forEach((col, i) => {
        const cell = ws.getCell(`${col}${rowIdx}`)
        cell.numFmt = numFmt
        cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
        // Warnai selisih jika ada
        if (col === 'D') {
          const val = (node.balance || 0) - (node.refBalance || 0)
          if (val > 0) cell.font = { name: 'Calibri', size: 10, color: { argb: '1D4ED8' } } // Biru
          else if (val < 0) cell.font = { name: 'Calibri', size: 10, color: { argb: 'DC2626' } } // Merah
        }
      })
      rowIdx++
    }

    const addGroupTot = (name, total, refTotal, bg, fg) => {
      const data = hasRef ? [`Total ${name}`, total || 0, refTotal || 0, (total || 0) - (refTotal || 0)] : [`Total ${name}`, total || 0]
      const row = ws.addRow(data)
      row.height = 18
      applyStyle(row, { fill: solidFill(bg), font: { name: 'Calibri', bold: true, size: 10, color: { argb: fg } }, alignment: { vertical: 'middle' }, border: thinBorder() })
      ws.getCell(`A${rowIdx}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }
      ;['B','C','D'].slice(0, numCols - 1).forEach(col => {
        ws.getCell(`${col}${rowIdx}`).numFmt = numFmt
        ws.getCell(`${col}${rowIdx}`).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
      })
      rowIdx++
    }

    const addSectionTot = (name, total, refTotal, bg, fg) => {
      const data = hasRef ? [name, total || 0, refTotal || 0, (total || 0) - (refTotal || 0)] : [name, total || 0]
      const row = ws.addRow(data)
      row.height = 22
      applyStyle(row, { fill: solidFill(bg), font: { name: 'Calibri', bold: true, size: 11, color: { argb: fg } }, alignment: { vertical: 'middle' }, border: thinBorder() })
      ws.getCell(`A${rowIdx}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      ;['B','C','D'].slice(0, numCols - 1).forEach(col => {
        ws.getCell(`${col}${rowIdx}`).numFmt = numFmt
        ws.getCell(`${col}${rowIdx}`).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
      })
      
      const spacer = ws.addRow([])
      spacer.height = 8
      rowIdx += 2 // Termasuk spacer
    }

    // ── RENDER DATA ──

    // 1. ASET
    if (assetGroups.value.length > 0) {
      addCategoryHdr('ASET', C.assetCatBg, C.assetCatFg)
      assetGroups.value.forEach(g => {
        addGroupHdr(g.name, g.description, C.assetGrpBg, C.assetGrpFg)
        g.nodes.forEach(n => addNodeLine(n))
        addGroupTot(g.name, g.total, g.refTotal, C.assetCatBg, C.assetCatFg)
      })
      addSectionTot('TOTAL ASET', totalAset.value, refTotalAset.value, C.secTotalBg, C.secTotalFg)
    }

    // 2. LIABILITAS
    if (liabGroups.value.length > 0) {
      addCategoryHdr('LIABILITAS', C.liabCatBg, C.liabCatFg)
      liabGroups.value.forEach(g => {
        addGroupHdr(g.name, g.description, C.liabGrpBg, C.liabGrpFg)
        g.nodes.forEach(n => addNodeLine(n))
        addGroupTot(g.name, g.total, g.refTotal, C.liabCatBg, C.liabCatFg)
      })
      addSectionTot('TOTAL LIABILITAS', totalLiabilitas.value, refTotalLiabilitas.value, C.liabCatBg, C.white)
    }

    // 3. EKUITAS
    if (equityGroups.value.length > 0) {
      addCategoryHdr('EKUITAS', C.eqCatBg, C.eqCatFg)
      equityGroups.value.forEach(g => {
        addGroupHdr(g.name, g.description, C.eqGrpBg, C.eqGrpFg)
        g.nodes.forEach(n => addNodeLine(n))
        addGroupTot(g.name, g.total, g.refTotal, C.eqCatBg, C.eqCatFg)
      })
      addSectionTot('TOTAL EKUITAS', totalEkuitas.value, refTotalEkuitas.value, C.eqCatBg, C.eqCatFg)
    }

    // ── TOTAL LIABILITAS & EKUITAS ──
    const totLiabEq = totalLiabilitas.value + totalEkuitas.value
    const refTotLiabEq = refTotalLiabilitas.value + refTotalEkuitas.value
    addSectionTot('TOTAL LIABILITAS DAN EKUITAS', totLiabEq, refTotLiabEq, C.secTotalBg, C.secTotalFg)

    // ── BALANCE CHECK BAR ──
    const selisih = totalAset.value - totLiabEq
    const isBal = Math.abs(selisih) < 1
    const chkBg = isBal ? 'DCFCE7' : 'FEE2E2' // Green or Red
    const chkFg = isBal ? '166534' : '991B1B'
    const chkMsg = isBal 
      ? '✓ NERACA SEIMBANG  (Aset = Liabilitas + Ekuitas)' 
      : `✗ NERACA TIDAK SEIMBANG  —  Selisih: ${new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2 }).format(Math.abs(selisih))}`

    const rCheck = ws.addRow([chkMsg])
    ws.mergeCells(`A${rowIdx}:${lastCol}${rowIdx}`)
    rCheck.height = 24
    applyStyle(rCheck, {
      fill: solidFill(chkBg),
      font: { name: 'Calibri', bold: true, size: 11, color: { argb: chkFg } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'medium', color: { argb: chkFg } },
        bottom: { style: 'medium', color: { argb: chkFg } },
        left: { style: 'medium', color: { argb: chkFg } },
        right: { style: 'medium', color: { argb: chkFg } }
      }
    })

    // ── Download File ──
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = bsFileName('xlsx') // menggunakan fungsi bsFileName yang sudah ada
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
// EXPORT PDF — gaya ACCURATE (clean, hitam-putih, hierarki indentasi)
// ════════════════════════════════════════════════════
async function exportPdf() {
  exporting.value = 'pdf'
  try {
    const jsPDFmod = await import('jspdf')
    const jsPDF = jsPDFmod.default || jsPDFmod.jsPDF || jsPDFmod
    const autoTableMod = await import('jspdf-autotable')
    const autoTable = autoTableMod.default || autoTableMod

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const company = orgName.value || 'PERSERODA PEMBANGUNAN INVESTASI TANGERANG SELATAN'
    const hasRef  = showRef.value
    const colSpan = hasRef ? 4 : 2

    // ══ HEADER: ACCURATE style ══
    // Baris 1: nama perusahaan (bold, uppercase)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text(company.toUpperCase(), 105, 13, { align: 'center' })

    // Baris 2: judul laporan (bold, merah, besar) — simulasi dengan warna merah
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
    doc.setTextColor(180, 0, 0)
    doc.text('Neraca (Standar)', 105, 21, { align: 'center' })

    // Baris 3: Per Tgl.
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.text(`Per Tgl. ${formatDateShort(filters.value.asOfDate)}`, 105, 27, { align: 'center' })

    // Garis bawah header
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.line(10, 30, 200, 30)

    // ══ TABLE BODY ══
    const body = []

    // Warna-warna ACCURATE style (minimal, hitam-putih)
    const WHITE   = [255, 255, 255]
    const BLACK   = [0, 0, 0]
    const BOLD_BG = [255, 255, 255]  // header section: putih, bold saja

    // Helper padding untuk indentasi
    const pad = (n) => ' '.repeat(n)

    // Helper baris
    const addSectionLv1 = (label) => body.push([
      { content: label, colSpan, styles: { fontStyle: 'bold', fillColor: WHITE, textColor: BLACK, fontSize: 8.5, cellPadding: { top: 3, bottom: 1, left: 4, right: 4 } } }
    ])
    const addSectionLv2 = (label) => body.push([
      { content: pad(2) + label, colSpan, styles: { fontStyle: 'bold', fillColor: WHITE, textColor: BLACK, fontSize: 8.5, cellPadding: { top: 2, bottom: 1, left: 4, right: 4 } } }
    ])
    const addSectionLv3 = (label) => body.push([
      { content: pad(4) + label, colSpan, styles: { fontStyle: 'bold', fillColor: WHITE, textColor: BLACK, fontSize: 8, cellPadding: { top: 2, bottom: 1, left: 4, right: 4 } } }
    ])
    const addDetail = (n) => {
      const row = [
        { content: pad(6) + n.name, styles: { fontStyle: 'normal', fillColor: WHITE, textColor: BLACK, fontSize: 8, halign: 'left' } },
        { content: fmt(n.balance),  styles: { fontStyle: 'normal', fillColor: WHITE, textColor: BLACK, fontSize: 8, halign: 'right' } },
      ]
      if (hasRef) {
        row.push({ content: fmt(n.refBalance), styles: { fontSize: 8, halign: 'right', fillColor: WHITE, textColor: BLACK } })
        row.push({ content: fmt(n.balance - n.refBalance), styles: { fontSize: 8, halign: 'right', fillColor: WHITE, textColor: BLACK } })
      }
      body.push(row)
    }
    const addSubtotal = (label, total, refTotal) => {
      const row = [
        { content: pad(2) + label, styles: { fontStyle: 'bold', fillColor: WHITE, textColor: BLACK, fontSize: 8, halign: 'left', lineWidth: { top: 0.3 } } },
        { content: fmt(total),     styles: { fontStyle: 'bold', fillColor: WHITE, textColor: BLACK, fontSize: 8, halign: 'right', lineWidth: { top: 0.3 } } },
      ]
      if (hasRef) {
        row.push({ content: fmt(refTotal||0), styles: { fontStyle: 'bold', fillColor: WHITE, textColor: BLACK, fontSize: 8, halign: 'right', lineWidth: { top: 0.3 } } })
        row.push({ content: fmt((total||0)-(refTotal||0)), styles: { fontStyle: 'bold', fillColor: WHITE, textColor: BLACK, fontSize: 8, halign: 'right', lineWidth: { top: 0.3 } } })
      }
      body.push(row)
    }
    const addTotalSection = (label, total, refTotal) => {
      const row = [
        { content: label, styles: { fontStyle: 'bold', fillColor: WHITE, textColor: BLACK, fontSize: 8.5, halign: 'left', lineWidth: { top: 0.5 }, lineColor: [0,0,0] } },
        { content: fmt(total), styles: { fontStyle: 'bold', fillColor: WHITE, textColor: BLACK, fontSize: 8.5, halign: 'right', lineWidth: { top: 0.5 }, lineColor: [0,0,0] } },
      ]
      if (hasRef) {
        row.push({ content: fmt(refTotal||0), styles: { fontStyle: 'bold', fillColor: WHITE, textColor: BLACK, fontSize: 8.5, halign: 'right', lineWidth: { top: 0.5 }, lineColor: [0,0,0] } })
        row.push({ content: fmt((total||0)-(refTotal||0)), styles: { fontStyle: 'bold', fillColor: WHITE, textColor: BLACK, fontSize: 8.5, halign: 'right', lineWidth: { top: 0.5 }, lineColor: [0,0,0] } })
      }
      body.push(row)
    }
    const addSpacer = () => body.push([{ content: '', colSpan, styles: { cellPadding: { top: 1.5, bottom: 0, left: 0, right: 0 }, fillColor: WHITE } }])

    // ── AKTIVA ──
    addSectionLv1('Aktiva')
    for (const g of assetGroups.value) {
      addSectionLv2(g.name)
      for (const n of g.nodes) addDetail(n)
      addSubtotal(`Jumlah ${g.name}`, g.total, g.refTotal)
    }
    addTotalSection('Jumlah Aktiva', totalAset.value, refTotalAset.value)
    addSpacer()

    // ── KEWAJIBAN DAN EKUITAS ──
    if (liabGroups.value.length > 0 || equityGroups.value.length > 0) {
      addSectionLv1('Kewajiban dan Ekuitas')

      if (liabGroups.value.length > 0) {
        addSectionLv2('Kewajiban')
        for (const g of liabGroups.value) {
          addSectionLv3(g.name)
          for (const n of g.nodes) addDetail(n)
          addSubtotal(`Jumlah ${g.name}`, g.total, g.refTotal)
        }
        addSubtotal('Jumlah Kewajiban', totalLiabilitas.value, refTotalLiabilitas.value)
      }

      if (equityGroups.value.length > 0) {
        addSectionLv2('Ekuitas')
        for (const g of equityGroups.value) {
          for (const n of g.nodes) addDetail(n)
        }
        addSubtotal('Jumlah Ekuitas', totalEkuitas.value, refTotalEkuitas.value)
      }

      addTotalSection('Jumlah Kewajiban dan Ekuitas',
        totalLiabilitas.value + totalEkuitas.value,
        refTotalLiabilitas.value + refTotalEkuitas.value,
      )
    }

    // ── Table headers ──
    const headRow = hasRef
      ? [
          { content: 'Description', styles: { halign: 'left', fontStyle: 'bold', textColor: [180,0,0] } },
          { content: 'Balance',     styles: { halign: 'right', fontStyle: 'bold', textColor: [180,0,0] } },
          { content: formatDate(filters.value.asOfRefDate), styles: { halign: 'right', fontStyle: 'bold', textColor: [180,0,0] } },
          { content: 'Selisih',     styles: { halign: 'right', fontStyle: 'bold', textColor: [180,0,0] } },
        ]
      : [
          { content: 'Description', styles: { halign: 'left',  fontStyle: 'bold', textColor: [180,0,0] } },
          { content: 'Balance',     styles: { halign: 'right', fontStyle: 'bold', textColor: [180,0,0] } },
        ]

    const colStyles = hasRef
      ? { 0: { cellWidth: 'auto' }, 1: { cellWidth: 38, halign: 'right' }, 2: { cellWidth: 38, halign: 'right' }, 3: { cellWidth: 28, halign: 'right' } }
      : { 0: { cellWidth: 'auto' }, 1: { cellWidth: 50, halign: 'right' } }

    const tableOpts = {
      head:  [headRow],
      body,
      startY: 33,
      styles: {
        fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 4, right: 4 },
        overflow: 'linebreak', lineColor: [200, 200, 200], lineWidth: 0,
        fillColor: WHITE, textColor: BLACK, font: 'helvetica',
      },
      headStyles: {
        fillColor: WHITE, textColor: [180, 0, 0], fontStyle: 'bold', fontSize: 8.5,
        lineColor: [180, 0, 0], lineWidth: { bottom: 0.5 },
      },
      columnStyles: colStyles,
      alternateRowStyles: { fillColor: WHITE }, // no alternating color — ACCURATE style
      margin: { left: 10, right: 10 },
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0,
    }

    if (typeof doc.autoTable === 'function') {
      doc.autoTable(tableOpts)
    } else {
      autoTable(doc, tableOpts)
    }

    // ── Footer: nomor halaman + tanggal cetak (ACCURATE style) ──
    const nowStr = `Cetak di ${new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })} - ${new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}`
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)

      // Garis footer
      doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3)
      doc.line(10, 285, 200, 285)

      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 100, 100)
      doc.text('ACCURATE Accounting System Report', 105, 289, { align: 'center' })
      doc.text(nowStr, 10, 289)
      doc.text(`(${i})`, 200, 289, { align: 'right' })
    }

    doc.save(bsFileName('pdf'))
  } catch (e) { alert('Export PDF gagal: ' + e.message) }
  finally { exporting.value = '' }
}

// ── Load external script helper ───────────────────────────────────────────────
const loadScript = (src) => new Promise((resolve, reject) => {
  if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
  const s = document.createElement('script')
  s.src = src; s.onload = resolve; s.onerror = reject
  document.head.appendChild(s)
})
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
/* Kalender input — tampilkan date picker bawaan browser */
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
.btn--print { background: #475569; color: #fff; }
.btn--print:hover { background: #334155; }
.btn--xlsx { background: #16a34a; color: #fff; }
.btn--xlsx:hover:not(:disabled) { background: #15803d; }
.btn--pdf { background: #dc2626; color: #fff; }
.btn--pdf:hover:not(:disabled) { background: #b91c1c; }

/* Error */
.tb-error { margin: 16px 20px 0; padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; }

/* Summary Cards */
.summary-cards { display: flex; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.summary-card { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; min-width: 130px; flex: 1; }
.summary-card--asset  { border-left: 3px solid #2563eb; }
.summary-card--liab   { border-left: 3px solid #dc2626; }
.summary-card--equity { border-left: 3px solid #16a34a; }
.summary-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); }
.summary-value { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.summary-value--period   { color: var(--text-secondary); font-size: 12px; font-weight: 500; }
.summary-value--asset    { color: #1d4ed8; }
.summary-value--liab     { color: #dc2626; }
.summary-value--equity   { color: #15803d; }
.summary-value--balanced   { color: #16a34a; }
.summary-value--unbalanced { color: #dc2626; }
.summary-diff { font-size: 11px; color: #dc2626; font-weight: 600; }

/* Print header (hanya tampil saat print) */
.print-header { display: none; }

/* ── TABLE ── */
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }

/* thead */
.bs-table thead th {
  background: #fff;
  border-top: 1px solid #ccc;
  border-bottom: 2px solid #b00000;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 700;
  color: #b00000;
  white-space: nowrap;
}
.bs-table thead th:first-child { text-align: left; }
.bs-col-account { width: auto; min-width: 320px; }
.bs-col-bal  { width: 150px; text-align: right !important; }
.bs-col-diff { width: 120px; text-align: right !important; }

/* Level 1: "Aktiva" / "Kewajiban dan Ekuitas" */
.tr-section-lv1 td,
.td-section-lv1 {
  padding: 8px 10px 3px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  background: #fff;
  border-bottom: none;
}

/* Level 2: "Aktiva Lancar", "Kewajiban", "Ekuitas" */
.tr-section-lv2 td,
.td-section-lv2 {
  padding: 6px 10px 2px 20px;
  font-size: 12.5px;
  font-weight: 700;
  color: #1e293b;
  background: #fff;
  border-bottom: none;
}

/* Level 3: group di dalam Kewajiban */
.tr-section-lv3 td,
.td-section-lv3 {
  padding: 5px 10px 2px 30px;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
  background: #fff;
  border-bottom: none;
}

/* Detail rows */
.tr-detail td { border-bottom: none; background: #fff; }
.td-detail {
  padding: 3px 10px 3px 50px;
  font-size: 12.5px;
  color: #374151;
}
.td-bal {
  padding: 3px 10px;
  font-size: 12.5px;
  color: #374151;
}

/* Subtotal rows (Jumlah Kas dan Bank, dll) */
.tr-subtotal td { background: #fff; }
.td-subtotal {
  padding: 4px 10px 4px 20px;
  font-size: 12.5px;
  font-weight: 600;
  color: #0f172a;
  border-top: 1px solid #94a3b8;
  border-bottom: 1px solid #94a3b8;
}
.td-subtotal-val {
  padding: 4px 10px;
  font-size: 12.5px;
  font-weight: 600;
  color: #0f172a;
  border-top: 1px solid #94a3b8;
  border-bottom: 1px solid #94a3b8;
}

/* Total subsection (Jumlah Kewajiban, Jumlah Ekuitas) */
.tr-total-subsection td { background: #fff; }
.td-total-subsection {
  padding: 5px 10px 5px 10px;
  font-size: 12.5px;
  font-weight: 700;
  color: #0f172a;
  border-top: 1.5px solid #475569;
  border-bottom: 1.5px solid #475569;
}
.td-total-subsection-val {
  padding: 5px 10px;
  font-size: 12.5px;
  font-weight: 700;
  color: #0f172a;
  border-top: 1.5px solid #475569;
  border-bottom: 1.5px solid #475569;
}

/* Total section (Jumlah Aktiva / Jumlah Kewajiban dan Ekuitas) */
.tr-total-section td { background: #fff; }
.td-total-section {
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
  border-top: 2px solid #0f172a;
  border-bottom: 2px solid #0f172a;
}
.td-total-section-val {
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
  border-top: 2px solid #0f172a;
  border-bottom: 2px solid #0f172a;
}

/* Grand total footer */
.tr-grand-total td { background: #fff; }
.td-grand-total {
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
  border-top: 2px solid #0f172a;
  border-bottom: 3px double #0f172a;
}
.td-grand-total-val {
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
  border-top: 2px solid #0f172a;
  border-bottom: 3px double #0f172a;
}

/* Spacer row */
.tr-spacer-row td { padding: 4px; background: #fff; border: none; }

/* Number */
.tb-num { text-align: right; font-family: var(--font-mono); font-size: 12.5px; }
.tb-diff-pos { color: #1d4ed8; }
.tb-diff-neg { color: #dc2626; }

/* Balance check (screen only) */
.screen-only { }
.tr-balance-check td { padding: 7px 14px; font-size: 12px; font-weight: 600; }
.tr-balanced   td { background: #dcfce7; color: #166534; }
.tr-unbalanced td { background: #fee2e2; color: #991b1b; }
.balance-check-label { font-size: 12px; font-weight: 700; }

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

/* ════════════════════════════════════════════════════
   PRINT STYLES — ACCURATE style
   ════════════════════════════════════════════════════ */
@media print {
  .layout { background: #fff !important; }
  .main { padding: 0 !important; }
  .content-card { box-shadow: none !important; border-radius: 0 !important; }
  .page-header,
  .filter-panel,
  .summary-cards,
  .tb-error,
  .screen-only { display: none !important; }

  /* Print header: ACCURATE style */
  .print-header {
    display: block !important;
    text-align: center;
    padding: 0 0 6px;
    margin-bottom: 4px;
  }
  .print-company {
    font-size: 11pt;
    font-weight: 800;
    color: #000;
    letter-spacing: .02em;
  }
  .print-title {
    font-size: 16pt;
    font-weight: 800;
    color: #b00000;
    margin: 2px 0;
  }
  .print-period {
    font-size: 9pt;
    font-weight: 600;
    color: #000;
    margin-bottom: 4px;
  }

  /* Tabel print */
  .table-wrap { overflow: visible !important; }
  .bs-table { font-size: 8pt !important; }

  .bs-table thead th {
    font-size: 8pt !important;
    padding: 4px 6px !important;
    color: #b00000 !important;
    background: #fff !important;
    border-top: 1px solid #aaa !important;
    border-bottom: 2px solid #b00000 !important;
  }

  .td-section-lv1 { padding: 5px 6px 2px !important; font-size: 8.5pt !important; }
  .td-section-lv2 { padding: 4px 6px 1px 14px !important; font-size: 8pt !important; }
  .td-section-lv3 { padding: 3px 6px 1px 20px !important; font-size: 8pt !important; }
  .td-detail       { padding: 2px 6px 2px 32px !important; font-size: 8pt !important; }
  .td-bal          { padding: 2px 6px !important; font-size: 8pt !important; }

  .td-subtotal,
  .td-subtotal-val {
    padding: 3px 6px !important; font-size: 8pt !important;
    border-top: 0.5px solid #888 !important;
    border-bottom: 0.5px solid #888 !important;
  }
  .td-subtotal     { padding-left: 14px !important; }

  .td-total-subsection,
  .td-total-subsection-val {
    padding: 3px 6px !important; font-size: 8pt !important;
    border-top: 1px solid #333 !important;
    border-bottom: 1px solid #333 !important;
  }

  .td-total-section,
  .td-total-section-val {
    padding: 4px 6px !important; font-size: 8.5pt !important;
    border-top: 1.5px solid #000 !important;
    border-bottom: 1.5px solid #000 !important;
  }

  .td-grand-total,
  .td-grand-total-val {
    padding: 4px 6px !important; font-size: 8.5pt !important;
    border-top: 1.5px solid #000 !important;
    border-bottom: 2px double #000 !important;
  }

  @page { size: A4 portrait; margin: 12mm 10mm 15mm; }
  tr { page-break-inside: avoid; }
}
</style>