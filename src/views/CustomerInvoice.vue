<template>
  <div class="layout">
    <main class="main">
      <div class="content-card">

        <div class="page-header">
          <h2 class="page-title">Customer Invoice</h2>
        </div>

        <!-- ══ TOOLBAR ══ -->
        <div class="toolbar">
          <div class="search-wrap">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input v-model="searchQuery" class="search-input" placeholder="Search invoice no or customer..." @input="onSearch" />
          </div>
          <button class="btn btn--primary" @click="openCreateModal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Create Customer Invoice
          </button>
        </div>

        <!-- ══ LIST LABEL ══ -->
        <div class="list-label">List Customer Invoice</div>

        <!-- ══ TABLE ══ -->
        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th>No Invoice</th>
              <th>Meter Id</th>
              <th>Organization</th>
              <th>Customer</th>
              <th>Total Usage</th>
              <th>Status</th>
              <th class="th-action">Action</th>
            </tr></thead>
            <tbody>
              <tr v-if="loading"><td colspan="7" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
              <tr v-else-if="error"><td colspan="7" class="td-empty td-error">{{ error }}</td></tr>
              <tr v-else-if="rows.length === 0"><td colspan="7" class="td-empty">No customer invoices found.</td></tr>
              <template v-else>
                <tr v-for="r in rows" :key="r.id" class="tr-data">
                  <td><span class="code-badge">{{ r.documentNo || '—' }}</span></td>
                  <td class="td-secondary">{{ r.kodePelanggan || r['businessPartner$_identifier'] || '—' }}</td>
                  <td class="td-clip">{{ r['organization$_identifier'] || '—' }}</td>
                  <td class="td-clip">{{ r['businessPartner$_identifier'] || '—' }}</td>
                  <td class="td-secondary">{{ r.totalUsage ?? '—' }}</td>
                  <td>
                    <span :class="['status-pill', statusClass(r.documentStatus)]">{{ statusLabel(r.documentStatus) }}</span>
                  </td>
                  <td class="td-action-cell">
                    <div class="action-group">
                      <button class="btn-view" @click="openViewModal(r)">View</button>
                      <div class="dropdown-wrap" v-click-outside="closeDropdown">
                        <button class="action-btn action-btn--more" @click.stop="toggleDropdown(r.id, $event)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                        <div v-if="openDropdown === r.id" class="dropdown-menu" :style="{ top: dropdownPos.top + 'px', right: dropdownPos.right + 'px' }">
                          <button class="dropdown-item" @click="openEditModal(r)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit
                          </button>
                          <button class="dropdown-item dropdown-item--danger" @click="confirmDelete(r)">
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

        <!-- ══ PAGINATION ══ -->
        <div v-if="totalPages > 1" class="pagination">
          <button class="page-btn" :disabled="currentPage === 1" @click="goPage(currentPage - 1)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <template v-for="p in pageNumbers" :key="p">
            <span v-if="p === '...'" class="page-ellipsis">…</span>
            <button v-else :class="['page-btn', p === currentPage ? 'page-btn--active' : '']" @click="goPage(p)">{{ p }}</button>
          </template>
          <button class="page-btn" :disabled="currentPage === totalPages" @click="goPage(currentPage + 1)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

      </div>
    </main>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- CREATE / EDIT MODAL -->
    <!-- ══════════════════════════════════════════════════════ -->
    <transition name="fade">
      <div v-if="showFormModal" class="modal-overlay" @mousedown.self="closeFormModal">
        <div class="modal modal--xl">

          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Dashboard</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span>List Invoice</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">{{ isEdit ? 'Edit' : 'Create' }} Invoice</span>
              </div>
              <div class="modal-title">{{ isEdit ? 'Edit' : 'Create' }} Invoice</div>
            </div>
            <button class="modal-close" @click="closeFormModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="modal-body">

            <!-- ── Information Section ── -->
            <div class="section-label">Information</div>
            <div class="form-grid-3">
              <div class="form-group">
                <label>Invoice No.</label>
                <input v-model="form.documentNo" class="form-input" placeholder="00000000" disabled />
              </div>
              <div class="form-group">
                <label>Organization</label>
                <select v-model="form.organization" class="form-input" disabled>
                  <option value="">Select</option>
                </select>
              </div>
              <div class="form-group">
                <label>Invoice Date</label>
                <input v-model="form.invoiceDate" type="date" class="form-input" />
              </div>

              <div class="form-group">
                <label>Customer</label>
                <div class="acc-wrap">
                  <input v-model="customerSearch" class="acc-input" placeholder="Select..." @input="onCustomerSearch" @focus="showCustomerDrop = true" @blur="onBlur('customer')" />
                  <svg class="acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                  <ul v-if="showCustomerDrop && filteredCustomers.length" class="acc-dropdown">
                    <li v-for="c in filteredCustomers" :key="c.id" class="acc-opt" @mousedown.prevent="selectCustomer(c)">{{ c.name }}</li>
                  </ul>
                  <ul v-else-if="showCustomerDrop && customerSearch.length > 1 && !filteredCustomers.length" class="acc-dropdown">
                    <li class="acc-empty">No customers found</li>
                  </ul>
                </div>
              </div>
              <div class="form-group">
                <label>Payment Terms</label>
                <div class="acc-wrap">
                  <input v-model="payTermSearch" class="acc-input" placeholder="Select..." @input="showPayTermDrop = true" @focus="showPayTermDrop = true" @blur="onBlur('payterm')" />
                  <svg class="acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                  <ul v-if="showPayTermDrop && filteredPayTerms.length" class="acc-dropdown">
                    <li v-for="p in filteredPayTerms" :key="p.id" class="acc-opt" @mousedown.prevent="selectPayTerm(p)">{{ p.name }}</li>
                  </ul>
                </div>
              </div>
              <div class="form-group">
                <label>Stand Awal</label>
                <input v-model.number="form.standAwal" type="number" min="0" class="form-input" placeholder="0" />
              </div>

              <div class="form-group">
                <label>Stand Akhir</label>
                <input v-model.number="form.standAkhir" type="number" min="0" class="form-input" placeholder="0" @input="calcUsage" />
              </div>
              <div class="form-group">
                <label>Kode Pelanggan</label>
                <input v-model="form.kodePelanggan" class="form-input" placeholder="Kode Pelanggan" />
              </div>
              <div class="form-group">
                <label>Transaction Doc</label>
                <div class="acc-wrap">
                  <input v-model="docTypeSearch" class="acc-input" placeholder="Select..." @input="showDocTypeDrop = true" @focus="showDocTypeDrop = true" @blur="onBlur('doctype')" />
                  <svg class="acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                  <ul v-if="showDocTypeDrop && filteredDocTypes.length" class="acc-dropdown">
                    <li v-for="d in filteredDocTypes" :key="d.id" class="acc-opt" @mousedown.prevent="selectDocType(d)">{{ d.name }}</li>
                  </ul>
                </div>
              </div>

              <div class="form-group">
                <label>Total Usage</label>
                <input v-model.number="form.totalUsage" type="number" class="form-input" placeholder="0" style="background:#f8fafc" readonly />
              </div>
              <div class="form-group">
                <label>Partner Address</label>
                <select v-model="form.partnerAddress" class="form-input" :disabled="!form.businessPartner">
                  <option value="">Select</option>
                  <option v-for="l in partnerLocations" :key="l.id" :value="l.id">{{ l['locationAddress$_identifier'] || l.name || l.id }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Payment Method</label>
                <div class="acc-wrap">
                  <input v-model="payMethodSearch" class="acc-input" placeholder="Select..." @input="showPayMethodDrop = true" @focus="showPayMethodDrop = true" @blur="onBlur('paymethod')" />
                  <svg class="acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                  <ul v-if="showPayMethodDrop && filteredPayMethods.length" class="acc-dropdown">
                    <li v-for="m in filteredPayMethods" :key="m.id" class="acc-opt" @mousedown.prevent="selectPayMethod(m)">{{ m.name }}</li>
                  </ul>
                </div>
              </div>

              <div class="form-group" style="grid-column: 3">
                <label>Note</label>
                <textarea v-model="form.description" class="form-input form-textarea" placeholder="Additional Note" rows="2"></textarea>
              </div>
            </div>

            <!-- ── Item Detail ── -->
            <div class="section-divider">
              Item Detail
              <button class="btn-add-line" @click="addLine">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                Add Item
              </button>
            </div>
            <div class="table-wrap" style="margin-bottom:0">
              <table class="table table--lines">
                <thead><tr>
                  <th>Product</th>
                  <th style="width:90px">Quantity</th>
                  <th style="width:70px">UOM</th>
                  <th style="width:120px">Unit Price</th>
                  <th style="width:110px">Tax</th>
                  <th style="width:120px">Net Amount</th>
                  <th style="width:32px"></th>
                </tr></thead>
                <tbody>
                  <tr v-if="lines.length === 0"><td colspan="7" class="td-empty" style="padding:16px">No items. Click "Add Item".</td></tr>
                  <tr v-for="(line, idx) in lines" :key="idx">
                    <td>
                      <div class="acc-wrap">
                        <input v-model="line.productSearch" class="acc-input acc-input--sm" placeholder="Select product..." @input="onProductSearch(line)" @focus="line.showDrop = true" @blur="onProductBlur(line)" />
                        <ul v-if="line.showDrop && line.productOptions.length" class="acc-dropdown">
                          <li v-for="p in line.productOptions" :key="p.id" class="acc-opt" @mousedown.prevent="selectProduct(line, p)">{{ p.name }}</li>
                        </ul>
                      </div>
                    </td>
                    <td><input v-model.number="line.invoicedQuantity" type="number" min="0" class="form-input form-input--sm" @input="calcLine(line)" /></td>
                    <td><span class="uom-badge">{{ line.uomLabel || 'Pcs' }}</span></td>
                    <td>
                      <div class="price-input-wrap">
                        <span class="price-prefix">Rp</span>
                        <input v-model.number="line.unitPrice" type="number" min="0" class="form-input form-input--sm price-input" @input="calcLine(line)" />
                      </div>
                    </td>
                    <td>
                      <div class="acc-wrap">
                        <input v-model="line.taxSearch" class="acc-input acc-input--sm" placeholder="PPN..." @input="onTaxSearch(line)" @focus="line.showTaxDrop = true" @blur="onTaxBlur(line)" />
                        <ul v-if="line.showTaxDrop && line.taxOptions.length" class="acc-dropdown">
                          <li v-for="t in line.taxOptions" :key="t.id" class="acc-opt" @mousedown.prevent="selectTax(line, t)">{{ t.name }}</li>
                        </ul>
                      </div>
                    </td>
                    <td>
                      <div class="price-input-wrap">
                        <span class="price-prefix">RP</span>
                        <input :value="formatNum(line.lineNetAmount)" class="form-input form-input--sm price-input" readonly style="background:#f8fafc" />
                      </div>
                    </td>
                    <td>
                      <button class="btn-rm-line" @click="removeLine(idx)">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- ── Totals ── -->
            <div class="totals-block">
              <div class="totals-row"><span>Subtotal</span><span>Rp {{ formatNum(subtotal) }}</span></div>
              <div class="totals-row"><span>Total Pajak</span><span>Rp {{ formatNum(totalTax) }}</span></div>
              <div class="totals-row totals-row--grand"><span>Total Invoice</span><span>Rp {{ formatNum(grandTotal) }}</span></div>
            </div>

            <div v-if="formError" class="form-api-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ formError }}
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn--ghost" @click="closeFormModal">Cancel</button>
            <button class="btn btn--primary" :disabled="saving" @click="saveInvoice">
              <span v-if="saving" class="spinner"></span>
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- VIEW MODAL -->
    <!-- ══════════════════════════════════════════════════════ -->
    <transition name="fade">
      <div v-if="showViewModal" class="modal-overlay" @mousedown.self="showViewModal = false">
        <div class="modal modal--xl">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Dashboard</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span>List Invoice</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">View Invoice</span>
              </div>
              <div class="modal-title">Invoice — {{ viewRow?.documentNo }}</div>
            </div>
            <button class="modal-close" @click="showViewModal = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body" v-if="viewRow">
            <div class="detail-grid">
              <div class="detail-item"><span class="detail-label">Invoice No.</span><span class="detail-value mono">{{ viewRow.documentNo }}</span></div>
              <div class="detail-item"><span class="detail-label">Invoice Date</span><span class="detail-value">{{ formatDate(viewRow.invoiceDate) }}</span></div>
              <div class="detail-item"><span class="detail-label">Status</span><span :class="['status-pill', statusClass(viewRow.documentStatus)]">{{ statusLabel(viewRow.documentStatus) }}</span></div>
              <div class="detail-item"><span class="detail-label">Customer</span><span class="detail-value">{{ viewRow['businessPartner$_identifier'] || '—' }}</span></div>
              <div class="detail-item"><span class="detail-label">Kode Pelanggan</span><span class="detail-value">{{ viewRow.kodePelanggan || '—' }}</span></div>
              <div class="detail-item"><span class="detail-label">Total Usage</span><span class="detail-value">{{ viewRow.totalUsage ?? '—' }}</span></div>
              <div class="detail-item"><span class="detail-label">Payment Terms</span><span class="detail-value">{{ viewRow['paymentTerms$_identifier'] || '—' }}</span></div>
              <div class="detail-item"><span class="detail-label">Payment Method</span><span class="detail-value">{{ viewRow['paymentMethod$_identifier'] || '—' }}</span></div>
              <div class="detail-item"><span class="detail-label">Grand Total</span><span class="detail-value">Rp {{ formatNum(viewRow.grandTotalAmount) }}</span></div>
              <div class="detail-item"><span class="detail-label">Organization</span><span class="detail-value">{{ viewRow['organization$_identifier'] || '—' }}</span></div>
              <div class="detail-item detail-item--full"><span class="detail-label">Description</span><span class="detail-value">{{ viewRow.description || '—' }}</span></div>
            </div>

            <div class="section-divider" style="margin-top:20px">Item Detail</div>
            <div v-if="viewLinesLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>
            <div v-else class="table-wrap" style="margin-bottom:0">
              <table class="table table--lines">
                <thead><tr><th>Product</th><th>Qty</th><th>UOM</th><th>Unit Price</th><th>Tax</th><th>Net Amount</th></tr></thead>
                <tbody>
                  <tr v-if="viewLines.length === 0"><td colspan="6" class="td-empty">No items.</td></tr>
                  <tr v-for="(l, i) in viewLines" :key="l.id">
                    <td>{{ l['product$_identifier'] || '—' }}</td>
                    <td class="td-secondary">{{ l.invoicedQuantity }}</td>
                    <td class="td-secondary">{{ l['uOM$_identifier'] || '—' }}</td>
                    <td class="td-secondary">Rp {{ formatNum(l.unitPrice) }}</td>
                    <td class="td-secondary">{{ l['tax$_identifier'] || l['taxCategory$_identifier'] || '—' }}</td>
                    <td class="td-secondary">Rp {{ formatNum(l.lineNetAmount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- View totals -->
            <div class="totals-block">
              <div class="totals-row"><span>Subtotal</span><span>Rp {{ formatNum(viewRow.summedLineAmount) }}</span></div>
              <div class="totals-row"><span>Total Pajak</span><span>Rp {{ formatNum((viewRow.grandTotalAmount ?? 0) - (viewRow.summedLineAmount ?? 0)) }}</span></div>
              <div class="totals-row totals-row--grand"><span>Total Invoice</span><span>Rp {{ formatNum(viewRow.grandTotalAmount) }}</span></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="showViewModal = false">Close</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══ DELETE CONFIRM ══ -->
    <transition name="fade">
      <div v-if="showDeleteModal" class="modal-overlay" @mousedown.self="showDeleteModal = false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <div class="modal-title">Delete Invoice</div>
            <button class="modal-close" @click="showDeleteModal = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-text">Are you sure you want to delete invoice <strong>{{ deleteRow?.documentNo }}</strong>? This cannot be undone.</p>
            <div v-if="deleteError" class="form-api-error" style="margin-top:10px">{{ deleteError }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="showDeleteModal = false">Cancel</button>
            <button class="btn btn--danger" :disabled="deleting" @click="doDelete">
              <span v-if="deleting" class="spinner"></span>
              {{ deleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══ TOAST ══ -->
    <transition name="fade">
      <div v-if="toast.show" :class="['toast', `toast--${toast.type}`]">
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
  fetchAllInvoices, createInvoice, updateInvoice, deleteInvoice,
  fetchInvoiceLines, createInvoiceLine, updateInvoiceLine,
  fetchCustomers, fetchPartnerLocations, fetchPaymentTerms, fetchPaymentMethods,
  fetchDocumentTypes, fetchProducts, fetchUOMs, fetchTaxCategories,
} from '@/services/customerInvoice.js'

// ── directive
const vClickOutside = {
  mounted(el, binding) {
    el._handler = (e) => { if (!el.contains(e.target)) binding.value(e) }
    document.addEventListener('mousedown', el._handler)
  },
  unmounted(el) { document.removeEventListener('mousedown', el._handler) },
}

// ── table state
const rows = ref([])
const loading = ref(false)
const error = ref('')
const currentPage = ref(1)
const pageSize = 20
const totalCount = ref(0)
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize)))
const searchQuery = ref('')
let searchTimer = null

// ── dropdown
const openDropdown = ref(null)
const dropdownPos = ref({ top: 0, right: 0 })

// ── lookups
const paymentTermsList = ref([])
const paymentMethodsList = ref([])
const documentTypesList = ref([])
const uoms = ref([])
const taxCategories = ref([])
const partnerLocations = ref([])

// ── form state
const showFormModal = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const saving = ref(false)
const formError = ref('')

const emptyForm = () => ({
  documentNo: '', organization: '', invoiceDate: today(),
  businessPartner: '', paymentTerms: '', standAwal: 0, standAkhir: 0,
  kodePelanggan: '', transactionDocument: '', totalUsage: 0,
  partnerAddress: '', paymentMethod: '', description: '',
  salesOrder: '', orderReference: '',
})
const form = ref(emptyForm())

// searchable comboboxes
const customerSearch = ref('')
const filteredCustomers = ref([])
const showCustomerDrop = ref(false)

const payTermSearch = ref('')
const showPayTermDrop = ref(false)
const filteredPayTerms = computed(() => {
  const q = payTermSearch.value.toLowerCase()
  return paymentTermsList.value.filter(p => !q || p.name?.toLowerCase().includes(q)).slice(0, 30)
})

const payMethodSearch = ref('')
const showPayMethodDrop = ref(false)
const filteredPayMethods = computed(() => {
  const q = payMethodSearch.value.toLowerCase()
  return paymentMethodsList.value.filter(m => !q || m.name?.toLowerCase().includes(q)).slice(0, 30)
})

const docTypeSearch = ref('')
const showDocTypeDrop = ref(false)
const filteredDocTypes = computed(() => {
  const q = docTypeSearch.value.toLowerCase()
  return documentTypesList.value.filter(d => !q || d.name?.toLowerCase().includes(q)).slice(0, 30)
})

const lines = ref([])

// ── totals
const subtotal = computed(() => lines.value.reduce((s, l) => s + (l.lineNetAmount || 0), 0))
const totalTax = computed(() => lines.value.reduce((s, l) => s + (l.taxAmount || 0), 0))
const grandTotal = computed(() => subtotal.value + totalTax.value)

// ── view modal
const showViewModal = ref(false)
const viewRow = ref(null)
const viewLines = ref([])
const viewLinesLoading = ref(false)

// ── delete modal
const showDeleteModal = ref(false)
const deleteRow = ref(null)
const deleting = ref(false)
const deleteError = ref('')

// ── toast
const toast = ref({ show: false, type: 'success', message: '' })
function showToast(msg, type = 'success') {
  toast.value = { show: true, type, message: msg }
  setTimeout(() => { toast.value.show = false }, 3000)
}

// ── helpers
function today() { return new Date().toISOString().slice(0, 10) }
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatNum(v) {
  if (v == null || v === '') return '0'
  return Number(v).toLocaleString('id-ID')
}
function statusLabel(s) {
  const map = { DR: 'Draft', CO: 'Completed', CL: 'Closed', VO: 'Voided', RE: 'Reversed' }
  return map[s] || s || 'New'
}
function statusClass(s) {
  if (s === 'CO') return 'status-pill--completed'
  if (s === 'CL') return 'status-pill--closed'
  if (s === 'VO' || s === 'RE') return 'status-pill--voided'
  return 'status-pill--new'
}

const pageNumbers = computed(() => {
  const tp = totalPages.value, cp = currentPage.value, pages = []
  if (tp <= 7) { for (let i = 1; i <= tp; i++) pages.push(i); return pages }
  pages.push(1)
  if (cp > 3) pages.push('...')
  for (let i = Math.max(2, cp - 1); i <= Math.min(tp - 1, cp + 1); i++) pages.push(i)
  if (cp < tp - 2) pages.push('...')
  pages.push(tp)
  return pages
})

// ── load
async function loadInvoices() {
  loading.value = true; error.value = ''
  try {
    const data = await fetchAllInvoices({ startRow: (currentPage.value - 1) * pageSize, pageSize, searchKey: searchQuery.value })
    rows.value = data.data ?? []
    totalCount.value = data.totalRows ?? rows.value.length
  } catch (e) {
    error.value = e?.response?.data?.response?.error?.message || e.message
  } finally { loading.value = false }
}

function goPage(p) { if (p >= 1 && p <= totalPages.value) { currentPage.value = p; loadInvoices() } }
function onSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(() => { currentPage.value = 1; loadInvoices() }, 400) }

function toggleDropdown(id, e) {
  if (openDropdown.value === id) { openDropdown.value = null; return }
  openDropdown.value = id
  const btn = e.currentTarget.getBoundingClientRect()
  dropdownPos.value = { top: btn.bottom + 4, right: window.innerWidth - btn.right }
}
function closeDropdown() { openDropdown.value = null }

// ── load lookups
async function loadLookups() {
  const [pt, pm, dt, u, tc] = await Promise.allSettled([
    fetchPaymentTerms(), fetchPaymentMethods(), fetchDocumentTypes(), fetchUOMs(), fetchTaxCategories(),
  ])
  paymentTermsList.value = pt.value ?? []
  paymentMethodsList.value = pm.value ?? []
  documentTypesList.value = dt.value ?? []
  uoms.value = u.value ?? []
  taxCategories.value = tc.value ?? []
}

// ── blur helper
function onBlur(type) {
  setTimeout(() => {
    if (type === 'customer') showCustomerDrop.value = false
    if (type === 'payterm') showPayTermDrop.value = false
    if (type === 'paymethod') showPayMethodDrop.value = false
    if (type === 'doctype') showDocTypeDrop.value = false
  }, 150)
}

// ── customer
let customerTimer = null
async function onCustomerSearch() {
  showCustomerDrop.value = true
  clearTimeout(customerTimer)
  customerTimer = setTimeout(async () => {
    if (!customerSearch.value.trim()) { filteredCustomers.value = []; return }
    filteredCustomers.value = await fetchCustomers(customerSearch.value)
  }, 300)
}
function selectCustomer(c) {
  form.value.businessPartner = c.id
  customerSearch.value = c.name
  showCustomerDrop.value = false
  loadPLocs(c.id)
}
async function loadPLocs(bpId) {
  form.value.partnerAddress = ''
  partnerLocations.value = await fetchPartnerLocations(bpId)
  if (partnerLocations.value.length === 1) form.value.partnerAddress = partnerLocations.value[0].id
}

function selectPayTerm(p) { form.value.paymentTerms = p.id; payTermSearch.value = p.name; showPayTermDrop.value = false }
function selectPayMethod(m) { form.value.paymentMethod = m.id; payMethodSearch.value = m.name; showPayMethodDrop.value = false }
function selectDocType(d) { form.value.transactionDocument = d.id; docTypeSearch.value = d.name; showDocTypeDrop.value = false }

// ── usage calc
function calcUsage() {
  form.value.totalUsage = Math.max(0, (form.value.standAkhir || 0) - (form.value.standAwal || 0))
}

// ── product search per line
let productTimers = new WeakMap()
async function onProductSearch(line) {
  line.showDrop = true
  const t = productTimers.get(line)
  if (t) clearTimeout(t)
  productTimers.set(line, setTimeout(async () => {
    line.productOptions = await fetchProducts(line.productSearch)
  }, 300))
}
function selectProduct(line, p) {
  line.product = p.id
  line.productSearch = p.name
  line.showDrop = false
  if (p.uOM) {
    line.uOM = p.uOM
    const found = uoms.value.find(u => u.id === p.uOM)
    line.uomLabel = found ? (found.uOMSymbol || found.name) : (p['uOM$_identifier'] || 'Pcs')
  }
  line.unitPrice = p.listPrice || p.standardPrice || 0
  calcLine(line)
}
function onProductBlur(line) { setTimeout(() => { line.showDrop = false }, 150) }

// ── tax search per line
function onTaxSearch(line) {
  line.showTaxDrop = true
  const q = (line.taxSearch || '').toLowerCase()
  line.taxOptions = taxCategories.value.filter(t =>
    !q || (t.name || '').toLowerCase().includes(q)
  ).slice(0, 20)
}
function selectTax(line, t) {
  line.taxCategory = t.id
  line.taxSearch = t.name
  line.taxRate = t.rate || 0
  line.showTaxDrop = false
  calcLine(line)
}
function onTaxBlur(line) { setTimeout(() => { line.showTaxDrop = false }, 150) }

// ── line calc
function calcLine(line) {
  line.lineNetAmount = (line.invoicedQuantity || 0) * (line.unitPrice || 0)
  line.taxAmount = line.lineNetAmount * ((line.taxRate || 0) / 100)
}

// ── line helpers
function newLine() {
  return {
    product: '', productSearch: '', invoicedQuantity: 1,
    uOM: '', uomLabel: 'Pcs', unitPrice: 0,
    taxCategory: '', taxSearch: '', taxRate: 0, taxOptions: [],
    lineNetAmount: 0, taxAmount: 0,
    showDrop: false, showTaxDrop: false, productOptions: [],
  }
}
function addLine() { lines.value.push(newLine()) }
function removeLine(i) { lines.value.splice(i, 1) }

// ── open modals
function openCreateModal() {
  isEdit.value = false; editId.value = null
  form.value = emptyForm(); lines.value = []
  customerSearch.value = ''; payTermSearch.value = ''; payMethodSearch.value = ''
  docTypeSearch.value = ''; partnerLocations.value = []; formError.value = ''
  showFormModal.value = true
}

async function openEditModal(r) {
  closeDropdown()
  isEdit.value = true; editId.value = r.id; formError.value = ''
  showFormModal.value = true
  form.value = {
    documentNo: r.documentNo || '',
    organization: r['organization$_identifier'] || '',
    invoiceDate: r.invoiceDate?.slice(0, 10) || today(),
    businessPartner: r.businessPartner || '',
    paymentTerms: r.paymentTerms || '',
    standAwal: r.standAwal ?? 0,
    standAkhir: r.standAkhir ?? 0,
    kodePelanggan: r.kodePelanggan || '',
    transactionDocument: r.documentType || '',
    totalUsage: r.totalUsage ?? 0,
    partnerAddress: r.partnerAddress || '',
    paymentMethod: r.paymentMethod || '',
    description: r.description || '',
    salesOrder: r.salesOrder || '',
    orderReference: r.orderReference || '',
  }
  customerSearch.value = r['businessPartner$_identifier'] || ''
  payTermSearch.value = r['paymentTerms$_identifier'] || ''
  payMethodSearch.value = r['paymentMethod$_identifier'] || ''
  docTypeSearch.value = r['documentType$_identifier'] || ''
  if (r.businessPartner) await loadPLocs(r.businessPartner)

  const existingLines = await fetchInvoiceLines(r.id)
  lines.value = existingLines.map(l => {
    const foundUom = uoms.value.find(u => u.id === l.uOM)
    return {
      id: l.id,
      product: l.product || '',
      productSearch: l['product$_identifier'] || '',
      invoicedQuantity: l.invoicedQuantity || 1,
      uOM: l.uOM || '',
      uomLabel: foundUom ? (foundUom.uOMSymbol || foundUom.name) : (l['uOM$_identifier'] || 'Pcs'),
      unitPrice: l.unitPrice || 0,
      taxCategory: l.taxCategory || l.tax || '',
      taxSearch: l['tax$_identifier'] || l['taxCategory$_identifier'] || '',
      taxRate: 0,
      taxOptions: [],
      lineNetAmount: l.lineNetAmount || 0,
      taxAmount: 0,
      showDrop: false, showTaxDrop: false, productOptions: [],
    }
  })
}

async function openViewModal(r) {
  viewRow.value = r; showViewModal.value = true; viewLinesLoading.value = true
  viewLines.value = await fetchInvoiceLines(r.id)
  viewLinesLoading.value = false
}

// ── save
async function saveInvoice() {
  saving.value = true; formError.value = ''
  try {
    let invoiceId
    if (isEdit.value) {
      await updateInvoice(editId.value, form.value)
      invoiceId = editId.value
    } else {
      const created = await createInvoice(form.value)
      invoiceId = created?.id
    }
    if (invoiceId) {
      for (const line of lines.value) {
        if (!line.product) continue
        const payload = {
          invoicedQuantity: line.invoicedQuantity,
          unitPrice: line.unitPrice,
          lineNetAmount: line.lineNetAmount,
          product: line.product,
          uOM: line.uOM,
          taxCategory: line.taxCategory,
        }
        if (line.id) await updateInvoiceLine(line.id, payload)
        else await createInvoiceLine(invoiceId, payload)
      }
    }
    showFormModal.value = false
    showToast(isEdit.value ? 'Invoice updated!' : 'Invoice created!')
    await loadInvoices()
  } catch (e) {
    formError.value = e?.response?.data?.response?.error?.message || e.message
  } finally { saving.value = false }
}

function closeFormModal() { showFormModal.value = false }

function confirmDelete(r) { closeDropdown(); deleteRow.value = r; deleteError.value = ''; showDeleteModal.value = true }
async function doDelete() {
  deleting.value = true; deleteError.value = ''
  try {
    await deleteInvoice(deleteRow.value.id)
    showDeleteModal.value = false
    showToast('Invoice deleted.')
    await loadInvoices()
  } catch (e) {
    deleteError.value = e?.response?.data?.response?.error?.message || e.message
  } finally { deleting.value = false }
}

onMounted(() => { loadInvoices(); loadLookups() })
</script>

<style scoped>
:root {
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --bg: #f1f5f9; --surface: #ffffff; --surface2: #f8fafc;
  --border: #e2e8f0; --accent: #3b82f6; --accent-light: #eff6ff;
  --text-primary: #0f172a; --text-secondary: #475569; --text-muted: #94a3b8;
  --success: #22c55e; --danger: #ef4444;
  --radius: 10px; --radius-sm: 6px;
  --shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
  --shadow-md: 0 4px 16px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,.04);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
button { box-sizing: border-box; }

.layout { display: flex; flex-direction: column; min-height: 100vh; background: var(--bg); font-family: var(--font); }
.main { flex: 1; padding: 28px 24px; max-width: 1280px; margin: 0 auto; width: 100%; }
.content-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }

.page-header { padding: 20px 20px 0; }
.page-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }

.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; }
.search-wrap { position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 10px; color: var(--text-muted); pointer-events: none; }
.search-input { height: 36px; padding: 0 12px 0 32px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; font-family: var(--font); background: var(--surface2); width: 280px; transition: border-color .15s; }
.search-input:focus { border-color: var(--accent); background: #fff; }

.list-label { padding: 0 20px 10px; font-size: 13px; font-weight: 600; color: var(--text-secondary); border-bottom: 1px solid var(--border); }

.btn { display: inline-flex; align-items: center; gap: 6px; padding: 0 16px; height: 36px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font); transition: all .15s; }
.btn--primary { background: var(--accent); color: #fff; }
.btn--primary:hover { background: #2563eb; }
.btn--primary:disabled { opacity: .6; cursor: not-allowed; }
.btn--ghost { background: var(--surface2); border: 1px solid var(--border); color: var(--text-secondary); }
.btn--ghost:hover { background: var(--border); }
.btn--danger { background: var(--danger); color: #fff; }
.btn--danger:hover { background: #dc2626; }
.btn--danger:disabled { opacity: .6; cursor: not-allowed; }

.btn-view { display: inline-flex; align-items: center; height: 28px; padding: 0 10px; border-radius: var(--radius-sm); font-size: 12px; font-weight: 600; background: var(--accent-light); color: var(--accent); border: 1px solid #bfdbfe; cursor: pointer; font-family: var(--font); transition: background .12s; }
.btn-view:hover { background: #dbeafe; }

.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table thead th { background: var(--surface2); color: var(--text-muted); font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; padding: 10px 16px; border-bottom: 1px solid var(--border); white-space: nowrap; text-align: left; }
.table--lines thead th { padding: 8px 12px; }
.table--lines tbody td { padding: 6px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.table--lines tbody tr:last-child td { border-bottom: none; }
.th-action { text-align: right; }
.table tbody tr td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tr-data:hover { background: var(--surface2); }
.tr-data:last-child td { border-bottom: none; }

.code-badge { font-family: var(--font-mono); font-size: 11.5px; font-weight: 500; background: var(--surface2); border: 1px solid var(--border); padding: 3px 8px; border-radius: 4px; color: var(--text-secondary); white-space: nowrap; }
.td-secondary { color: var(--text-secondary); font-size: 13px; }
.td-clip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
.td-empty { text-align: center; color: var(--text-muted); padding: 48px 16px; font-size: 13px; }
.td-error { color: var(--danger); }
.td-action-cell { text-align: right; overflow: visible !important; }

.status-pill { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
.status-pill--new { background: #f0fdf4; color: #16a34a; }
.status-pill--completed { background: #eff6ff; color: #1d4ed8; }
.status-pill--closed { background: #f1f5f9; color: #64748b; }
.status-pill--voided { background: #fff1f2; color: var(--danger); }

.action-group { display: flex; gap: 6px; justify-content: flex-end; align-items: center; }
.action-btn { display: inline-flex; align-items: center; gap: 4px; padding: 5px 8px; border-radius: 5px; font-size: 12px; font-weight: 500; border: none; cursor: pointer; transition: background .12s; font-family: var(--font); }
.action-btn--more { background: var(--surface2); color: var(--text-secondary); }
.action-btn--more:hover { background: var(--border); }
.dropdown-wrap { position: relative; }
.dropdown-menu { position: fixed; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); z-index: 9999; min-width: 150px; overflow: hidden; }
.dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 14px; font-size: 12.5px; font-weight: 500; background: none; border: none; cursor: pointer; color: var(--text-secondary); font-family: var(--font); transition: background .1s; white-space: nowrap; }
.dropdown-item:hover { background: var(--surface2); color: var(--text-primary); }
.dropdown-item--danger { color: var(--danger); }
.dropdown-item--danger:hover { background: #fff1f2; }

.loading-dots { display: flex; gap: 6px; justify-content: center; }
.loading-dots span { width: 7px; height: 7px; background: var(--accent); border-radius: 50%; animation: bounce 1.2s infinite ease-in-out; }
.loading-dots span:nth-child(2) { animation-delay: .2s; }
.loading-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes bounce { 0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1} }

.pagination { display: flex; align-items: center; justify-content: flex-end; gap: 2px; padding: 14px 20px; background: var(--bg); }
.page-btn { min-width: 36px; height: 36px; padding: 0 10px; border-radius: 10px; border: none; background: transparent; color: #94a3b8; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; font-family: var(--font); }
.page-btn:hover:not(:disabled):not(.page-btn--active) { color: var(--text-primary); background: rgba(0,0,0,.05); }
.page-btn--active { background: #fff !important; color: #1e293b !important; font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.07); }
.page-btn:disabled { opacity: .3; cursor: not-allowed; }
.page-ellipsis { color: var(--text-muted); padding: 0 4px; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(2px); }
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); width: 100%; max-width: 480px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; }
.modal--xl { max-width: 900px; }
.modal--sm { max-width: 400px; }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 20px 12px; border-bottom: 1px solid var(--border); gap: 12px; flex-shrink: 0; }
.modal-breadcrumb { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-muted); margin-bottom: 4px; }
.bc-active { color: var(--accent); font-weight: 500; }
.modal-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.modal-close { background: none; border: none; color: var(--text-muted); display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; flex-shrink: 0; transition: background .12s; }
.modal-close:hover { background: var(--surface2); }
.modal-body { padding: 20px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0; }

/* Form */
.section-label { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 4px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-input { width: 100%; height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); }
.form-input:focus { border-color: var(--accent); background: #fff; }
.form-input:disabled, .form-input[readonly] { opacity: .7; cursor: default; }
.form-textarea { height: auto; padding: 8px 12px; resize: vertical; min-height: 60px; }
.form-input--sm { height: 32px; font-size: 12.5px; }

.section-divider { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin: 20px 0 10px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.btn-add-line { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--accent); background: var(--accent-light); border: 1px solid #bfdbfe; border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-family: var(--font); transition: background .12s; }
.btn-add-line:hover { background: #dbeafe; }
.btn-rm-line { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: #fee2e2; color: var(--danger); border: none; cursor: pointer; }
.btn-rm-line:hover { background: #fecaca; }

.uom-badge { display: inline-block; padding: 2px 8px; background: var(--surface2); border: 1px solid var(--border); border-radius: 4px; font-size: 11.5px; font-weight: 500; color: var(--text-secondary); white-space: nowrap; }
.price-input-wrap { display: flex; align-items: center; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; background: var(--surface2); transition: border-color .15s; }
.price-input-wrap:focus-within { border-color: var(--accent); background: #fff; }
.price-prefix { padding: 0 6px; font-size: 11px; font-weight: 600; color: var(--text-muted); background: var(--surface2); white-space: nowrap; border-right: 1px solid var(--border); height: 32px; display: flex; align-items: center; }
.price-input { border: none !important; background: transparent !important; flex: 1; padding-left: 6px; }
.price-input:focus { outline: none; }

/* Totals */
.totals-block { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 10px; }
.totals-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 13px; color: var(--text-secondary); }
.totals-row--grand { border-top: 2px solid var(--border); margin-top: 6px; padding-top: 10px; font-size: 15px; font-weight: 700; color: var(--text-primary); }

/* Combobox */
.acc-wrap { position: relative; width: 100%; }
.acc-input { display: block; width: 100%; height: 36px; padding: 0 32px 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.acc-input:focus { border-color: var(--accent); background: #fff; }
.acc-input--sm { height: 32px; font-size: 12.5px; }
.acc-chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.acc-dropdown { position: absolute; z-index: 400; top: calc(100% + 3px); left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); max-height: 200px; overflow-y: auto; list-style: none; margin: 0; padding: 4px 0; }
.acc-opt { padding: 8px 12px; font-size: 12.5px; color: var(--text-primary); cursor: pointer; transition: background .1s; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.acc-opt:hover { background: var(--accent-light); }
.acc-empty { padding: 8px 12px; font-size: 12.5px; color: var(--text-muted); font-style: italic; }

/* Detail */
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-item--full { grid-column: 1 / -1; }
.detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.detail-value { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }
.detail-value.mono { font-family: var(--font-mono); font-size: 12.5px; }
.delete-text { font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); }
.delete-text strong { color: var(--text-primary); }

.form-api-error { margin-top: 14px; padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; }
.toast { position: fixed; bottom: 24px; right: 24px; z-index: 2000; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); }
.toast--success { background: #16a34a; color: #fff; }
.toast--error { background: var(--danger); color: #fff; }
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>