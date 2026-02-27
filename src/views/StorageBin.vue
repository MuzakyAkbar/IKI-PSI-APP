<template>
  <div class="layout">
    <main class="main">
      <div class="content-card">

        <div class="page-header">
          <h2 class="page-title">Storage Bin</h2>
        </div>

        <div class="toolbar">
          <div class="search-wrap">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input v-model="searchQuery" class="search-input" placeholder="Search storage bin..." @input="onSearch" />
          </div>
          <button class="btn btn--primary" @click="openCreateModal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Create Storage Bin
          </button>
        </div>

        <div class="table-wrap">
          <table class="table">
            <colgroup>
              <col style="width:160px">
              <col style="width:24%">
              <col>
              <col style="width:110px">
              <col style="width:110px">
              <col style="width:90px">
              <col style="width:100px">
              <col style="width:140px">
            </colgroup>
            <thead><tr>
              <th>Storage Bin Code</th><th>Storage Bin Name</th><th>Warehouse Name</th>
              <th>Corridor(X)</th><th>Shelves(Y)</th><th>Height(Z)</th>
              <th>Status</th><th class="th-action">Action</th>
            </tr></thead>
            <tbody>
              <tr v-if="loading"><td colspan="8" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
              <tr v-else-if="error"><td colspan="8" class="td-empty td-error">{{ error }}</td></tr>
              <tr v-else-if="rows.length===0"><td colspan="8" class="td-empty">No storage bins found.</td></tr>
              <template v-else>
                <tr v-for="r in rows" :key="r.id" class="tr-data">
                  <td><span class="code-badge">{{ r.searchKey || '—' }}</span></td>
                  <td class="td-name">
                    <span class="td-name-text">{{ r.searchKey || '—' }}</span>
                    <span :class="['status-dot', r.active?'status-dot--active':'status-dot--inactive']"></span>
                  </td>
                  <td class="td-secondary td-clip">{{ r['warehouse$_identifier'] || '—' }}</td>
                  <td class="td-secondary">{{ r.x || '—' }}</td>
                  <td class="td-secondary">{{ r.y || '—' }}</td>
                  <td class="td-secondary">{{ r.z || '—' }}</td>
                  <td><span :class="['status-pill', r.active?'status-pill--active':'status-pill--inactive']">{{ r.active?'Active':'Inactive' }}</span></td>
                  <td class="td-action-cell">
                    <div class="action-group">
                      <div class="dropdown-wrap" v-click-outside="closeDropdown">
                        <button class="action-btn action-btn--more" @click.stop="toggleDropdown(r.id, $event)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                        <div v-if="openDropdown===r.id" class="dropdown-menu" :style="{top: dropdownPos.top+'px', right: dropdownPos.right+'px'}">
                          <button class="dropdown-item" @click="openViewModal(r)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>View
                          </button>
                          <button class="dropdown-item" @click="openEditModal(r); closeDropdown()">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit
                          </button>
                          <button v-if="r.active" class="dropdown-item dropdown-item--danger" @click="confirmDelete(r)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Delete
                          </button>
                          <button v-else class="dropdown-item dropdown-item--success" @click="confirmDelete(r)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>Set As Active
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

        <div v-if="totalPages > 1" class="pagination">
          <button class="page-btn" :disabled="currentPage===1" @click="goPage(currentPage-1)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button v-for="p in paginationPages" :key="p" :class="['page-btn', p===currentPage?'page-btn--active':'']" @click="goPage(p)">{{ p }}</button>
          <button class="page-btn" :disabled="currentPage===totalPages" @click="goPage(currentPage+1)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

      </div>
    </main>

    <!-- ══ VIEW MODAL ══ -->
    <transition name="fade">
      <div v-if="viewModal" class="modal-overlay" @click.self="viewModal=null">
        <div class="modal">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Storage Bin</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">View Storage Bin</span>
              </div>
              <div class="modal-title">{{ viewModal.searchKey }}</div>
            </div>
            <button class="modal-close" @click="viewModal=null">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="detail-grid">
              <div class="detail-item">
                <div class="detail-label">Storage Bin Code</div>
                <div class="detail-value mono">{{ viewModal.searchKey || '—' }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Storage Bin Name</div>
                <div class="detail-value">{{ viewModal.searchKey || '—' }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Warehouse Name</div>
                <div class="detail-value">{{ viewModal['warehouse$_identifier'] || '—' }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Status</div>
                <div class="detail-value">
                  <span :class="['status-pill', viewModal.active?'status-pill--active':'status-pill--inactive']">{{ viewModal.active?'Active':'Inactive' }}</span>
                </div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Corridor (X)</div>
                <div class="detail-value">{{ viewModal.x || '—' }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Shelves (Y)</div>
                <div class="detail-value">{{ viewModal.y || '—' }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Height (Z)</div>
                <div class="detail-value">{{ viewModal.z || '—' }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Organization</div>
                <div class="detail-value">{{ viewModal['organization$_identifier'] || '—' }}</div>
              </div>
            </div>

            <!-- Item sub-table placeholder -->
            <div class="sub-section">
              <div class="sub-title">Item</div>
              <table class="table table--sub">
                <thead><tr>
                  <th>—</th><th>—</th><th>—</th><th>—</th><th>—</th>
                </tr></thead>
                <tbody>
                  <tr><td colspan="5" class="td-empty">—</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--secondary" @click="openEditFromView(); viewModal=null">Edit</button>
            <button class="btn btn--primary" @click="viewModal=null">Close</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══ FORM MODAL ══ -->
    <transition name="fade">
      <div v-if="formModal.show" class="modal-overlay" @click.self="closeFormModal">
        <div class="modal modal--wide">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Storage Bin</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">{{ formModal.mode==='create' ? 'Create Storage Bin' : 'Edit Storage Bin' }}</span>
              </div>
              <div class="modal-title">{{ formModal.mode==='create' ? 'Create Storage Bin' : 'Edit Storage Bin' }}</div>
            </div>
            <button class="modal-close" @click="closeFormModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-grid-2">
              <div class="form-group">
                <label>Storage Bin Code <span class="req">*</span></label>
                <input v-model="form.searchKey" placeholder="e.g. BIN-A-01" :class="{'input-error':formErrors.searchKey}" />
                <span class="field-error" v-if="formErrors.searchKey">{{ formErrors.searchKey }}</span>
              </div>
              <div class="form-group">
                <label>Warehouse <span class="req">*</span></label>
                <select v-model="form.warehouseId" :class="{'input-error':formErrors.warehouseId}">
                  <option value="">— Select Warehouse —</option>
                  <option v-for="w in warehouseOptions" :key="w.id" :value="w.id">{{ w.name }}</option>
                </select>
                <span class="field-error" v-if="formErrors.warehouseId">{{ formErrors.warehouseId }}</span>
              </div>
              <div class="form-group">
                <label>Corridor (X)</label>
                <input v-model="form.x" placeholder="Corridor" />
              </div>
              <div class="form-group">
                <label>Shelves (Y)</label>
                <input v-model="form.y" placeholder="Shelves" />
              </div>
              <div class="form-group">
                <label>Height (Z)</label>
                <input v-model="form.z" placeholder="Height" />
              </div>
            </div>
            <div class="form-checks">
              <label class="check-label"><input type="checkbox" v-model="form.active" />Active</label>
            </div>
            <div v-if="formError" class="form-api-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ formError }}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--secondary" @click="closeFormModal" :disabled="formLoading">Cancel</button>
            <button class="btn btn--primary" @click="submitForm" :disabled="formLoading">
              <span v-if="formLoading" class="btn-loader"></span>
              {{ formModal.mode==='create' ? 'Save' : 'Update' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══ DELETE CONFIRM MODAL ══ -->
    <transition name="fade">
      <div v-if="deleteModal.show" class="modal-overlay" @click.self="deleteModal.show=false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <div class="modal-title">{{ deleteModal.row?.active ? 'Confirm Delete' : 'Confirm Activate' }}</div>
            <button class="modal-close" @click="deleteModal.show=false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-text" v-if="deleteModal.row?.active">Are you sure you want to deactivate <strong>{{ deleteModal.row?.searchKey }}</strong>?</p>
            <p class="delete-text" v-else>Are you sure you want to activate <strong>{{ deleteModal.row?.searchKey }}</strong>?</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn--secondary" @click="deleteModal.show=false" :disabled="deleteModal.loading">Cancel</button>
            <button :class="['btn', deleteModal.row?.active ? 'btn--danger' : 'btn--success']" @click="doDelete" :disabled="deleteModal.loading">
              <span v-if="deleteModal.loading" class="btn-loader"></span>
              {{ deleteModal.row?.active ? 'Deactivate' : 'Activate' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══ TOAST ══ -->
    <transition name="toast">
      <div v-if="toast.show" :class="['toast', `toast--${toast.type}`]">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path v-if="toast.type==='success'" d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline v-if="toast.type==='success'" points="22 4 12 14.01 9 11.01"/>
          <circle v-else cx="12" cy="12" r="10"/><line v-if="toast.type==='error'" x1="12" y1="8" x2="12" y2="12"/><line v-if="toast.type==='error'" x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {{ toast.message }}
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { fetchStorageBinsPage, createStorageBin, updateStorageBin, deleteStorageBin, fetchAllWarehouses } from '@/services/warehouse.js'

const vClickOutside = {
  mounted(el, binding) { el._co = (e) => { if (!el.contains(e.target)) binding.value(e) }; document.addEventListener('click', el._co) },
  unmounted(el) { document.removeEventListener('click', el._co) },
}

const rows = ref([])
const loading = ref(false)
const error = ref(null)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = 20
const totalRows = ref(0)
const openDropdown = ref(null)
const dropdownPos = ref({ top: 0, right: 0 })
let searchTimeout = null

const warehouseOptions = ref([])

const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize)))
const paginationPages = computed(() => {
  const pages = []; const t = totalPages.value; const c = currentPage.value
  if (t <= 7) { for (let i = 1; i <= t; i++) pages.push(i); return pages }
  pages.push(1); if (c > 3) pages.push('…')
  for (let i = Math.max(2, c-1); i <= Math.min(t-1, c+1); i++) pages.push(i)
  if (c < t-2) pages.push('…'); pages.push(t); return pages
})

async function load() {
  loading.value = true; error.value = null
  const startRow = (currentPage.value - 1) * pageSize
  try {
    const res = await fetchStorageBinsPage({ startRow, pageSize, searchKey: searchQuery.value })
    rows.value = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : [])
    totalRows.value = res.totalRows ?? rows.value.length
  } catch (e) { error.value = 'Gagal memuat data.'; console.error(e) }
  finally { loading.value = false }
}

async function loadWarehouseOptions() {
  if (warehouseOptions.value.length > 0) return
  try { warehouseOptions.value = await fetchAllWarehouses() }
  catch (e) { console.warn('loadWarehouseOptions failed', e) }
}

function onSearch() { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { currentPage.value = 1; load() }, 400) }
function goPage(p) { if (p < 1 || p > totalPages.value || typeof p !== 'number') return; currentPage.value = p; load() }
function toggleDropdown(id, event) {
  if (openDropdown.value === id) { openDropdown.value = null; return }
  const rect = event.currentTarget.getBoundingClientRect()
  dropdownPos.value = { top: rect.bottom + 4, right: window.innerWidth - rect.right }
  openDropdown.value = id
}
function closeDropdown() { openDropdown.value = null }

const toast = reactive({ show: false, message: '', type: 'success' })
let toastTimer = null
function showToast(message, type = 'success') {
  clearTimeout(toastTimer); Object.assign(toast, { show: true, message, type })
  toastTimer = setTimeout(() => { toast.show = false }, 3000)
}

const viewModal = ref(null)
const _viewRow = ref(null)
function openViewModal(r) { openDropdown.value = null; viewModal.value = r; _viewRow.value = r }
function openEditFromView() { if (_viewRow.value) openEditModal(_viewRow.value) }

const formModal = reactive({ show: false, mode: 'create', id: null })
const formLoading = ref(false)
const formError = ref(null)
const formErrors = reactive({})
const defaultForm = () => ({ searchKey: '', warehouseId: '', x: '', y: '', z: '', active: true })
const form = reactive(defaultForm())

function openCreateModal() {
  Object.assign(form, defaultForm()); Object.keys(formErrors).forEach(k => delete formErrors[k])
  formError.value = null; formModal.mode = 'create'; formModal.id = null; formModal.show = true
  loadWarehouseOptions()
}
function openEditModal(r) {
  openDropdown.value = null
  Object.assign(form, {
    searchKey: r.searchKey ?? '',
    warehouseId: r.warehouse?.id ?? r.warehouse ?? '',
    x: r.x ?? '', y: r.y ?? '', z: r.z ?? '', active: r.active ?? true,
  })
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  formError.value = null; formModal.mode = 'edit'; formModal.id = r.id; formModal.show = true
  loadWarehouseOptions()
}
function closeFormModal() { if (formLoading.value) return; formModal.show = false }
function validateForm() {
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  if (!form.searchKey.trim()) formErrors.searchKey = 'Storage Bin Code is required'
  if (!form.warehouseId) formErrors.warehouseId = 'Warehouse is required'
  return Object.keys(formErrors).length === 0
}
async function submitForm() {
  if (!validateForm()) return
  formLoading.value = true; formError.value = null
  try {
    const payload = { searchKey: form.searchKey.trim(), warehouseId: form.warehouseId, x: form.x.trim() || null, y: form.y.trim() || null, z: form.z.trim() || null, active: form.active }
    if (formModal.mode === 'create') await createStorageBin(payload)
    else await updateStorageBin(formModal.id, payload)
    formModal.show = false
    showToast(formModal.mode === 'create' ? 'Storage Bin created successfully!' : 'Storage Bin updated successfully!')
    load()
  } catch (e) {
    formError.value = e?.response?.data?.response?.error?.message ?? e?.message ?? 'An error occurred'
  } finally { formLoading.value = false }
}

const deleteModal = reactive({ show: false, row: null, loading: false })
function confirmDelete(r) { closeDropdown(); deleteModal.row = r; deleteModal.show = true }
async function doDelete() {
  deleteModal.loading = true
  try {
    await deleteStorageBin(deleteModal.row.id)
    deleteModal.show = false
    showToast(deleteModal.row.active ? 'Storage Bin deactivated.' : 'Storage Bin activated.')
    load()
  } catch (e) { showToast(e?.response?.data?.response?.error?.message ?? 'An error occurred', 'error'); deleteModal.show = false }
  finally { deleteModal.loading = false }
}

onMounted(() => load())
</script>

<style scoped>
*, *::before, *::after { box-sizing: border-box; }
:root {
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  --bg: #f1f5f9; --surface: #ffffff; --surface2: #f8fafc; --border: #e2e8f0;
  --text-primary: #0f172a; --text-secondary: #475569; --text-muted: #94a3b8;
  --accent: #3b82f6; --success: #22c55e; --danger: #ef4444;
  --radius: 12px; --radius-sm: 8px;
  --shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
  --shadow-md: 0 4px 16px rgba(0,0,0,.1);
}
.layout { display: flex; min-height: 100vh; background: var(--bg); font-family: var(--font); }
.main { flex: 1; padding: 28px 32px; min-width: 0; }
.content-card { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }
.page-header { padding: 22px 24px 16px; border-bottom: 1px solid var(--border); }
.page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }
.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; gap: 12px; }
.search-wrap { position: relative; flex: 1; max-width: 320px; }
.search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.search-input { width: 100%; height: 36px; padding: 0 12px 0 34px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; background: var(--surface2); outline: none; font-family: var(--font); color: var(--text-primary); }
.search-input:focus { border-color: var(--accent); background: #fff; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; border: none; cursor: pointer; transition: all .15s; font-family: var(--font); }
.btn--primary { background: var(--accent); color: #fff; } .btn--primary:hover { background: #2563eb; }
.btn--secondary { background: var(--surface2); color: var(--text-secondary); border: 1px solid var(--border); } .btn--secondary:hover { background: var(--border); }
.btn--danger { background: var(--danger); color: #fff; } .btn--danger:hover { background: #dc2626; }
.btn--success { background: var(--success); color: #fff; } .btn--success:hover { background: #16a34a; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.btn-loader { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table thead th { padding: 10px 14px; text-align: left; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); background: var(--surface2); border-bottom: 1px solid var(--border); white-space: nowrap; }
.table tbody td { padding: 11px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.table tbody tr:last-child td { border-bottom: none; }
.tr-data:hover { background: var(--surface2); }
.th-action { text-align: right; }
.table--sub { margin-top: 8px; }
.table--sub thead th { background: var(--bg); font-size: 11px; }
.table--sub tbody td { padding: 8px 12px; }
.sub-section { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border); }
.sub-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin-bottom: 8px; }
.code-badge { font-family: var(--font-mono); font-size: 11.5px; font-weight: 500; background: var(--surface2); border: 1px solid var(--border); padding: 3px 8px; border-radius: 4px; color: var(--text-secondary); white-space: nowrap; display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; vertical-align: middle; }
.td-name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.td-name-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; }
.td-secondary { color: var(--text-secondary); font-size: 13px; }
.td-clip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
.td-empty { text-align: center; color: var(--text-muted); padding: 48px 16px; font-size: 13px; }
.td-error { color: var(--danger); }
.td-action-cell { text-align: right; white-space: nowrap; overflow: visible !important; }
.status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-left: 5px; vertical-align: middle; }
.status-dot--active { background: var(--success); } .status-dot--inactive { background: var(--text-muted); }
.status-pill { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
.status-pill--active { background: #f0fdf4; color: #16a34a; } .status-pill--inactive { background: #fff1f2; color: var(--danger); }
.action-group { display: flex; gap: 4px; justify-content: flex-end; align-items: center; }
.action-btn { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 5px; font-size: 12px; font-weight: 500; border: none; cursor: pointer; transition: background .12s; font-family: var(--font); }
.action-btn--more { background: var(--surface2); color: var(--text-secondary); padding: 5px 8px; } .action-btn--more:hover { background: var(--border); }
.dropdown-wrap { position: relative; }
.dropdown-menu { position: fixed; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); z-index: 9999; min-width: 160px; overflow: hidden; }
.dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 14px; font-size: 12.5px; font-weight: 500; background: none; border: none; cursor: pointer; color: var(--text-secondary); font-family: var(--font); transition: background .1s; white-space: nowrap; }
.dropdown-item:hover { background: var(--surface2); color: var(--text-primary); }
.dropdown-item--danger { color: var(--danger); } .dropdown-item--danger:hover { background: #fff1f2; }
.dropdown-item--success { color: var(--success); } .dropdown-item--success:hover { background: #f0fdf4; }
.loading-dots { display: flex; gap: 6px; justify-content: center; align-items: center; }
.loading-dots span { width: 7px; height: 7px; background: var(--accent); border-radius: 50%; animation: bounce 1.2s infinite ease-in-out; }
.loading-dots span:nth-child(2) { animation-delay: .2s; } .loading-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes bounce { 0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1} }
.pagination { display: flex; align-items: center; justify-content: flex-end; gap: 2px; padding: 14px 20px; background: var(--bg); }
.page-btn { min-width: 36px; height: 36px; padding: 0 10px; border-radius: 10px; border: none; background: transparent; color: #94a3b8; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; font-family: var(--font); outline: none; }
.page-btn:hover:not(:disabled):not(.page-btn--active) { color: var(--text-primary); background: rgba(0,0,0,.05); }
.page-btn--active { background: #fff !important; color: #1e293b !important; font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.07); }
.page-btn:disabled { opacity: .3; cursor: not-allowed; }
.toast { position: fixed; bottom: 24px; right: 24px; z-index: 2000; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); }
.toast--success { background: #16a34a; color: #fff; } .toast--error { background: var(--danger); color: #fff; }
.toast-enter-active,.toast-leave-active { transition: all .25s ease; }
.toast-enter-from,.toast-leave-to { opacity: 0; transform: translateY(8px); }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(2px); }
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); width: 100%; max-width: 520px; overflow: hidden; }
.modal--wide { max-width: 620px; } .modal--sm { max-width: 400px; }
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