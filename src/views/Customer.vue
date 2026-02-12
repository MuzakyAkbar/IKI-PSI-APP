<template>
  <div class="layout">
    <!-- Header -->
    <header class="header">
      <div class="header-inner">
        <div class="brand">
          <span class="brand-logo">N</span>
          <span class="brand-name">NexERP</span>
        </div>
        <div class="header-title">
          <span class="breadcrumb">Sales /</span>
          <span class="page-title">Customer</span>
        </div>
        <div class="header-right">
          <div class="avatar">BS</div>
          <span class="user-name">Brooklyn Simmons</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="main">
      <div class="content-card">
        <!-- Tabs -->
        <div class="tabs">
          <button :class="['tab', activeTab === 'list' ? 'tab--active' : '']" @click="activeTab = 'list'">List Customers</button>
          <button :class="['tab', activeTab === 'linkgl' ? 'tab--active' : '']" @click="activeTab = 'linkgl'">Link GL</button>
        </div>

        <!-- List Tab -->
        <div v-if="activeTab === 'list'">
          <div class="toolbar">
            <div class="search-wrap">
              <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input v-model="searchQuery" class="search-input" placeholder="Search customer..." @input="onSearch" />
            </div>
            <button class="btn btn--primary" @click="openCreateModal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Create Customer
            </button>
          </div>

          <!-- Table -->
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Customer Name</th>
                  <th>City</th>
                  <th>Phone</th>
                  <th class="th-action">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="5" class="td-empty">
                    <div class="loading-dots"><span></span><span></span><span></span></div>
                  </td>
                </tr>
                <tr v-else-if="error">
                  <td colspan="5" class="td-empty td-error">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {{ error }}
                  </td>
                </tr>
                <tr v-else-if="customers.length === 0">
                  <td colspan="5" class="td-empty">No customers found.</td>
                </tr>
                <template v-else>
                  <tr v-for="c in customers" :key="c.id" class="tr-data">
                    <td><span class="code-badge">{{ c.searchKey }}</span></td>
                    <td class="td-name">{{ c.name }}</td>
                    <td class="td-secondary">{{ c.description || '-' }}</td>
                    <td class="td-secondary td-mono">-</td>
                    <td class="td-action-cell">
                      <div class="action-group">
                        <button class="action-btn action-btn--view" @click="openViewModal(c)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          View
                        </button>
                        <button class="action-btn action-btn--edit" @click="openEditModal(c)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Edit
                        </button>
                        <button class="action-btn action-btn--delete" @click="confirmDelete(c)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="pagination" v-if="!loading && totalPages > 1">
            <button class="page-btn" :disabled="currentPage === 1" @click="goPage(currentPage - 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button v-for="p in visiblePages" :key="p" :class="['page-btn', p === currentPage ? 'page-btn--active' : '']" @click="goPage(p)">{{ p }}</button>
            <button class="page-btn" :disabled="currentPage === totalPages" @click="goPage(currentPage + 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>

        <!-- Link GL Tab -->
        <div v-if="activeTab === 'linkgl'" class="linkgl-placeholder">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <p>Link GL feature coming soon.</p>
        </div>
      </div>
    </main>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast.show" :class="['toast', `toast--${toast.type}`]">
        <svg v-if="toast.type === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ toast.message }}
      </div>
    </Transition>

    <!-- VIEW MODAL -->
    <Transition name="fade">
      <div v-if="viewModal" class="modal-overlay" @click.self="viewModal = null">
        <div class="modal">
          <div class="modal-header">
            <h3>Customer Detail</h3>
            <button class="modal-close" @click="viewModal = null">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Code / SKU</span>
                <span class="detail-value mono">{{ viewModal.searchKey }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Name</span>
                <span class="detail-value">{{ viewModal.name }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Organization</span>
                <span class="detail-value">{{ viewModal['organization$_identifier'] || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Currency</span>
                <span class="detail-value">{{ viewModal['currency$_identifier'] || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Payment Terms</span>
                <span class="detail-value">{{ viewModal['paymentTerms$_identifier'] || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Payment Method</span>
                <span class="detail-value">{{ viewModal['paymentMethod$_identifier'] || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Price List</span>
                <span class="detail-value">{{ viewModal['priceList$_identifier'] || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Credit Limit</span>
                <span class="detail-value">{{ viewModal.creditLimit ?? '0' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Credit Status</span>
                <span class="detail-value">{{ viewModal.creditStatus || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Status</span>
                <span :class="['status-badge', viewModal.active ? 'status-badge--active' : 'status-badge--inactive']">
                  {{ viewModal.active ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <div class="detail-item" style="grid-column: 1 / -1" v-if="viewModal.description">
                <span class="detail-label">Description</span>
                <span class="detail-value">{{ viewModal.description }}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="viewModal = null">Close</button>
            <button class="btn btn--primary" @click="openEditFromView">Edit</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- CREATE / EDIT MODAL -->
    <Transition name="fade">
      <div v-if="formModal.show" class="modal-overlay" @click.self="closeFormModal">
        <div class="modal modal--wide">
          <div class="modal-header">
            <h3>{{ formModal.mode === 'create' ? 'Create Customer' : 'Edit Customer' }}</h3>
            <button class="modal-close" @click="closeFormModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="form-section-title">Customer Info</p>
            <div class="form-grid">
              <div class="form-group">
                <label>Customer Code / SKU <span class="required">*</span></label>
                <input v-model="form.searchKey" type="text" placeholder="e.g. CS-0001" :class="{ 'input-error': formErrors.searchKey }" />
                <span class="field-error" v-if="formErrors.searchKey">{{ formErrors.searchKey }}</span>
              </div>
              <div class="form-group">
                <label>Customer Name <span class="required">*</span></label>
                <input v-model="form.name" type="text" placeholder="Customer Name" :class="{ 'input-error': formErrors.name }" />
                <span class="field-error" v-if="formErrors.name">{{ formErrors.name }}</span>
              </div>
              <div class="form-group" style="grid-column: 1 / -1">
                <label>Description</label>
                <input v-model="form.description" type="text" placeholder="Description (optional)" />
              </div>
            </div>

            <p class="form-section-title" style="margin-top: 18px">Commercial</p>
            <div class="form-grid">
              <div class="form-group">
                <label>Payment Terms</label>
                <select v-model="form.paymentTerms">
                  <option value="">— Select —</option>
                  <option v-for="pt in lookups.paymentTerms" :key="pt.id" :value="pt.id">{{ pt.name || pt._identifier }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Price List</label>
                <select v-model="form.priceList">
                  <option value="">— Select —</option>
                  <option v-for="pl in lookups.priceLists" :key="pl.id" :value="pl.id">{{ pl.name || pl._identifier }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Payment Method</label>
                <select v-model="form.paymentMethod">
                  <option value="">— Select —</option>
                  <option v-for="pm in lookups.paymentMethods" :key="pm.id" :value="pm.id">{{ pm.name || pm._identifier }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Credit Limit</label>
                <input v-model="form.creditLimit" type="number" min="0" placeholder="0" />
              </div>
              <div class="form-group">
                <label>Status</label>
                <select v-model="form.active">
                  <option :value="true">Active</option>
                  <option :value="false">Inactive</option>
                </select>
              </div>
            </div>

            <div v-if="formError" class="form-api-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ formError }}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="closeFormModal" :disabled="formLoading">Cancel</button>
            <button class="btn btn--primary" @click="submitForm" :disabled="formLoading">
              <span v-if="formLoading" class="btn-spinner"></span>
              {{ formLoading ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- DELETE CONFIRM MODAL -->
    <Transition name="fade">
      <div v-if="deleteModal.show" class="modal-overlay" @click.self="deleteModal.show = false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <h3>Delete Customer</h3>
            <button class="modal-close" @click="deleteModal.show = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-text">
              Yakin ingin menghapus customer <strong>{{ deleteModal.customer?.name }}</strong>? Tindakan ini tidak bisa dibatalkan.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="deleteModal.show = false" :disabled="deleteLoading">Cancel</button>
            <button class="btn btn--danger" @click="doDelete" :disabled="deleteLoading">
              <span v-if="deleteLoading" class="btn-spinner"></span>
              {{ deleteLoading ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import {
  fetchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  fetchPaymentTerms,
  fetchPriceLists,
  fetchPaymentMethods,
} from '@/services/customer'

// ─── List ─────────────────────────────────────────────────────
const activeTab = ref('list')
const customers = ref([])
const loading = ref(false)
const error = ref(null)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = 20
const totalRows = ref(0)
let searchTimeout = null

const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize)))
const visiblePages = computed(() => {
  const pages = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(totalPages.value, currentPage.value + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

// ─── Lookups ──────────────────────────────────────────────────
const lookups = reactive({ paymentTerms: [], priceLists: [], paymentMethods: [] })

async function loadLookups() {
  try {
    const [pt, pl, pm] = await Promise.all([fetchPaymentTerms(), fetchPriceLists(), fetchPaymentMethods()])
    lookups.paymentTerms = pt
    lookups.priceLists = pl
    lookups.paymentMethods = pm
  } catch (e) {
    console.warn('Lookup load failed (non-critical):', e)
  }
}

// ─── Load customers ───────────────────────────────────────────
async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await fetchCustomers({
      startRow: (currentPage.value - 1) * pageSize,
      pageSize,
      searchKey: searchQuery.value,
    })
    customers.value = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : [])
    totalRows.value = res.totalRows ?? customers.value.length
  } catch (e) {
    error.value = 'Gagal memuat data customer. Periksa koneksi atau kredensial API.'
    console.error(e)
  } finally {
    loading.value = false
  }
}

function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { currentPage.value = 1; load() }, 400)
}

function goPage(p) {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  load()
}

// ─── Toast ────────────────────────────────────────────────────
const toast = reactive({ show: false, message: '', type: 'success' })
let toastTimer = null

function showToast(message, type = 'success') {
  clearTimeout(toastTimer)
  toast.message = message
  toast.type = type
  toast.show = true
  toastTimer = setTimeout(() => { toast.show = false }, 3000)
}

// ─── View Modal ───────────────────────────────────────────────
const viewModal = ref(null)

function openViewModal(c) { viewModal.value = c }

function openEditFromView() {
  const c = viewModal.value
  viewModal.value = null
  openEditModal(c)
}

// ─── Form Modal ───────────────────────────────────────────────
const formModal = reactive({ show: false, mode: 'create', id: null })
const formLoading = ref(false)
const formError = ref(null)
const formErrors = reactive({})

const defaultForm = () => ({
  searchKey: '', name: '', description: '',
  paymentTerms: '', priceList: '', paymentMethod: '',
  creditLimit: 0, active: true,
})

const form = reactive(defaultForm())

function openCreateModal() {
  Object.assign(form, defaultForm())
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  formError.value = null
  formModal.mode = 'create'
  formModal.id = null
  formModal.show = true
}

function openEditModal(c) {
  Object.assign(form, {
    searchKey: c.searchKey ?? '',
    name: c.name ?? '',
    description: c.description ?? '',
    paymentTerms: c.paymentTerms ?? '',
    priceList: c.priceList ?? '',
    paymentMethod: c.paymentMethod ?? '',
    creditLimit: c.creditLimit ?? 0,
    active: c.active ?? true,
  })
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  formError.value = null
  formModal.mode = 'edit'
  formModal.id = c.id
  formModal.show = true
}

function closeFormModal() {
  if (formLoading.value) return
  formModal.show = false
}

function validateForm() {
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  if (!form.searchKey.trim()) formErrors.searchKey = 'Code wajib diisi'
  if (!form.name.trim()) formErrors.name = 'Nama customer wajib diisi'
  return Object.keys(formErrors).length === 0
}

async function submitForm() {
  if (!validateForm()) return
  formLoading.value = true
  formError.value = null
  try {
    const payload = {
      searchKey: form.searchKey.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      creditLimit: Number(form.creditLimit) || 0,
      active: form.active,
      ...(form.paymentTerms && { paymentTerms: form.paymentTerms }),
      ...(form.priceList && { priceList: form.priceList }),
      ...(form.paymentMethod && { paymentMethod: form.paymentMethod }),
    }
    if (formModal.mode === 'create') {
      await createCustomer(payload)
      showToast('Customer berhasil dibuat')
    } else {
      await updateCustomer(formModal.id, payload)
      showToast('Customer berhasil diupdate')
    }
    formModal.show = false
    currentPage.value = 1
    load()
  } catch (e) {
    formError.value = e.response?.data?.response?.error?.message
      ?? e.response?.data?.message
      ?? e.message
      ?? 'Terjadi kesalahan, coba lagi.'
    console.error(e)
  } finally {
    formLoading.value = false
  }
}

// ─── Delete ───────────────────────────────────────────────────
const deleteModal = reactive({ show: false, customer: null })
const deleteLoading = ref(false)

function confirmDelete(c) {
  deleteModal.customer = c
  deleteModal.show = true
}

async function doDelete() {
  deleteLoading.value = true
  try {
    await deleteCustomer(deleteModal.customer.id)
    showToast('Customer berhasil dihapus')
    deleteModal.show = false
    if (customers.value.length === 1 && currentPage.value > 1) currentPage.value--
    load()
  } catch (e) {
    showToast('Gagal menghapus customer', 'error')
    console.error(e)
    deleteModal.show = false
  } finally {
    deleteLoading.value = false
  }
}

// ─── Init ─────────────────────────────────────────────────────
onMounted(() => { load(); loadLookups() })
</script>

<style scoped>
.layout { display: flex; flex-direction: column; min-height: 100vh; background: var(--bg); }

.header { background: var(--surface); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; }
.header-inner { max-width: 1280px; margin: 0 auto; padding: 0 24px; height: 56px; display: flex; align-items: center; gap: 20px; }
.brand { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.brand-logo { width: 30px; height: 30px; background: var(--accent); color: #fff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; }
.brand-name { font-weight: 600; font-size: 15px; color: var(--text-primary); }
.header-title { flex: 1; display: flex; align-items: center; gap: 6px; font-size: 14px; }
.breadcrumb { color: var(--text-muted); }
.page-title { font-weight: 600; color: var(--text-primary); }
.header-right { display: flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 13px; flex-shrink: 0; }
.avatar { width: 30px; height: 30px; background: var(--accent); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; }
.user-name { font-weight: 500; }

.main { flex: 1; padding: 28px 24px; max-width: 1280px; margin: 0 auto; width: 100%; }
.content-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }

.tabs { display: flex; border-bottom: 1px solid var(--border); padding: 0 20px; gap: 4px; }
.tab { padding: 14px 16px 12px; font-size: 13px; font-weight: 500; background: none; border: none; border-bottom: 2px solid transparent; color: var(--text-secondary); cursor: pointer; transition: color .15s, border-color .15s; margin-bottom: -1px; }
.tab:hover { color: var(--text-primary); }
.tab--active { color: var(--accent); border-bottom-color: var(--accent); }

.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; gap: 12px; }
.search-wrap { position: relative; flex: 1; max-width: 320px; }
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.search-input { width: 100%; padding: 8px 12px 8px 34px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; color: var(--text-primary); background: var(--surface2); outline: none; transition: border-color .15s; }
.search-input:focus { border-color: var(--accent); background: #fff; box-shadow: 0 0 0 3px rgba(37,99,235,.08); }

.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; border: none; cursor: pointer; transition: background .15s, opacity .15s; flex-shrink: 0; font-family: var(--font); }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.btn--primary { background: var(--accent); color: #fff; }
.btn--primary:hover:not(:disabled) { background: var(--accent-hover); }
.btn--ghost { background: transparent; color: var(--text-secondary); border: 1px solid var(--border); }
.btn--ghost:hover:not(:disabled) { background: var(--surface2); }
.btn--danger { background: var(--danger); color: #fff; }
.btn--danger:hover:not(:disabled) { background: #dc2626; }
.btn-spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th { padding: 10px 16px; text-align: left; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); background: var(--surface2); border-bottom: 1px solid var(--border); white-space: nowrap; }
.th-action { text-align: right; }
.table td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tr-data:last-child td { border-bottom: none; }
.tr-data:hover td { background: var(--accent-light); }
.code-badge { font-family: var(--font-mono); font-size: 11.5px; font-weight: 500; background: var(--surface2); border: 1px solid var(--border); padding: 2px 8px; border-radius: 4px; color: var(--text-secondary); white-space: nowrap; }
.td-name { font-weight: 500; }
.td-secondary { color: var(--text-secondary); }
.td-mono { font-family: var(--font-mono); font-size: 12px; }
.td-empty { text-align: center; color: var(--text-muted); padding: 48px 16px; font-size: 13px; }
.td-error { color: var(--danger); display: flex; align-items: center; justify-content: center; gap: 6px; }
.td-action-cell { text-align: right; }
.action-group { display: flex; gap: 4px; justify-content: flex-end; }
.action-btn { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 5px; font-size: 12px; font-weight: 500; border: none; cursor: pointer; transition: background .12s; font-family: var(--font); }
.action-btn--view { background: var(--accent-light); color: var(--accent); }
.action-btn--view:hover { background: #dbeafe; }
.action-btn--edit { background: #f0fdf4; color: #16a34a; }
.action-btn--edit:hover { background: #dcfce7; }
.action-btn--delete { background: #fff1f2; color: var(--danger); }
.action-btn--delete:hover { background: #ffe4e6; }

.loading-dots { display: flex; gap: 6px; justify-content: center; align-items: center; }
.loading-dots span { width: 7px; height: 7px; background: var(--accent); border-radius: 50%; animation: bounce 1.2s infinite ease-in-out; }
.loading-dots span:nth-child(2) { animation-delay: .2s; }
.loading-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes bounce { 0%, 80%, 100% { transform: scale(.6); opacity: .4; } 40% { transform: scale(1); opacity: 1; } }

.pagination { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 16px; border-top: 1px solid var(--border); }
.page-btn { min-width: 32px; height: 32px; padding: 0 8px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary); font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background .12s, color .12s; }
.page-btn:hover:not(:disabled) { background: var(--surface2); color: var(--text-primary); }
.page-btn--active { background: var(--accent); color: #fff; border-color: var(--accent); }
.page-btn:disabled { opacity: .35; cursor: not-allowed; }

.linkgl-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 80px 20px; color: var(--text-muted); font-size: 13px; }

.toast { position: fixed; bottom: 24px; right: 24px; z-index: 2000; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); }
.toast--success { background: #16a34a; color: #fff; }
.toast--error { background: var(--danger); color: #fff; }
.toast-enter-active, .toast-leave-active { transition: all .25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(2px); }
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); width: 100%; max-width: 480px; overflow: hidden; }
.modal--wide { max-width: 640px; }
.modal--sm { max-width: 400px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 16px; border-bottom: 1px solid var(--border); }
.modal-header h3 { font-size: 15px; font-weight: 600; }
.modal-close { background: none; border: none; color: var(--text-muted); display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; transition: background .12s; }
.modal-close:hover { background: var(--surface2); color: var(--text-primary); }
.modal-body { padding: 20px; max-height: 65vh; overflow-y: auto; }
.modal-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; }

.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.detail-value { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }
.detail-value.mono { font-family: var(--font-mono); font-size: 12.5px; }
.status-badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600; }
.status-badge--active { background: #f0fdf4; color: #16a34a; }
.status-badge--inactive { background: #fff1f2; color: var(--danger); }

.form-section-title { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--text-muted); margin-bottom: 12px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-group input, .form-group select { padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); }
.form-group input:focus, .form-group select:focus { border-color: var(--accent); background: #fff; }
.input-error { border-color: var(--danger) !important; }
.field-error { font-size: 11.5px; color: var(--danger); }
.required { color: var(--danger); }
.form-api-error { margin-top: 14px; padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; }

.delete-text { font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); }
.delete-text strong { color: var(--text-primary); }

.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>