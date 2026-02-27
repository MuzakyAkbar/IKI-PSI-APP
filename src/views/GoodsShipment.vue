<template>
  <div class="layout">
    <main class="main">
      <div class="content-card">

        <div class="page-header">
          <h2 class="page-title">Goods Shipment</h2>
        </div>

        <!-- ══ TOOLBAR ══ -->
        <div class="toolbar">
          <div class="search-wrap">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input v-model="searchQuery" class="search-input" placeholder="Search shipment no or customer..." @input="onSearch" />
          </div>
          <button class="btn btn--primary" @click="openCreateModal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Create Goods Shipment
          </button>
        </div>

        <!-- ══ LIST LABEL ══ -->
        <div class="list-label">List Goods Shipment</div>

        <!-- ══ TABLE ══ -->
        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th>GS. No</th>
              <th>Create Date</th>
              <th>Organization</th>
              <th>Status</th>
              <th>PO. No</th>
              <th>Customer</th>
              <th class="th-action">Action</th>
            </tr></thead>
            <tbody>
              <tr v-if="loading"><td colspan="7" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
              <tr v-else-if="error"><td colspan="7" class="td-empty td-error">{{ error }}</td></tr>
              <tr v-else-if="rows.length === 0"><td colspan="7" class="td-empty">No goods shipments found.</td></tr>
              <template v-else>
                <tr v-for="r in rows" :key="r.id" class="tr-data">
                  <td><span class="code-badge">{{ r.documentNo || '—' }}</span></td>
                  <td class="td-secondary">{{ formatDate(r.movementDate) }}</td>
                  <td class="td-clip">{{ r['organization$_identifier'] || '—' }}</td>
                  <td><span :class="['status-pill', statusClass(r.documentStatus)]">{{ statusLabel(r.documentStatus) }}</span></td>
                  <td class="td-secondary">{{ r['salesOrder$_identifier'] || '—' }}</td>
                  <td class="td-clip">{{ r['businessPartner$_identifier'] || '—' }}</td>
                  <td class="td-action-cell">
                    <div class="action-group">
                      <div class="dropdown-wrap" v-click-outside="closeDropdown">
                        <button class="action-btn action-btn--more" @click.stop="toggleDropdown(r.id, $event)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                        <div v-if="openDropdown === r.id" class="dropdown-menu" :style="{ top: dropdownPos.top + 'px', right: dropdownPos.right + 'px' }">
                          <button class="dropdown-item" @click="openViewModal(r)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>View
                          </button>
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
                <span>List Goods Shipment</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">{{ isEdit ? 'Edit' : 'Create' }} Goods Shipment</span>
              </div>
              <div class="modal-title">{{ isEdit ? 'Edit' : 'Create' }} Goods Shipment</div>
            </div>
            <button class="modal-close" @click="closeFormModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="modal-body">
            <!-- ── Row 1 ── -->
            <div class="form-grid-3">
              <div class="form-group">
                <label>Goods Shipment No.</label>
                <input v-model="form.documentNo" class="form-input" placeholder="GS000000" disabled />
              </div>
              <div class="form-group">
                <label>Document Type</label>
                <div class="acc-wrap">
                  <input v-model="docTypeSearch" class="acc-input" placeholder="Select document type..." @input="showDocTypeDrop = true" @focus="showDocTypeDrop = true" @blur="onBlur('docType')" />
                  <svg class="acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                  <ul v-if="showDocTypeDrop && filteredDocTypes.length" class="acc-dropdown">
                    <li v-for="d in filteredDocTypes" :key="d.id" class="acc-opt" @mousedown.prevent="selectDocType(d)">{{ d.name }}</li>
                  </ul>
                </div>
              </div>
              <div class="form-group">
                <label>Warehouse</label>
                <select v-model="form.warehouse" class="form-input">
                  <option value="">Select</option>
                  <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
                </select>
              </div>

              <!-- ── Row 2 ── -->
              <div class="form-group">
                <label>Organization</label>
                <select v-model="form.organization" class="form-input" disabled>
                  <option value="">Select</option>
                </select>
              </div>
              <div class="form-group">
                <label>Partner Address</label>
                <select v-model="form.partnerAddress" class="form-input" :disabled="!form.businessPartner">
                  <option value="">Select</option>
                  <option v-for="l in partnerLocations" :key="l.id" :value="l.id">{{ l['locationAddress$_identifier'] || l.name || l.id }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Description</label>
                <input v-model="form.description" class="form-input" placeholder="Description" />
              </div>

              <!-- ── Row 3 ── -->
              <div class="form-group">
                <label>Customer</label>
                <div class="acc-wrap">
                  <input v-model="customerSearch" class="acc-input" placeholder="Search customer..." @input="onCustomerSearch" @focus="showCustomerDrop = true" @blur="onBlur('customer')" />
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
                <label>Delivery Location</label>
                <select v-model="form.deliveryLocation" class="form-input">
                  <option value="">Select</option>
                  <option v-for="l in partnerLocations" :key="l.id" :value="l.id">{{ l['locationAddress$_identifier'] || l.name || l.id }}</option>
                </select>
              </div>
              <div></div>

              <!-- ── Row 4 ── -->
              <div class="form-group">
                <label>Movement Date</label>
                <input v-model="form.movementDate" type="date" class="form-input" />
              </div>
              <div class="form-group">
                <label>Document No.</label>
                <input v-model="form.documentNo" class="form-input" placeholder="GS000000" disabled />
              </div>
              <div></div>
            </div>

            <!-- ── More Information ── -->
            <div class="section-divider">More Information</div>
            <div class="form-grid-3">
              <div class="form-group">
                <label>Accounting Date</label>
                <input v-model="form.accountingDate" type="date" class="form-input" />
              </div>
              <div class="form-group">
                <label>Sales Order</label>
                <div class="acc-wrap">
                  <input v-model="soSearch" class="acc-input" placeholder="Search sales order..." @input="onSoSearch" @focus="showSoDrop = true" @blur="onBlur('so')" />
                  <svg class="acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                  <ul v-if="showSoDrop && filteredSOs.length" class="acc-dropdown">
                    <li v-for="o in filteredSOs" :key="o.id" class="acc-opt" @mousedown.prevent="selectSO(o)">{{ o.documentNo }} — {{ o['businessPartner$_identifier'] || '' }}</li>
                  </ul>
                  <ul v-else-if="showSoDrop && soSearch.length > 1 && !filteredSOs.length" class="acc-dropdown">
                    <li class="acc-empty">No orders found</li>
                  </ul>
                </div>
              </div>
              <div class="form-group">
                <label>Order Reference</label>
                <input v-model="form.orderReference" class="form-input" placeholder="Order Reference" />
              </div>
              <div style="display:flex; align-items:center; gap:8px; padding-top:8px;">
                <input id="netting" v-model="form.isNettingShipment" type="checkbox" style="width:15px;height:15px;cursor:pointer;accent-color:var(--accent);flex-shrink:0" />
                <label for="netting" style="font-size:13px;font-weight:500;color:var(--text-secondary);cursor:pointer;margin:0;white-space:nowrap">Is Netting Shipment</label>
              </div>
              <div></div>
              <div></div>
            </div>

            <!-- ── Shipment Lines ── -->
            <div class="section-divider">
              Shipment Lines
              <button class="btn-add-line" @click="addLine">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                Add Line
              </button>
            </div>
            <div class="table-wrap" style="margin-bottom:0">
              <table class="table table--lines">
                <thead><tr>
                  <th style="width:36px">#</th>
                  <th>Product</th>
                  <th style="width:90px">Quantity</th>
                  <th style="width:110px">UOM</th>
                  <th style="width:36px"></th>
                </tr></thead>
                <tbody>
                  <tr v-if="lines.length === 0"><td colspan="5" class="td-empty" style="padding:18px">No lines yet. Click "Add Line".</td></tr>
                  <tr v-for="(line, idx) in lines" :key="idx">
                    <td class="td-secondary" style="font-size:12px">{{ idx + 1 }}</td>
                    <td>
                      <div class="acc-wrap">
                        <input v-model="line.productSearch" class="acc-input acc-input--sm" placeholder="Search product..." @input="onProductSearch(line)" @focus="line.showDrop = true" @blur="onProductBlur(line)" />
                        <ul v-if="line.showDrop && line.productOptions.length" class="acc-dropdown">
                          <li v-for="p in line.productOptions" :key="p.id" class="acc-opt" @mousedown.prevent="selectProduct(line, p)">{{ p.name }}</li>
                        </ul>
                        <ul v-else-if="line.showDrop && line.productSearch.length > 1 && !line.productOptions.length" class="acc-dropdown">
                          <li class="acc-empty">No products found</li>
                        </ul>
                      </div>
                    </td>
                    <td>
                      <input v-model.number="line.movementQuantity" type="number" min="0" class="form-input form-input--sm" placeholder="Qty" />
                    </td>
                    <td>
                      <div class="acc-wrap">
                        <input v-model="line.uomSearch" class="acc-input acc-input--sm" placeholder="UOM..." @input="onUomSearch(line)" @focus="line.showUomDrop = true" @blur="onUomBlur(line)" />
                        <ul v-if="line.showUomDrop && line.uomOptions.length" class="acc-dropdown">
                          <li v-for="u in line.uomOptions" :key="u.id" class="acc-opt" @mousedown.prevent="selectUom(line, u)">{{ u.uOMSymbol || u.name }}</li>
                        </ul>
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

            <div v-if="formError" class="form-api-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ formError }}
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn--ghost" @click="closeFormModal">Cancel</button>
            <button class="btn btn--primary" :disabled="saving" @click="saveShipment">
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
                <span>List Goods Shipment</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">View Goods Shipment</span>
              </div>
              <div class="modal-title">Goods Shipment — {{ viewRow?.documentNo }}</div>
            </div>
            <button class="modal-close" @click="showViewModal = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body" v-if="viewRow">
            <div class="detail-grid">
              <div class="detail-item"><span class="detail-label">GS No.</span><span class="detail-value mono">{{ viewRow.documentNo }}</span></div>
              <div class="detail-item"><span class="detail-label">Movement Date</span><span class="detail-value">{{ formatDate(viewRow.movementDate) }}</span></div>
              <div class="detail-item"><span class="detail-label">Status</span><span :class="['status-pill', statusClass(viewRow.documentStatus)]">{{ statusLabel(viewRow.documentStatus) }}</span></div>
              <div class="detail-item"><span class="detail-label">Warehouse</span><span class="detail-value">{{ viewRow['warehouse$_identifier'] || '—' }}</span></div>
              <div class="detail-item"><span class="detail-label">Customer</span><span class="detail-value">{{ viewRow['businessPartner$_identifier'] || '—' }}</span></div>
              <div class="detail-item"><span class="detail-label">Sales Order</span><span class="detail-value">{{ viewRow['salesOrder$_identifier'] || '—' }}</span></div>
              <div class="detail-item"><span class="detail-label">Document Type</span><span class="detail-value">{{ viewRow['documentType$_identifier'] || '—' }}</span></div>
              <div class="detail-item"><span class="detail-label">Organization</span><span class="detail-value">{{ viewRow['organization$_identifier'] || '—' }}</span></div>
              <div class="detail-item detail-item--full"><span class="detail-label">Description</span><span class="detail-value">{{ viewRow.description || '—' }}</span></div>
            </div>

            <div class="section-divider" style="margin-top:20px">Shipment Lines</div>
            <div v-if="viewLinesLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>
            <div v-else class="table-wrap" style="margin-bottom:0">
              <table class="table table--lines">
                <thead><tr><th>#</th><th>Product</th><th>Quantity</th><th>UOM</th></tr></thead>
                <tbody>
                  <tr v-if="viewLines.length === 0"><td colspan="4" class="td-empty">No lines.</td></tr>
                  <tr v-for="(l, i) in viewLines" :key="l.id">
                    <td class="td-secondary">{{ i + 1 }}</td>
                    <td>{{ l['product$_identifier'] || '—' }}</td>
                    <td class="td-secondary">{{ l.movementQuantity }}</td>
                    <td class="td-secondary">{{ l['uOM$_identifier'] || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="showViewModal = false">Close</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- DELETE CONFIRM -->
    <!-- ══════════════════════════════════════════════════════ -->
    <transition name="fade">
      <div v-if="showDeleteModal" class="modal-overlay" @mousedown.self="showDeleteModal = false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <div class="modal-title">Delete Goods Shipment</div>
            <button class="modal-close" @click="showDeleteModal = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-text">Are you sure you want to delete shipment <strong>{{ deleteRow?.documentNo }}</strong>? This cannot be undone.</p>
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
  fetchAllShipments, createShipment, updateShipment, deleteShipment,
  fetchShipmentLines, createShipmentLine, updateShipmentLine,
  fetchCustomers, fetchPartnerLocations, fetchWarehouses, fetchDocumentTypes,
  fetchSalesOrders, fetchProducts, fetchUOMs,
} from '@/services/goodsShipment.js'

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
const warehouses = ref([])
const documentTypes = ref([])
const uoms = ref([])
const partnerLocations = ref([])

// ── form state
const showFormModal = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const saving = ref(false)
const formError = ref('')

const emptyForm = () => ({
  documentNo: '',
  documentType: '',
  warehouse: '',
  organization: '',
  partnerAddress: '',
  description: '',
  businessPartner: '',
  deliveryLocation: '',
  movementDate: today(),
  accountingDate: today(),
  salesOrder: '',
  orderReference: '',
  isNettingShipment: false,
})
const form = ref(emptyForm())

// Searchable comboboxes
const customerSearch = ref('')
const filteredCustomers = ref([])
const showCustomerDrop = ref(false)

const docTypeSearch = ref('')
const showDocTypeDrop = ref(false)
const filteredDocTypes = computed(() => {
  const q = docTypeSearch.value.toLowerCase()
  return documentTypes.value.filter(d => !q || (d.name || '').toLowerCase().includes(q)).slice(0, 30)
})

const soSearch = ref('')
const filteredSOs = ref([])
const showSoDrop = ref(false)

const lines = ref([])

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
function statusLabel(s) {
  const map = { DR: 'Draft', CO: 'Completed', CL: 'Closed', VO: 'Voided', TMP: 'Temporary' }
  return map[s] || s || 'Open'
}
function statusClass(s) {
  if (s === 'CO') return 'status-pill--completed'
  if (s === 'CL') return 'status-pill--closed'
  if (s === 'VO') return 'status-pill--voided'
  return 'status-pill--open'
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

// ── load shipments
async function loadShipments() {
  loading.value = true; error.value = ''
  try {
    const data = await fetchAllShipments({
      startRow: (currentPage.value - 1) * pageSize, pageSize, searchKey: searchQuery.value,
    })
    rows.value = data.data ?? []
    totalCount.value = data.totalRows ?? rows.value.length
  } catch (e) {
    error.value = e?.response?.data?.response?.error?.message || e.message
  } finally { loading.value = false }
}

function goPage(p) { if (p >= 1 && p <= totalPages.value) { currentPage.value = p; loadShipments() } }
function onSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(() => { currentPage.value = 1; loadShipments() }, 400) }

// ── dropdown
function toggleDropdown(id, e) {
  if (openDropdown.value === id) { openDropdown.value = null; return }
  openDropdown.value = id
  const btn = e.currentTarget.getBoundingClientRect()
  dropdownPos.value = { top: btn.bottom + 4, right: window.innerWidth - btn.right }
}
function closeDropdown() { openDropdown.value = null }

// ── load lookups
async function loadLookups() {
  const [w, dt, u] = await Promise.allSettled([
    fetchWarehouses(), fetchDocumentTypes(), fetchUOMs(),
  ])
  warehouses.value = w.value ?? []
  documentTypes.value = dt.value ?? []
  uoms.value = u.value ?? []
}

// ── combobox blur helper
function onBlur(type) {
  setTimeout(() => {
    if (type === 'customer') showCustomerDrop.value = false
    if (type === 'docType') showDocTypeDrop.value = false
    if (type === 'so') showSoDrop.value = false
  }, 150)
}

// ── customer search
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
  loadPartnerLocations(c.id)
}
async function loadPartnerLocations(bpId) {
  form.value.partnerAddress = ''; form.value.deliveryLocation = ''
  partnerLocations.value = await fetchPartnerLocations(bpId)
  if (partnerLocations.value.length === 1) {
    form.value.partnerAddress = partnerLocations.value[0].id
    form.value.deliveryLocation = partnerLocations.value[0].id
  }
}

// ── doc type
function selectDocType(d) {
  form.value.documentType = d.id
  docTypeSearch.value = d.name
  showDocTypeDrop.value = false
}

// ── sales order search
let soTimer = null
async function onSoSearch() {
  showSoDrop.value = true
  clearTimeout(soTimer)
  soTimer = setTimeout(async () => {
    if (!soSearch.value.trim()) { filteredSOs.value = []; return }
    filteredSOs.value = await fetchSalesOrders(soSearch.value)
  }, 300)
}
function selectSO(o) {
  form.value.salesOrder = o.id
  soSearch.value = o.documentNo
  showSoDrop.value = false
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
  // Auto-fill UOM
  if (p.uOM) {
    line.uOM = p.uOM
    const found = uoms.value.find(u => u.id === p.uOM)
    line.uomSearch = found ? (found.uOMSymbol || found.name) : (p['uOM$_identifier'] || '')
    line.uomOptions = found ? [found] : []
  }
}
function onProductBlur(line) { setTimeout(() => { line.showDrop = false }, 150) }

// ── UOM search per line
async function onUomSearch(line) {
  line.showUomDrop = true
  const q = (line.uomSearch || '').toLowerCase()
  line.uomOptions = uoms.value.filter(u =>
    !q || (u.uOMSymbol || '').toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q)
  ).slice(0, 20)
}
function selectUom(line, u) {
  line.uOM = u.id
  line.uomSearch = u.uOMSymbol || u.name
  line.showUomDrop = false
}
function onUomBlur(line) { setTimeout(() => { line.showUomDrop = false }, 150) }

// ── line helpers
function newLine() {
  return { product: '', productSearch: '', movementQuantity: 1, uOM: '', uomSearch: '', uomOptions: [], showDrop: false, showUomDrop: false, productOptions: [] }
}
function addLine() { lines.value.push(newLine()) }
function removeLine(i) { lines.value.splice(i, 1) }

// ── open modals
function openCreateModal() {
  isEdit.value = false; editId.value = null
  form.value = emptyForm(); lines.value = []
  customerSearch.value = ''; docTypeSearch.value = ''; soSearch.value = ''
  partnerLocations.value = []; formError.value = ''
  showFormModal.value = true
}

async function openEditModal(r) {
  closeDropdown()
  isEdit.value = true; editId.value = r.id; formError.value = ''
  showFormModal.value = true

  form.value = {
    documentNo: r.documentNo || '',
    documentType: r.documentType || '',
    warehouse: r.warehouse || '',
    organization: r['organization$_identifier'] || '',
    partnerAddress: r.partnerAddress || '',
    description: r.description || '',
    businessPartner: r.businessPartner || '',
    deliveryLocation: r.deliveryLocation || '',
    movementDate: r.movementDate?.slice(0, 10) || today(),
    accountingDate: r.accountingDate?.slice(0, 10) || today(),
    salesOrder: r.salesOrder || '',
    orderReference: r.orderReference || '',
    isNettingShipment: r.isNettingShipment || false,
  }

  customerSearch.value = r['businessPartner$_identifier'] || ''
  docTypeSearch.value = r['documentType$_identifier'] || ''
  soSearch.value = r['salesOrder$_identifier'] || ''
  if (r.businessPartner) await loadPartnerLocations(r.businessPartner)

  const existingLines = await fetchShipmentLines(r.id)
  lines.value = existingLines.map(l => {
    const foundUom = uoms.value.find(u => u.id === l.uOM)
    return {
      id: l.id,
      product: l.product || '',
      productSearch: l['product$_identifier'] || '',
      movementQuantity: l.movementQuantity || 1,
      uOM: l.uOM || '',
      uomSearch: foundUom ? (foundUom.uOMSymbol || foundUom.name) : (l['uOM$_identifier'] || ''),
      uomOptions: foundUom ? [foundUom] : [],
      showDrop: false,
      showUomDrop: false,
      productOptions: [],
    }
  })
}

async function openViewModal(r) {
  closeDropdown()
  viewRow.value = r; showViewModal.value = true; viewLinesLoading.value = true
  viewLines.value = await fetchShipmentLines(r.id)
  viewLinesLoading.value = false
}

// ── save
async function saveShipment() {
  saving.value = true; formError.value = ''
  try {
    let shipmentId
    if (isEdit.value) {
      await updateShipment(editId.value, form.value)
      shipmentId = editId.value
    } else {
      const created = await createShipment(form.value)
      shipmentId = created?.id
    }

    // Save lines
    if (shipmentId) {
      for (const line of lines.value) {
        if (!line.product) continue
        const linePayload = { movementQuantity: line.movementQuantity, uOM: line.uOM, product: line.product }
        if (line.id) await updateShipmentLine(line.id, linePayload)
        else await createShipmentLine(shipmentId, linePayload)
      }
    }

    showFormModal.value = false
    showToast(isEdit.value ? 'Goods Shipment updated!' : 'Goods Shipment created!')
    await loadShipments()
  } catch (e) {
    formError.value = e?.response?.data?.response?.error?.message || e.message
  } finally { saving.value = false }
}

function closeFormModal() { showFormModal.value = false }

// ── delete
function confirmDelete(r) { closeDropdown(); deleteRow.value = r; deleteError.value = ''; showDeleteModal.value = true }
async function doDelete() {
  deleting.value = true; deleteError.value = ''
  try {
    await deleteShipment(deleteRow.value.id)
    showDeleteModal.value = false
    showToast('Goods Shipment deleted.')
    await loadShipments()
  } catch (e) {
    deleteError.value = e?.response?.data?.response?.error?.message || e.message
  } finally { deleting.value = false }
}

onMounted(() => { loadShipments(); loadLookups() })
</script>

<style scoped>
:root {
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --bg: #f1f5f9;
  --surface: #ffffff;
  --surface2: #f8fafc;
  --border: #e2e8f0;
  --accent: #3b82f6;
  --accent-light: #eff6ff;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --success: #22c55e;
  --danger: #ef4444;
  --radius: 10px;
  --radius-sm: 6px;
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
.search-input { height: 36px; padding: 0 12px 0 32px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; font-family: var(--font); background: var(--surface2); width: 260px; transition: border-color .15s; }
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

.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table thead th { background: var(--surface2); color: var(--text-muted); font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; padding: 10px 16px; border-bottom: 1px solid var(--border); white-space: nowrap; text-align: left; }
.table--lines thead th { padding: 8px 12px; }
.table--lines tbody td { padding: 6px 12px; }
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
.status-pill--open { background: #f0fdf4; color: #16a34a; }
.status-pill--completed { background: #eff6ff; color: #1d4ed8; }
.status-pill--closed { background: #f1f5f9; color: #64748b; }
.status-pill--voided { background: #fff1f2; color: var(--danger); }

.action-group { display: flex; gap: 4px; justify-content: flex-end; }
.action-btn { display: inline-flex; align-items: center; gap: 4px; padding: 5px 8px; border-radius: 5px; font-size: 12px; font-weight: 500; border: none; cursor: pointer; transition: background .12s; font-family: var(--font); }
.action-btn--more { background: var(--surface2); color: var(--text-secondary); }
.action-btn--more:hover { background: var(--border); }
.dropdown-wrap { position: relative; }
.dropdown-menu { position: fixed; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); z-index: 9999; min-width: 160px; overflow: hidden; }
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
.page-ellipsis { color: var(--text-muted); padding: 0 4px; font-size: 13px; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(2px); }
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); width: 100%; max-width: 480px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; }
.modal--xl { max-width: 860px; }
.modal--sm { max-width: 400px; }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 20px 12px; border-bottom: 1px solid var(--border); gap: 12px; flex-shrink: 0; }
.modal-breadcrumb { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-muted); margin-bottom: 4px; }
.bc-active { color: var(--accent); font-weight: 500; }
.modal-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.modal-close { background: none; border: none; color: var(--text-muted); display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; transition: background .12s; flex-shrink: 0; }
.modal-close:hover { background: var(--surface2); color: var(--text-primary); }
.modal-body { padding: 20px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0; }

/* Form */
.form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-input { width: 100%; height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); }
.form-input:focus { border-color: var(--accent); background: #fff; }
.form-input:disabled { opacity: .6; cursor: not-allowed; background: #f1f5f9; }
.form-input--sm { height: 32px; font-size: 12.5px; }

.section-divider { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin: 20px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.btn-add-line { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--accent); background: var(--accent-light); border: 1px solid #bfdbfe; border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-family: var(--font); transition: background .12s; }
.btn-add-line:hover { background: #dbeafe; }
.btn-rm-line { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: #fee2e2; color: var(--danger); border: none; cursor: pointer; transition: background .12s; }
.btn-rm-line:hover { background: #fecaca; }

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

/* Detail view */
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