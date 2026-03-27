<template>
  <div class="page-wrap">
    <div class="card">

      <!-- ══ PAGE TITLE ══ -->
      <div class="card-title-row">
        <h1 class="card-title">General Ledger</h1>
      </div>

      <!-- ══ TABS ══ -->
      <div class="tabs">
        <button
          :class="['tab', activeTab === 'filter' ? 'tab--active' : '']"
          @click="activeTab = 'filter'"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          Filter & Select COA
        </button>
        <button
          :class="['tab', activeTab === 'result' ? 'tab--active' : '']"
          @click="activeTab = 'result'"
          :disabled="selectedCOAs.length === 0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
          Results
          <span v-if="selectedCOAs.length > 0" class="tab-badge">{{ selectedCOAs.length }}</span>
        </button>
      </div>

      <!-- ══ TAB: FILTER ══ -->
      <div v-show="activeTab === 'filter'" class="tab-content">
        <!-- Toolbar -->
        <div class="toolbar">
          <div class="toolbar-left">
            <div class="field-group">
              <label class="field-label">Date From</label>
              <input v-model="dateFrom" type="date" class="field-input" />
            </div>
            <div class="field-group">
              <label class="field-label">Date To</label>
              <input v-model="dateTo" type="date" class="field-input" />
            </div>
          </div>
          <div class="toolbar-right">
            <button class="btn btn--primary" @click="fetchCOAList" :disabled="loading">
              <span v-if="loading" class="spinner"></span>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              {{ loading ? 'Searching...' : 'Search' }}
            </button>
          </div>
        </div>

        <!-- Error -->
        <div v-if="errorMessage" class="alert-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ errorMessage }}
        </div>

        <!-- Empty hint -->
        <div v-if="!loading && selectedCOAs.length === 0 && !errorMessage" class="empty-hint">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <p>Select a date range and click <strong>Search</strong> to display general ledger data</p>
        </div>

        <!-- Summary setelah data loaded -->
        <div v-if="selectedCOAs.length > 0" class="summary-section">
          <div class="summary-header">
            <span class="summary-period">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {{ formatDateDisplay(dateFrom) }} — {{ formatDateDisplay(dateTo) }}
            </span>
            <span class="summary-count-badge">{{ selectedCOAs.length }} accounts selected</span>
          </div>
          <div class="summary-coa-list">
            <div v-for="coa in selectedCOAs" :key="coa.accountId" class="summary-coa-row">
              <span class="coa-code-badge">{{ coa.accountCode }}</span>
              <span class="coa-name-text">{{ coa.accountName }}</span>
              <span class="coa-type-text">{{ getAccountType(coa.accountType) }}</span>
            </div>
          </div>
          <div class="summary-actions">
            <button class="btn btn--outline" @click="showModal = true">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Change COA Selection
            </button>
            <button class="btn btn--primary" @click="activeTab = 'result'">
              View Results
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- ══ TAB: RESULT ══ -->
      <div v-show="activeTab === 'result' && selectedCOAs.length > 0" class="tab-content">
        <!-- Result Toolbar -->
        <div class="toolbar">
          <div class="toolbar-left">
            <div class="result-info">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>{{ formatDateDisplay(dateFrom) }} — {{ formatDateDisplay(dateTo) }}</span>
              <span class="result-count-badge">{{ selectedCOAs.length }} Accounts</span>
            </div>
          </div>
          <div class="toolbar-right">
            <button class="btn btn--excel" @click="downloadExcel" :disabled="downloadingExcel">
              <span v-if="downloadingExcel" class="spinner"></span>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {{ downloadingExcel ? 'Downloading...' : 'Download Excel' }}
            </button>
          </div>
        </div>

        <!-- COA Blocks -->
        <div class="coa-blocks">
          <div v-for="coa in selectedCOAs" :key="coa.accountId" class="coa-block">

            <!-- COA Header Bar -->
            <div class="coa-bar">
              <div class="coa-bar-left">
                <span class="coa-code-badge">{{ coa.accountCode }}</span>
                <span class="coa-bar-name">{{ coa.accountName }}</span>
                <span class="coa-bar-type">{{ getAccountType(coa.accountType) }}</span>
              </div>
              <div class="coa-bar-stats">
                <div class="stat-item">
                  <span class="stat-label">Opening</span>
                  <span class="stat-value">{{ formatCurrency(coa.openingBalance || 0) }}</span>
                </div>
                <div class="stat-sep">|</div>
                <div class="stat-item">
                  <span class="stat-label">Debit</span>
                  <span class="stat-value stat-value--debit">{{ formatCurrency(coa.totalDebit) }}</span>
                </div>
                <div class="stat-sep">|</div>
                <div class="stat-item">
                  <span class="stat-label">Credit</span>
                  <span class="stat-value stat-value--credit">{{ formatCurrency(coa.totalCredit) }}</span>
                </div>
                <div class="stat-sep">|</div>
                <div class="stat-item">
                  <span class="stat-label">Closing</span>
                  <span class="stat-value stat-value--closing">{{ formatCurrency(coa.closingBalance || 0) }}</span>
                </div>
              </div>
            </div>

            <!-- Transactions Table -->
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>DOCUMENT NO</th>
                    <th>PARTNER</th>
                    <th>DESCRIPTION HEADER</th>
                    <th>DESCRIPTION LINE</th>
                    <th class="th-r">DEBIT</th>
                    <th class="th-r">CREDIT</th>
                    <th class="th-r">BALANCE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!coa.transactions || coa.transactions.length === 0">
                    <td colspan="8" class="td-empty">No transactions in this period</td>
                  </tr>
                  <tr v-for="(trans, idx) in coa.transactions" :key="idx" class="tr-row">
                    <td class="td-date">{{ formatDate(trans.date) }}</td>
                    <td><span class="doc-pill">{{ trans.documentNo }}</span></td>
                    <td class="td-clip td-muted">{{ trans.partner && trans.partner !== '-' ? trans.partner : '—' }}</td>
                    <td class="td-clip td-muted" :title="trans.descriptionHeader">{{ trans.descriptionHeader || '—' }}</td>
                    <td class="td-clip td-muted" :title="trans.description">{{ trans.description || '—' }}</td>
                    <td class="td-r td-debit">{{ trans.debit > 0 ? formatCurrency(trans.debit) : '—' }}</td>
                    <td class="td-r td-credit">{{ trans.credit > 0 ? formatCurrency(trans.credit) : '—' }}</td>
                    <td class="td-r td-balance">{{ formatCurrency(trans.runningBalance) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>

    </div><!-- /card -->

    <!-- ══ COA SELECTION MODAL ══ -->
    <transition name="fade">
      <div v-if="showModal" class="modal-overlay" @mousedown.self="closeModal">
        <div class="modal">

          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>General Ledger</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">Select Chart of Account</span>
              </div>
              <div class="modal-title">Select Chart of Account</div>
            </div>
            <button class="modal-close" @click="closeModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="modal-search-row">
              <div class="search-wrap">
                <svg class="search-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input v-model="searchAccountCode" class="search-inp" placeholder="Search account code..." />
              </div>
              <div class="search-wrap">
                <svg class="search-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input v-model="searchAccountName" class="search-inp" placeholder="Search account name..." />
              </div>
            </div>

            <div class="modal-meta">
              Showing <strong>{{ filteredCOAList.length }}</strong> of <strong>{{ coaList.length }}</strong> accounts
            </div>

            <div class="modal-table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th class="th-chk">
                      <input type="checkbox" class="chk" @change="toggleAllCOA" :checked="isAllCOASelected" />
                    </th>
                    <th>CODE</th>
                    <th>ACCOUNT NAME</th>
                    <th>TYPE</th>
                    <th class="th-c">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="filteredCOAList.length === 0">
                    <td colspan="5" class="td-empty">No accounts found</td>
                  </tr>
                  <tr
                    v-for="coa in filteredCOAList"
                    :key="coa.accountId"
                    class="tr-row tr-sel"
                    @click="toggleCOASelection(coa.accountId)"
                  >
                    <td class="td-chk" @click.stop>
                      <input type="checkbox" class="chk" v-model="tempSelectedCOA" :value="coa.accountId" />
                    </td>
                    <td><span class="coa-code-badge">{{ coa.accountCode }}</span></td>
                    <td class="td-name">{{ coa.accountName }}</td>
                    <td><span class="type-pill">{{ getAccountType(coa.accountType) }}</span></td>
                    <td class="td-c">
                      <span :class="['status-pill', coa.active ? 'status-pill--on' : 'status-pill--off']">
                        <span class="status-dot"></span>
                        {{ coa.active ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="modal-footer">
            <span class="sel-count">{{ tempSelectedCOA.length }} COA selected</span>
            <div class="modal-footer-btns">
              <button class="btn btn--ghost" @click="closeModal">Cancel</button>
              <button
                class="btn btn--primary"
                @click="confirmCOASelection"
                :disabled="loading || tempSelectedCOA.length === 0"
              >
                <span v-if="loading" class="spinner"></span>
                {{ loading ? 'Loading...' : 'Confirm' }}
              </button>
            </div>
          </div>

        </div>
      </div>
    </transition>

    <!-- ══ TOAST ══ -->
    <transition name="fade">
      <div v-if="toast.show" :class="['toast', `toast--${toast.type}`]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <template v-if="toast.type === 'success'"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></template>
          <template v-else><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></template>
        </svg>
        {{ toast.message }}
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// ── State ─────────────────────────────────────────────────────────────────────
const activeTab         = ref('filter')
const dateFrom          = ref('')
const dateTo            = ref('')
const showModal         = ref(false)
const loading           = ref(false)
const errorMessage      = ref('')
const tempSelectedCOA   = ref([])
const selectedCOAs      = ref([])
const coaList           = ref([])
const searchAccountCode = ref('')
const searchAccountName = ref('')
const downloadingExcel  = ref(false)
const toast = ref({ show: false, type: 'success', message: '' })

// ── API Config ────────────────────────────────────────────────────────────────
const BASE_URL = window.APP_CONFIG?.API_BASE_URL || '/openbravo/'
const USERNAME = 'APIService'
const PASSWORD = 'wrt'
const token    = btoa(`${USERNAME}:${PASSWORD}`)
const API_PATH = 'org.openbravo.service.json.jsonrest'

const MappingNameTable = {
  '318':                              'Invoice',
  '319':                              'MaterialMgmtShipmentInOut',
  '320':                              'MaterialMgmtShipmentInOutLine',
  'D1A97202E832470285C9B1EB026D54E2': 'FIN_Payment',
  '224':                              'FinancialMgmtGLJournal',
  '539':                              'FinancialMgmtAsset',
  '800060':                           'FinancialMgmtAmortization',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const authHeader = () => ({
  Authorization: `Basic ${token}`,
  'Content-Type': 'application/json',
})

const apiGet = (path) =>
  fetch(`${BASE_URL}${API_PATH}${path}`, { headers: authHeader() })

const showToast = (type, message) => {
  toast.value = { show: true, type, message }
  setTimeout(() => { toast.value.show = false }, 3500)
}

// ── Computed ──────────────────────────────────────────────────────────────────
const isAllCOASelected = computed(() =>
  filteredCOAList.value.length > 0 &&
  filteredCOAList.value.every(c => tempSelectedCOA.value.includes(c.accountId))
)

const filteredCOAList = computed(() => {
  let list = coaList.value
  if (searchAccountCode.value)
    list = list.filter(c => c.accountCode.toLowerCase().includes(searchAccountCode.value.toLowerCase()))
  if (searchAccountName.value)
    list = list.filter(c => c.accountName.toLowerCase().includes(searchAccountName.value.toLowerCase()))
  return list
})

// ── Formatters ────────────────────────────────────────────────────────────────
const getAccountType = (type) => ({
  A: 'Asset', L: 'Liability', O: "Owner's Equity",
  R: 'Revenue', E: 'Expense', M: 'Memo',
}[type] || type)

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 2 }).format(amount)

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })

const formatDateDisplay = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const formatDateForFilename = (dateString) => {
  const d = new Date(dateString)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

// ── Fetch COA List ────────────────────────────────────────────────────────────
const fetchCOAList = async () => {
  if (!dateFrom.value || !dateTo.value) {
    errorMessage.value = 'Please select a date from and date to first!'
    return
  }
  if (dateFrom.value > dateTo.value) {
    errorMessage.value = 'Date from must be earlier than date to!'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const res = await apiGet('/FinancialMgmtElementValue?_orderBy=searchKey asc')
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
    const data = await res.json()

    if (!data.response?.data) throw new Error('Invalid response structure')

    coaList.value = data.response.data.map(item => ({
      accountId:      item.id,
      accountCode:    item.searchKey,
      accountName:    item.name,
      description:    item.description || '-',
      accountType:    item.accountType,
      accountSign:    item.accountSign,
      active:         item.active,
      totalDebit:     0,
      totalCredit:    0,
      balance:        0,
      openingBalance: 0,
      closingBalance: 0,
      transactions:   [],
    }))

    if (coaList.value.length === 0) {
      errorMessage.value = 'No COA data found'
      return
    }

    tempSelectedCOA.value = []
    showModal.value = true
  } catch (err) {
    console.error(err)
    errorMessage.value = `Failed to fetch data: ${err.message}`
  } finally {
    loading.value = false
  }
}

// ── Toggle Helpers ────────────────────────────────────────────────────────────
const toggleCOASelection = (id) => {
  const idx = tempSelectedCOA.value.indexOf(id)
  if (idx === -1) tempSelectedCOA.value.push(id)
  else tempSelectedCOA.value.splice(idx, 1)
}

const toggleAllCOA = (e) => {
  const ids = filteredCOAList.value.map(c => c.accountId)
  if (e.target.checked) {
    tempSelectedCOA.value = [...new Set([...tempSelectedCOA.value, ...ids])]
  } else {
    tempSelectedCOA.value = tempSelectedCOA.value.filter(id => !ids.includes(id))
  }
}

// ── Confirm & Fetch Transactions ──────────────────────────────────────────────
const confirmCOASelection = async () => {
  if (tempSelectedCOA.value.length === 0) {
    errorMessage.value = 'Please select at least one COA'
    return
  }

  loading.value = true
  errorMessage.value = ''

  selectedCOAs.value = coaList.value.filter(c => tempSelectedCOA.value.includes(c.accountId))
  const docDetailCache = {}

  try {
    for (const coa of selectedCOAs.value) {
      // 1. Opening balance
      const openRes = await apiGet(
        `/FinancialMgmtAccountingFact?_where=account='${coa.accountId}' AND accountingDate<'${dateFrom.value}'&_orderBy=accountingDate`
      )
      if (openRes.ok) {
        const openData = await openRes.json()
        calculateOpeningBalance(openData, coa)
      } else {
        coa.openingBalance = 0
      }

      // 2. Period transactions
      const res = await apiGet(
        `/FinancialMgmtAccountingFact?_where=account='${coa.accountId}' AND accountingDate>='${dateFrom.value}' AND accountingDate<='${dateTo.value}'&_orderBy=accountingDate`
      )
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data = await res.json()
      const records = data.response.data || []

      // 3. Enrich with document details (cached)
      for (const record of records) {
        const mappingName = MappingNameTable[record.table] || null
        record.mappingName = mappingName
        if (!mappingName) continue

        const cacheKey = `${mappingName}::${record.recordID}`
        if (docDetailCache[cacheKey]) {
          record.documentDetail = docDetailCache[cacheKey]
        } else {
          try {
            const detailRes = await apiGet(
              `/${mappingName}?_where=id='${record.recordID}'&_selectedProperties=description&_includeChildren=false`
            )
            if (detailRes.ok) {
              const detailData = await detailRes.json()
              docDetailCache[cacheKey] = detailData
              record.documentDetail = detailData
            }
          } catch (e) {
            console.warn('Detail fetch failed:', record.recordID, e)
          }
        }
      }

      processTransactionData(data, coa)
      coa.closingBalance = (coa.openingBalance || 0) + coa.balance
    }

    closeModal()
    activeTab.value = 'result'
    showToast('success', `Data for ${selectedCOAs.value.length} account(s) loaded successfully`)
  } catch (err) {
    console.error(err)
    errorMessage.value = `Failed to fetch transaction data: ${err.message}`
    showToast('error', 'Failed to fetch transaction data')
  } finally {
    loading.value = false
  }
}

// ── Data Processors ───────────────────────────────────────────────────────────
const calculateOpeningBalance = (data, coa) => {
  if (!data?.response?.data?.length) { coa.openingBalance = 0; return }
  let d = 0, c = 0
  data.response.data.forEach(item => { d += item.debit || 0; c += item.credit || 0 })
  coa.openingBalance = d - c
}

const processTransactionData = (data, coa) => {
  if (!data?.response?.data) { coa.transactions = []; return }
  coa.totalDebit = 0; coa.totalCredit = 0

  const transactions = data.response.data.map(item => ({
    id:                item.id,
    date:              item.accountingDate,
    accountingDate:    item.accountingDate,
    period:            item.period$_identifier,
    documentNo:        item.description?.split('#')[0] || '-',
    debit:             item.debit || 0,
    credit:            item.credit || 0,
    description:       item.description?.split('#')[1]?.match(/\(([^)]+)\)/)?.[1] || '-',
    descriptionHeader: item.documentDetail?.response?.data?.[0]?.description || '-',
    accountCode:       item.value,
    partner:           item.businessPartner$_identifier?.split('-')[1] || '-',
    runningBalance:    0,
  }))

  transactions.sort((a, b) => new Date(a.accountingDate) - new Date(b.accountingDate))

  let runningBalance = coa.openingBalance || 0
  transactions.forEach(t => {
    coa.totalDebit  += t.debit
    coa.totalCredit += t.credit
    runningBalance  += t.debit - t.credit
    t.runningBalance = runningBalance
  })

  coa.balance      = coa.totalDebit - coa.totalCredit
  coa.transactions = transactions
}

// ── Modal ─────────────────────────────────────────────────────────────────────
const closeModal = () => {
  showModal.value         = false
  searchAccountCode.value = ''
  searchAccountName.value = ''
}

// ── Excel Download (styled with ExcelJS) ──────────────────────────────────────
const downloadExcel = async () => {
  if (!selectedCOAs.value.length) return
  downloadingExcel.value = true
  try {
    // Load ExcelJS from CDN
    await loadScript('https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js')
    const ExcelJS = window.ExcelJS

    const workbook = new ExcelJS.Workbook()
    workbook.creator  = 'NexERP Financial Management'
    workbook.created  = new Date()

    const orgName   = 'NexERP'
    const currency  = 'IDR'
    const yearLabel = new Date(dateFrom.value).getFullYear().toString()
    const periodLabel = `${formatDateDisplay(dateFrom.value)}  —  ${formatDateDisplay(dateTo.value)}`

    // ── Color palette ──
    const C = {
      headerBg:    '1E3A5F',   // dark navy — title row
      headerFg:    'FFFFFF',
      subHeaderBg: '2563EB',   // blue — column headers
      subHeaderFg: 'FFFFFF',
      coaBg:       'EFF6FF',   // light blue — COA account bar
      coaFg:       '1D4ED8',
      metaBg:      'F8FAFC',   // light grey — meta info rows
      openingBg:   'FFF7ED',   // warm — opening balance
      openingFg:   'C2410C',
      totalBg:     'F0FDF4',   // green tint — total row
      totalFg:     '15803D',
      debitFg:     '16A34A',   // green text — debit
      creditFg:    'DC2626',   // red text — credit
      balanceFg:   '1E40AF',   // blue — balance
      borderColor: 'CBD5E1',
      altRow:      'F8FAFF',   // very light blue alternate row
      white:       'FFFFFF',
    }

    // ── Helpers ──
    const numFmt   = '#,##0.00'
    const thinBorder = (color = C.borderColor) => ({
      top:    { style: 'thin', color: { argb: color } },
      bottom: { style: 'thin', color: { argb: color } },
      left:   { style: 'thin', color: { argb: color } },
      right:  { style: 'thin', color: { argb: color } },
    })
    const medBorder = (color = C.borderColor) => ({
      top:    { style: 'medium', color: { argb: color } },
      bottom: { style: 'medium', color: { argb: color } },
      left:   { style: 'medium', color: { argb: color } },
      right:  { style: 'medium', color: { argb: color } },
    })

    const applyStyle = (row, style) => {
      row.eachCell({ includeEmpty: true }, cell => {
        if (style.fill)   cell.fill   = style.fill
        if (style.font)   cell.font   = { ...cell.font, ...style.font }
        if (style.border) cell.border = style.border
        if (style.alignment) cell.alignment = style.alignment
      })
    }

    const setCellStyle = (cell, style) => {
      if (style.fill)      cell.fill      = style.fill
      if (style.font)      cell.font      = style.font
      if (style.border)    cell.border    = style.border
      if (style.alignment) cell.alignment = style.alignment
      if (style.numFmt)    cell.numFmt    = style.numFmt
    }

    const solidFill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })

    // ── One sheet per COA ──
    for (const coa of selectedCOAs.value) {
      const sheetName = coa.accountCode.replace(/[/\\?*[\]]/g, '_').substring(0, 31)
      const ws = workbook.addWorksheet(sheetName, {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
        views: [{ state: 'frozen', xSplit: 0, ySplit: 8 }], // freeze header rows
      })

      // ── Column widths (A–L) ──
      ws.columns = [
        { key: 'date',    width: 14 },
        { key: 'period',  width: 14 },
        { key: 'docNo',   width: 22 },
        { key: 'account', width: 16 },
        { key: 'partner', width: 22 },
        { key: 'descH',   width: 38 },
        { key: 'descL',   width: 38 },
        { key: 'pad',     width: 4  },
        { key: 'debit',   width: 20 },
        { key: 'credit',  width: 20 },
        { key: 'balance', width: 20 },
      ]

      const COLS = 11  // A–K
      const lastCol = 'K'

      // ══ ROW 1: Big Title ══
      const r1 = ws.addRow([`GENERAL LEDGER  ·  ${orgName}  ·  ${currency}`])
      ws.mergeCells(`A1:${lastCol}1`)
      r1.height = 32
      applyStyle(r1, {
        fill: solidFill(C.headerBg),
        font: { name: 'Calibri', bold: true, size: 14, color: { argb: C.headerFg } },
        alignment: { vertical: 'middle', horizontal: 'center' },
        border: thinBorder(C.headerBg),
      })

      // ══ ROW 2: Meta label row ══
      const r2 = ws.addRow(['Fiscal Year', '', 'Period', '', '', 'Accounts', '', '', 'Generated', '', ''])
      r2.height = 16
      applyStyle(r2, {
        fill: solidFill(C.metaBg),
        font: { name: 'Calibri', bold: true, size: 9, color: { argb: '64748B' } },
        alignment: { vertical: 'middle' },
        border: thinBorder(),
      })
      ;['A2','C2','F2','I2'].forEach(addr => {
        ws.getCell(addr).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      })

      // ══ ROW 3: Meta value row ══
      const r3 = ws.addRow([yearLabel, '', periodLabel, '', '', selectedCOAs.value.map(c => c.accountCode).join(', '), '', '', new Date().toLocaleDateString('en-GB'), '', ''])
      r3.height = 18
      applyStyle(r3, {
        fill: solidFill(C.white),
        font: { name: 'Calibri', bold: false, size: 10, color: { argb: '1E293B' } },
        border: thinBorder(),
        alignment: { vertical: 'middle' },
      })
      ws.mergeCells('C3:E3')
      ws.mergeCells('F3:H3')
      ;['A3','C3','F3','I3'].forEach(addr => {
        ws.getCell(addr).font = { name: 'Calibri', bold: true, size: 10, color: { argb: '1E293B' } }
        ws.getCell(addr).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      })

      // ══ ROW 4: blank spacer ══
      const r4 = ws.addRow([])
      r4.height = 8
      applyStyle(r4, { fill: solidFill(C.white), border: thinBorder(C.white) })

      // ══ ROW 5: COA Account Header ══
      const r5 = ws.addRow([`${coa.accountCode}   ${coa.accountName}   (${getAccountType(coa.accountType)})`])
      ws.mergeCells(`A5:${lastCol}5`)
      r5.height = 26
      applyStyle(r5, {
        fill: solidFill(C.coaBg),
        font: { name: 'Calibri', bold: true, size: 12, color: { argb: C.coaFg } },
        alignment: { vertical: 'middle', horizontal: 'left', indent: 2 },
        border: medBorder('BFDBFE'),
      })

      // ══ ROW 6: Balance summary bar ══
      const r6 = ws.addRow([
        'Opening Balance', '', '',
        'Total Debit', '', '',
        'Total Credit', '', '',
        'Closing Balance', '',
      ])
      r6.height = 16
      applyStyle(r6, {
        fill: solidFill(C.metaBg),
        font: { name: 'Calibri', bold: true, size: 9, color: { argb: '64748B' } },
        alignment: { vertical: 'middle', horizontal: 'center' },
        border: thinBorder(),
      })

      // ══ ROW 7: Balance values ══
      const r7 = ws.addRow([
        coa.openingBalance, '', '',
        coa.totalDebit, '', '',
        coa.totalCredit, '', '',
        coa.closingBalance, '',
      ])
      r7.height = 20
      applyStyle(r7, {
        fill: solidFill(C.white),
        font: { name: 'Calibri', bold: true, size: 11 },
        alignment: { vertical: 'middle', horizontal: 'center' },
        border: thinBorder(),
      })
      ws.getCell('A7').numFmt = numFmt
      ws.getCell('A7').font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'C2410C' } }
      ws.getCell('D7').numFmt = numFmt
      ws.getCell('D7').font = { name: 'Calibri', bold: true, size: 11, color: { argb: C.debitFg } }
      ws.getCell('G7').numFmt = numFmt
      ws.getCell('G7').font = { name: 'Calibri', bold: true, size: 11, color: { argb: C.creditFg } }
      ws.getCell('J7').numFmt = numFmt
      ws.getCell('J7').font = { name: 'Calibri', bold: true, size: 11, color: { argb: C.balanceFg } }
      ws.mergeCells('A6:C6'); ws.mergeCells('D6:F6'); ws.mergeCells('G6:I6'); ws.mergeCells('J6:K6')
      ws.mergeCells('A7:C7'); ws.mergeCells('D7:F7'); ws.mergeCells('G7:I7'); ws.mergeCells('J7:K7')

      // ══ ROW 8: Column Headers ══
      const r8 = ws.addRow(['Date', 'Period', 'Document No', 'Account', 'Partner', 'Description Header', 'Description Line', '', 'Debit', 'Credit', 'Balance'])
      r8.height = 22
      applyStyle(r8, {
        fill: solidFill(C.subHeaderBg),
        font: { name: 'Calibri', bold: true, size: 10, color: { argb: C.subHeaderFg } },
        alignment: { vertical: 'middle', horizontal: 'center', wrapText: false },
        border: thinBorder(C.subHeaderBg),
      })
      // Left-align text columns
      ;['A8','B8','C8','D8','E8','F8','G8'].forEach(addr => {
        ws.getCell(addr).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      })
      // Right-align number columns
      ;['I8','J8','K8'].forEach(addr => {
        ws.getCell(addr).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
      })

      // ══ ROW 9: Initial Balance ══
      const r9 = ws.addRow(['', '', '', '', '', 'Initial Balance', '', '', 
        coa.openingBalance > 0 ? coa.openingBalance : 0,
        coa.openingBalance < 0 ? Math.abs(coa.openingBalance) : 0,
        coa.openingBalance,
      ])
      r9.height = 18
      applyStyle(r9, {
        fill: solidFill(C.openingBg),
        font: { name: 'Calibri', bold: true, size: 10, color: { argb: C.openingFg } },
        alignment: { vertical: 'middle' },
        border: thinBorder(),
      })
      ;['I9','J9','K9'].forEach(addr => {
        ws.getCell(addr).numFmt    = numFmt
        ws.getCell(addr).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
      })
      ws.getCell('F9').alignment = { vertical: 'middle', horizontal: 'left', bold: true, indent: 1 }

      // ══ Transaction rows ══
      let rowIdx = 10
      coa.transactions.forEach((t, i) => {
        const isAlt = i % 2 === 1
        const row = ws.addRow([
          t.date ? new Date(t.date) : '',
          t.period || '',
          t.documentNo || '',
          t.accountCode || coa.accountCode,
          t.partner && t.partner !== '-' ? t.partner : '',
          t.descriptionHeader && t.descriptionHeader !== '-' ? t.descriptionHeader : '',
          t.description && t.description !== '-' ? t.description : '',
          '',
          t.debit  || 0,
          t.credit || 0,
          t.runningBalance,
        ])
        row.height = 18

        applyStyle(row, {
          fill: solidFill(isAlt ? C.altRow : C.white),
          font: { name: 'Calibri', size: 10, color: { argb: '374151' } },
          border: thinBorder(),
          alignment: { vertical: 'middle' },
        })

        // Date cell — format as date
        const dateCell = ws.getCell(`A${rowIdx}`)
        dateCell.numFmt    = 'dd mmm yyyy'
        dateCell.alignment = { vertical: 'middle', horizontal: 'center' }

        // Period
        ws.getCell(`B${rowIdx}`).alignment = { vertical: 'middle', horizontal: 'center' }

        // Document No — mono feel with light blue
        const docCell = ws.getCell(`C${rowIdx}`)
        docCell.font      = { name: 'Courier New', size: 9, bold: true, color: { argb: '1D4ED8' } }
        docCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
        docCell.fill      = solidFill(isAlt ? 'E8F0FE' : 'EFF6FF')

        // Text columns — left align
        ;['D','E','F','G'].forEach(col => {
          ws.getCell(`${col}${rowIdx}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
        })

        // Debit
        const debitCell = ws.getCell(`I${rowIdx}`)
        debitCell.numFmt    = numFmt
        debitCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
        if (t.debit > 0) debitCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.debitFg } }
        else { debitCell.value = null; debitCell.value = '—'; debitCell.font = { name: 'Calibri', size: 10, color: { argb: 'CBD5E1' } } }

        // Credit
        const creditCell = ws.getCell(`J${rowIdx}`)
        creditCell.numFmt    = numFmt
        creditCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
        if (t.credit > 0) creditCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.creditFg } }
        else { creditCell.value = null; creditCell.value = '—'; creditCell.font = { name: 'Calibri', size: 10, color: { argb: 'CBD5E1' } } }

        // Balance
        const balCell = ws.getCell(`K${rowIdx}`)
        balCell.numFmt    = numFmt
        balCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
        balCell.font      = { name: 'Calibri', size: 10, bold: true, color: { argb: C.balanceFg } }

        rowIdx++
      })

      // ══ Total Row ══
      const totalD = (coa.openingBalance > 0 ? coa.openingBalance : 0) + coa.totalDebit
      const totalC = (coa.openingBalance < 0 ? Math.abs(coa.openingBalance) : 0) + coa.totalCredit
      const rTot = ws.addRow(['', '', '', '', '', 'TOTAL', '', '', totalD, totalC, coa.closingBalance])
      rTot.height = 22
      applyStyle(rTot, {
        fill: solidFill(C.totalBg),
        font: { name: 'Calibri', bold: true, size: 11, color: { argb: C.totalFg } },
        border: medBorder('86EFAC'),
        alignment: { vertical: 'middle' },
      })
      ws.getCell(`F${rowIdx}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      ;[`I${rowIdx}`,`J${rowIdx}`,`K${rowIdx}`].forEach(addr => {
        ws.getCell(addr).numFmt    = numFmt
        ws.getCell(addr).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
      })
      ws.getCell(`I${rowIdx}`).font = { name: 'Calibri', bold: true, size: 11, color: { argb: C.debitFg } }
      ws.getCell(`J${rowIdx}`).font = { name: 'Calibri', bold: true, size: 11, color: { argb: C.creditFg } }
      ws.getCell(`K${rowIdx}`).font = { name: 'Calibri', bold: true, size: 11, color: { argb: C.balanceFg } }
    }

    // ── Write & download ──
    const buffer   = await workbook.xlsx.writeBuffer()
    const blob     = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url      = URL.createObjectURL(blob)
    const a        = document.createElement('a')
    a.href         = url
    a.download     = `GL_Report_${dateFrom.value.replace(/-/g,'')}_to_${dateTo.value.replace(/-/g,'')}.xlsx`
    a.click()
    URL.revokeObjectURL(url)

    showToast('success', 'Excel file downloaded successfully')
  } catch (err) {
    console.error(err)
    showToast('error', 'Failed to generate Excel file: ' + err.message)
  } finally {
    downloadingExcel.value = false
  }
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
*, *::before, *::after { box-sizing: border-box; }

.page-wrap {
  min-height: 100vh;
  background: #f0f2f5;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

/* ── Card ── */
.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04);
  overflow: hidden;
}
.card-title-row { padding: 24px 28px 0; }
.card-title {
  font-size: 22px; font-weight: 700; color: #1a1a2e;
  margin: 0; letter-spacing: -.3px;
}

/* ── Tabs ── */
.tabs {
  display: flex;
  padding: 0 28px;
  margin-top: 16px;
  border-bottom: 2px solid #f0f2f5;
}
.tab {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 10px 4px; margin-right: 24px;
  background: none; border: none;
  border-bottom: 2px solid transparent; margin-bottom: -2px;
  font-size: 14px; font-weight: 500; color: #6b7280;
  cursor: pointer; transition: color .15s, border-color .15s;
  font-family: inherit; white-space: nowrap;
}
.tab:hover:not(:disabled) { color: #374151; }
.tab--active { color: #2563eb; border-bottom-color: #2563eb; font-weight: 600; }
.tab:disabled { opacity: .4; cursor: not-allowed; }
.tab-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 5px;
  background: #2563eb; color: #fff; border-radius: 9px;
  font-size: 11px; font-weight: 700;
}

/* ── Toolbar ── */
.toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 28px; gap: 12px;
  border-bottom: 1px solid #f0f2f5; flex-wrap: wrap;
}
.toolbar-left  { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.toolbar-right { display: flex; align-items: center; gap: 8px; }

/* ── Field Group ── */
.field-group { display: flex; flex-direction: column; gap: 4px; }
.field-label {
  font-size: 11.5px; font-weight: 600; color: #6b7280;
  text-transform: uppercase; letter-spacing: .04em;
}
.field-input {
  height: 38px; padding: 0 12px;
  border: 1.5px solid #e5e7eb; border-radius: 8px;
  font-size: 13.5px; color: #111827;
  outline: none; transition: border-color .15s, box-shadow .15s;
  font-family: inherit; background: #fff; min-width: 155px;
}
.field-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.1); }

/* ── Result Info ── */
.result-info { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #6b7280; }
.result-count-badge {
  padding: 2px 9px; background: #eff6ff; color: #1d4ed8;
  border-radius: 20px; font-size: 12px; font-weight: 600;
}

/* ── Buttons ── */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 38px; padding: 0 16px;
  border-radius: 8px; border: none;
  font-size: 13.5px; font-weight: 600;
  cursor: pointer; transition: all .15s;
  font-family: inherit; white-space: nowrap;
}
.btn--primary { background: #2563eb; color: #fff; }
.btn--primary:hover:not(:disabled) { background: #1d4ed8; }
.btn--primary:disabled { opacity: .55; cursor: not-allowed; }
.btn--ghost { background: transparent; color: #374151; border: 1.5px solid #e5e7eb; }
.btn--ghost:hover { background: #f9fafb; }
.btn--outline { background: transparent; color: #2563eb; border: 1.5px solid #bfdbfe; }
.btn--outline:hover { background: #eff6ff; }
.btn--excel { background: #16a34a; color: #fff; }
.btn--excel:hover:not(:disabled) { background: #15803d; }
.btn--excel:disabled { opacity: .55; cursor: not-allowed; }

/* ── Alert ── */
.alert-error {
  display: flex; align-items: center; gap: 8px;
  margin: 12px 28px 0; padding: 10px 14px;
  background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 8px; color: #dc2626;
  font-size: 13px; font-weight: 500;
}

/* ── Empty hint ── */
.empty-hint {
  display: flex; flex-direction: column; align-items: center;
  padding: 56px 28px; text-align: center; color: #9ca3af;
}
.empty-hint svg { margin-bottom: 14px; opacity: .45; }
.empty-hint p { font-size: 13.5px; line-height: 1.6; max-width: 320px; margin: 0; }
.empty-hint strong { color: #374151; }

/* ── Summary section ── */
.summary-section { padding: 20px 28px 24px; }
.summary-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.summary-period { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #374151; font-weight: 500; }
.summary-count-badge {
  padding: 2px 9px; background: #f0fdf4; color: #16a34a;
  border: 1px solid #bbf7d0; border-radius: 20px; font-size: 12px; font-weight: 600;
}
.summary-coa-list { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 16px; }
.summary-coa-row {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 14px; border-bottom: 1px solid #f3f4f6; font-size: 13px;
}
.summary-coa-row:last-child { border-bottom: none; }
.coa-name-text { color: #111827; font-weight: 500; flex: 1; }
.coa-type-text { color: #9ca3af; font-size: 12px; }
.summary-actions { display: flex; gap: 8px; }

/* ── COA Blocks ── */
.coa-blocks { display: flex; flex-direction: column; }
.coa-block { border-bottom: 1px solid #f0f2f5; }
.coa-block:last-child { border-bottom: none; }

/* ── COA Bar ── */
.coa-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 12px 28px; background: #f8faff; border-bottom: 1px solid #e8edf5; flex-wrap: wrap;
}
.coa-bar-left { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
.coa-bar-name { font-size: 14px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.coa-bar-type { font-size: 11.5px; color: #6b7280; padding: 2px 8px; background: #f3f4f6; border-radius: 4px; white-space: nowrap; }
.coa-bar-stats { display: flex; align-items: center; flex-shrink: 0; }
.stat-item { display: flex; flex-direction: column; align-items: flex-end; padding: 0 14px; }
.stat-label { font-size: 10.5px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.stat-value { font-size: 13px; font-weight: 700; color: #111827; white-space: nowrap; }
.stat-value--debit   { color: #16a34a; }
.stat-value--credit  { color: #dc2626; }
.stat-value--closing { color: #2563eb; font-size: 14px; }
.stat-sep { color: #d1d5db; font-size: 16px; user-select: none; }

/* ── Table ── */
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table thead tr { background: #f9fafb; }
.table th {
  padding: 10px 16px; text-align: left;
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .06em; color: #6b7280;
  border-bottom: 1.5px solid #e5e7eb; white-space: nowrap;
}
.table td { padding: 11px 16px; color: #374151; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
.tr-row:last-child td { border-bottom: none; }
.tr-row:hover td { background: #f9fafb; }
.tr-sel { cursor: pointer; }
.tr-sel:hover td { background: #f0f7ff; }

.th-r, .td-r  { text-align: right !important; }
.th-c, .td-c  { text-align: center !important; }
.th-chk, .td-chk { width: 44px; text-align: center !important; }

.td-empty { text-align: center; padding: 36px 16px; color: #9ca3af; font-size: 13px; }
.td-date  { white-space: nowrap; font-size: 12.5px; color: #6b7280; }
.td-muted { color: #6b7280; font-size: 12.5px; }
.td-clip  { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.td-name  { font-weight: 500; color: #111827; }
.td-debit  { color: #16a34a; font-weight: 600; font-size: 12.5px; }
.td-credit { color: #dc2626; font-weight: 600; font-size: 12.5px; }
.td-balance { color: #111827; font-weight: 700; font-size: 12.5px; }

/* ── Badges ── */
.coa-code-badge {
  display: inline-block; padding: 2px 8px;
  background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 5px;
  font-size: 11.5px; font-family: 'JetBrains Mono','Fira Code',monospace;
  color: #1d4ed8; font-weight: 700; white-space: nowrap; flex-shrink: 0;
}
.doc-pill {
  display: inline-block; padding: 2px 7px;
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px;
  font-size: 11.5px; font-family: 'JetBrains Mono','Fira Code',monospace;
  color: #475569; font-weight: 600; white-space: nowrap;
}
.type-pill {
  display: inline-block; padding: 2px 9px;
  background: #f0f9ff; color: #0369a1; border-radius: 20px;
  font-size: 11.5px; font-weight: 600;
}
.status-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 20px;
  font-size: 11.5px; font-weight: 600; white-space: nowrap;
}
.status-pill--on  { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
.status-pill--off { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.chk { width: 15px; height: 15px; accent-color: #2563eb; cursor: pointer; }

/* ── Modal ── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(15,23,42,.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 20px; backdrop-filter: blur(3px);
}
.modal {
  background: #fff; border-radius: 12px;
  box-shadow: 0 24px 64px rgba(0,0,0,.18);
  width: 100%; max-width: 800px;
  overflow: hidden; display: flex; flex-direction: column; max-height: 88vh;
}
.modal-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 18px 22px 14px; border-bottom: 1px solid #f0f2f5;
  gap: 12px; flex-shrink: 0;
}
.modal-breadcrumb { display: flex; align-items: center; gap: 4px; font-size: 11.5px; color: #9ca3af; margin-bottom: 3px; }
.bc-active { color: #2563eb; font-weight: 600; }
.modal-title { font-size: 15px; font-weight: 700; color: #111827; }
.modal-close {
  background: none; border: none; color: #9ca3af;
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 7px; cursor: pointer;
  transition: background .12s; flex-shrink: 0;
}
.modal-close:hover { background: #f3f4f6; color: #374151; }
.modal-body { padding: 16px 22px; overflow-y: auto; flex: 1; }
.modal-footer {
  padding: 14px 22px; border-top: 1px solid #f0f2f5;
  display: flex; justify-content: space-between; align-items: center;
  gap: 12px; flex-shrink: 0; background: #f9fafb;
}
.modal-footer-btns { display: flex; gap: 8px; }
.sel-count { font-size: 13px; font-weight: 600; color: #2563eb; }

.modal-search-row { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.search-wrap { position: relative; flex: 1; min-width: 160px; }
.search-ico { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; }
.search-inp {
  width: 100%; height: 36px; padding: 0 12px 0 32px;
  border: 1.5px solid #e5e7eb; border-radius: 8px;
  font-size: 13px; color: #111827; background: #fff;
  outline: none; transition: border-color .15s; font-family: inherit;
}
.search-inp:focus { border-color: #2563eb; }
.modal-meta { font-size: 12.5px; color: #6b7280; margin-bottom: 10px; }
.modal-table-wrap { border: 1.5px solid #e5e7eb; border-radius: 8px; overflow: hidden; max-height: 420px; overflow-y: auto; }

/* ── Spinner ── */
.spinner {
  width: 13px; height: 13px;
  border: 2px solid rgba(255,255,255,.35); border-top-color: #fff;
  border-radius: 50%; animation: spin .6s linear infinite; flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Toast ── */
.toast {
  position: fixed; bottom: 24px; right: 24px; z-index: 2000;
  display: flex; align-items: center; gap: 8px;
  padding: 12px 18px; border-radius: 8px;
  font-size: 13px; font-weight: 500; box-shadow: 0 8px 24px rgba(0,0,0,.18);
}
.toast--success { background: #16a34a; color: #fff; }
.toast--error   { background: #dc2626; color: #fff; }

/* ── Transitions ── */
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── Scrollbar ── */
.modal-table-wrap::-webkit-scrollbar,
.modal-body::-webkit-scrollbar { width: 6px; height: 6px; }
.modal-table-wrap::-webkit-scrollbar-track,
.modal-body::-webkit-scrollbar-track { background: #f1f5f9; }
.modal-table-wrap::-webkit-scrollbar-thumb,
.modal-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 6px; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .page-wrap { padding: 12px; }
  .card-title-row, .tabs { padding-left: 16px; padding-right: 16px; }
  .toolbar { padding: 12px 16px; }
  .toolbar-left { flex-direction: column; align-items: stretch; }
  .field-input { min-width: unset; width: 100%; }
  .coa-bar { flex-direction: column; align-items: flex-start; padding: 12px 16px; }
  .coa-bar-stats { flex-wrap: wrap; gap: 4px; }
  .stat-item { align-items: flex-start; padding: 4px 8px; }
  .stat-sep { display: none; }
  .summary-section { padding: 16px; }
}
</style>