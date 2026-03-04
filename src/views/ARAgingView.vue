<template>
  <div class="layout">
    <main class="main">
      <div class="content-card">

        <div class="page-header">
          <div>
            <h2 class="page-title">AR Aging — Receivables Aging Schedule</h2>
            <p class="page-subtitle">Aging piutang berdasarkan invoice yang masih outstanding</p>
          </div>
        </div>

        <!-- ══ FILTER PANEL ══ -->
        <div class="filter-panel">
          <div class="filter-grid">
            <div class="filter-group">
              <label>As Of Date</label>
              <input v-model="filters.asOfDate" type="date" class="form-input" />
            </div>
            <div class="filter-group">
              <label>Customer</label>
              <div class="acc-wrap">
                <input
                  v-model="customerSearch"
                  class="acc-input"
                  placeholder="Cari & pilih customer..."
                  @input="onCustomerSearch"
                  @focus="showCustomerDrop = true"
                  @blur="onCustomerBlur"
                />
                <svg class="acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                <ul v-if="showCustomerDrop && customerOptions.length" class="acc-dropdown">
                  <li class="acc-opt acc-opt--all" @mousedown.prevent="selectAllCustomers">
                    <span class="check-icon" :class="{ 'check-icon--on': selectedCustomers.length === 0 }">✓</span>
                    Semua Customer
                  </li>
                  <li
                    v-for="c in customerOptions"
                    :key="c.id"
                    class="acc-opt acc-opt--check"
                    @mousedown.prevent="toggleCustomer(c)"
                  >
                    <span class="check-icon" :class="{ 'check-icon--on': isSelected(c.id) }">✓</span>
                    {{ c.name }}
                  </li>
                </ul>
              </div>
              <!-- Selected chips -->
              <div v-if="selectedCustomers.length" class="chips-wrap">
                <span v-for="c in selectedCustomers" :key="c.id" class="chip">
                  {{ c.name }}
                  <button class="chip-rm" @click="removeCustomer(c.id)">×</button>
                </span>
              </div>
            </div>
            <div class="filter-group">
              <label>Group Days</label>
              <div class="day-groups">
                <div class="day-group-row">
                  <span class="day-label">Group 1</span>
                  <input v-model.number="filters.group1" type="number" class="form-input form-input--sm" />
                </div>
                <div class="day-group-row">
                  <span class="day-label">Group 2</span>
                  <input v-model.number="filters.group2" type="number" class="form-input form-input--sm" />
                </div>
                <div class="day-group-row">
                  <span class="day-label">Group 3</span>
                  <input v-model.number="filters.group3" type="number" class="form-input form-input--sm" />
                </div>
                <div class="day-group-row">
                  <span class="day-label">Group 4</span>
                  <input v-model.number="filters.group4" type="number" class="form-input form-input--sm" />
                </div>
              </div>
            </div>
            <div class="filter-actions">
              <button class="btn btn--primary" :disabled="running" @click="runReport">
                <span v-if="running" class="spinner"></span>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                {{ running ? 'Loading...' : 'View' }}
              </button>
              <button class="btn btn--export" :disabled="!hasData" @click="exportExcel">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                Export Excel
              </button>
              <button class="btn btn--export btn--export-pdf" :disabled="!hasData" @click="exportPdf">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Export PDF
              </button>
            </div>
          </div>
        </div>

        <!-- ══ ERROR ══ -->
        <div v-if="reportError" class="report-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ reportError }}
        </div>

        <!-- ══ REPORT META ══ -->
        <div v-if="hasData" class="report-meta">
          <div class="meta-item"><span class="meta-label">Organization</span><span class="meta-value">XYZ</span></div>
          <div class="meta-item"><span class="meta-label">General Ledger</span><span class="meta-value">XYZ</span></div>
          <div class="meta-item"><span class="meta-label">As Of Date</span><span class="meta-value">{{ formatDisplayDate(filters.asOfDate) }}</span></div>
        </div>

        <!-- ══ SUMMARY TABLE ══ -->
        <div v-if="hasData" class="table-section">
          <div class="table-wrap">
            <table class="table aging-table">
              <thead>
                <tr class="aging-header-row">
                  <th class="th-bp">BUSINESS PARTNER</th>
                  <th class="th-num">CURRENT</th>
                  <th class="th-num">1–{{ filters.group1 }}</th>
                  <th class="th-num">{{ filters.group1 + 1 }}–{{ filters.group2 }}</th>
                  <th class="th-num">{{ filters.group2 + 1 }}–{{ filters.group3 }}</th>
                  <th class="th-num">{{ filters.group3 + 1 }}–{{ filters.group4 }}</th>
                  <th class="th-num">&gt;{{ filters.group4 }}</th>
                  <th class="th-num">TOTAL</th>
                  <th class="th-num">CREDITS</th>
                  <th class="th-num">NET</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="summaryRows.length === 0">
                  <td colspan="10" class="td-empty">Tidak ada data outstanding.</td>
                </tr>
                <tr
                  v-for="row in summaryRows"
                  :key="row.bpId"
                  class="tr-data tr-bp"
                  @click="openDetail(row)"
                >
                  <td class="td-bp-name">
                    <span class="bp-link">{{ row.bpName }}</span>
                  </td>
                  <td class="td-num" :class="{ 'td-zero': row.current === 0 }">{{ row.current === 0 ? '0.00' : formatNum(row.current) }}</td>
                  <td class="td-num" :class="{ 'td-zero': row.g1 === 0 }">{{ row.g1 === 0 ? '0.00' : formatNum(row.g1) }}</td>
                  <td class="td-num" :class="{ 'td-zero': row.g2 === 0 }">{{ row.g2 === 0 ? '0.00' : formatNum(row.g2) }}</td>
                  <td class="td-num" :class="{ 'td-zero': row.g3 === 0 }">{{ row.g3 === 0 ? '0.00' : formatNum(row.g3) }}</td>
                  <td class="td-num" :class="{ 'td-zero': row.g4 === 0 }">{{ row.g4 === 0 ? '0.00' : formatNum(row.g4) }}</td>
                  <td class="td-num" :class="{ 'td-zero': row.g5 === 0 }">{{ row.g5 === 0 ? '0.00' : formatNum(row.g5) }}</td>
                  <td class="td-num td-total">{{ formatNum(row.total) }}</td>
                  <td class="td-num td-credit">({{ formatNum(row.credits) }})</td>
                  <td class="td-num td-net">{{ formatNum(row.net) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="tr-total">
                  <td class="td-total-label">TOTAL:</td>
                  <td class="td-num">{{ formatNum(grandTotal.current) }}</td>
                  <td class="td-num">{{ formatNum(grandTotal.g1) }}</td>
                  <td class="td-num">{{ formatNum(grandTotal.g2) }}</td>
                  <td class="td-num">{{ formatNum(grandTotal.g3) }}</td>
                  <td class="td-num">{{ formatNum(grandTotal.g4) }}</td>
                  <td class="td-num">{{ formatNum(grandTotal.g5) }}</td>
                  <td class="td-num td-total">{{ formatNum(grandTotal.total) }}</td>
                  <td class="td-num td-credit">({{ formatNum(grandTotal.credits) }})</td>
                  <td class="td-num td-net">{{ formatNum(grandTotal.net) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- ══ EMPTY STATE ══ -->
        <div v-else-if="!running && !reportError" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <p>Atur filter dan klik <strong>View</strong> untuk melihat aging report</p>
        </div>

      </div>
    </main>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- DETAIL MODAL                                           -->
    <!-- ══════════════════════════════════════════════════════ -->
    <transition name="fade">
      <div v-if="showDetail" class="modal-overlay" @mousedown.self="showDetail = false">
        <div class="modal modal--xl">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>AR Aging</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">{{ detailRow?.bpName }}</span>
              </div>
              <div class="modal-title">Receivables Aging Schedule Details — {{ detailRow?.bpName }}</div>
            </div>
            <button class="modal-close" @click="showDetail = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="modal-subheader">
            <span>Organization: <strong>XYZ</strong></span>
            <span>As Of Date: <strong>{{ formatDisplayDate(filters.asOfDate) }}</strong></span>
            <span>General Ledger: <strong>XYZ</strong></span>
          </div>

          <div class="modal-body">
            <div v-if="detailLoading" class="td-empty" style="padding:48px">
              <div class="loading-dots"><span></span><span></span><span></span></div>
            </div>
            <div v-else>
              <!-- BP Section -->
              <div class="detail-bp-header">{{ detailRow?.bpName }}</div>
              <div class="table-wrap">
                <table class="table detail-table">
                  <thead>
                    <tr>
                      <th>Document No.</th>
                      <th>Document Date</th>
                      <th>Due Date</th>
                      <th class="th-num">Current</th>
                      <th class="th-num">1–{{ filters.group1 }}</th>
                      <th class="th-num">{{ filters.group1 + 1 }}–{{ filters.group2 }}</th>
                      <th class="th-num">{{ filters.group2 + 1 }}–{{ filters.group3 }}</th>
                      <th class="th-num">{{ filters.group3 + 1 }}–{{ filters.group4 }}</th>
                      <th class="th-num">&gt;{{ filters.group4 }}</th>
                      <th class="th-num">Credits</th>
                      <th class="th-num">Net Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="detailInvoices.length === 0">
                      <td colspan="11" class="td-empty">Tidak ada invoice outstanding.</td>
                    </tr>
                    <tr v-for="inv in detailInvoices" :key="inv.id" class="tr-data">
                      <td><span class="code-badge">{{ inv.documentNo }}</span></td>
                      <td class="td-sec">{{ formatDisplayDate(inv.invoiceDate) }}</td>
                      <td class="td-sec">{{ formatDisplayDate(inv.dueDate) }}</td>
                      <td class="td-num" :class="{ 'td-zero': inv.current === 0 }">{{ inv.current === 0 ? '0.00' : formatNum(inv.current) }}</td>
                      <td class="td-num" :class="{ 'td-zero': inv.g1 === 0 }">{{ inv.g1 === 0 ? '0.00' : formatNum(inv.g1) }}</td>
                      <td class="td-num" :class="{ 'td-zero': inv.g2 === 0 }">{{ inv.g2 === 0 ? '0.00' : formatNum(inv.g2) }}</td>
                      <td class="td-num" :class="{ 'td-zero': inv.g3 === 0 }">{{ inv.g3 === 0 ? '0.00' : formatNum(inv.g3) }}</td>
                      <td class="td-num" :class="{ 'td-zero': inv.g4 === 0 }">{{ inv.g4 === 0 ? '0.00' : formatNum(inv.g4) }}</td>
                      <td class="td-num" :class="{ 'td-zero': inv.g5 === 0 }">{{ inv.g5 === 0 ? '0.00' : formatNum(inv.g5) }}</td>
                      <td class="td-num td-credit">({{ formatNum(inv.credits) }})</td>
                      <td class="td-num td-net">{{ formatNum(inv.netDue) }}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr class="tr-total">
                      <td colspan="3" class="td-total-label">Balance</td>
                      <td class="td-num">{{ formatNum(detailRow?.current ?? 0) }}</td>
                      <td class="td-num">{{ formatNum(detailRow?.g1 ?? 0) }}</td>
                      <td class="td-num">{{ formatNum(detailRow?.g2 ?? 0) }}</td>
                      <td class="td-num">{{ formatNum(detailRow?.g3 ?? 0) }}</td>
                      <td class="td-num">{{ formatNum(detailRow?.g4 ?? 0) }}</td>
                      <td class="td-num">{{ formatNum(detailRow?.g5 ?? 0) }}</td>
                      <td class="td-num td-credit">({{ formatNum(detailRow?.credits ?? 0) }})</td>
                      <td class="td-num td-net">{{ formatNum(detailRow?.net ?? 0) }}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn--ghost" @click="showDetail = false">Close</button>
            <button class="btn btn--export" @click="exportDetailExcel">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              XLS
            </button>
            <button class="btn btn--export btn--export-pdf" @click="exportDetailPdf">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              PDF
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══ TOAST ══ -->
    <transition name="fade">
      <div v-if="toast.show" :class="['toast', `toast--${toast.type}`]">{{ toast.message }}</div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

// ── API setup
const BASE_URL = window.APP_CONFIG?.API_BASE_URL || '/openbravo/'
const token = btoa('APIService:wrt')
const api = axios.create({
  baseURL: BASE_URL,
  headers: { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' },
})

// ── state
const filters = ref({
  asOfDate: new Date().toISOString().slice(0, 10),
  group1: 30,
  group2: 60,
  group3: 90,
  group4: 120,
})

const customerSearch  = ref('')
const customerOptions = ref([])
const selectedCustomers = ref([])
const showCustomerDrop  = ref(false)
let customerTimer = null

const running     = ref(false)
const reportError = ref('')
const summaryRows = ref([])

const showDetail    = ref(false)
const detailRow     = ref(null)
const detailInvoices = ref([])
const detailLoading  = ref(false)

const toast = ref({ show: false, type: 'success', message: '' })

// ── computed
const hasData = computed(() => summaryRows.value.length > 0)

const grandTotal = computed(() => {
  const zero = { current: 0, g1: 0, g2: 0, g3: 0, g4: 0, g5: 0, total: 0, credits: 0, net: 0 }
  return summaryRows.value.reduce((acc, r) => {
    acc.current += r.current; acc.g1 += r.g1; acc.g2 += r.g2; acc.g3 += r.g3
    acc.g4 += r.g4; acc.g5 += r.g5; acc.total += r.total; acc.credits += r.credits; acc.net += r.net
    return acc
  }, zero)
})

// ── customer search
async function onCustomerSearch() {
  showCustomerDrop.value = true
  clearTimeout(customerTimer)
  customerTimer = setTimeout(async () => {
    const q = customerSearch.value.trim()
    let where = `e.businessPartnerCategory.name = 'Customer'`
    if (q) where += ` and upper(e.name) like upper('%${q.replace(/'/g,"''")}%')`
    const res = await api.get('/org.openbravo.service.json.jsonrest/BusinessPartner', {
      params: { _where: where, _startRow: 0, _endRow: 100 },
    })
    customerOptions.value = res.data?.response?.data ?? []
  }, 300)
}
function onCustomerBlur() { setTimeout(() => { showCustomerDrop.value = false }, 200) }
function isSelected(id) { return selectedCustomers.value.some(c => c.id === id) }
function toggleCustomer(c) {
  const idx = selectedCustomers.value.findIndex(x => x.id === c.id)
  if (idx >= 0) selectedCustomers.value.splice(idx, 1)
  else selectedCustomers.value.push({ id: c.id, name: c.name })
}
function selectAllCustomers() { selectedCustomers.value = [] }
function removeCustomer(id) { selectedCustomers.value = selectedCustomers.value.filter(c => c.id !== id) }

// ── helpers
function today() { return new Date().toISOString().slice(0, 10) }

function formatDisplayDate(d) {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
}

function formatNum(v) {
  if (v == null || isNaN(v)) return '0.00'
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

function daysBetween(d1, d2) {
  return Math.floor((new Date(d2) - new Date(d1)) / 86400000)
}

function showToast(msg, type = 'success') {
  toast.value = { show: true, type, message: msg }
  setTimeout(() => { toast.value.show = false }, 3000)
}

// ── classify overdue days → bucket
function classifyDays(days, g) {
  // days overdue (positive = overdue, negative = current)
  if (days <= 0)         return 'current'
  if (days <= g.group1)  return 'g1'
  if (days <= g.group2)  return 'g2'
  if (days <= g.group3)  return 'g3'
  if (days <= g.group4)  return 'g4'
  return 'g5'
}

// ── main report
async function runReport() {
  running.value = true; reportError.value = ''; summaryRows.value = []
  try {
    const asOf = filters.value.asOfDate

    // Build where clause
    let where = `e.salesTransaction = true and e.documentStatus = 'CO' and e.outstandingAmount > 0`
    where += ` and e.invoiceDate <= '${asOf}'`
    if (selectedCustomers.value.length > 0) {
      const ids = selectedCustomers.value.map(c => `'${c.id}'`).join(',')
      where += ` and e.businessPartner.id in (${ids})`
    }

    // Fetch all outstanding invoices
    let allInvoices = []
    let startRow = 0
    const pageSize = 200
    while (true) {
      const res = await api.get('/org.openbravo.service.json.jsonrest/Invoice', {
        params: {
          _where: where,
          _startRow: startRow,
          _endRow: startRow + pageSize,
          _orderBy: 'e.businessPartner.name asc, e.invoiceDate asc',
        },
      })
      const chunk = res.data?.response?.data ?? []
      allInvoices = allInvoices.concat(chunk)
      if (chunk.length < pageSize) break
      startRow += pageSize
    }

    if (allInvoices.length === 0) {
      summaryRows.value = []
      running.value = false
      return
    }

    // Group by business partner
    const grouped = {}
    const g = filters.value
    for (const inv of allInvoices) {
      const bpId   = inv.businessPartner || inv['businessPartner']
      const bpName = inv['businessPartner$_identifier'] || bpId

      if (!grouped[bpId]) {
        grouped[bpId] = {
          bpId, bpName,
          current: 0, g1: 0, g2: 0, g3: 0, g4: 0, g5: 0,
          total: 0, credits: 0, net: 0,
          invoices: [],
        }
      }

      const outstanding = parseFloat(inv.outstandingAmount) || 0
      const dueDate = inv.dueDate || inv.invoiceDate
      const overdueDays = daysBetween(dueDate, asOf)
      const bucket = classifyDays(overdueDays, g)

      // Compute aging bucket for this invoice
      const buckets = { current: 0, g1: 0, g2: 0, g3: 0, g4: 0, g5: 0 }
      buckets[bucket] = outstanding

      grouped[bpId].current += buckets.current
      grouped[bpId].g1      += buckets.g1
      grouped[bpId].g2      += buckets.g2
      grouped[bpId].g3      += buckets.g3
      grouped[bpId].g4      += buckets.g4
      grouped[bpId].g5      += buckets.g5
      grouped[bpId].total   += outstanding
      grouped[bpId].net     += outstanding
      grouped[bpId].invoices.push({ ...inv, dueDate, overdueDays, ...buckets, credits: 0, netDue: outstanding })
    }

    summaryRows.value = Object.values(grouped).sort((a, b) => a.bpName.localeCompare(b.bpName))
  } catch (e) {
    reportError.value = e?.response?.data?.response?.error?.message || e.message || 'Gagal memuat data'
  } finally { running.value = false }
}

// ── open detail modal
async function openDetail(row) {
  detailRow.value = row
  detailInvoices.value = []
  detailLoading.value = true
  showDetail.value = true

  // Map stored invoice data already computed
  detailInvoices.value = row.invoices.map(inv => ({
    id:          inv.id,
    documentNo:  inv.documentNo,
    invoiceDate: inv.invoiceDate?.slice(0, 10),
    dueDate:     inv.dueDate?.slice(0, 10),
    current:     inv.current,
    g1:          inv.g1,
    g2:          inv.g2,
    g3:          inv.g3,
    g4:          inv.g4,
    g5:          inv.g5,
    credits:     inv.credits,
    netDue:      inv.netDue,
  }))
  detailLoading.value = false
}

// ══════════════════════════════════════════════════════════════
// EXPORT — Excel (summary)
// ══════════════════════════════════════════════════════════════
async function exportExcel() {
  try {
    if (!window.ExcelJS) {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'
      document.head.appendChild(script)
      await new Promise(r => { script.onload = r })
    }
    const ExcelJS = window.ExcelJS

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('ReportAgingBalance')

    const g = filters.value
    const colLabels = [
      'BUSINESS PARTNER', 'CURRENT',
      `1-${g.group1}`, `${g.group1+1}-${g.group2}`,
      `${g.group2+1}-${g.group3}`, `${g.group3+1}-${g.group4}`,
      `>${g.group4}`, 'TOTAL', 'CREDITS', 'NET'
    ]

    // Title
    ws.addRow(['Receivables Aging Schedule'])
    ws.addRow(['Organization:', '', 'XYZ', '', '', 'General Ledger:', '', '', 'XYZ'])
    ws.addRow([`As Of Date:`, '', formatDisplayDate(g.asOfDate)])
    ws.addRow([])
    ws.addRow(colLabels)

    // Style header row
    const headerRow = ws.getRow(5)
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A4A4A' } }
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = { bottom: { style: 'thin' } }
    })
    ws.getRow(1).getCell(1).font = { bold: true, size: 14 }

    // Data rows
    for (const row of summaryRows.value) {
      ws.addRow([
        row.bpName,
        row.current, row.g1, row.g2, row.g3, row.g4, row.g5,
        row.total, row.credits, row.net
      ])
    }

    // Totals row
    const gt = grandTotal.value
    const totRow = ws.addRow([
      'TOTAL:', gt.current, gt.g1, gt.g2, gt.g3, gt.g4, gt.g5, gt.total, gt.credits, gt.net
    ])
    totRow.eachCell(cell => { cell.font = { bold: true } })

    // Number format for cols 2-10
    ws.columns.forEach((col, i) => {
      if (i === 0) { col.width = 35 } else { col.width = 14; col.numFmt = '#,##0.00' }
    })

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `AR_Aging_${g.asOfDate}.xlsx`; a.click()
    URL.revokeObjectURL(url)
    showToast('Excel exported!')
  } catch (e) {
    console.error(e)
    showToast('Export Excel gagal: ' + e.message, 'error')
  }
}

// ══════════════════════════════════════════════════════════════
// EXPORT — PDF (summary)
// ══════════════════════════════════════════════════════════════
async function exportPdf() {
  try {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    document.head.appendChild(script)
    await new Promise(r => { script.onload = r })
    const script2 = document.createElement('script')
    script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
    document.head.appendChild(script2)
    await new Promise(r => { script2.onload = r })

    const { jsPDF } = window.jspdf
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    const g = filters.value
    const pageW = doc.internal.pageSize.getWidth()

    // Title
    doc.setFontSize(14); doc.setFont('helvetica', 'bold')
    doc.text('Receivables Aging Schedule', pageW / 2, 40, { align: 'center' })

    // Meta
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text(`Organization:  XYZ`, 40, 60)
    doc.text(`General Ledger:  XYZ`, pageW / 2, 60)
    doc.text(`As Of Date:  ${formatDisplayDate(g.asOfDate)}`, 40, 74)

    const head = [[
      'BUSINESS PARTNER', 'CURRENT',
      `1-${g.group1}`, `${g.group1+1}-${g.group2}`,
      `${g.group2+1}-${g.group3}`, `${g.group3+1}-${g.group4}`,
      `>${g.group4}`, 'TOTAL', 'CREDITS', 'NET'
    ]]

    const body = summaryRows.value.map(row => [
      row.bpName,
      formatNum(row.current), formatNum(row.g1), formatNum(row.g2),
      formatNum(row.g3), formatNum(row.g4), formatNum(row.g5),
      formatNum(row.total), `(${formatNum(row.credits)})`, formatNum(row.net)
    ])

    const gt = grandTotal.value
    body.push([
      'TOTAL:',
      formatNum(gt.current), formatNum(gt.g1), formatNum(gt.g2),
      formatNum(gt.g3), formatNum(gt.g4), formatNum(gt.g5),
      formatNum(gt.total), `(${formatNum(gt.credits)})`, formatNum(gt.net)
    ])

    doc.autoTable({
      head, body,
      startY: 90,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [74, 74, 74], textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 140 },
        1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' },
        4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' },
        7: { halign: 'right', fontStyle: 'bold' },
        8: { halign: 'right' }, 9: { halign: 'right', fontStyle: 'bold' },
      },
      didDrawCell: (data) => {
        if (data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [240, 240, 240]
        }
      },
      foot: [],
    })

    // Page number
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7); doc.setFont('helvetica', 'normal')
      const pDate = `Generated on ${formatDisplayDate(new Date().toISOString().slice(0,10))}`
      doc.text(pDate, 40, doc.internal.pageSize.getHeight() - 20)
      doc.text(`Page ${i} of ${pageCount}`, pageW - 40, doc.internal.pageSize.getHeight() - 20, { align: 'right' })
    }

    doc.save(`AR_Aging_${g.asOfDate}.pdf`)
    showToast('PDF exported!')
  } catch (e) {
    console.error(e)
    showToast('Export PDF gagal: ' + e.message, 'error')
  }
}

// ══════════════════════════════════════════════════════════════
// EXPORT — Detail Excel
// ══════════════════════════════════════════════════════════════
async function exportDetailExcel() {
  try {
    if (!window.ExcelJS) {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'
      document.head.appendChild(script)
      await new Promise(r => { script.onload = r })
    }
    const ExcelJS = window.ExcelJS

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('PaymentReportPDF')
    const g = filters.value
    const row = detailRow.value

    ws.addRow(['Receivables Aging Schedule Details'])
    ws.addRow(['Organization:', '', 'XYZ', '', '', 'As Of Date:', '', formatDisplayDate(g.asOfDate), '', 'General Ledger:', '', 'XYZ'])
    ws.addRow([])
    ws.addRow(['', 'Business Partner', 'Document No.', 'Document Date', 'Current',
      `1-${g.group1}`, `${g.group1+1}-${g.group2}`, `${g.group2+1}-${g.group3}`,
      `${g.group3+1}-${g.group4}`, `>${g.group4}`, 'Credits', 'Net Due', 'Total'])
    ws.getRow(4).eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A4A4A' } }
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    })

    ws.addRow([row.bpName])
    for (const inv of detailInvoices.value) {
      ws.addRow(['', '', inv.documentNo, inv.invoiceDate,
        inv.current, inv.g1, inv.g2, inv.g3, inv.g4, inv.g5,
        inv.credits, inv.netDue, inv.netDue])
    }

    ws.addRow(['Balance', '', '', '', row.current, row.g1, row.g2, row.g3, row.g4, row.g5, row.credits, row.net, row.net])
    const gt = grandTotal.value
    ws.addRow(['Total'])
    ws.addRow(['', '', '', '', gt.current, gt.g1, gt.g2, gt.g3, gt.g4, gt.g5, gt.credits, gt.net, gt.net])

    ws.getColumn(1).width = 25; ws.getColumn(2).width = 28
    for (let c = 5; c <= 13; c++) { ws.getColumn(c).width = 14; ws.getColumn(c).numFmt = '#,##0.00' }

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `AR_Aging_Detail_${row.bpName}_${g.asOfDate}.xlsx`; a.click()
    URL.revokeObjectURL(url)
    showToast('Excel detail exported!')
  } catch (e) {
    showToast('Export Excel gagal: ' + e.message, 'error')
  }
}

// ══════════════════════════════════════════════════════════════
// EXPORT — Detail PDF
// ══════════════════════════════════════════════════════════════
async function exportDetailPdf() {
  try {
    if (!window.jspdf) {
      const s1 = document.createElement('script')
      s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
      document.head.appendChild(s1); await new Promise(r => { s1.onload = r })
      const s2 = document.createElement('script')
      s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
      document.head.appendChild(s2); await new Promise(r => { s2.onload = r })
    }

    const { jsPDF } = window.jspdf
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    const g = filters.value
    const row = detailRow.value
    const pageW = doc.internal.pageSize.getWidth()

    doc.setFontSize(13); doc.setFont('helvetica', 'bold')
    doc.text('Receivables Aging Schedule Details', pageW / 2, 36, { align: 'center' })
    doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    doc.text(`Organization: XYZ`, 40, 54)
    doc.text(`As Of Date: ${formatDisplayDate(g.asOfDate)}`, pageW / 3, 54)
    doc.text(`General Ledger: XYZ`, (pageW * 2) / 3, 54)

    const head = [[
      'Document No.', 'Document Date', 'Current',
      `1-${g.group1}`, `${g.group1+1}-${g.group2}`,
      `${g.group2+1}-${g.group3}`, `${g.group3+1}-${g.group4}`,
      `>${g.group4}`, 'Credits', 'Net Due'
    ]]

    const body = detailInvoices.value.map(inv => [
      inv.documentNo, formatDisplayDate(inv.invoiceDate),
      formatNum(inv.current), formatNum(inv.g1), formatNum(inv.g2),
      formatNum(inv.g3), formatNum(inv.g4), formatNum(inv.g5),
      `(${formatNum(inv.credits)})`, formatNum(inv.netDue)
    ])
    body.push([
      'Balance', '',
      formatNum(row.current), formatNum(row.g1), formatNum(row.g2),
      formatNum(row.g3), formatNum(row.g4), formatNum(row.g5),
      `(${formatNum(row.credits)})`, formatNum(row.net)
    ])

    // BP header row above table
    doc.setFontSize(10); doc.setFont('helvetica', 'bold')
    doc.text(row.bpName, 40, 72)

    doc.autoTable({
      head, body,
      startY: 82,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [74, 74, 74], textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 80 }, 1: { cellWidth: 72 },
        2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' },
        5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' },
        8: { halign: 'right' }, 9: { halign: 'right', fontStyle: 'bold' },
      },
    })

    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7); doc.setFont('helvetica', 'normal')
      doc.text(`Generated on ${formatDisplayDate(new Date().toISOString().slice(0,10))}`, 40, doc.internal.pageSize.getHeight() - 18)
      doc.text(`Page ${i} of ${pageCount}`, pageW - 40, doc.internal.pageSize.getHeight() - 18, { align: 'right' })
    }

    doc.save(`AR_Aging_Detail_${row.bpName}_${g.asOfDate}.pdf`)
    showToast('PDF detail exported!')
  } catch (e) {
    showToast('Export PDF gagal: ' + e.message, 'error')
  }
}

onMounted(() => {
  // Pre-load customer list
  api.get('/org.openbravo.service.json.jsonrest/BusinessPartner', {
    params: { _where: `e.businessPartnerCategory.name = 'Customer'`, _startRow: 0, _endRow: 100 },
  }).then(res => { customerOptions.value = res.data?.response?.data ?? [] }).catch(() => {})
})
</script>

<style scoped>
:root {
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --bg: #f1f5f9; --surface: #ffffff; --surface2: #f8fafc;
  --border: #e2e8f0; --accent: #3b82f6;
  --text-primary: #0f172a; --text-secondary: #475569; --text-muted: #94a3b8;
  --danger: #ef4444; --radius: 10px; --radius-sm: 6px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,.06);
  --shadow-md: 0 4px 16px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,.04);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
.layout { display: flex; flex-direction: column; min-height: 100vh; background: var(--bg); font-family: var(--font); }
.main { flex: 1; padding: 28px 24px; max-width: 1400px; margin: 0 auto; width: 100%; }
.content-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-sm); overflow: hidden; }

.page-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); }
.page-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.page-subtitle { font-size: 12.5px; color: var(--text-muted); margin-top: 2px; }

/* Filter panel */
.filter-panel { padding: 18px 24px; background: var(--surface2); border-bottom: 1px solid var(--border); }
.filter-grid { display: grid; grid-template-columns: 180px 1fr auto auto; gap: 20px; align-items: start; }
.filter-group { display: flex; flex-direction: column; gap: 6px; }
.filter-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.filter-actions { display: flex; flex-direction: column; gap: 8px; padding-top: 18px; }

/* Day groups */
.day-groups { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.day-group-row { display: flex; align-items: center; gap: 8px; }
.day-label { font-size: 11.5px; color: var(--text-muted); font-weight: 500; width: 48px; flex-shrink: 0; }

/* Buttons */
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 0 16px; height: 36px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font); transition: all .15s; white-space: nowrap; }
.btn--primary { background: var(--accent); color: #fff; }
.btn--primary:hover:not(:disabled) { background: #2563eb; }
.btn--primary:disabled { opacity: .6; cursor: not-allowed; }
.btn--ghost { background: var(--surface2); border: 1px solid var(--border); color: var(--text-secondary); }
.btn--ghost:hover { background: var(--border); }
.btn--export { background: #16a34a; color: #fff; }
.btn--export:hover:not(:disabled) { background: #15803d; }
.btn--export:disabled { opacity: .5; cursor: not-allowed; }
.btn--export-pdf { background: #dc2626; }
.btn--export-pdf:hover:not(:disabled) { background: #b91c1c; }
.btn--edit { background: var(--surface2); color: var(--text-secondary); border: 1px solid var(--border); }
.btn--edit:hover { background: var(--border); color: var(--text-primary); }

/* Form inputs */
.form-input { width: 100%; height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface); font-family: var(--font); color: var(--text-primary); transition: border-color .15s; }
.form-input:focus { border-color: var(--accent); }
.form-input--sm { height: 32px; font-size: 12px; width: 70px; }

/* Combobox */
.acc-wrap { position: relative; width: 100%; }
.acc-input { display: block; width: 100%; height: 36px; padding: 0 32px 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface); font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.acc-input:focus { border-color: var(--accent); }
.acc-chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.acc-dropdown { position: absolute; z-index: 300; top: calc(100% + 3px); left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); max-height: 220px; overflow-y: auto; list-style: none; margin: 0; padding: 4px 0; }
.acc-opt { padding: 8px 12px; font-size: 12.5px; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; gap: 8px; }
.acc-opt:hover { background: #eff6ff; }
.acc-opt--all { font-weight: 600; border-bottom: 1px solid var(--border); }
.check-icon { width: 16px; height: 16px; border: 1.5px solid var(--border); border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: transparent; flex-shrink: 0; }
.check-icon--on { background: var(--accent); border-color: var(--accent); color: #fff; }

/* Chips */
.chips-wrap { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px 3px 10px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 99px; font-size: 12px; color: #1d4ed8; font-weight: 500; }
.chip-rm { background: none; border: none; cursor: pointer; color: #93c5fd; font-size: 14px; line-height: 1; padding: 0 2px; }
.chip-rm:hover { color: #1d4ed8; }

/* Report meta */
.report-meta { display: flex; gap: 32px; padding: 12px 24px; background: var(--surface2); border-bottom: 1px solid var(--border); }
.meta-item { display: flex; gap: 8px; align-items: center; }
.meta-label { font-size: 11.5px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.meta-value { font-size: 13px; color: var(--text-primary); font-weight: 600; }

/* Table */
.table-section { overflow-x: auto; }
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }

.aging-table thead .aging-header-row th {
  background: #3a3a3a;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  padding: 10px 12px;
  border: none;
  white-space: nowrap;
}
.aging-table tbody tr td { padding: 10px 12px; border-bottom: 1px solid var(--border); }
.aging-table tfoot tr td { padding: 10px 12px; border-top: 2px solid #3a3a3a; background: #f8fafc; }

.th-bp { text-align: left; min-width: 200px; }
.th-num { text-align: right; min-width: 100px; }
.td-num { text-align: right; font-variant-numeric: tabular-nums; color: var(--text-secondary); }
.td-zero { color: var(--text-muted); }
.td-total { font-weight: 700; color: var(--text-primary); }
.td-credit { color: #dc2626; }
.td-net { font-weight: 700; color: #15803d; }
.td-bp-name { font-weight: 500; }
.td-total-label { font-weight: 700; color: var(--text-primary); }
.td-empty { text-align: center; color: var(--text-muted); padding: 48px; font-size: 13px; }

.tr-data:hover { background: var(--surface2); }
.tr-bp { cursor: pointer; }
.tr-bp:hover .bp-link { color: var(--accent); text-decoration: underline; }
.bp-link { color: var(--text-primary); font-weight: 600; }
.tr-total td { font-weight: 700; }

/* Detail table */
.detail-table thead th {
  background: #3a3a3a; color: #fff;
  font-size: 10.5px; font-weight: 700;
  padding: 8px 10px; white-space: nowrap;
}
.detail-table tbody tr td { padding: 8px 10px; border-bottom: 1px solid var(--border); }
.td-sec { color: var(--text-secondary); font-size: 12.5px; }
.code-badge { font-family: var(--font-mono); font-size: 11.5px; background: var(--surface2); border: 1px solid var(--border); padding: 2px 7px; border-radius: 4px; }

/* Empty state */
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 80px 24px; color: var(--text-muted); }
.empty-state p { font-size: 14px; }
.empty-state strong { color: var(--text-secondary); }

/* Error */
.report-error { margin: 16px 24px; padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: center; gap: 8px; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(2px); }
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); width: 100%; max-width: 1100px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; }
.modal--xl { max-width: 1100px; }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 20px 12px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.modal-breadcrumb { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-muted); margin-bottom: 4px; }
.bc-active { color: var(--accent); font-weight: 500; }
.modal-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.modal-close { background: none; border: none; color: var(--text-muted); display: flex; align-items: center; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; }
.modal-close:hover { background: var(--surface2); color: var(--text-primary); }
.modal-subheader { display: flex; gap: 32px; padding: 10px 20px; background: var(--surface2); border-bottom: 1px solid var(--border); font-size: 12.5px; color: var(--text-secondary); flex-shrink: 0; }
.modal-subheader strong { color: var(--text-primary); }
.modal-body { padding: 20px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0; }

.detail-bp-header { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #3a3a3a; }

/* Loading */
.loading-dots { display: flex; gap: 6px; justify-content: center; }
.loading-dots span { width: 7px; height: 7px; background: var(--accent); border-radius: 50%; animation: bounce 1.2s infinite ease-in-out; }
.loading-dots span:nth-child(2) { animation-delay: .2s; }
.loading-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes bounce { 0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1} }

/* Spinner */
.spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Toast */
.toast { position: fixed; bottom: 24px; right: 24px; z-index: 2000; padding: 12px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); }
.toast--success { background: #16a34a; color: #fff; }
.toast--error { background: var(--danger); color: #fff; }
.fade-enter-active,.fade-leave-active { transition: opacity .15s; }
.fade-enter-from,.fade-leave-to { opacity: 0; }
</style>
