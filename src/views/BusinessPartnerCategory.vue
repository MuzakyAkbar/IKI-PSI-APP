<template>
  <div class="app">

    <!-- ══════════════════════════════════════════════════════════
         LIST VIEW
    ══════════════════════════════════════════════════════════ -->
    <div v-if="!page.show" class="page-wrap">
      <div class="content-card">

        <!-- Header -->
        <div class="card-header">
          <h2 class="page-title">Business Partner Category</h2>
        </div>

        <!-- ══ LIST TAB ══ -->
        <div v-if="activeTab==='list'">
          <div class="toolbar">
            <div class="search-wrap">
              <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input v-model="searchQuery" class="search-input" placeholder="Search..." @input="onSearch" />
            </div>
            <button class="btn btn--primary" @click="openCreatePage">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Create Category
            </button>
          </div>

          <div class="table-wrap">
            <table class="table">
              <colgroup>
                <col style="width:180px">
                <col>
                <col>
                <col style="width:100px">
                <col style="width:140px">
              </colgroup>
              <thead><tr>
                <th>Code</th>
                <th>Category Name</th>
                <th>Description</th>
                <th class="th-center">Default</th>
                <th class="th-action">Action</th>
              </tr></thead>
              <tbody>
                <tr v-if="loading"><td colspan="5" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
                <tr v-else-if="error"><td colspan="5" class="td-empty td-error">{{ error }}</td></tr>
                <tr v-else-if="categories.length===0"><td colspan="5" class="td-empty">No categories found.</td></tr>
                <template v-else>
                  <tr v-for="c in categories" :key="c.id" class="tr-data">
                    <td><span class="code-badge">{{ c.searchKey || '—' }}</span></td>
                    <td class="td-name">
                      {{ c.name }}
                      <span v-if="!c.active" class="inactive-pill">Inactive</span>
                    </td>
                    <td class="td-secondary">{{ c.description || '—' }}</td>
                    <td class="td-center">
                      <span v-if="c.default" class="default-pill">Default</span>
                      <span v-else class="td-secondary">—</span>
                    </td>
                    <td class="td-action-cell">
                      <div class="action-group">
                        <div class="dropdown-wrap" v-click-outside="closeDropdown">
                          <button class="action-btn" @click.stop="toggleDropdown(c.id, $event)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                          </button>
                          <div v-if="openDropdown===c.id" class="dropdown-menu" :style="{top:dropdownPos.top+'px',right:dropdownPos.right+'px'}">
                            <button class="dropdown-item" @click="openViewModal(c)">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>View
                            </button>
                            <button class="dropdown-item" @click="openEditPage(c); closeDropdown()">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit
                            </button>
                            <button class="dropdown-item dropdown-item--danger" @click="confirmToggle(c)">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Delete
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
            <button v-for="p in paginationPages" :key="p" :class="['page-btn', p===currentPage?'page-btn--active':'']" @click="typeof p==='number'&&goPage(p)">{{ p }}</button>
            <button class="page-btn" :disabled="currentPage===totalPages" @click="goPage(currentPage+1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════
         CREATE / EDIT PAGE — FULL PAGE
    ══════════════════════════════════════════════════════════ -->
    <Transition name="slide">
      <div v-if="page.show" class="page-wrap">

        <div class="breadcrumb-row">
          <button class="breadcrumb-back" @click="closePage">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            List Business Partner Category
          </button>
          <span class="breadcrumb-sep">/</span>
          <span class="breadcrumb-cur">{{ page.mode==='create' ? 'Create Category' : 'Edit Category' }}</span>
        </div>

        <div class="form-page-title">{{ page.mode==='create' ? 'Create Business Partner Category' : 'Edit Business Partner Category' }}</div>

        <!-- Category Info Card -->
        <div class="form-card">
          <div class="form-card-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Category Info
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Category Code <span class="req">*</span></label>
              <input
                v-model="form.searchKey"
                placeholder="e.g. CUSTOMER"
                :class="{'input-error': formErrors.searchKey}"
                :disabled="page.mode==='edit'"
              />
              <span class="field-error" v-if="formErrors.searchKey">{{ formErrors.searchKey }}</span>
            </div>
            <div class="form-group">
              <label>Category Name <span class="req">*</span></label>
              <input
                v-model="form.name"
                placeholder="e.g. Customer"
                :class="{'input-error': formErrors.name}"
              />
              <span class="field-error" v-if="formErrors.name">{{ formErrors.name }}</span>
            </div>
            <div class="form-group" style="grid-column: 1 / -1">
              <label>Description</label>
              <input v-model="form.description" placeholder="Optional description" />
            </div>
          </div>
          <div class="form-checks" style="margin-top:14px">
            <label class="check-label"><input type="checkbox" v-model="form.active" /> Active</label>
            <label class="check-label"><input type="checkbox" v-model="form.default" /> Set as Default</label>
          </div>
        </div>

        <div v-if="formError" class="form-api-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ formError }}
        </div>

        <div class="page-footer">
          <button class="btn btn--ghost" @click="closePage" :disabled="formLoading">Cancel</button>
          <button class="btn btn--primary" @click="submitForm" :disabled="formLoading">
            <span v-if="formLoading" class="btn-spinner"></span>
            {{ formLoading ? 'Saving...' : 'Save' }}
          </button>
        </div>

      </div>
    </Transition>

    <!-- ══════════════════════════════════════════════════════════
         VIEW DETAIL MODAL
    ══════════════════════════════════════════════════════════ -->
    <Transition name="fade">
      <div v-if="viewModal.show" class="modal-overlay" @click.self="viewModal.show=false">
        <div class="modal modal--detail">
          <div class="modal-header">
            <h3 class="modal-title">Business Partner Category Detail</h3>
            <button class="modal-close" @click="viewModal.show=false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body" v-if="viewModal.data">
            <div class="detail-cols">
              <div class="detail-col">
                <div class="detail-item">
                  <span class="detail-label">Code</span>
                  <span class="detail-value mono">{{ viewModal.data.searchKey || '—' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Category Name</span>
                  <span class="detail-value">{{ viewModal.data.name || '—' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Description</span>
                  <span class="detail-value">{{ viewModal.data.description || '—' }}</span>
                </div>
              </div>
              <div class="detail-col">
                <div class="detail-item">
                  <span class="detail-label">Default</span>
                  <span class="detail-value">{{ viewModal.data.default ? 'Yes' : 'No' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Organization</span>
                  <span class="detail-value">{{ viewModal.data['organization$_identifier'] || '—' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Status</span>
                  <span :class="['status-pill', viewModal.data.active ? 'status-pill--active' : 'status-pill--inactive']">
                    {{ viewModal.data.active ? 'Active' : 'Inactive' }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Created</span>
                  <span class="detail-value mono">{{ formatDate(viewModal.data.creationDate) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="openEditPage(viewModal.data); viewModal.show=false">Edit</button>
            <button class="btn btn--primary" @click="viewModal.show=false">Close</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ══ TOGGLE ACTIVE MODAL ══ -->
    <Transition name="fade">
      <div v-if="toggleModal.show" class="modal-overlay" @click.self="toggleModal.show=false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <h3 class="modal-title">Delete Category</h3>
            <button class="modal-close" @click="toggleModal.show=false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-text">
              Are you sure you want to delete <strong>{{ toggleModal.item?.name }}</strong>? This action cannot be undone.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="toggleModal.show=false" :disabled="toggleLoading">Cancel</button>
            <button class="btn btn--danger" @click="doToggle" :disabled="toggleLoading">
              <span v-if="toggleLoading" class="btn-spinner"></span>
              Delete
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ══ TOAST ══ -->
    <Transition name="toast">
      <div v-if="toast.show" :class="['toast', `toast--${toast.type}`]">
        <svg v-if="toast.type==='success'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>
        {{ toast.message }}
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import {
  fetchBPCategories,
  createBPCategory,
  updateBPCategory,
  deleteBPCategory,
} from '@/services/businessPartnerCategory'

// ── click-outside directive ──────────────────────────────────
const vClickOutside = {
  mounted(el, binding) { el._co = e => { if (!el.contains(e.target)) binding.value(e) }; document.addEventListener('click', el._co) },
  unmounted(el) { document.removeEventListener('click', el._co) },
}

// ════════════════════════════════════════════════════════════
// LIST STATE
// ════════════════════════════════════════════════════════════
const categories  = ref([])
const loading     = ref(false)
const error       = ref('')
const searchQuery = ref('')
const activeTab   = ref('list')

const PAGE_SIZE   = 20
const currentPage = ref(1)
const totalRows   = ref(0)
const totalPages  = computed(() => Math.max(1, Math.ceil(totalRows.value / PAGE_SIZE)))

const paginationPages = computed(() => {
  const total = totalPages.value
  const cur   = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = []
  if (cur > 3) { pages.push(1); if (cur > 4) pages.push('…') }
  for (let p = Math.max(1, cur - 1); p <= Math.min(total, cur + 1); p++) pages.push(p)
  if (cur < total - 2) { if (cur < total - 3) pages.push('…'); pages.push(total) }
  return pages
})

// ── dropdown ──────────────────────────────────────────────
const openDropdown = ref(null)
const dropdownPos  = reactive({ top: 0, right: 0 })

function toggleDropdown(id, event) {
  if (openDropdown.value === id) { openDropdown.value = null; return }
  const btn  = event.currentTarget
  const rect = btn.getBoundingClientRect()
  dropdownPos.top   = rect.bottom + window.scrollY + 4
  dropdownPos.right = window.innerWidth - rect.right
  openDropdown.value = id
}
function closeDropdown() { openDropdown.value = null }

// ════════════════════════════════════════════════════════════
// LOAD DATA
// ════════════════════════════════════════════════════════════
async function loadCategories(page = 1) {
  loading.value = true
  error.value   = ''
  try {
    const startRow = (page - 1) * PAGE_SIZE
    const res = await fetchBPCategories({ startRow, pageSize: PAGE_SIZE, searchKey: searchQuery.value })
    categories.value = res.data ?? []
    totalRows.value   = res.totalRows ?? categories.value.length
    currentPage.value = page
  } catch (e) {
    error.value = e.message || 'Failed to load categories.'
  } finally {
    loading.value = false
  }
}

let searchTimer = null
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadCategories(1), 400)
}

function goPage(p) {
  if (p < 1 || p > totalPages.value) return
  loadCategories(p)
}

onMounted(() => loadCategories(1))

// ════════════════════════════════════════════════════════════
// CREATE / EDIT PAGE
// ════════════════════════════════════════════════════════════
const page = reactive({ show: false, mode: 'create', id: null })

const form = reactive({
  searchKey:   '',
  name:        '',
  description: '',
  active:      true,
  default:     false,
})

const formErrors = reactive({ searchKey: '', name: '' })
const formError  = ref('')
const formLoading = ref(false)

function resetForm() {
  form.searchKey   = ''
  form.name        = ''
  form.description = ''
  form.active      = true
  form.default     = false
  formErrors.searchKey = ''
  formErrors.name      = ''
  formError.value      = ''
}

function openCreatePage() {
  resetForm()
  page.mode = 'create'
  page.id   = null
  page.show = true
  closeDropdown()
}

function openEditPage(item) {
  resetForm()
  form.searchKey   = item.searchKey   || ''
  form.name        = item.name        || ''
  form.description = item.description || ''
  form.active      = item.active      ?? true
  form.default     = item.default     ?? false
  page.mode = 'edit'
  page.id   = item.id
  page.show = true
  closeDropdown()
}

function closePage() {
  page.show = false
}

function validateForm() {
  let valid = true
  formErrors.searchKey = ''
  formErrors.name      = ''
  if (!form.searchKey.trim()) { formErrors.searchKey = 'Category code is required.'; valid = false }
  if (!form.name.trim())      { formErrors.name      = 'Category name is required.'; valid = false }
  return valid
}

async function submitForm() {
  if (!validateForm()) return
  formLoading.value = true
  formError.value   = ''
  try {
    if (page.mode === 'create') {
      await createBPCategory({ ...form })
      showToast('Category created successfully.', 'success')
    } else {
      await updateBPCategory(page.id, { ...form })
      showToast('Category updated successfully.', 'success')
    }
    page.show = false
    await loadCategories(currentPage.value)
  } catch (e) {
    formError.value = e.message || 'Failed to save category.'
  } finally {
    formLoading.value = false
  }
}

// ════════════════════════════════════════════════════════════
// VIEW MODAL
// ════════════════════════════════════════════════════════════
const viewModal = reactive({ show: false, data: null })

function openViewModal(item) {
  viewModal.data = item
  viewModal.show = true
  closeDropdown()
}

// ════════════════════════════════════════════════════════════
// TOGGLE ACTIVE MODAL
// ════════════════════════════════════════════════════════════
const toggleModal  = reactive({ show: false, item: null })
const toggleLoading = ref(false)

function confirmToggle(item) {
  toggleModal.item = item
  toggleModal.show = true
  closeDropdown()
}

async function doToggle() {
  toggleLoading.value = true
  try {
    await deleteBPCategory(toggleModal.item.id)
    showToast('Category deleted successfully.', 'success')
    toggleModal.show = false
    await loadCategories(currentPage.value)
  } catch (e) {
    showToast(e.message || 'Action failed.', 'error')
  } finally {
    toggleLoading.value = false
  }
}

// ════════════════════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════════════════════
const toast = reactive({ show: false, message: '', type: 'success' })
let toastTimer = null

function showToast(message, type = 'success') {
  clearTimeout(toastTimer)
  toast.message = message
  toast.type    = type
  toast.show    = true
  toastTimer    = setTimeout(() => { toast.show = false }, 3000)
}

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════
function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return iso }
}
</script>

<style scoped>
/* ── Design Tokens ────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --font:       'Inter', system-ui, -apple-system, sans-serif;
  --font-mono:  'JetBrains Mono', 'Fira Code', monospace;
  --accent:     #4f46e5;
  --accent-h:   #4338ca;
  --danger:     #dc2626;
  --success:    #16a34a;
  --bg:         #f1f5f9;
  --surface:    #ffffff;
  --surface2:   #f8fafc;
  --border:     #e2e8f0;
  --text-primary:   #0f172a;
  --text-secondary: #475569;
  --text-muted:     #94a3b8;
  --radius:     12px;
  --radius-sm:  8px;
  --shadow:     0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
  --shadow-md:  0 4px 16px rgba(0,0,0,.1);
}

.app { font-family: var(--font); color: var(--text-primary); background: var(--bg); min-height: 100vh; }

/* ── Page Wrap ─────────────────────────────────────────────── */
.page-wrap { padding: 24px; max-width: 1200px; margin: 0 auto; }
.content-card { background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); box-shadow: var(--shadow); overflow: hidden; }
.card-header { padding: 20px 24px 0; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
.page-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }

/* ── Toolbar ────────────────────────────────────────────────── */
.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; gap: 12px; }
.search-wrap { display: flex; align-items: center; gap: 8px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0 12px; flex: 1; max-width: 320px; }
.search-icon { color: var(--text-muted); flex-shrink: 0; }
.search-input { border: none; background: none; outline: none; font-size: 13.5px; color: var(--text-primary); width: 100%; height: 36px; font-family: var(--font); }

/* ── Buttons ────────────────────────────────────────────────── */
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 0 16px; height: 36px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: background .15s, opacity .15s; font-family: var(--font); }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.btn--primary { background: var(--accent); color: #fff; }
.btn--primary:hover:not(:disabled) { background: var(--accent-h); }
.btn--ghost { background: var(--surface2); color: var(--text-secondary); border: 1px solid var(--border); }
.btn--ghost:hover:not(:disabled) { background: var(--border); }
.btn--danger { background: var(--danger); color: #fff; }
.btn--danger:hover:not(:disabled) { background: #b91c1c; }
.btn-spinner { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,.35); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Table ─────────────────────────────────────────────────── */
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.table thead tr { border-bottom: 2px solid var(--border); }
.table th { padding: 11px 14px; text-align: left; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); background: var(--surface2); white-space: nowrap; }
.th-action { text-align: right; }
.th-center { text-align: center; }
.td-empty { text-align: center; padding: 40px 14px; color: var(--text-muted); font-size: 13.5px; }
.td-error { color: var(--danger); }
.table td { padding: 12px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tr-data:last-child td { border-bottom: none; }
.tr-data:hover td { background: #fafbff; }
.td-name { font-weight: 500; color: var(--text-primary); }
.td-secondary { color: var(--text-secondary); font-size: 13px; }
.td-center { text-align: center; }
.td-action-cell { text-align: right; padding-right: 16px; }
.code-badge { display: inline-block; padding: 2px 9px; background: #eff6ff; color: #1d4ed8; border-radius: 6px; font-size: 12px; font-weight: 600; font-family: var(--font-mono); letter-spacing: .02em; }
.inactive-pill { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; background: #fff1f2; color: var(--danger); margin-left: 6px; vertical-align: middle; }
.default-pill { display: inline-block; padding: 2px 9px; border-radius: 99px; font-size: 11px; font-weight: 600; background: #f0fdf4; color: var(--success); }

/* ── Dropdown ─────────────────────────────────────────── */
.action-group { display: flex; justify-content: flex-end; }
.action-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 6px; background: var(--surface2); border: 1px solid var(--border); cursor: pointer; color: var(--text-secondary); transition: background .12s; }
.action-btn:hover { background: var(--border); }
.dropdown-wrap { position: relative; }
.dropdown-menu { position: fixed; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); z-index: 9999; min-width: 160px; overflow: hidden; }
.dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 14px; font-size: 12.5px; font-weight: 500; background: none; border: none; cursor: pointer; color: var(--text-secondary); font-family: var(--font); transition: background .1s; white-space: nowrap; }
.dropdown-item:hover { background: var(--surface2); color: var(--text-primary); }
.dropdown-item--danger { color: var(--danger); } .dropdown-item--danger:hover { background: #fff1f2; }
.dropdown-item--success { color: var(--success); } .dropdown-item--success:hover { background: #f0fdf4; }

/* ── Loading ──────────────────────────────────────────── */
.loading-dots { display: flex; gap: 6px; justify-content: center; align-items: center; }
.loading-dots span { width: 7px; height: 7px; background: var(--accent); border-radius: 50%; animation: bounce 1.2s infinite ease-in-out; }
.loading-dots span:nth-child(2) { animation-delay: .2s; }
.loading-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes bounce { 0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1} }

/* ── Pagination ───────────────────────────────────────── */
.pagination { display: flex; align-items: center; justify-content: flex-end; gap: 2px; padding: 14px 20px; background: var(--bg); }
.page-btn { min-width: 36px; height: 36px; padding: 0 10px; border-radius: 10px; border: none; background: transparent; color: #94a3b8; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; font-family: var(--font); outline: none; }
.page-btn:hover:not(:disabled):not(.page-btn--active) { color: var(--text-primary); background: rgba(0,0,0,.05); }
.page-btn--active { background: #fff !important; color: #1e293b !important; font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.07); }
.page-btn:disabled { opacity: .3; cursor: not-allowed; }

/* ── Toast ────────────────────────────────────────────── */
.toast { position: fixed; bottom: 24px; right: 24px; z-index: 3000; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); }
.toast--success { background: #16a34a; color: #fff; }
.toast--error { background: var(--danger); color: #fff; }
.toast-enter-active,.toast-leave-active { transition: all .25s ease; }
.toast-enter-from,.toast-leave-to { opacity: 0; transform: translateY(8px); }

/* ── Breadcrumb ───────────────────────────────────────── */
.breadcrumb-row { display: flex; align-items: center; gap: 6px; font-size: 12.5px; margin-bottom: 16px; }
.breadcrumb-back { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; color: var(--accent); font-size: 12.5px; font-weight: 500; cursor: pointer; padding: 0; font-family: var(--font); }
.breadcrumb-back:hover { text-decoration: underline; }
.breadcrumb-sep { color: var(--text-muted); }
.breadcrumb-cur { color: var(--text-primary); font-weight: 500; }
.form-page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; }

/* ── Form Cards ───────────────────────────────────────── */
.form-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px 24px; margin-bottom: 16px; box-shadow: var(--shadow); }
.form-card-title { display: flex; align-items: center; gap: 7px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--text-muted); margin-bottom: 18px; }
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-group input { height: 38px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; width: 100%; }
.form-group input:focus { border-color: var(--accent); background: #fff; }
.form-group input:disabled { background: #f1f5f9; color: var(--text-muted); cursor: not-allowed; }
.input-error { border-color: var(--danger) !important; }
.field-error { font-size: 11.5px; color: var(--danger); }
.req { color: var(--danger); }
.form-checks { display: flex; gap: 20px; }
.check-label { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 500; color: var(--text-secondary); cursor: pointer; }
.check-label input[type=checkbox] { width: 15px; height: 15px; accent-color: var(--accent); cursor: pointer; }
.form-api-error { padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; margin-bottom: 16px; }
.page-footer { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; margin-top: 8px; }

/* ── Modals ───────────────────────────────────────────── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(2px); }
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); width: 100%; max-width: 480px; overflow: hidden; }
.modal--detail { max-width: 600px; }
.modal--sm { max-width: 400px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); }
.modal-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
.modal-close { background: none; border: none; color: var(--text-muted); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .12s; }
.modal-close:hover { background: var(--surface2); color: var(--text-primary); }
.modal-body { padding: 20px; max-height: 60vh; overflow-y: auto; }
.modal-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; }

/* ── Detail View ──────────────────────────────────────── */
.detail-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.detail-col { display: flex; flex-direction: column; gap: 14px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.detail-value { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }
.detail-value.mono { font-family: var(--font-mono); font-size: 12.5px; }
.status-pill { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600; }
.status-pill--active { background: #f0fdf4; color: #16a34a; }
.status-pill--inactive { background: #fff1f2; color: var(--danger); }
.delete-text { font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); margin: 0; }
.delete-text strong { color: var(--text-primary); }

/* ── Transitions ──────────────────────────────────────── */
.fade-enter-active,.fade-leave-active { transition: opacity .15s; }
.fade-enter-from,.fade-leave-to { opacity: 0; }
.slide-enter-active,.slide-leave-active { transition: transform .2s ease, opacity .2s ease; }
.slide-enter-from,.slide-leave-to { transform: translateX(24px); opacity: 0; }
</style>