<template>
  <div class="layout">
    <main class="main">
      <div class="content-card">

        <div class="page-header">
          <h2 class="page-title">G/L Item</h2>
        </div>

        <!-- ══ TOOLBAR ══ -->
        <div class="toolbar">
          <div class="search-wrap">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input v-model="searchQuery" class="search-input" placeholder="Cari nama atau deskripsi G/L Item..." @input="onSearch" />
          </div>
          <button class="btn btn--primary" @click="openCreateModal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Buat G/L Item
          </button>
        </div>

        <!-- ══ TABLE ══ -->
        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th>Nama</th>
              <th>Kategori Pajak</th>
              <th>Faktur Finansial</th>
              <th>Deskripsi</th>
              <th class="th-action">Tindakan</th>
            </tr></thead>
            <tbody>
              <tr v-if="loading"><td colspan="5" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
              <tr v-else-if="error"><td colspan="5" class="td-empty td-error">{{ error }}</td></tr>
              <tr v-else-if="rows.length === 0"><td colspan="5" class="td-empty">Tidak ada G/L Item yang ditemukan.</td></tr>
              <template v-else>
                <tr v-for="r in rows" :key="r.id" class="tr-data">
                  <td class="td-name">{{ r.name || '—' }}</td>
                  <td class="td-secondary">{{ r['taxCategory$_identifier'] || '—' }}</td>
                  <td><span :class="['status-pill', r.enableInFinancialInvoices ? 'status-complete' : 'status-void']">{{ r.enableInFinancialInvoices ? 'Ya' : 'Tidak' }}</span></td>
                  <td class="td-secondary td-clip">{{ r.description || '—' }}</td>
                  <td class="td-action-cell">
                    <div class="action-group">
                      <div class="dropdown-wrap" v-click-outside="closeDropdown">
                        <button class="action-btn action-btn--more" @click.stop="toggleDropdown(r.id, $event)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                        <div v-if="openDropdown === r.id" class="dropdown-menu" :style="{ top: dropdownPos.top + 'px', right: dropdownPos.right + 'px' }" @click.stop>
                          <button class="dropdown-item" @click="openViewModal(r); closeDropdown()">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Lihat
                          </button>
                          <button class="dropdown-item" @click="openEditModal(r); closeDropdown()">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Sunting
                          </button>
                          <button class="dropdown-item dropdown-item--danger" @click="confirmDelete(r); closeDropdown()">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Hapus
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

        <!-- ══ PAGINATION ══ -->
        <div v-if="totalPages > 1 || currentPage > 1" class="pagination">
          <button class="page-btn" :disabled="currentPage === 1 || loading" @click="goPage(currentPage - 1)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <template v-for="p in pageNumbers" :key="String(p) + '-' + currentPage">
            <span v-if="p === '...'" class="page-ellipsis">…</span>
            <button v-else :class="['page-btn', Number(p) === currentPage ? 'page-btn--active' : '']" :disabled="loading" @click="goPage(Number(p))">{{ p }}</button>
          </template>
          <button class="page-btn" :disabled="currentPage >= totalPages || loading" @click="goPage(currentPage + 1)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

      </div>
    </main>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- CREATE / EDIT MODAL                                    -->
    <!-- ══════════════════════════════════════════════════════ -->
    <transition name="fade">
      <div v-if="showFormModal" class="modal-overlay" @mousedown.self="closeFormModal">
        <div class="modal modal--lg">

          <!-- Header -->
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Dashboard</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span>G/L Item</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">{{ isEdit ? 'Sunting' : 'Buat' }} G/L Item</span>
              </div>
              <div class="modal-title">{{ isEdit ? 'Sunting' : 'Buat' }} G/L Item</div>
            </div>
            <button class="modal-close" @click="closeFormModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Tabs -->
          <div class="modal-tabs">
            <button :class="['modal-tab', activeFormTab === 'header' ? 'modal-tab--active' : '']" @click="activeFormTab = 'header'">G/L Item</button>
            <button :class="['modal-tab', activeFormTab === 'acct' ? 'modal-tab--active' : '']" @click="switchToAcctTab" :disabled="!savedGLItemId && !isEdit">Akuntansi</button>
          </div>

          <!-- Body -->
          <div class="modal-body">

            <!-- ── Header Tab ── -->
            <div v-if="activeFormTab === 'header'">
              <div class="form-grid-2">

                <div class="form-group">
                  <label>Nama <span class="req">*</span></label>
                  <input v-model="form.name" class="form-input" placeholder="Nama G/L Item" />
                </div>
                <div class="form-group">
                  <label>Kategori Pajak</label>
                  <select v-model="form.taxCategory" class="form-input">
                    <option value="">— Tidak ada —</option>
                    <option v-for="t in taxCategories" :key="t.id" :value="t.id">{{ t.name }}</option>
                  </select>
                </div>
                <div class="form-group form-group--full">
                  <label>Deskripsi</label>
                  <input v-model="form.description" class="form-input" placeholder="Deskripsi (opsional)" />
                </div>
                <div class="form-group">
                  <label class="form-check">
                    <input type="checkbox" v-model="form.enableInFinancialInvoices" />
                    Aktifkan di Faktur Finansial
                  </label>
                </div>
                <div class="form-group">
                  <label class="form-check">
                    <input type="checkbox" v-model="form.enableInCash" />
                    Aktifkan di Kas
                  </label>
                </div>

              </div>

              <div v-if="formError" class="form-api-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                {{ formError }}
              </div>
            </div>

            <!-- ── Akuntansi Tab ── -->
            <div v-if="activeFormTab === 'acct'">
              <div class="section-divider">
                <span>Akun Debit / Kredit</span>
                <button class="btn-add-line" @click="openAddAcctModal" :disabled="acctLoading">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  Tambah Akun
                </button>
              </div>

              <div v-if="acctLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>
              <div v-else-if="acctRows.length === 0" class="td-empty" style="padding:24px 0;text-align:left">Belum ada akuntansi. Klik <b>Tambah Akun</b> untuk menambahkan.</div>
              <table v-else class="table" style="margin-top:4px">
                <thead><tr>
                  <th>General Ledger</th>
                  <th>Akun Debit</th>
                  <th>Akun Kredit</th>
                  <th class="th-action">Tindakan</th>
                </tr></thead>
                <tbody>
                  <tr v-for="a in acctRows" :key="a.id" class="tr-data">
                    <td class="td-secondary">{{ a['accountingSchema$_identifier'] || '—' }}</td>
                    <td class="td-secondary">{{ a['glitemDebitAcct$_identifier'] || '—' }}</td>
                    <td class="td-secondary">{{ a['glitemCreditAcct$_identifier'] || '—' }}</td>
                    <td class="td-action-cell">
                      <button class="action-btn action-btn--more" style="color:#ef4444" @click="deleteAcctRow(a)" title="Hapus">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div v-if="acctError" class="form-api-error" style="margin-top:12px">{{ acctError }}</div>
            </div>

          </div>

          <div class="modal-footer">
            <button class="btn btn--ghost" @click="closeFormModal" :disabled="saving">Batal</button>
            <button v-if="activeFormTab === 'header'" class="btn btn--primary" @click="saveHeader" :disabled="saving">
              <span v-if="saving" class="spinner"></span>
              {{ isEdit ? 'Simpan Perubahan' : 'Simpan & Lanjut' }}
            </button>
          </div>

        </div>
      </div>
    </transition>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- ADD ACCOUNT MODAL                                      -->
    <!-- ══════════════════════════════════════════════════════ -->
    <transition name="fade">
      <div v-if="showAcctModal" class="modal-overlay" @mousedown.self="showAcctModal = false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <div class="modal-title">Tambah Akun G/L Item</div>
            <button class="modal-close" @click="showAcctModal = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group" style="margin-bottom:12px">
              <label>General Ledger <span class="req">*</span></label>
              <select v-model="acctForm.accountingSchema" class="form-input">
                <option value="">Pilih General Ledger</option>
                <option v-for="s in acctSchemas" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom:12px">
              <label>Akun Debit</label>
              <div class="acc-wrap">
                <input v-model="acctForm.debitSearch" class="acc-input" placeholder="Cari kode / nama akun..."
                  @input="onDebitSearch" @focus="showDebitDrop = true" @blur="onDebitBlur" />
                <svg class="acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                <ul v-if="showDebitDrop && filteredDebitAccts.length" class="acc-dropdown">
                  <li v-for="a in filteredDebitAccts" :key="a.id" class="acc-opt" @mousedown.prevent="selectDebit(a)">{{ a['account$_identifier'] || a._identifier || a.combination }}</li>
                </ul>
                <ul v-else-if="showDebitDrop && acctForm.debitSearch.length > 1 && !debitLoading" class="acc-dropdown">
                  <li class="acc-empty">Akun tidak ditemukan</li>
                </ul>
              </div>
            </div>
            <div class="form-group">
              <label>Akun Kredit</label>
              <div class="acc-wrap">
                <input v-model="acctForm.creditSearch" class="acc-input" placeholder="Cari kode / nama akun..."
                  @input="onCreditSearch" @focus="showCreditDrop = true" @blur="onCreditBlur" />
                <svg class="acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                <ul v-if="showCreditDrop && filteredCreditAccts.length" class="acc-dropdown">
                  <li v-for="a in filteredCreditAccts" :key="a.id" class="acc-opt" @mousedown.prevent="selectCredit(a)">{{ a['account$_identifier'] || a._identifier || a.combination }}</li>
                </ul>
                <ul v-else-if="showCreditDrop && acctForm.creditSearch.length > 1 && !creditLoading" class="acc-dropdown">
                  <li class="acc-empty">Akun tidak ditemukan</li>
                </ul>
              </div>
            </div>
            <div v-if="acctFormError" class="form-api-error" style="margin-top:10px">{{ acctFormError }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="showAcctModal = false">Batal</button>
            <button class="btn btn--primary" @click="saveAcctRow" :disabled="savingAcct">
              <span v-if="savingAcct" class="spinner"></span>
              Simpan
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- VIEW MODAL                                             -->
    <!-- ══════════════════════════════════════════════════════ -->
    <transition name="fade">
      <div v-if="showViewModal" class="modal-overlay" @mousedown.self="showViewModal = false">
        <div class="modal modal--lg">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>G/L Item</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">Detail</span>
              </div>
              <div class="modal-title">{{ viewRow?.name || '—' }}</div>
            </div>
            <button class="modal-close" @click="showViewModal = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="detail-grid" style="margin-bottom:20px">
              <div class="detail-item">
                <div class="detail-label">Nama</div>
                <div class="detail-value">{{ viewRow?.name || '—' }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Kategori Pajak</div>
                <div class="detail-value">{{ viewRow?.['taxCategory$_identifier'] || '—' }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Faktur Finansial</div>
                <div class="detail-value"><span :class="['status-pill', viewRow?.enableInFinancialInvoices ? 'status-complete' : 'status-void']">{{ viewRow?.enableInFinancialInvoices ? 'Ya' : 'Tidak' }}</span></div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Kas</div>
                <div class="detail-value"><span :class="['status-pill', viewRow?.enableInCash ? 'status-complete' : 'status-void']">{{ viewRow?.enableInCash ? 'Ya' : 'Tidak' }}</span></div>
              </div>
              <div class="detail-item detail-item--full">
                <div class="detail-label">Deskripsi</div>
                <div class="detail-value">{{ viewRow?.description || '—' }}</div>
              </div>
            </div>

            <div class="section-divider"><span>Akuntansi</span></div>
            <div v-if="viewAcctLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>
            <div v-else-if="viewAcctRows.length === 0" class="td-empty" style="padding:16px 0;text-align:left;font-size:13px">Belum ada akun yang dikonfigurasi.</div>
            <table v-else class="table">
              <thead><tr>
                <th>General Ledger</th>
                <th>Akun Debit</th>
                <th>Akun Kredit</th>
              </tr></thead>
              <tbody>
                <tr v-for="a in viewAcctRows" :key="a.id" class="tr-data">
                  <td class="td-secondary">{{ a['accountingSchema$_identifier'] || '—' }}</td>
                  <td class="td-secondary">{{ a['glitemDebitAcct$_identifier'] || '—' }}</td>
                  <td class="td-secondary">{{ a['glitemCreditAcct$_identifier'] || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="showViewModal = false">Tutup</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- DELETE MODAL                                           -->
    <!-- ══════════════════════════════════════════════════════ -->
    <transition name="fade">
      <div v-if="showDeleteModal" class="modal-overlay" @mousedown.self="showDeleteModal = false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <div class="modal-title">Hapus G/L Item</div>
            <button class="modal-close" @click="showDeleteModal = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-text">Yakin ingin menghapus G/L Item <strong>{{ deleteTarget?.name }}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
            <div v-if="deleteError" class="form-api-error" style="margin-top:10px">{{ deleteError }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="showDeleteModal = false" :disabled="deleting">Batal</button>
            <button class="btn btn--danger" @click="doDelete" :disabled="deleting">
              <span v-if="deleting" class="spinner"></span>
              Hapus
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══ TOAST ══ -->
    <transition name="fade">
      <div v-if="toast.show" :class="['toast', toast.type === 'success' ? 'toast--success' : 'toast--error']">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path v-if="toast.type === 'success'" d="M20 6 9 17l-5-5"/>
          <path v-else d="M18 6 6 18M6 6l12 12"/>
        </svg>
        {{ toast.message }}
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  fetchAllGLItems, fetchGLItemAccounts,
  createGLItem, updateGLItem, deleteGLItem,
  createGLItemAccount, deleteGLItemAccount,
  searchAccounts, fetchAcctSchemas, fetchTaxCategories,
  DEFAULT_ORGANIZATION,
} from '@/services/glItem.js'

// ════════════════════════════════════════════════════
// STATE — TABLE
// ════════════════════════════════════════════════════
const PAGE_SIZE   = 20
const rows        = ref([])
const loading     = ref(false)
const error       = ref('')
const searchQuery = ref('')
const currentPage = ref(1)
const totalRows   = ref(0)
let   searchTimer = null

const openDropdown = ref(null)
const dropdownPos  = ref({ top: 0, right: 0 })

// ════════════════════════════════════════════════════
// STATE — FORM MODAL
// ════════════════════════════════════════════════════
const showFormModal  = ref(false)
const isEdit         = ref(false)
const editId         = ref(null)
const savedGLItemId  = ref(null)
const activeFormTab  = ref('header')
const saving         = ref(false)
const formError      = ref('')

const emptyForm = () => ({
  name: '',
  description: '',
  enableInFinancialInvoices: false,
  enableInCash: false,
  taxCategory: '',
})
const form = ref(emptyForm())

// ── Lookup lists (Tax Category & Accounting Schema)
const taxCategories = ref([])
const acctSchemas    = ref([])

// ════════════════════════════════════════════════════
// STATE — ACCOUNTING TAB
// ════════════════════════════════════════════════════
const acctRows    = ref([])
const acctLoading = ref(false)
const acctError   = ref('')

const showAcctModal  = ref(false)
const savingAcct     = ref(false)
const acctFormError  = ref('')
const acctForm = ref({ accountingSchema: '', debitId: null, debitSearch: '', creditId: null, creditSearch: '' })

const filteredDebitAccts  = ref([])
const filteredCreditAccts = ref([])
const showDebitDrop       = ref(false)
const showCreditDrop      = ref(false)
const debitLoading        = ref(false)
const creditLoading       = ref(false)
let   debitTimer  = null
let   creditTimer = null

// ════════════════════════════════════════════════════
// STATE — VIEW MODAL
// ════════════════════════════════════════════════════
const showViewModal    = ref(false)
const viewRow          = ref(null)
const viewAcctRows     = ref([])
const viewAcctLoading  = ref(false)

// ════════════════════════════════════════════════════
// STATE — DELETE MODAL
// ════════════════════════════════════════════════════
const showDeleteModal = ref(false)
const deleteTarget    = ref(null)
const deleting        = ref(false)
const deleteError     = ref('')

// ════════════════════════════════════════════════════
// STATE — TOAST
// ════════════════════════════════════════════════════
const toast = ref({ show: false, type: 'success', message: '' })

// ════════════════════════════════════════════════════
// COMPUTED
// ════════════════════════════════════════════════════
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / PAGE_SIZE)))
const pageNumbers = computed(() => {
  const tp = totalPages.value, cp = currentPage.value, pages = []
  if (tp <= 1) return [1]
  if (tp <= 7) { for (let i = 1; i <= tp; i++) pages.push(i); return pages }
  pages.push(1)
  if (cp > 3) pages.push('...')
  for (let i = Math.max(2, cp - 1); i <= Math.min(tp - 1, cp + 1); i++) pages.push(i)
  if (cp < tp - 2) pages.push('...')
  pages.push(tp)
  return pages
})

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════
function showToast(msg, type = 'success') {
  toast.value = { show: true, type, message: msg }
  setTimeout(() => { toast.value.show = false }, 3000)
}

// ════════════════════════════════════════════════════
// LOAD ROWS
// ════════════════════════════════════════════════════
async function loadRows() {
  loading.value = true; error.value = ''
  try {
    const startRow = (currentPage.value - 1) * PAGE_SIZE
    const res = await fetchAllGLItems({ startRow, pageSize: PAGE_SIZE, search: searchQuery.value })
    rows.value = res.data ?? []
    const tr = res.totalRows ?? res.total ?? res.count ?? null
    if (tr !== null && !isNaN(Number(tr))) {
      totalRows.value = Number(tr)
    } else {
      const fetched = rows.value.length
      totalRows.value = fetched === PAGE_SIZE ? startRow + fetched + 1 : startRow + fetched
    }
  } catch (e) { error.value = e.message }
  finally { loading.value = false }
}

// ════════════════════════════════════════════════════
// PAGINATION / SEARCH
// ════════════════════════════════════════════════════
async function goPage(p) {
  if (p < 1) return
  currentPage.value = p
  await loadRows()
}
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { currentPage.value = 1; loadRows() }, 400)
}

// ════════════════════════════════════════════════════
// DROPDOWN
// ════════════════════════════════════════════════════
function toggleDropdown(id, e) {
  if (openDropdown.value === id) { openDropdown.value = null; return }
  openDropdown.value = id
  const btn = e.currentTarget.getBoundingClientRect()
  dropdownPos.value = { top: btn.bottom + 4, right: window.innerWidth - btn.right }
}
function closeDropdown() { openDropdown.value = null }

// ════════════════════════════════════════════════════
// OPEN MODALS
// ════════════════════════════════════════════════════
function openCreateModal() {
  isEdit.value = false; editId.value = null; savedGLItemId.value = null
  activeFormTab.value = 'header'; formError.value = ''
  form.value = emptyForm()
  acctRows.value = []; acctError.value = ''
  showFormModal.value = true
}

function openEditModal(r) {
  isEdit.value = true; editId.value = r.id; savedGLItemId.value = r.id
  activeFormTab.value = 'header'; formError.value = ''
  form.value = {
    name:                       r.name        || '',
    description:                r.description || '',
    enableInFinancialInvoices:  !!r.enableInFinancialInvoices,
    enableInCash:               !!r.enableInCash,
    taxCategory:                r.taxCategory || '',
  }
  acctRows.value = []; acctError.value = ''
  showFormModal.value = true
}

function openViewModal(r) {
  viewRow.value = { ...r }
  viewAcctRows.value = []; viewAcctLoading.value = true
  showViewModal.value = true
  fetchGLItemAccounts(r.id)
    .then(d => { viewAcctRows.value = d })
    .catch(() => { viewAcctRows.value = [] })
    .finally(() => { viewAcctLoading.value = false })
}

// ════════════════════════════════════════════════════
// SAVE HEADER
// ════════════════════════════════════════════════════
async function saveHeader() {
  formError.value = ''
  if (!form.value.name.trim()) { formError.value = 'Nama wajib diisi.'; return }

  saving.value = true
  try {
    if (isEdit.value) {
      await updateGLItem(editId.value, form.value)
      showToast('G/L Item berhasil diupdate.')
      await loadRows()
    } else {
      const result = await createGLItem({ ...form.value, organization: DEFAULT_ORGANIZATION })
      savedGLItemId.value = result.id
      showToast('G/L Item tersimpan. Lanjutkan ke tab Akuntansi.')
      activeFormTab.value = 'acct'
      await loadRows()
      await loadAcctRows()
    }
  } catch (e) {
    formError.value = e.message || 'Gagal menyimpan G/L Item.'
  } finally { saving.value = false }
}

// ════════════════════════════════════════════════════
// ACCOUNTING TAB
// ════════════════════════════════════════════════════
async function switchToAcctTab() {
  const id = savedGLItemId.value || editId.value
  if (!id) { formError.value = 'Simpan header terlebih dahulu.'; return }
  formError.value = ''; activeFormTab.value = 'acct'
  if (acctRows.value.length === 0) await loadAcctRows()
}

async function loadAcctRows() {
  const id = savedGLItemId.value || editId.value
  if (!id) return
  acctLoading.value = true; acctError.value = ''
  try { acctRows.value = await fetchGLItemAccounts(id) }
  catch (e) { acctError.value = e.message }
  finally { acctLoading.value = false }
}

function openAddAcctModal() {
  acctForm.value = {
    accountingSchema: acctSchemas.value.length === 1 ? acctSchemas.value[0].id : '',
    debitId: null, debitSearch: '', creditId: null, creditSearch: '',
  }
  acctFormError.value = ''; filteredDebitAccts.value = []; filteredCreditAccts.value = []
  showAcctModal.value = true
}

// ── akun debit search
function onDebitSearch() {
  showDebitDrop.value = true
  clearTimeout(debitTimer)
  if (acctForm.value.debitSearch.length < 2) { filteredDebitAccts.value = []; return }
  debitLoading.value = true
  debitTimer = setTimeout(async () => {
    try { filteredDebitAccts.value = await searchAccounts(acctForm.value.debitSearch) }
    catch { filteredDebitAccts.value = [] }
    finally { debitLoading.value = false }
  }, 300)
}
function onDebitBlur() { setTimeout(() => { showDebitDrop.value = false }, 200) }
function selectDebit(a) {
  acctForm.value.debitId = a.id
  acctForm.value.debitSearch = a['account$_identifier'] || a._identifier || a.combination
  showDebitDrop.value = false; filteredDebitAccts.value = []
}

// ── akun kredit search
function onCreditSearch() {
  showCreditDrop.value = true
  clearTimeout(creditTimer)
  if (acctForm.value.creditSearch.length < 2) { filteredCreditAccts.value = []; return }
  creditLoading.value = true
  creditTimer = setTimeout(async () => {
    try { filteredCreditAccts.value = await searchAccounts(acctForm.value.creditSearch) }
    catch { filteredCreditAccts.value = [] }
    finally { creditLoading.value = false }
  }, 300)
}
function onCreditBlur() { setTimeout(() => { showCreditDrop.value = false }, 200) }
function selectCredit(a) {
  acctForm.value.creditId = a.id
  acctForm.value.creditSearch = a['account$_identifier'] || a._identifier || a.combination
  showCreditDrop.value = false; filteredCreditAccts.value = []
}

async function saveAcctRow() {
  acctFormError.value = ''
  if (!acctForm.value.accountingSchema) {
    acctFormError.value = 'Pilih General Ledger (Accounting Schema) terlebih dahulu.'; return
  }
  if (!acctForm.value.debitId && !acctForm.value.creditId) {
    acctFormError.value = 'Pilih minimal satu akun (debit atau kredit).'; return
  }
  const id = savedGLItemId.value || editId.value
  savingAcct.value = true
  try {
    await createGLItemAccount(id, {
      accountingSchema:  acctForm.value.accountingSchema,
      glitemDebitAcct:   acctForm.value.debitId  || null,
      glitemCreditAcct:  acctForm.value.creditId || null,
    })
    showAcctModal.value = false
    showToast('Akun berhasil ditambahkan.')
    await loadAcctRows()
  } catch (e) {
    acctFormError.value = e.message || 'Gagal menyimpan akun.'
  } finally { savingAcct.value = false }
}

async function deleteAcctRow(a) {
  acctError.value = ''
  try {
    await deleteGLItemAccount(a.id)
    showToast('Akun berhasil dihapus.')
    await loadAcctRows()
  } catch (e) {
    acctError.value = e.message || 'Gagal menghapus akun.'
  }
}

// ════════════════════════════════════════════════════
// CLOSE FORM MODAL
// ════════════════════════════════════════════════════
function closeFormModal() {
  if (saving.value || savingAcct.value) return
  showFormModal.value = false
  savedGLItemId.value = null
}

// ════════════════════════════════════════════════════
// DELETE
// ════════════════════════════════════════════════════
function confirmDelete(r) {
  deleteTarget.value = { ...r }; deleteError.value = ''
  showDeleteModal.value = true
}
async function doDelete() {
  deleting.value = true; deleteError.value = ''
  try {
    await deleteGLItem(deleteTarget.value.id)
    showDeleteModal.value = false
    showToast('G/L Item berhasil dihapus.')
    await loadRows()
  } catch (e) {
    deleteError.value = e.message || 'Gagal menghapus.'
  } finally { deleting.value = false }
}

// ════════════════════════════════════════════════════
// LOOKUP LISTS — Tax Category & Accounting Schema
// ════════════════════════════════════════════════════
async function loadLookups() {
  try {
    const [taxCats, schemas] = await Promise.all([fetchTaxCategories(), fetchAcctSchemas()])
    taxCategories.value = taxCats
    acctSchemas.value   = schemas
  } catch (e) {
    console.warn('[GLItem] Gagal memuat lookup list:', e.message)
  }
}

onMounted(() => { loadRows(); loadLookups() })
</script>

<style scoped>
:root {
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --bg: #f1f5f9; --surface: #ffffff; --surface2: #f8fafc;
  --border: #e2e8f0; --accent: #3b82f6; --accent-light: #eff6ff;
  --text-primary: #0f172a; --text-secondary: #475569; --text-muted: #94a3b8;
  --danger: #ef4444;
  --radius: 10px; --radius-sm: 6px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,.06);
  --shadow-md: 0 4px 16px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,.04);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
.layout { display: flex; flex-direction: column; min-height: 100vh; background: var(--bg); font-family: var(--font); }
.main { flex: 1; padding: 28px 24px; max-width: 1280px; margin: 0 auto; width: 100%; }
.content-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-sm); overflow: hidden; }

.page-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); }
.page-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }

.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--border); }
.search-wrap { position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 10px; color: var(--text-muted); pointer-events: none; }
.search-input { height: 36px; padding: 0 12px 0 32px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; font-family: var(--font); background: var(--surface2); width: 280px; transition: border-color .15s; }
.search-input:focus { border-color: var(--accent); background: #fff; }

.btn { display: inline-flex; align-items: center; gap: 6px; padding: 0 16px; height: 36px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font); transition: all .15s; }
.btn--primary { background: var(--accent); color: #fff; }
.btn--primary:hover:not(:disabled) { background: #2563eb; }
.btn--ghost { background: var(--surface2); border: 1px solid var(--border); color: var(--text-secondary); }
.btn--ghost:hover:not(:disabled) { background: var(--border); }
.btn--danger { background: var(--danger); color: #fff; }
.btn--danger:hover:not(:disabled) { background: #dc2626; }
.btn:disabled { opacity: .5; cursor: not-allowed; }

.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table thead th { background: var(--surface2); color: var(--text-muted); font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; padding: 10px 16px; border-bottom: 1px solid var(--border); white-space: nowrap; text-align: left; }
.th-action { text-align: right; width: 80px; }
.table tbody tr td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tr-data:hover { background: var(--surface2); }
.tr-data:last-child td { border-bottom: none; }

.code-badge { font-family: var(--font-mono); font-size: 11.5px; font-weight: 500; background: var(--surface2); border: 1px solid var(--border); padding: 3px 8px; border-radius: 4px; color: var(--text-secondary); white-space: nowrap; }
.td-secondary { color: var(--text-secondary); font-size: 13px; }
.td-clip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280px; }
.td-name { font-weight: 500; }
.td-empty { text-align: center; color: var(--text-muted); padding: 48px 16px; font-size: 13px; }
.td-error { color: var(--danger); }
.td-action-cell { text-align: right; overflow: visible !important; }

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

.loading-dots { display: flex; gap: 6px; justify-content: center; align-items: center; }
.loading-dots span { width: 7px; height: 7px; background: var(--accent); border-radius: 50%; animation: bounce 1.2s infinite ease-in-out; }
.loading-dots span:nth-child(2) { animation-delay: .2s; }
.loading-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes bounce { 0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1} }

.pagination { display: flex; align-items: center; justify-content: flex-end; gap: 2px; padding: 14px 20px; background: var(--bg); }
.page-btn { min-width: 36px; height: 36px; padding: 0 10px; border-radius: 10px; border: none; background: transparent; color: #94a3b8; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; font-family: var(--font); }
.page-btn:hover:not(:disabled):not(.page-btn--active) { color: var(--text-primary); background: rgba(0,0,0,.05); }
.page-btn--active { background: #fff !important; color: #1e293b !important; font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.07); }
.page-btn:disabled { opacity: .3; cursor: not-allowed; }
.page-ellipsis { color: var(--text-muted); padding: 0 4px; font-size: 13px; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(2px); }
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); width: 100%; max-width: 480px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; }
.modal--lg { max-width: 640px; }
.modal--sm { max-width: 420px; }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 20px 12px; border-bottom: 1px solid var(--border); gap: 12px; flex-shrink: 0; }
.modal-breadcrumb { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-muted); margin-bottom: 4px; }
.bc-active { color: var(--accent); font-weight: 500; }
.modal-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.modal-close { background: none; border: none; color: var(--text-muted); display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; transition: background .12s; flex-shrink: 0; }
.modal-close:hover { background: var(--surface2); color: var(--text-primary); }
.modal-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); padding: 0 20px; flex-shrink: 0; }
.modal-tab { padding: 10px 14px; font-size: 13px; font-weight: 500; color: var(--text-secondary); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-family: var(--font); transition: all .15s; margin-bottom: -1px; }
.modal-tab--active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
.modal-tab:disabled { opacity: .4; cursor: not-allowed; }
.modal-body { padding: 20px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0; }

.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group--full { grid-column: 1 / -1; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-check { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: var(--text-primary); cursor: pointer; height: 36px; }
.form-check input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; accent-color: var(--accent); }
.status-pill { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
.status-complete { background: #dcfce7; color: #15803d; }
.status-void { background: #f1f5f9; color: #64748b; }
.form-input { width: 100%; height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); }
.form-input:focus { border-color: var(--accent); background: #fff; }
.req { color: var(--danger); }
.form-api-error { margin-top: 14px; padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; }

.acc-wrap { position: relative; width: 100%; }
.acc-input { display: block; width: 100%; height: 36px; padding: 0 32px 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.acc-input:focus { border-color: var(--accent); background: #fff; }
.acc-chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.acc-dropdown { position: absolute; z-index: 300; top: calc(100% + 3px); left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); max-height: 200px; overflow-y: auto; list-style: none; margin: 0; padding: 4px 0; }
.acc-opt { padding: 8px 12px; font-size: 12.5px; color: var(--text-primary); cursor: pointer; transition: background .1s; }
.acc-opt:hover { background: var(--accent-light); }
.acc-empty { padding: 8px 12px; font-size: 12.5px; color: var(--text-muted); font-style: italic; }

.section-divider { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin: 0 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.btn-add-line { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--accent); background: var(--accent-light); border: 1px solid #bfdbfe; border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-family: var(--font); transition: background .12s; }
.btn-add-line:hover:not(:disabled) { background: #dbeafe; }
.btn-add-line:disabled { opacity: .4; cursor: not-allowed; }

.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-item--full { grid-column: 1 / -1; }
.detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.detail-value { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }
.detail-value.mono { font-family: var(--font-mono); font-size: 12.5px; }

.delete-text { font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); }
.delete-text strong { color: var(--text-primary); }

.toast { position: fixed; bottom: 24px; right: 24px; z-index: 2000; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); }
.toast--success { background: #16a34a; color: #fff; }
.toast--error   { background: var(--danger); color: #fff; }

.spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.fade-enter-active,.fade-leave-active { transition: opacity .15s; }
.fade-enter-from,.fade-leave-to { opacity: 0; }
</style>