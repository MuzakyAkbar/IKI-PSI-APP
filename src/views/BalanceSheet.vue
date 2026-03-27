<template>
  <div class="layout">
    <main class="main">
      <div class="content-card">

        <div class="page-header">
          <h2 class="page-title">Balance Sheet</h2>
          <p class="page-subtitle">Laporan Posisi Keuangan (Neraca)</p>
        </div>

        <!-- ══ FILTER PANEL ══ -->
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

          <!-- Filter Lanjutan -->
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

        <!-- ══ ERROR ══ -->
        <div v-if="error" class="tb-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ error }}
        </div>

        <!-- ══ RESULTS ══ -->
        <div v-if="searched && !loading">
          <!-- Summary Cards -->
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

          <!-- ══ PRINT AREA ══ -->
          <div id="bs-print-area">

            <!-- Print Header (hanya tampil saat print) -->
            <div class="print-header">
              <div class="print-company">Balance Sheet</div>
              <div class="print-subtitle">Laporan Posisi Keuangan (Neraca)</div>
              <div class="print-period">Per Tanggal: {{ formatDate(filters.asOfDate) }}</div>
              <div class="print-currency">(Dalam Rupiah)</div>
            </div>

            <!-- ══ TABLE ══ -->
            <div class="table-wrap" v-if="reportGroups.length > 0">
              <table class="table bs-table" id="bs-table">
                <thead>
                  <tr>
                    <th class="bs-col-account">Akun</th>
                    <th class="bs-col-bal tb-num">{{ formatDate(filters.asOfDate) }}</th>
                    <th v-if="showRef" class="bs-col-bal tb-num">{{ formatDate(filters.asOfRefDate) }}</th>
                    <th v-if="showRef" class="bs-col-diff tb-num">Selisih</th>
                  </tr>
                </thead>
                <tbody>

                  <!-- ── ASET ── -->
                  <template v-if="assetGroups.length > 0">
                    <tr class="tr-category-header">
                      <td colspan="99">
                        <div class="category-header-content category-asset">
                          <span class="category-name">ASET</span>
                        </div>
                      </td>
                    </tr>
                    <template v-for="group in assetGroups" :key="group.id">
                      <tr class="tr-group-header">
                        <td colspan="99">
                          <div class="group-header-content group-asset">
                            <span class="group-name">{{ group.name }}</span>
                            <span v-if="group.description" class="group-desc">{{ group.description }}</span>
                          </div>
                        </td>
                      </tr>
                      <tr v-for="node in group.nodes" :key="node.id" class="tr-data tr-node">
                        <td class="bs-node-cell">
                          <div class="node-content">
                            <span class="acc-code acc-code--asset">{{ node.searchKey }}</span>
                            <span class="node-name">{{ node.name }}</span>
                          </div>
                        </td>
                        <td class="tb-num tb-asset">{{ fmt(node.balance) }}</td>
                        <td v-if="showRef" class="tb-num tb-asset">{{ fmt(node.refBalance) }}</td>
                        <td v-if="showRef" class="tb-num" :class="diffClass(node.balance - node.refBalance)">{{ fmt(node.balance - node.refBalance) }}</td>
                      </tr>
                      <tr class="tr-group-total group-total-asset">
                        <td class="group-total-label">Total {{ group.name }}</td>
                        <td class="tb-num tb-group-total">{{ fmt(group.total) }}</td>
                        <td v-if="showRef" class="tb-num tb-group-total">{{ fmt(group.refTotal) }}</td>
                        <td v-if="showRef" class="tb-num" :class="diffClass(group.total - group.refTotal)">{{ fmt(group.total - group.refTotal) }}</td>
                      </tr>
                    </template>
                    <tr class="tr-section-total section-total-asset">
                      <td class="section-total-label">TOTAL ASET</td>
                      <td class="tb-num section-total-val">{{ fmt(totalAset) }}</td>
                      <td v-if="showRef" class="tb-num section-total-val">{{ fmt(refTotalAset) }}</td>
                      <td v-if="showRef" class="tb-num section-total-val" :class="diffClass(totalAset - refTotalAset)">{{ fmt(totalAset - refTotalAset) }}</td>
                    </tr>
                  </template>

                  <!-- ── LIABILITAS ── -->
                  <template v-if="liabGroups.length > 0">
                    <tr class="tr-spacer"><td colspan="99"></td></tr>
                    <tr class="tr-category-header">
                      <td colspan="99">
                        <div class="category-header-content category-liab">
                          <span class="category-name">LIABILITAS</span>
                        </div>
                      </td>
                    </tr>
                    <template v-for="group in liabGroups" :key="group.id">
                      <tr class="tr-group-header">
                        <td colspan="99">
                          <div class="group-header-content group-liab">
                            <span class="group-name">{{ group.name }}</span>
                            <span v-if="group.description" class="group-desc">{{ group.description }}</span>
                          </div>
                        </td>
                      </tr>
                      <tr v-for="node in group.nodes" :key="node.id" class="tr-data tr-node">
                        <td class="bs-node-cell">
                          <div class="node-content">
                            <span class="acc-code acc-code--liab">{{ node.searchKey }}</span>
                            <span class="node-name">{{ node.name }}</span>
                          </div>
                        </td>
                        <td class="tb-num tb-liab">{{ fmt(node.balance) }}</td>
                        <td v-if="showRef" class="tb-num tb-liab">{{ fmt(node.refBalance) }}</td>
                        <td v-if="showRef" class="tb-num" :class="diffClass(node.balance - node.refBalance)">{{ fmt(node.balance - node.refBalance) }}</td>
                      </tr>
                      <tr class="tr-group-total group-total-liab">
                        <td class="group-total-label">Total {{ group.name }}</td>
                        <td class="tb-num tb-group-total">{{ fmt(group.total) }}</td>
                        <td v-if="showRef" class="tb-num tb-group-total">{{ fmt(group.refTotal) }}</td>
                        <td v-if="showRef" class="tb-num" :class="diffClass(group.total - group.refTotal)">{{ fmt(group.total - group.refTotal) }}</td>
                      </tr>
                    </template>
                    <tr class="tr-section-total section-total-liab">
                      <td class="section-total-label">TOTAL LIABILITAS</td>
                      <td class="tb-num section-total-val">{{ fmt(totalLiabilitas) }}</td>
                      <td v-if="showRef" class="tb-num section-total-val">{{ fmt(refTotalLiabilitas) }}</td>
                      <td v-if="showRef" class="tb-num section-total-val" :class="diffClass(totalLiabilitas - refTotalLiabilitas)">{{ fmt(totalLiabilitas - refTotalLiabilitas) }}</td>
                    </tr>
                  </template>

                  <!-- ── EKUITAS ── -->
                  <template v-if="equityGroups.length > 0">
                    <tr class="tr-spacer"><td colspan="99"></td></tr>
                    <tr class="tr-category-header">
                      <td colspan="99">
                        <div class="category-header-content category-equity">
                          <span class="category-name">EKUITAS</span>
                        </div>
                      </td>
                    </tr>
                    <template v-for="group in equityGroups" :key="group.id">
                      <tr class="tr-group-header">
                        <td colspan="99">
                          <div class="group-header-content group-equity">
                            <span class="group-name">{{ group.name }}</span>
                            <span v-if="group.description" class="group-desc">{{ group.description }}</span>
                          </div>
                        </td>
                      </tr>
                      <tr v-for="node in group.nodes" :key="node.id" class="tr-data tr-node">
                        <td class="bs-node-cell">
                          <div class="node-content">
                            <span class="acc-code acc-code--equity">{{ node.searchKey }}</span>
                            <span class="node-name">{{ node.name }}</span>
                          </div>
                        </td>
                        <td class="tb-num tb-equity">{{ fmt(node.balance) }}</td>
                        <td v-if="showRef" class="tb-num tb-equity">{{ fmt(node.refBalance) }}</td>
                        <td v-if="showRef" class="tb-num" :class="diffClass(node.balance - node.refBalance)">{{ fmt(node.balance - node.refBalance) }}</td>
                      </tr>
                      <tr class="tr-group-total group-total-equity">
                        <td class="group-total-label">Total {{ group.name }}</td>
                        <td class="tb-num tb-group-total">{{ fmt(group.total) }}</td>
                        <td v-if="showRef" class="tb-num tb-group-total">{{ fmt(group.refTotal) }}</td>
                        <td v-if="showRef" class="tb-num" :class="diffClass(group.total - group.refTotal)">{{ fmt(group.total - group.refTotal) }}</td>
                      </tr>
                    </template>
                    <tr class="tr-section-total section-total-equity">
                      <td class="section-total-label">TOTAL EKUITAS</td>
                      <td class="tb-num section-total-val">{{ fmt(totalEkuitas) }}</td>
                      <td v-if="showRef" class="tb-num section-total-val">{{ fmt(refTotalEkuitas) }}</td>
                      <td v-if="showRef" class="tb-num section-total-val" :class="diffClass(totalEkuitas - refTotalEkuitas)">{{ fmt(totalEkuitas - refTotalEkuitas) }}</td>
                    </tr>
                  </template>

                </tbody>
                <tfoot>
                  <tr class="tr-spacer"><td colspan="99"></td></tr>
                  <!-- Total Liabilitas + Ekuitas -->
                  <tr class="tr-liab-equity">
                    <td class="liab-equity-label">TOTAL LIABILITAS DAN EKUITAS</td>
                    <td class="tb-num liab-equity-val">{{ fmt(totalLiabilitas + totalEkuitas) }}</td>
                    <td v-if="showRef" class="tb-num liab-equity-val">{{ fmt(refTotalLiabilitas + refTotalEkuitas) }}</td>
                    <td v-if="showRef" class="tb-num liab-equity-diff">{{ fmt((totalLiabilitas + totalEkuitas) - (refTotalLiabilitas + refTotalEkuitas)) }}</td>
                  </tr>
                  <!-- Balance check -->
                  <tr class="tr-balance-check" :class="isBalanced ? 'tr-balanced' : 'tr-unbalanced'">
                    <td class="balance-check-label" colspan="2">
                      <span v-if="isBalanced">✓ Neraca Seimbang &nbsp;(Aset = Liabilitas + Ekuitas)</span>
                      <span v-else>✗ Neraca Tidak Seimbang — selisih: {{ formatCurrency(Math.abs(totalAset - (totalLiabilitas + totalEkuitas))) }}</span>
                    </td>
                    <td v-if="showRef" colspan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div v-else class="tb-empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="color:#cbd5e1;margin:0 auto 12px;display:block"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              <p>Tidak ada data neraca untuk parameter yang dipilih.</p>
            </div>

          </div><!-- end print-area -->
        </div>

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

// ── formatters
function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
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
// EXPORT EXCEL
// ════════════════════════════════════════════════════
async function exportXlsx() {
  exporting.value = 'xlsx'
  try {
    const XLSXmod = await import('xlsx')
    const XLSX = XLSXmod.default || XLSXmod
    const { utils, writeFile } = XLSX

    const wb = utils.book_new()
    const ws = {}
    let r = 0

    const col1    = formatDate(filters.value.asOfDate)
    const col2    = showRef.value ? formatDate(filters.value.asOfRefDate) : null
    const numCols = col2 ? 3 : 1

    ws['!merges'] = []
    const setMerge = (r1, c1, r2, c2) => ws['!merges'].push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } })

    // ── Title rows
    ws['A1'] = { v: 'BALANCE SHEET', s: { font: { bold: true, sz: 13 }, alignment: { horizontal: 'center' } } }
    setMerge(0, 0, 0, numCols)
    ws['A2'] = { v: 'Laporan Posisi Keuangan (Neraca)', s: { font: { sz: 10 }, alignment: { horizontal: 'center' } } }
    setMerge(1, 0, 1, numCols)
    ws['A3'] = { v: `Per Tanggal: ${col1}`, s: { font: { sz: 10 }, alignment: { horizontal: 'center' } } }
    setMerge(2, 0, 2, numCols)
    ws['A4'] = { v: '(Dalam Rupiah)', s: { font: { italic: true, sz: 9 }, alignment: { horizontal: 'center' } } }
    setMerge(3, 0, 3, numCols)
    r = 4

    const numFmt   = '#,##0.00'
    const hdrStyle = { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1E3A8A' } }, alignment: { horizontal: 'center' } }
    ws[`A${r+1}`] = { v: 'Akun', s: hdrStyle }
    ws[`B${r+1}`] = { v: col1,   s: { ...hdrStyle, alignment: { horizontal: 'right' } } }
    if (col2) {
      ws[`C${r+1}`] = { v: col2,      s: { ...hdrStyle, alignment: { horizontal: 'right' } } }
      ws[`D${r+1}`] = { v: 'Selisih', s: { ...hdrStyle, alignment: { horizontal: 'right' } } }
    }
    r++

    const numStyle  = (bold = false, rgb = '0F172A') => ({ font: { sz: 10, bold, color: { rgb } }, numFmt, alignment: { horizontal: 'right' }, border: { bottom: { style: 'thin', color: { rgb: 'E2E8F0' } } } })
    const textStyle = (bold = false, rgb = '0F172A', bg = null) => {
      const s = { font: { sz: 10, bold, color: { rgb } }, alignment: { horizontal: 'left', indent: bold ? 0 : 1 }, border: { bottom: { style: 'thin', color: { rgb: 'E2E8F0' } } } }
      if (bg) s.fill = { fgColor: { rgb: bg } }
      return s
    }
    const addCategoryHeader = (label, bgRgb, textRgb) => {
      r++
      const cols = col2 ? 4 : 2
      const s = { font: { bold: true, sz: 11, color: { rgb: textRgb } }, fill: { fgColor: { rgb: bgRgb } }, alignment: { horizontal: 'left' } }
      ws[`A${r}`] = { v: label, s }
      for (let c = 1; c < cols; c++) ws[`${String.fromCharCode(65+c)}${r}`] = { v: '', s }
      setMerge(r-1, 0, r-1, cols-1)
    }
    const addGroupHeader = (label, desc, bgRgb, textRgb) => {
      r++
      const cols = col2 ? 4 : 2
      const s = { font: { bold: true, sz: 10, color: { rgb: textRgb } }, fill: { fgColor: { rgb: bgRgb } }, alignment: { horizontal: 'left', indent: 1 } }
      ws[`A${r}`] = { v: desc ? `${label} — ${desc}` : label, s }
      for (let c = 1; c < cols; c++) ws[`${String.fromCharCode(65+c)}${r}`] = { v: '', s }
      setMerge(r-1, 0, r-1, cols-1)
    }
    const addLine = (kode, nama, amt, refAmt) => {
      r++
      ws[`A${r}`] = { v: `${kode}  ${nama}`, s: textStyle(false) }
      ws[`B${r}`] = { v: amt, s: numStyle() }
      if (col2) { ws[`C${r}`] = { v: refAmt || 0, s: numStyle() }; ws[`D${r}`] = { v: (amt||0)-(refAmt||0), s: numStyle() } }
    }
    const addGroupTotal = (label, total, refTotal, bgRgb, textRgb) => {
      r++
      ws[`A${r}`] = { v: label, s: textStyle(true, textRgb, bgRgb) }
      ws[`B${r}`] = { v: total, s: { ...numStyle(true, textRgb), fill: { fgColor: { rgb: bgRgb } } } }
      if (col2) { ws[`C${r}`] = { v: refTotal||0, s: { ...numStyle(true, textRgb), fill: { fgColor: { rgb: bgRgb } } } }; ws[`D${r}`] = { v: (total||0)-(refTotal||0), s: { ...numStyle(true, textRgb), fill: { fgColor: { rgb: bgRgb } } } } }
    }
    const addSectionTotal = (label, total, refTotal, bgRgb, textRgb) => {
      r++
      const s = { font: { bold: true, sz: 10, color: { rgb: textRgb } }, fill: { fgColor: { rgb: bgRgb } }, numFmt, alignment: { horizontal: 'right' }, border: { top: { style: 'medium', color: { rgb: textRgb } }, bottom: { style: 'medium', color: { rgb: textRgb } } } }
      const ls = { font: { bold: true, sz: 10, color: { rgb: textRgb } }, fill: { fgColor: { rgb: bgRgb } }, alignment: { horizontal: 'left' }, border: { top: { style: 'medium', color: { rgb: textRgb } }, bottom: { style: 'medium', color: { rgb: textRgb } } } }
      ws[`A${r}`] = { v: label, s: ls }
      ws[`B${r}`] = { v: total, s }
      if (col2) { ws[`C${r}`] = { v: refTotal||0, s }; ws[`D${r}`] = { v: (total||0)-(refTotal||0), s } }
    }
    const addSpacer = () => { r++; ws[`A${r}`] = { v: '' } }

    // ═ ASET
    addCategoryHeader('ASET', 'DBEAFE', '1E3A8A')
    for (const g of assetGroups.value) {
      addGroupHeader(g.name, g.description, 'EFF6FF', '1D4ED8')
      for (const n of g.nodes) addLine(n.searchKey, n.name, n.balance, n.refBalance)
      addGroupTotal(`Total ${g.name}`, g.total, g.refTotal, 'DBEAFE', '1E40AF')
    }
    addSectionTotal('TOTAL ASET', totalAset.value, refTotalAset.value, '1E3A8A', 'FFFFFF')
    addSpacer()

    // ═ LIABILITAS
    addCategoryHeader('LIABILITAS', 'FEE2E2', '991B1B')
    for (const g of liabGroups.value) {
      addGroupHeader(g.name, g.description, 'FFF1F2', 'DC2626')
      for (const n of g.nodes) addLine(n.searchKey, n.name, n.balance, n.refBalance)
      addGroupTotal(`Total ${g.name}`, g.total, g.refTotal, 'FECACA', '991B1B')
    }
    addSectionTotal('TOTAL LIABILITAS', totalLiabilitas.value, refTotalLiabilitas.value, '991B1B', 'FFFFFF')
    addSpacer()

    // ═ EKUITAS
    addCategoryHeader('EKUITAS', 'D1FAE5', '065F46')
    for (const g of equityGroups.value) {
      addGroupHeader(g.name, g.description, 'ECFDF5', '059669')
      for (const n of g.nodes) addLine(n.searchKey, n.name, n.balance, n.refBalance)
      addGroupTotal(`Total ${g.name}`, g.total, g.refTotal, 'A7F3D0', '065F46')
    }
    addSectionTotal('TOTAL EKUITAS', totalEkuitas.value, refTotalEkuitas.value, '065F46', 'FFFFFF')
    addSpacer()

    // ═ TOTAL LIABILITAS & EKUITAS
    addSectionTotal('TOTAL LIABILITAS DAN EKUITAS',
      totalLiabilitas.value + totalEkuitas.value,
      refTotalLiabilitas.value + refTotalEkuitas.value,
      '1E3A8A', 'FFFFFF'
    )

    // ═ BALANCE CHECK ROW
    r++
    const selisih   = totalAset.value - (totalLiabilitas.value + totalEkuitas.value)
    const balanced  = Math.abs(selisih) < 1
    const chkBg     = balanced ? 'DCFCE7' : 'FEE2E2'
    const chkText   = balanced ? '166534' : '991B1B'
    const chkLabel  = balanced
      ? '✓ Neraca Seimbang  (Aset = Liabilitas + Ekuitas)'
      : `✗ Neraca Tidak Seimbang  —  Selisih: ${new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2 }).format(Math.abs(selisih))}`
    const chkStyle  = { font: { bold: true, sz: 10, color: { rgb: chkText } }, fill: { fgColor: { rgb: chkBg } }, alignment: { horizontal: 'center' } }
    const chkCols   = col2 ? 4 : 2
    ws[`A${r}`] = { v: chkLabel, s: chkStyle }
    for (let ci = 1; ci < chkCols; ci++) ws[`${String.fromCharCode(65 + ci)}${r}`] = { v: '', s: chkStyle }
    ws['!merges'].push({ s: { r: r - 1, c: 0 }, e: { r: r - 1, c: chkCols - 1 } })

    ws['!cols'] = [{ wch: 46 }, { wch: 20 }, ...(col2 ? [{ wch: 20 }, { wch: 18 }] : [])]
    ws['!rows'] = [{ hpt: 22 }, { hpt: 14 }, { hpt: 14 }, { hpt: 12 }]
    ws['!ref']  = `A1:${col2 ? 'D' : 'B'}${r}`

    utils.book_append_sheet(wb, ws, 'Balance Sheet')
    writeFile(wb, bsFileName('xlsx'))
  } catch (e) { alert('Export Excel gagal: ' + e.message) }
  finally { exporting.value = '' }
}

// ════════════════════════════════════════════════════
// EXPORT PDF
// ════════════════════════════════════════════════════
async function exportPdf() {
  exporting.value = 'pdf'
  try {
    const jsPDFmod = await import('jspdf')
    const jsPDF = jsPDFmod.default || jsPDFmod.jsPDF || jsPDFmod
    const autoTableMod = await import('jspdf-autotable')
    const autoTable = autoTableMod.default || autoTableMod

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
    doc.text('BALANCE SHEET', 105, 14, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text('Laporan Posisi Keuangan (Neraca)', 105, 20, { align: 'center' })
    doc.text(`Per Tanggal: ${formatDate(filters.value.asOfDate)}`, 105, 26, { align: 'center' })
    doc.text('(Dalam Rupiah)', 105, 31, { align: 'center' })

    const col1 = formatDate(filters.value.asOfDate)
    const col2 = showRef.value ? formatDate(filters.value.asOfRefDate) : null
    const colSpan = col2 ? 3 : 2

    const head = [
      col2
        ? [{ content: 'Akun', styles: { halign: 'left' } }, { content: col1, styles: { halign: 'right' } }, { content: col2, styles: { halign: 'right' } }, { content: 'Selisih', styles: { halign: 'right' } }]
        : [{ content: 'Akun', styles: { halign: 'left' } }, { content: col1, styles: { halign: 'right' } }],
    ]
    const body = []

    const addCatHdr = (label, fill, text) => body.push([{ content: label, colSpan, styles: { fontStyle: 'bold', fillColor: fill, textColor: text, fontSize: 9, cellPadding: { top: 4, bottom: 4, left: 6, right: 6 } } }])
    const addGrpHdr = (label, fill, text) => body.push([{ content: `  ${label}`, colSpan, styles: { fontStyle: 'bold', fillColor: fill, textColor: text, fontSize: 8.5 } }])
    const addLine   = (n) => {
      const row = [{ content: `    ${n.searchKey}  ${n.name}`, styles: { fontSize: 8, halign: 'left' } }, { content: fmt(n.balance), styles: { halign: 'right' } }]
      if (col2) { row.push({ content: fmt(n.refBalance), styles: { halign: 'right' } }); row.push({ content: fmt(n.balance - n.refBalance), styles: { halign: 'right' } }) }
      body.push(row)
    }
    const addGrpTot = (label, total, refTotal, fill, text) => {
      const row = [{ content: `  Total ${label}`, styles: { fontStyle: 'bold', fillColor: fill, textColor: text, halign: 'left' } }, { content: fmt(total), styles: { fontStyle: 'bold', fillColor: fill, textColor: text, halign: 'right' } }]
      if (col2) { row.push({ content: fmt(refTotal||0), styles: { fontStyle: 'bold', fillColor: fill, textColor: text, halign: 'right' } }); row.push({ content: fmt((total||0)-(refTotal||0)), styles: { fontStyle: 'bold', fillColor: fill, textColor: text, halign: 'right' } }) }
      body.push(row)
    }
    const addSecTot = (label, total, refTotal, fill, text) => {
      const row = [{ content: label, styles: { fontStyle: 'bold', fillColor: fill, textColor: text, halign: 'left', fontSize: 9 } }, { content: fmt(total), styles: { fontStyle: 'bold', fillColor: fill, textColor: text, halign: 'right', fontSize: 9 } }]
      if (col2) { row.push({ content: fmt(refTotal||0), styles: { fontStyle: 'bold', fillColor: fill, textColor: text, halign: 'right', fontSize: 9 } }); row.push({ content: fmt((total||0)-(refTotal||0)), styles: { fontStyle: 'bold', fillColor: fill, textColor: text, halign: 'right', fontSize: 9 } }) }
      body.push(row)
    }
    const addSpacer = () => body.push([{ content: '', colSpan, styles: { cellPadding: 1.5 } }])

    // ASET
    addCatHdr('ASET', [219, 234, 254], [30, 58, 138])
    for (const g of assetGroups.value) {
      addGrpHdr(g.name, [239, 246, 255], [29, 78, 216])
      for (const n of g.nodes) addLine(n)
      addGrpTot(g.name, g.total, g.refTotal, [219, 234, 254], [30, 64, 175])
    }
    addSecTot('TOTAL ASET', totalAset.value, refTotalAset.value, [30, 58, 138], [255, 255, 255])
    addSpacer()

    // LIABILITAS
    addCatHdr('LIABILITAS', [254, 226, 226], [153, 27, 27])
    for (const g of liabGroups.value) {
      addGrpHdr(g.name, [255, 241, 242], [220, 38, 38])
      for (const n of g.nodes) addLine(n)
      addGrpTot(g.name, g.total, g.refTotal, [254, 202, 202], [153, 27, 27])
    }
    addSecTot('TOTAL LIABILITAS', totalLiabilitas.value, refTotalLiabilitas.value, [153, 27, 27], [255, 255, 255])
    addSpacer()

    // EKUITAS
    addCatHdr('EKUITAS', [209, 250, 229], [6, 95, 70])
    for (const g of equityGroups.value) {
      addGrpHdr(g.name, [236, 253, 245], [5, 150, 105])
      for (const n of g.nodes) addLine(n)
      addGrpTot(g.name, g.total, g.refTotal, [167, 243, 208], [6, 95, 70])
    }
    addSecTot('TOTAL EKUITAS', totalEkuitas.value, refTotalEkuitas.value, [6, 95, 70], [255, 255, 255])
    addSpacer()

    // TOTAL LIABILITAS & EKUITAS
    addSecTot('TOTAL LIABILITAS DAN EKUITAS',
      totalLiabilitas.value + totalEkuitas.value,
      refTotalLiabilitas.value + refTotalEkuitas.value,
      [30, 58, 138], [255, 255, 255]
    )

    const colStyles = col2
      ? { 0: { cellWidth: 'auto' }, 1: { cellWidth: 34, halign: 'right' }, 2: { cellWidth: 34, halign: 'right' }, 3: { cellWidth: 26, halign: 'right' } }
      : { 0: { cellWidth: 'auto' }, 1: { cellWidth: 46, halign: 'right' } }

    const tableOpts = {
      head, body, startY: 36,
      styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: colStyles,
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 10, right: 10 },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.1,
    }

    if (typeof doc.autoTable === 'function') {
      doc.autoTable(tableOpts)
    } else {
      autoTable(doc, tableOpts)
    }

    // ── Balance check box — dirender di luar tabel pada halaman terakhir
    const selisihPdf  = totalAset.value - (totalLiabilitas.value + totalEkuitas.value)
    const balancedPdf = Math.abs(selisihPdf) < 1
    const chkFill     = balancedPdf ? [220, 252, 231] : [254, 226, 226]
    const chkBorder   = balancedPdf ? [22, 101, 52]   : [153, 27, 27]
    const chkTxtColor = balancedPdf ? [22, 101, 52]   : [153, 27, 27]
    const chkLabelPdf = balancedPdf
      ? 'NERACA SEIMBANG  (Aset = Liabilitas + Ekuitas)'
      : `NERACA TIDAK SEIMBANG  -  Selisih: ${new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2 }).format(Math.abs(selisihPdf))}`

    // Ambil posisi Y akhir tabel, lalu gambar kotak di bawahnya
    const lastPage  = doc.getNumberOfPages()
    doc.setPage(lastPage)
    const finalY    = (doc.lastAutoTable?.finalY ?? 200) + 4
    const boxX      = 10
    const boxW      = 190
    const boxH      = 9

    // Background fill
    doc.setFillColor(...chkFill)
    doc.setDrawColor(...chkBorder)
    doc.setLineWidth(0.4)
    doc.rect(boxX, finalY, boxW, boxH, 'FD')  // F=fill, D=draw border

    // Teks
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...chkTxtColor)
    doc.text(chkLabelPdf, boxX + boxW / 2, finalY + boxH / 2 + 0.5, { align: 'center', baseline: 'middle' })

    // Reset warna teks sebelum footer
    doc.setTextColor(148, 163, 184)

    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7.5); doc.setTextColor(148, 163, 184)
      doc.text(`Halaman ${i} dari ${pageCount}`, 105, 290, { align: 'center' })
      doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })}`, 195, 290, { align: 'right' })
    }

    doc.save(bsFileName('pdf'))
  } catch (e) { alert('Export PDF gagal: ' + e.message) }
  finally { exporting.value = '' }
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

/* Table */
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.bs-table thead th { background: #1e3a8a; border-bottom: 2px solid #1e40af; padding: 10px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #fff; white-space: nowrap; }
.bs-table thead th:first-child { text-align: left; }
.bs-col-account { width: auto; min-width: 300px; }
.bs-col-bal  { width: 160px; text-align: right !important; }
.bs-col-diff { width: 130px; text-align: right !important; }

/* Category headers */
.tr-category-header td { padding: 0; border-bottom: none; }
.category-header-content { padding: 10px 14px 7px; margin-top: 8px; }
.category-asset  { background: linear-gradient(90deg, #dbeafe, transparent); border-left: 4px solid #2563eb; }
.category-liab   { background: linear-gradient(90deg, #fee2e2, transparent); border-left: 4px solid #dc2626; }
.category-equity { background: linear-gradient(90deg, #d1fae5, transparent); border-left: 4px solid #16a34a; }
.category-name { font-size: 12.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
.category-asset  .category-name { color: #1e3a8a; }
.category-liab   .category-name { color: #991b1b; }
.category-equity .category-name { color: #065f46; }

/* Group headers */
.tr-group-header td { padding: 0; border-bottom: none; }
.group-header-content { display: flex; align-items: center; gap: 8px; padding: 7px 14px 5px 28px; }
.group-asset  { background: #eff6ff; }
.group-liab   { background: #fff1f2; }
.group-equity { background: #ecfdf5; }
.group-name { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; }
.group-asset  .group-name { color: #1d4ed8; }
.group-liab   .group-name { color: #dc2626; }
.group-equity .group-name { color: #059669; }
.group-desc { font-size: 11px; color: var(--text-muted); }

/* Data rows */
.tr-data td { padding: 7px 14px; border-bottom: 1px solid #f1f5f9; }
.tr-data:hover td { background: #f8faff; }
.bs-node-cell { padding: 7px 14px 7px 36px !important; }
.node-content { display: flex; align-items: center; gap: 8px; }
.node-name { font-size: 13px; color: var(--text-primary); }

/* Account codes */
.acc-code { font-family: var(--font-mono); font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; white-space: nowrap; }
.acc-code--asset  { color: #1d4ed8; background: #eff6ff; }
.acc-code--liab   { color: #dc2626; background: #fff1f2; }
.acc-code--equity { color: #059669; background: #ecfdf5; }

/* Group subtotals */
.tr-group-total td { padding: 7px 14px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.group-total-asset  td { background: #dbeafe; }
.group-total-liab   td { background: #fecaca; }
.group-total-equity td { background: #a7f3d0; }
.group-total-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .02em; padding-left: 36px !important; }
.tb-group-total { font-weight: 700; }

/* Section totals */
.tr-section-total td { padding: 9px 14px; border-top: 2px solid; border-bottom: 2px solid; }
.section-total-asset  td { background: #1e3a8a; border-color: #1e40af; }
.section-total-liab   td { background: #991b1b; border-color: #b91c1c; }
.section-total-equity td { background: #065f46; border-color: #047857; }
.section-total-label { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: #fff; }
.section-total-val   { font-weight: 800; color: #fff !important; }

/* Spacer row */
.tr-spacer td { padding: 6px; background: #f8fafc; }

/* Footer: Total Liabilitas + Ekuitas */
.tr-liab-equity td { padding: 11px 14px; background: #1e3a8a; border-top: 3px solid #3b82f6; }
.liab-equity-label { font-size: 13px; font-weight: 800; color: #fff; text-transform: uppercase; letter-spacing: .05em; }
.liab-equity-val   { font-weight: 800; color: #bfdbfe !important; font-family: var(--font-mono); font-size: 12.5px; }
.liab-equity-diff  { font-weight: 700; color: #bfdbfe !important; font-family: var(--font-mono); font-size: 12.5px; text-align: right; }

/* Balance check row */
.tr-balance-check td { padding: 7px 14px; font-size: 12px; font-weight: 600; }
.tr-balanced   td { background: #dcfce7; color: #166534; }
.tr-unbalanced td { background: #fee2e2; color: #991b1b; }
.balance-check-label { font-size: 12px; font-weight: 700; }

/* Number colors */
.tb-num    { text-align: right; font-family: var(--font-mono); font-size: 12.5px; }
.tb-asset  { color: #1d4ed8; }
.tb-liab   { color: #dc2626; }
.tb-equity { color: #059669; }
.tb-diff-pos { color: #1d4ed8; }
.tb-diff-neg { color: #dc2626; }

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
   PRINT STYLES
   Semua elemen non-laporan disembunyikan saat print.
   Hanya #bs-print-area yang tampil, plus header print.
   ════════════════════════════════════════════════════ */
@media print {
  /* Sembunyikan semua kecuali area print */
  .layout { background: #fff !important; }
  .main { padding: 0 !important; }
  .content-card { box-shadow: none !important; border-radius: 0 !important; }
  .page-header,
  .filter-panel,
  .summary-cards,
  .tb-error { display: none !important; }

  /* Tampilkan print header */
  .print-header {
    display: block !important;
    text-align: center;
    padding: 12px 0 8px;
    border-bottom: 2px solid #1e3a8a;
    margin-bottom: 8px;
  }
  .print-company { font-size: 15pt; font-weight: 800; color: #1e3a8a; }
  .print-subtitle { font-size: 9pt; color: #475569; margin-top: 2px; }
  .print-period   { font-size: 9pt; color: #0f172a; margin-top: 4px; font-weight: 600; }
  .print-currency { font-size: 8pt; color: #94a3b8; font-style: italic; }

  /* Tabel print */
  .table-wrap { overflow: visible !important; }
  .bs-table { font-size: 8pt !important; }
  .bs-table thead th { font-size: 8pt !important; padding: 5px 8px !important; }
  .tr-data td { padding: 4px 8px !important; }
  .bs-node-cell { padding: 4px 8px 4px 20px !important; }
  .acc-code { font-size: 7pt !important; }
  .node-name { font-size: 8pt !important; }
  .tr-category-header .category-header-content { padding: 5px 8px !important; margin-top: 4px !important; }
  .group-header-content { padding: 4px 8px 3px 16px !important; }
  .tr-group-total td { padding: 4px 8px !important; }
  .tr-section-total td { padding: 5px 8px !important; }
  .tr-liab-equity td { padding: 6px 8px !important; }
  .tr-balance-check td { padding: 4px 8px !important; }

  /* Page break */
  @page { size: A4 portrait; margin: 12mm 10mm; }
  tr { page-break-inside: avoid; }
}
</style>