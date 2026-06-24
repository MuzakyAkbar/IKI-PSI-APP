<template>
  <div class="layout">
    <main class="main">
      <div class="content-card">

        <div class="page-header">
          <h2 class="page-title">COA</h2>
        </div>

        <div class="toolbar">
          <div class="search-wrap">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input v-model="searchQuery" class="search-input" placeholder="Cari COA..." @input="onSearch" />
          </div>
          <button class="btn btn--primary" @click="openCreateModal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Buat COA
          </button>
        </div>

        <div class="table-wrap">
          <table class="table">
            <colgroup>
              <col style="width:130px">
              <col style="width:22%">
              <col style="width:11%">
              <col style="width:11%">
              <col style="width:11%">
              <col style="width:11%">
              <col>
              <col style="width:140px">
            </colgroup>
            <thead><tr>
              <th class="sortable" :class="sortClass('searchKey')" @click="toggleSort('searchKey')">No. COA</th>
              <th class="sortable" :class="sortClass('name')" @click="toggleSort('name')">Nama COA</th>
              <th>Tanda Akun</th>
              <th>Tingkat Elemen</th>
              <th>Tipe Akun</th>
              <th>Status</th>
              <th>Deskripsi</th>
              <th class="th-action">Tindakan</th>
            </tr></thead>
            <tbody>
              <tr v-if="loading"><td colspan="8" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
              <tr v-else-if="error"><td colspan="8" class="td-empty td-error">{{ error }}</td></tr>
              <tr v-else-if="filteredRows.length===0"><td colspan="8" class="td-empty">Tidak ada rekam COA yang ditemukan.</td></tr>
              <template v-else>
                <tr v-for="r in pagedRows" :key="r.id" class="tr-data">
                  <td><span class="code-badge">{{ r.searchKey }}</span></td>
                  <td class="td-name">
                    <span class="td-name-text">{{ r.name }}</span>
                    <span :class="['status-dot', r.active?'status-dot--active':'status-dot--inactive']"></span>
                  </td>
                  <td class="td-secondary">{{ accountSignLabel(r.accountSign) }}</td>
                  <td class="td-secondary">{{ elementLevelLabel(r.elementLevel) }}</td>
                  <td><span class="type-badge">{{ accountTypeLabel(r.accountType) }}</span></td>
                  <td><span :class="['status-pill', r.active?'status-pill--active':'status-pill--inactive']">{{ r.active?'Aktif':'Tidak Aktif' }}</span></td>
                  <td class="td-secondary td-clip">{{ r.description || '—' }}</td>
                  <td class="td-action-cell">
                    <div class="action-group">
                      <div class="dropdown-wrap" v-click-outside="closeDropdown">
                        <button class="action-btn action-btn--more" @click.stop="toggleDropdown(r.id, $event)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                        <div v-if="openDropdown===r.id" class="dropdown-menu" :style="{top: dropdownPos.top+'px', right: dropdownPos.right+'px'}">
                          <button class="dropdown-item" @click="openViewModal(r)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Melihat
                          </button>
                          <button class="dropdown-item" @click="openEditModal(r); closeDropdown()">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Sunting
                          </button>
                          <button v-if="r.active" class="dropdown-item dropdown-item--danger" @click="confirmDelete(r); closeDropdown()">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Menghapus
                          </button>
                          <button v-else class="dropdown-item dropdown-item--success" @click="confirmSetActive(r); closeDropdown()">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>Tetapkan Sebagai Aktif
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination-bar">
          <div class="pagination-left">
            <span class="pagination-info">
              <template v-if="filteredRows.length > 0">
                Menampilkan {{ paginationFrom }}–{{ paginationTo }} dari {{ filteredRows.length }} data
              </template>
              <template v-else>Tidak ada data</template>
            </span>
            <div class="rows-per-page">
              <label class="rows-label">Baris per halaman:</label>
              <select class="rows-select" v-model="pageSize" @change="onPageSizeChange">
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </div>
          </div>
          <div class="pagination" v-if="totalPages > 1">
            <button class="page-btn" :disabled="currentPage===1" @click="goPage(1)" title="Halaman pertama">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
            </button>
            <button class="page-btn" :disabled="currentPage===1" @click="goPage(currentPage-1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <template v-for="p in paginationPages" :key="p">
              <span v-if="p==='...'" class="page-ellipsis">…</span>
              <button v-else :class="['page-btn', p===currentPage?'page-btn--active':'']" @click="goPage(p)">{{ p }}</button>
            </template>
            <button class="page-btn" :disabled="currentPage===totalPages" @click="goPage(currentPage+1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button class="page-btn" :disabled="currentPage===totalPages" @click="goPage(totalPages)" title="Halaman terakhir">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
            </button>
          </div>
        </div>

      </div>
    </main>

    <!-- ══ VIEW MODAL ══ -->
    <transition name="fade">
      <div v-if="viewModal.open" class="modal-overlay" @click.self="viewModal.open=false">
        <div class="modal modal--wide">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Dashboard</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span>Daftar COA</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">View COA</span>
              </div>
              <div class="modal-title">View COA</div>
            </div>
            <button class="modal-close" @click="viewModal.open=false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body" v-if="viewModal.data">
            <div class="detail-grid">
              <div class="detail-item">
                <div class="detail-label">No. COA</div>
                <div class="detail-value mono">{{ viewModal.data.searchKey }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Nama COA</div>
                <div class="detail-value">{{ viewModal.data.name }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Tanda Akun</div>
                <div class="detail-value">{{ accountSignLabel(viewModal.data.accountSign) }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Element Level</div>
                <div class="detail-value">{{ elementLevelLabel(viewModal.data.elementLevel) }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Tipe Akun</div>
                <div class="detail-value">{{ accountTypeLabel(viewModal.data.accountType) }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Status</div>
                <div class="detail-value">
                  <span :class="['status-pill', viewModal.data.active?'status-pill--active':'status-pill--inactive']">
                    {{ viewModal.data.active?'Active':'Inactive' }}
                  </span>
                </div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Element Akuntansi</div>
                <div class="detail-value">{{ viewModal.data['accountingElement$_identifier'] || '—' }}</div>
              </div>
              <div class="detail-item" style="grid-column:1/-1">
                <div class="detail-label">Deskripsi</div>
                <div class="detail-value" style="white-space:pre-wrap">{{ viewModal.data.description || '—' }}</div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--secondary" @click="viewModal.open=false">Close</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══ CREATE / EDIT MODAL ══ -->
    <transition name="fade">
      <div v-if="formModal.open" class="modal-overlay" @click.self="formModal.open=false">
        <div class="modal modal--wide">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Dashboard</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span>Daftar COA</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">{{ formModal.mode==='create'?'Create COA':'Edit COA' }}</span>
              </div>
              <div class="modal-title">{{ formModal.mode==='create'?'Create COA':'Edit COA' }}</div>
            </div>
            <button class="modal-close" @click="formModal.open=false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-grid-2">
              <div class="form-group">
                <label>NO. COA <span class="req">*</span></label>
                <input v-model="form.searchKey" placeholder="0000000" :class="{'input-error':formErrors.searchKey}" />
                <span class="field-error" v-if="formErrors.searchKey">{{ formErrors.searchKey }}</span>
              </div>
              <div class="form-group">
                <label>Level Elemen <span class="req">*</span></label>
                <select v-model="form.elementLevel" :class="{'input-error':formErrors.elementLevel}">
                  <option value="S">Subaccount</option>
                  <option value="C">Account</option>
                  <option value="D">Breakdown</option>
                  <option value="E">Heading</option>
                </select>
                <span class="field-error" v-if="formErrors.elementLevel">{{ formErrors.elementLevel }}</span>
              </div>
              <div class="form-group">
                <label>Nama COA <span class="req">*</span></label>
                <input v-model="form.name" placeholder="COA Name" :class="{'input-error':formErrors.name}" />
                <span class="field-error" v-if="formErrors.name">{{ formErrors.name }}</span>
              </div>
              <div class="form-group">
                <label>Tipe Akun <span class="req">*</span></label>
                <select v-model="form.accountType" :class="{'input-error':formErrors.accountType}">
                  <option value="">— Pilih —</option>
                  <option value="A">Asset</option>
                  <option value="E">Expense</option>
                  <option value="L">Liability</option>
                  <option value="M">Memo</option>
                  <option value="O">Owner's Equity</option>
                  <option value="R">Revenue</option>
                </select>
                <span class="field-error" v-if="formErrors.accountType">{{ formErrors.accountType }}</span>
              </div>
              <div class="form-group">
                <label>Tanda Akun <span class="req">*</span></label>
                <select v-model="form.accountSign">
                  <option value="D">Debit</option>
                  <option value="C">Credit</option>
                  <option value="N">Natural</option>
                </select>
              </div>
              <div class="form-group">
                <label>Elemen Akuntansi <span class="req">*</span></label>
                <select v-model="form.accountingElement" :class="{'input-error':formErrors.accountingElement}">
                  <option value="">— Pilih —</option>
                  <option v-for="ae in accountingElements" :key="ae.id" :value="ae.id">
                    {{ ae._identifier || ae.name }}
                  </option>
                </select>
                <span class="field-error" v-if="formErrors.accountingElement">{{ formErrors.accountingElement }}</span>
              </div>
              <div class="form-group" style="grid-column:1/-1">
                <label>Description</label>
                <input v-model="form.description" placeholder="Description" />
              </div>
            </div>
            <div class="form-checks">
              <label class="check-label"><input type="checkbox" v-model="form.active" />Active</label>
            </div>
            <div v-if="formError" class="form-api-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div>
                <div>{{ formError }}</div>
                <pre v-if="formErrorRaw" class="error-raw">{{ formErrorRaw }}</pre>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--secondary" @click="formModal.open=false">Batal</button>
            <button class="btn btn--primary" @click="submitForm" :disabled="formSaving">
              <span v-if="formSaving">Saving…</span><span v-else>Simpan</span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══ DELETE / SET ACTIVE CONFIRM MODAL ══ -->
    <transition name="fade">
      <div v-if="deleteModal.open" class="modal-overlay" @click.self="deleteModal.open=false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <div class="modal-title">{{ deleteModal.setActive ? 'Set As Active' : 'Delete COA' }}</div>
            <button class="modal-close" @click="deleteModal.open=false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-text" v-if="deleteModal.setActive">
              Set COA <strong>{{ deleteModal.row?.name }}</strong> as active?
            </p>
            <p class="delete-text" v-else>
              Apa anda yakin ingin menghapus COA <strong>{{ deleteModal.row?.name }}</strong>?
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn--secondary" @click="deleteModal.open=false">Cancel</button>
            <button :class="['btn', deleteModal.setActive?'btn--primary':'btn--danger']" @click="executeDelete" :disabled="deleteModal.saving">
              <span v-if="deleteModal.saving">Processing…</span>
              <span v-else>{{ deleteModal.setActive ? 'Set Active' : 'Delete' }}</span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══ TOAST ══ -->
    <transition name="toast">
      <div v-if="toast.show" :class="['toast', `toast--${toast.type}`]">
        <svg v-if="toast.type==='success'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ toast.message }}
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { fetchAllCOAs, fetchAccountingElements, createCOA, updateCOA, deleteCOA, setActiveCOA } from '@/services/coa.js'

// ── Sort Icon Component ────────────────────────────────
// ── State ──────────────────────────────────────────────
const allRows            = ref([])   // semua data dari API (sekali fetch)
const loading            = ref(false)
const error              = ref('')
const searchQuery        = ref('')
const currentPage        = ref(1)
const pageSize           = ref(20)
const accountingElements = ref([])

// Sort state
const sortCol = ref('searchKey')
const sortDir = ref('asc')

function sortClass(col) {
  if (sortCol.value !== col) return ''
  return sortDir.value === 'asc' ? 'asc' : 'desc'
}

function toggleSort(col) {
  if (sortCol.value === col) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortCol.value = col; sortDir.value = 'asc' }
}

// ── Filter & Sort (client-side) ────────────────────────
const filteredRows = computed(() => {
  let data = [...allRows.value]

  // Filter search
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    data = data.filter(r =>
      (r.name?.toLowerCase().includes(q)) ||
      (r.searchKey?.toLowerCase().includes(q))
    )
  }

  // Sort
  data.sort((a, b) => {
    const aVal = (a[sortCol.value] ?? '').toString().toLowerCase()
    const bVal = (b[sortCol.value] ?? '').toString().toLowerCase()
    if (aVal < bVal) return sortDir.value === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir.value === 'asc' ? 1 : -1
    return 0
  })

  return data
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value)))

const paginationFrom = computed(() =>
  filteredRows.value.length === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1
)
const paginationTo = computed(() =>
  Math.min(currentPage.value * pageSize.value, filteredRows.value.length)
)

// Slice untuk halaman aktif
const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

// Reset ke page 1 kalau filter/sort berubah
watch([searchQuery, sortCol, sortDir], () => { currentPage.value = 1 })

// Pagination dengan ellipsis
const paginationPages = computed(() => {
  const total = totalPages.value
  const cur   = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = []
  pages.push(1)
  if (cur > 3) pages.push('...')
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) pages.push(p)
  if (cur < total - 2) pages.push('...')
  pages.push(total)
  return pages
})

const goPage = (p) => {
  if (p < 1 || p > totalPages.value || p === currentPage.value) return
  currentPage.value = p
}

const onPageSizeChange = () => {
  currentPage.value = 1
}

// ── Search debounce ────────────────────────────────────
let searchTimer = null
const onSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { currentPage.value = 1 }, 200)
}

// ── Load Data (sekali fetch semua) ────────────────────
async function loadData() {
  loading.value = true
  error.value   = ''
  try {
    // Fetch semua data sekaligus (pageSize besar)
    const res = await fetchAllCOAs({
      startRow: 0,
      pageSize: 9999,
      sortBy:   'searchKey',
      sortDir:  'asc',
    })
    allRows.value     = res.data ?? []
    currentPage.value = 1
  } catch (e) {
    error.value = e?.message || 'Failed to load data'
  } finally {
    loading.value = false
  }
}

async function loadLookups() {
  try {
    accountingElements.value = await fetchAccountingElements()
  } catch (e) {
    console.warn('Failed to load accounting elements:', e)
  }
}

onMounted(() => { loadData(); loadLookups() })

// ── Label helpers ──────────────────────────────────────
const ACCOUNT_TYPES  = { A: 'Asset', L: 'Liability', O: "Owner's Equity", E: 'Expense', R: 'Revenue', M: 'Memo' }
const ACCOUNT_SIGNS  = { D: 'Debit', C: 'Credit', N: 'Natural' }
const ELEMENT_LEVELS = { C: 'Account', S: 'Subaccount', D: 'Breakdown', E: 'Heading' }

const accountTypeLabel  = (v) => ACCOUNT_TYPES[v]  || v || '—'
const accountSignLabel  = (v) => ACCOUNT_SIGNS[v]  || v || '—'
const elementLevelLabel = (v) => ELEMENT_LEVELS[v] || v || '—'

// ── Dropdown ──────────────────────────────────────────
const openDropdown = ref(null)
const dropdownPos  = ref({ top: 0, right: 0 })
const toggleDropdown = (id, e) => {
  if (openDropdown.value === id) { openDropdown.value = null; return }
  const rect = e.currentTarget.getBoundingClientRect()
  dropdownPos.value = { top: rect.bottom + 4, right: window.innerWidth - rect.right }
  openDropdown.value = id
}
const closeDropdown = () => { openDropdown.value = null }

// ── View Modal ─────────────────────────────────────────
const viewModal = ref({ open: false, data: null })
const openViewModal = (r) => { viewModal.value = { open: true, data: r }; closeDropdown() }

// ── Form Modal ─────────────────────────────────────────
const formModal    = ref({ open: false, mode: 'create', id: null })
const form         = ref({})
const formErrors   = ref({})
const formError    = ref('')
const formErrorRaw = ref('')
const formSaving   = ref(false)

const defaultForm = () => ({
  searchKey: '', name: '', description: '',
  accountType: 'E', accountSign: 'D', elementLevel: 'S',
  accountingElement: '', active: true,
})

const openCreateModal = () => {
  form.value         = defaultForm()
  formErrors.value   = {}
  formError.value    = ''
  formErrorRaw.value = ''
  formModal.value    = { open: true, mode: 'create', id: null }
}

const openEditModal = (r) => {
  form.value = {
    searchKey:         r.searchKey         || '',
    name:              r.name              || '',
    description:       r.description       || '',
    accountType:       r.accountType       || '',
    accountSign:       r.accountSign       || 'D',
    elementLevel:      r.elementLevel      || '',
    accountingElement: r.accountingElement || '',
    active:            r.active ?? true,
  }
  formErrors.value   = {}
  formError.value    = ''
  formErrorRaw.value = ''
  formModal.value    = { open: true, mode: 'edit', id: r.id }
}

const validateForm = () => {
  const errs = {}
  if (!form.value.searchKey?.trim())     errs.searchKey         = 'No. COA is required'
  if (!form.value.name?.trim())          errs.name              = 'COA Name is required'
  if (!form.value.elementLevel)          errs.elementLevel      = 'Element Level is required'
  if (!form.value.accountType)           errs.accountType       = 'Account Type is required'
  if (!form.value.accountingElement)     errs.accountingElement = 'Accounting Element is required'
  formErrors.value = errs
  return Object.keys(errs).length === 0
}

const submitForm = async () => {
  if (!validateForm()) return
  formSaving.value   = true
  formError.value    = ''
  formErrorRaw.value = ''
  try {
    if (formModal.value.mode === 'create') {
      await createCOA(form.value)
      showToast('COA created successfully', 'success')
    } else {
      await updateCOA(formModal.value.id, form.value)
      showToast('COA updated successfully', 'success')
    }
    formModal.value.open = false
    await loadData()
  } catch (e) {
    formError.value = e?.message || 'An error occurred'
    if (e?.obResponse) formErrorRaw.value = JSON.stringify(e.obResponse, null, 2)
  } finally {
    formSaving.value = false
  }
}

// ── Delete / Set Active Modal ──────────────────────────
const deleteModal = ref({ open: false, row: null, saving: false, setActive: false })

const confirmDelete    = (r) => { deleteModal.value = { open: true, row: r, saving: false, setActive: false } }
const confirmSetActive = (r) => { deleteModal.value = { open: true, row: r, saving: false, setActive: true  } }

const executeDelete = async () => {
  deleteModal.value.saving = true
  try {
    if (deleteModal.value.setActive) {
      await setActiveCOA(deleteModal.value.row.id)
      showToast('COA set as active', 'success')
    } else {
      await deleteCOA(deleteModal.value.row.id)
      showToast('COA deactivated', 'success')
    }
    deleteModal.value.open = false
    await loadData()
  } catch (e) {
    showToast(e?.message || 'An error occurred', 'error')
    deleteModal.value.open = false
  }
}

// ── Toast ──────────────────────────────────────────────
const toast = ref({ show: false, message: '', type: 'success' })
let toastTimer = null
const showToast = (message, type = 'success') => {
  clearTimeout(toastTimer)
  toast.value = { show: true, message, type }
  toastTimer  = setTimeout(() => { toast.value.show = false }, 3000)
}

// ── v-click-outside directive ──────────────────────────
const vClickOutside = {
  mounted(el, binding) {
    el._clickOutsideHandler = (e) => { if (!el.contains(e.target)) binding.value(e) }
    document.addEventListener('click', el._clickOutsideHandler, true)
  },
  unmounted(el) {
    document.removeEventListener('click', el._clickOutsideHandler, true)
  },
}
</script>

<style scoped>
*, *::before, *::after { box-sizing: border-box; }
:root {
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --bg: #f0f4f8; --surface: #fff; --surface2: #f8fafc; --border: #e2e8f0;
  --text-primary: #0f172a; --text-secondary: #475569; --text-muted: #94a3b8;
  --accent: #3b82f6; --accent-light: #eff6ff; --danger: #ef4444; --success: #22c55e;
  --radius: 12px; --radius-sm: 8px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,.07); --shadow-md: 0 4px 20px rgba(0,0,0,.1);
}
.layout { display: flex; min-height: 100vh; background: var(--bg); font-family: var(--font); }
.main { flex: 1; padding: 24px; overflow-x: hidden; }
.content-card { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-sm); overflow: hidden; }
.page-header { padding: 20px 24px 0; }
.page-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0 0 16px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; gap: 12px; border-bottom: 1px solid var(--border); }
.search-wrap { position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 10px; color: var(--text-muted); }
.search-input { width: 240px; height: 36px; padding: 0 12px 0 34px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); font-family: var(--font); color: var(--text-primary); transition: border-color .15s; }
.search-input:focus { border-color: var(--accent); background: #fff; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 0 16px; height: 36px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font); transition: all .15s; white-space: nowrap; }
.btn--primary { background: var(--accent); color: #fff; }
.btn--primary:hover { background: #2563eb; }
.btn--primary:disabled { opacity: .6; cursor: not-allowed; }
.btn--secondary { background: var(--surface2); color: var(--text-secondary); border: 1px solid var(--border); }
.btn--secondary:hover { background: var(--border); }
.btn--danger { background: var(--danger); color: #fff; }
.btn--danger:hover { background: #dc2626; }
.btn--danger:disabled { opacity: .6; cursor: not-allowed; }
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th { padding: 11px 14px; text-align: left; font-size: 11.5px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em; background: var(--surface2); border-bottom: 1px solid var(--border); white-space: nowrap; }
.table td { padding: 12px 14px; border-bottom: 1px solid var(--border); color: var(--text-primary); vertical-align: middle; max-width: 0; }
.tr-data:hover td { background: #f8fafc; }
.tr-data:last-child td { border-bottom: none; }
.th-action { text-align: right !important; }
.sortable { cursor: pointer; user-select: none; position: relative; padding-right: 20px !important; transition: color 0.15s; }
.sortable:hover { color: var(--text-primary); }
.sortable::after, .sortable::before { content: ''; position: absolute; right: 6px; top: 50%; border: 4px solid transparent; opacity: 0.3; }
.sortable::before { border-bottom-color: currentColor; margin-top: -9px; }
.sortable::after  { border-top-color:    currentColor; margin-top: 1px; }
.sortable.asc::before  { opacity: 1; color: var(--accent); }
.sortable.desc::after  { opacity: 1; color: var(--accent); }
.code-badge { font-family: var(--font-mono); font-size: 11.5px; font-weight: 500; background: var(--surface2); border: 1px solid var(--border); padding: 3px 8px; border-radius: 4px; color: var(--text-secondary); white-space: nowrap; display: inline-block; }
.td-name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.td-name-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; }
.td-secondary { color: var(--text-secondary); font-size: 13px; }
.td-clip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.td-empty { text-align: center; color: var(--text-muted); padding: 48px 16px; font-size: 13px; }
.td-error { color: var(--danger); }
.td-action-cell { text-align: right; white-space: nowrap; overflow: visible !important; }
.type-badge { font-size: 11.5px; font-weight: 500; padding: 3px 10px; border-radius: 99px; background: #f1f5f9; color: #475569; display: inline-block; white-space: nowrap; }
.status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-left: 5px; vertical-align: middle; flex-shrink: 0; }
.status-dot--active { background: var(--success); }
.status-dot--inactive { background: var(--text-muted); }
.status-pill { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
.status-pill--active { background: #f0fdf4; color: #16a34a; }
.status-pill--inactive { background: #fff1f2; color: var(--danger); }
.action-group { display: flex; gap: 4px; justify-content: flex-end; align-items: center; }
.action-btn { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 5px; font-size: 12px; font-weight: 500; border: none; cursor: pointer; transition: background .12s; font-family: var(--font); }
.action-btn--more { background: var(--surface2); color: var(--text-secondary); padding: 5px 8px; }
.action-btn--more:hover { background: var(--border); }
.dropdown-wrap { position: relative; }
.dropdown-menu { position: fixed; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); z-index: 9999; min-width: 160px; overflow: hidden; }
.dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 14px; font-size: 12.5px; font-weight: 500; background: none; border: none; cursor: pointer; color: var(--text-secondary); font-family: var(--font); transition: background .1s; white-space: nowrap; }
.dropdown-item:hover { background: var(--surface2); color: var(--text-primary); }
.dropdown-item--danger { color: var(--danger); }
.dropdown-item--danger:hover { background: #fff1f2; }
.dropdown-item--success { color: var(--success); }
.dropdown-item--success:hover { background: #f0fdf4; }
.loading-dots { display: flex; gap: 6px; justify-content: center; align-items: center; }
.loading-dots span { width: 7px; height: 7px; background: var(--accent); border-radius: 50%; animation: bounce 1.2s infinite ease-in-out; }
.loading-dots span:nth-child(2) { animation-delay: .2s; }
.loading-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes bounce { 0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1} }
.pagination-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; background: var(--bg); border-top: 1px solid var(--border); gap: 12px; flex-wrap: wrap; }
.pagination-left { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.pagination-info { font-size: 12.5px; color: var(--text-muted); white-space: nowrap; }
.rows-per-page { display: flex; align-items: center; gap: 6px; }
.rows-label { font-size: 12.5px; color: var(--text-muted); white-space: nowrap; }
.rows-select { height: 30px; padding: 0 24px 0 8px; border: 1px solid var(--border); border-radius: 6px; font-size: 12.5px; background: var(--surface); color: var(--text-secondary); font-family: var(--font); cursor: pointer; outline: none; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 6px center; }
.rows-select:focus { border-color: var(--accent); }
.pagination { display: flex; align-items: center; gap: 2px; }
.page-btn { min-width: 36px; height: 36px; padding: 0 10px; border-radius: 10px; border: none; background: transparent; color: #94a3b8; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; font-family: var(--font); outline: none; appearance: none; -webkit-appearance: none; box-shadow: none; }
.page-btn:hover:not(:disabled):not(.page-btn--active) { color: var(--text-primary); background: rgba(0,0,0,.05); }
.page-btn--active { background: #fff !important; color: #1e293b !important; font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.07); }
.page-btn:disabled { opacity: .3; cursor: not-allowed; }
.page-ellipsis { min-width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 13px; color: var(--text-muted); }
.toast { position: fixed; bottom: 24px; right: 24px; z-index: 2000; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); }
.toast--success { background: #16a34a; color: #fff; }
.toast--error { background: var(--danger); color: #fff; }
.toast-enter-active,.toast-leave-active { transition: all .25s ease; }
.toast-enter-from,.toast-leave-to { opacity: 0; transform: translateY(8px); }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(2px); }
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); width: 100%; max-width: 480px; overflow: hidden; }
.modal--wide { max-width: 620px; }
.modal--sm { max-width: 400px; }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 20px 12px; border-bottom: 1px solid var(--border); gap: 12px; }
.modal-breadcrumb { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-muted); margin-bottom: 4px; }
.bc-active { color: var(--accent); font-weight: 500; }
.modal-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.modal-close { background: none; border: none; color: var(--text-muted); display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; transition: background .12s; flex-shrink: 0; }
.modal-close:hover { background: var(--surface2); color: var(--text-primary); }
.modal-body { padding: 20px; max-height: 65vh; overflow-y: auto; }
.modal-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; }
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-group input, .form-group select { width: 100%; height: 38px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.form-group input:focus, .form-group select:focus { border-color: var(--accent); background: #fff; }
.input-error { border-color: var(--danger) !important; }
.field-error { font-size: 11.5px; color: var(--danger); }
.req { color: var(--danger); }
.form-checks { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border); }
.check-label { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 500; color: var(--text-secondary); cursor: pointer; }
.check-label input[type=checkbox] { width: 15px; height: 15px; cursor: pointer; accent-color: var(--accent); }
.form-api-error { margin-top: 14px; padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; }
.error-raw { margin: 6px 0 0; font-family: var(--font-mono); font-size: 11px; white-space: pre-wrap; word-break: break-all; color: #7f1d1d; background: #fee2e2; padding: 8px; border-radius: 4px; max-height: 160px; overflow-y: auto; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.detail-value { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }
.detail-value.mono { font-family: var(--font-mono); font-size: 12.5px; }
.delete-text { font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); }
.delete-text strong { color: var(--text-primary); }
.fade-enter-active,.fade-leave-active { transition: opacity .15s; }
.fade-enter-from,.fade-leave-to { opacity: 0; }
</style>