<template>
  <div class="app">

    <!-- ══════════════════════════════════════════════════════════
         LIST VIEW
    ══════════════════════════════════════════════════════════ -->
    <div v-if="!page.show" class="page-wrap">
      <div class="content-card">

        <!-- Header -->
        <div class="card-header">
          <h2 class="page-title">Vendor</h2>
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
              Create Vendor
            </button>
          </div>

          <div class="table-wrap">
            <table class="table">
              <colgroup>
                <col style="width:150px">
                <col>
                <col style="width:160px">
                <col style="width:160px">
                <col style="width:140px">
              </colgroup>
              <thead><tr>
                <th>Code</th>
                <th>Vendor Name</th>
                <th>City</th>
                <th>Phone</th>
                <th class="th-action">Action</th>
              </tr></thead>
              <tbody>
                <tr v-if="loading"><td colspan="5" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
                <tr v-else-if="error"><td colspan="5" class="td-empty td-error">{{ error }}</td></tr>
                <tr v-else-if="vendors.length===0"><td colspan="5" class="td-empty">No vendors found.</td></tr>
                <template v-else>
                  <tr v-for="v in vendors" :key="v.id" class="tr-data">
                    <td><span class="code-badge">{{ v.searchKey || '—' }}</span></td>
                    <td class="td-name">
                      {{ v.name }}
                      <span v-if="!v.active" class="inactive-pill">Inactive</span>
                    </td>
                    <td class="td-secondary">{{ v.cityName || '—' }}</td>
                    <td class="td-secondary td-mono">{{ v.phone || '—' }}</td>
                    <td class="td-action-cell">
                      <div class="action-group">
                        <div class="dropdown-wrap" v-click-outside="closeDropdown">
                          <button class="action-btn" @click.stop="toggleDropdown(v.id, $event)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                          </button>
                          <div v-if="openDropdown===v.id" class="dropdown-menu" :style="{top:dropdownPos.top+'px',right:dropdownPos.right+'px'}">
                            <button class="dropdown-item" @click="openViewModal(v)">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>View
                            </button>
                            <button class="dropdown-item" @click="openEditPage(v); closeDropdown()">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit
                            </button>
                            <button v-if="v.active" class="dropdown-item dropdown-item--danger" @click="confirmToggle(v)">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Delete
                            </button>
                            <button v-else class="dropdown-item dropdown-item--success" @click="confirmToggle(v)">
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
            <button v-for="p in paginationPages" :key="p" :class="['page-btn', p===currentPage?'page-btn--active':'']" @click="typeof p==='number'&&goPage(p)">{{ p }}</button>
            <button class="page-btn" :disabled="currentPage===totalPages" @click="goPage(currentPage+1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════
         CREATE / EDIT VENDOR — FULL PAGE
    ══════════════════════════════════════════════════════════ -->
    <Transition name="slide">
      <div v-if="page.show && page.type==='vendor'" class="page-wrap">

        <div class="breadcrumb-row">
          <button class="breadcrumb-back" @click="closePage">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            List Vendor
          </button>
          <span class="breadcrumb-sep">/</span>
          <span class="breadcrumb-cur">{{ page.mode==='create' ? 'Create Vendor' : 'Edit Vendor' }}</span>
        </div>

        <div class="form-page-title">{{ page.mode==='create' ? 'Create Vendor' : 'Edit Vendor' }}</div>

        <!-- Vendor Info Card -->
        <div class="form-card">
          <div class="form-card-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Vendor Info
          </div>
          <!-- Row 1: Identity fields -->
          <div class="form-grid-3">
            <div class="form-group">
              <label>Vendor Code/SKU <span class="req">*</span></label>
              <input v-model="form.searchKey" placeholder="00000" :class="{'input-error':formErrors.searchKey}" :disabled="page.mode==='edit'" />
              <span class="field-error" v-if="formErrors.searchKey">{{ formErrors.searchKey }}</span>
            </div>
            <div class="form-group">
              <label>Vendor Name <span class="req">*</span></label>
              <input v-model="form.name" placeholder="Vendor Name" :class="{'input-error':formErrors.name}" />
              <span class="field-error" v-if="formErrors.name">{{ formErrors.name }}</span>
            </div>
            <div class="form-group">
              <label>Business Partner Category</label>
              <select v-model="form.linkGL">
                <option value="">Select</option>
                <option v-for="cat in bpCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>
          </div>

          <!-- Row 2: Location fields -->
          <div class="form-section-divider">
            <span class="form-section-label">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Address / Location
            </span>
          </div>
          <div class="form-grid-3" style="margin-top:12px">
            <div class="form-group">
              <label>Province</label>
              <input v-model="form.province" placeholder="Province" />
            </div>
            <div class="form-group">
              <label>City</label>
              <input v-model="form.city" placeholder="City" />
            </div>
            <div class="form-group">
              <label>Postal Code</label>
              <input v-model="form.postalCode" placeholder="Postal Code" />
            </div>
            <div class="form-group">
              <label>Street Address</label>
              <input v-model="form.streetAddress" placeholder="Street Address" />
            </div>
            <div class="form-group">
              <label>Other Details</label>
              <input v-model="form.otherDetails" placeholder="e.g. Room / Unit / Landmark" />
            </div>
          </div>
          <div class="form-checks" style="margin-top:14px">
            <label class="check-label"><input type="checkbox" v-model="form.active" /> Active</label>
            <label class="check-label"><input type="checkbox" v-model="form.taxExempt" /> Tax Exempt</label>
          </div>
        </div>

        <!-- Payment Info Card -->
        <div class="form-card">
          <div class="form-card-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Payment Info
          </div>
          <div class="form-grid-3">
            <div class="form-group">
              <label>Price List <span class="req">*</span></label>
              <select v-model="form.priceList" :class="{'input-error': formErrors.priceList}">
                <option value="">Select Price List</option>
                <option v-for="pl in lookups.priceLists" :key="pl.id" :value="pl.id">{{ pl.name }}</option>
              </select>
              <span class="field-error" v-if="formErrors.priceList">{{ formErrors.priceList }}</span>
            </div>
            <div class="form-group">
              <label>Payment Method <span class="req">*</span></label>
              <select v-model="form.paymentMethod" :class="{'input-error': formErrors.paymentMethod}">
                <option value="">Select Payment Method</option>
                <option v-for="pm in lookups.paymentMethods" :key="pm.id" :value="pm.id">{{ pm['_identifier'] || pm.name }}</option>
              </select>
              <span class="field-error" v-if="formErrors.paymentMethod">{{ formErrors.paymentMethod }}</span>
            </div>
            <div class="form-group">
              <label>Payment Terms <span class="req">*</span></label>
              <select v-model="form.paymentTerms" :class="{'input-error': formErrors.paymentTerms}">
                <option value="">Select Payment Terms</option>
                <option v-for="pt in lookups.paymentTerms" :key="pt.id" :value="pt.id">{{ pt.name }}</option>
              </select>
              <span class="field-error" v-if="formErrors.paymentTerms">{{ formErrors.paymentTerms }}</span>
            </div>
            <div class="form-group">
              <label>Financial Account</label>
              <select v-model="form.account">
                <option value="">Select Financial Account</option>
                <option v-for="fa in lookups.financialAccounts" :key="fa.id" :value="fa.id">{{ fa['_identifier'] || fa.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Credit Limit</label>
              <input v-model.number="form.creditLimit" type="number" min="0" placeholder="0" />
            </div>
          </div>
        </div>

        <!-- Contact Card -->
        <div class="form-card">
          <div class="form-card-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.4 2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            Contact
          </div>

          <!-- Form input: always visible -->
          <div class="form-grid-2">
            <div class="form-group">
              <label>First Name</label>
              <input v-model="form.contactFirstName" placeholder="First name" />
            </div>
            <div class="form-group">
              <label>Last Name</label>
              <input v-model="form.contactLastName" placeholder="Last name" />
            </div>
            <div class="form-group">
              <label>Email</label>
              <input v-model="form.contactEmail" placeholder="Email" type="email" />
            </div>
            <div class="form-group">
              <label>Phone</label>
              <input v-model="form.contactPhone" placeholder="Phone" />
            </div>
            <div class="form-group">
              <label>Position</label>
              <input v-model="form.contactPosition" placeholder="Position" />
            </div>
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
         VIEW VENDOR DETAIL MODAL
    ══════════════════════════════════════════════════════════ -->
    <Transition name="fade">
      <div v-if="viewModal.show" class="modal-overlay" @click.self="viewModal.show=false">
        <div class="modal modal--detail">
          <div class="modal-header">
            <h3 class="modal-title">Vendor Detail</h3>
            <button class="modal-close" @click="viewModal.show=false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="detail-panel">

              <!-- Section: Vendor Info -->
              <div class="detail-section-label">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Vendor Info
              </div>
              <div class="detail-cols">
                <div class="detail-col">
                  <div class="detail-item">
                    <span class="detail-label">Vendor Code/SKU</span>
                    <span class="detail-value mono">{{ viewModal.data?.searchKey || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Vendor Name</span>
                    <span class="detail-value">{{ viewModal.data?.name || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Business Partner Category</span>
                    <span class="detail-value">{{ viewModal.data?.['businessPartnerCategory$_identifier'] || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Status</span>
                    <span :class="['status-pill', viewModal.data?.active?'status-pill--active':'status-pill--inactive']">
                      {{ viewModal.data?.active ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Tax Exempt</span>
                    <span class="detail-value">{{ viewModal.data?.taxExempt ? 'Yes' : 'No' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Credit Limit</span>
                    <span class="detail-value">{{ viewModal.data?.creditLimit != null ? Number(viewModal.data.creditLimit).toLocaleString('id-ID') : '—' }}</span>
                  </div>
                </div>
                <div class="detail-col">
                  <div class="detail-item">
                    <span class="detail-label">Street Address</span>
                    <span class="detail-value">{{ viewModal.data?.streetAddress || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Other Details</span>
                    <span class="detail-value">{{ viewModal.data?.otherDetails || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">City</span>
                    <span class="detail-value">{{ (viewModal.data?.cityName && viewModal.data.cityName !== '—') ? viewModal.data.cityName : '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Postal Code</span>
                    <span class="detail-value">{{ viewModal.data?.postalCode || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Province</span>
                    <span class="detail-value">{{ viewModal.data?.['province$_identifier'] || '—' }}</span>
                  </div>
                </div>
              </div>

              <!-- Section: Payment Info -->
              <div class="detail-section-label" style="margin-top:18px">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                Payment Info
              </div>
              <div class="detail-cols">
                <div class="detail-col">
                  <div class="detail-item">
                    <span class="detail-label">Price List</span>
                    <span class="detail-value">{{ viewModal.data?.['priceList$_identifier'] || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Payment Method</span>
                    <span class="detail-value">{{ viewModal.data?.['paymentMethod$_identifier'] || '—' }}</span>
                  </div>
                </div>
                <div class="detail-col">
                  <div class="detail-item">
                    <span class="detail-label">Payment Terms</span>
                    <span class="detail-value">{{ viewModal.data?.['paymentTerms$_identifier'] || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Financial Account</span>
                    <span class="detail-value">{{ viewModal.data?.['account$_identifier'] || '—' }}</span>
                  </div>
                </div>
              </div>

              <!-- Section: Contact -->
              <div v-if="viewContact" style="margin-top:18px">
                <div class="detail-section-label">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.4 2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  Contact
                </div>
                <div class="detail-cols">
                  <div class="detail-col">
                    <div class="detail-item">
                      <span class="detail-label">Name</span>
                      <span class="detail-value">{{ [viewContact.firstName, viewContact.lastName].filter(Boolean).join(' ') || '—' }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Email</span>
                      <span class="detail-value">{{ viewContact.email || '—' }}</span>
                    </div>
                  </div>
                  <div class="detail-col">
                    <div class="detail-item">
                      <span class="detail-label">Phone</span>
                      <span class="detail-value">{{ viewContact.phone || '—' }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Position</span>
                      <span class="detail-value">{{ viewContact.position || '—' }}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn--ghost" @click="editFromView">Edit</button>
            <button class="btn btn--primary" @click="viewModal.show=false">Close</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ══ TOGGLE VENDOR ACTIVE MODAL ══ -->
    <Transition name="fade">
      <div v-if="toggleModal.show" class="modal-overlay" @click.self="toggleModal.show=false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <h3 class="modal-title">{{ toggleModal.vendor?.active ? 'Deactivate Vendor' : 'Activate Vendor' }}</h3>
            <button class="modal-close" @click="toggleModal.show=false"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="modal-body">
            <p class="delete-text" v-if="toggleModal.vendor?.active">Are you sure you want to deactivate <strong>{{ toggleModal.vendor?.name }}</strong>?</p>
            <p class="delete-text" v-else>Reactivate <strong>{{ toggleModal.vendor?.name }}</strong>?</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="toggleModal.show=false" :disabled="toggleLoading">Cancel</button>
            <button :class="['btn', toggleModal.vendor?.active ? 'btn--danger' : 'btn--primary']" @click="doToggle" :disabled="toggleLoading">
              <span v-if="toggleLoading" class="btn-spinner"></span>
              {{ toggleModal.vendor?.active ? 'Deactivate' : 'Activate' }}
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
  fetchVendors, createVendor, updateVendor, deleteVendor,
  fetchPaymentTerms, fetchPriceLists, fetchPaymentMethods, fetchFinancialAccounts,
  fetchContacts, fetchContactsForIds, createContact, updateContact,
  fetchBPLocations, fetchBPLocationsForIds,
  createLocation, updateLocation,
  createBPLocation, updateBPLocation, deleteBPLocation,
  fetchBPCategories,
} from '@/services/vendor'

// ── click-outside directive ──────────────────────────────────
const vClickOutside = {
  mounted(el, binding) { el._co = e => { if (!el.contains(e.target)) binding.value(e) }; document.addEventListener('click', el._co) },
  unmounted(el) { document.removeEventListener('click', el._co) },
}

// ════════════════════════════════════════════════════════════
// VENDOR LIST STATE
// ════════════════════════════════════════════════════════════
const activeTab    = ref('list')
const vendors      = ref([])
const loading      = ref(false)
const error        = ref(null)
const searchQuery  = ref('')
const currentPage  = ref(1)
const pageSize     = 20
const totalRows    = ref(0)
let   searchTimeout = null

const openDropdown = ref(null)
const dropdownPos  = ref({ top: 0, right: 0 })

// ── Lookups ──────────────────────────────────────────────────
const lookups = reactive({ paymentTerms: [], priceLists: [], paymentMethods: [], financialAccounts: [] })
const bpCategories = ref([])

async function loadLookups() {
  try {
    const [pt, pl, pm, fa, cats] = await Promise.all([
      fetchPaymentTerms(), fetchPriceLists(), fetchPaymentMethods(), fetchFinancialAccounts(),
      fetchBPCategories(),
    ])
    lookups.paymentTerms = pt
    lookups.priceLists = pl
    lookups.paymentMethods = pm
    lookups.financialAccounts = fa
    bpCategories.value = cats
  } catch (e) { console.warn('Lookup failed', e) }
}

// ── Pagination ───────────────────────────────────────────────
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize)))
const paginationPages = computed(() => {
  const p = []; const t = totalPages.value; const c = currentPage.value
  if (t <= 7) { for (let i = 1; i <= t; i++) p.push(i); return p }
  p.push(1); if (c > 3) p.push('…')
  for (let i = Math.max(2, c-1); i <= Math.min(t-1, c+1); i++) p.push(i)
  if (c < t-2) p.push('…'); p.push(t); return p
})

async function load() {
  loading.value = true; error.value = null
  try {
    const res = await fetchVendors({ startRow: (currentPage.value-1)*pageSize, pageSize, searchKey: searchQuery.value })
    const raw = res.data ?? res
    vendors.value = enrichVendors(raw)
    totalRows.value = res.totalRows ?? raw.length
  } catch (e) {
    error.value = 'Failed to load vendors.'
  } finally { loading.value = false }
}

async function enrichVendors(list) {
  if (!list?.length) { vendors.value = []; return }
  vendors.value = list
  try {
    const ids = list.map(v => `'${v.id}'`).join(',')
    const locs = await fetchBPLocationsForIds(ids)
    const locMap = {}
    for (const l of locs) {
      const bpId = typeof l.businessPartner === 'object' ? l.businessPartner?.id : l.businessPartner
      if (bpId && !locMap[bpId]) locMap[bpId] = l
    }
    vendors.value = list.map(v => {
      const loc = locMap[v.id]
      const ident = loc?.['locationAddress$_identifier'] || ''
      const parts = ident.split(' - ')
      return {
        ...v,
        streetAddress: parts[0]?.trim() || '',
        otherDetails:  parts[1]?.trim() || '',
        postalCode:    parts[2]?.trim() || '',
        cityName:      parts[3]?.trim() || (parts[0]?.trim() || '—'),
        phone:         v.hp || loc?.phone || '—',
        bpLocationId:  loc?.id || null,
        locationId:    typeof loc?.locationAddress === 'object' ? loc?.locationAddress?.id : loc?.locationAddress || null,
      }
    })
  } catch (e) { /* silently ignore enrichment error */ }
}

function onSearch() { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { currentPage.value = 1; load() }, 400) }
function goPage(p) { if (p < 1 || p > totalPages.value) return; currentPage.value = p; load() }

// ── Dropdown ─────────────────────────────────────────────────
function toggleDropdown(id, event) {
  if (openDropdown.value === id) { openDropdown.value = null; return }
  const rect = event.currentTarget.getBoundingClientRect()
  dropdownPos.value = { top: rect.bottom + 4, right: window.innerWidth - rect.right }
  openDropdown.value = id
}
function closeDropdown() { openDropdown.value = null }

// ── Toast ─────────────────────────────────────────────────────
const toast = reactive({ show: false, message: '', type: 'success' })
let toastTimer = null
function showToast(message, type = 'success') {
  clearTimeout(toastTimer); Object.assign(toast, { show: true, message, type })
  toastTimer = setTimeout(() => { toast.show = false }, 3000)
}

// ── View Modal ────────────────────────────────────────────────
const viewModal  = reactive({ show: false, data: null })
const viewContact = ref(null)

async function openViewModal(v) {
  closeDropdown()
  viewModal.data = v
  viewModal.show = true
  viewContact.value = null
  try {
    const contacts = await fetchContacts(v.id)
    viewContact.value = contacts[0] ?? null
  } catch (e) {}
}

function editFromView() {
  viewModal.show = false
  openEditPage(viewModal.data)
}

// ── Create / Edit Page ────────────────────────────────────────
const page        = reactive({ show: false, mode: 'create', type: 'vendor', data: null })
const formLoading = ref(false)
const formError   = ref(null)
const formErrors  = reactive({})

const defaultForm = () => ({
  searchKey: '', name: '', description: '',
  province: '', city: '', streetAddress: '', otherDetails: '', postalCode: '',
  contactFirstName: '', contactLastName: '', contactEmail: '', contactPhone: '', contactPosition: '',
  contactId: null,
  paymentTerms: '', priceList: '', paymentMethod: '', account: '',
  creditLimit: 0,
  taxExempt: false,
  linkGL: '',
  active: true,
  bpLocationId: null, locationId: null,
})
const form = reactive(defaultForm())

function openCreatePage() {
  Object.assign(form, defaultForm()); Object.keys(formErrors).forEach(k => delete formErrors[k])
  formError.value = null; page.mode = 'create'; page.type = 'vendor'; page.data = null; page.show = true
}

async function openEditPage(v) {
  closeDropdown()
  Object.assign(form, {
    searchKey:         v.searchKey ?? '',
    name:              v.name ?? '',
    description:       v.description ?? '',
    province:          v.province ?? '',
    city:              v.cityName !== '—' ? (v.cityName ?? '') : '',
    streetAddress:     v.streetAddress ?? '',
    otherDetails:      v.otherDetails ?? '',
    postalCode:        v.postalCode ?? '',
    contactFirstName:  '', contactLastName: '', contactEmail: '', contactPhone: '', contactPosition: '',
    contactId:         null,
    paymentTerms:      typeof v.paymentTerms === 'object' ? (v.paymentTerms?.id ?? '') : (v.paymentTerms ?? ''),
    priceList:         typeof v.priceList    === 'object' ? (v.priceList?.id    ?? '') : (v.priceList    ?? ''),
    paymentMethod:     typeof v.paymentMethod=== 'object' ? (v.paymentMethod?.id?? '') : (v.paymentMethod?? ''),
    account:           typeof v.account      === 'object' ? (v.account?.id      ?? '') : (v.account      ?? ''),
    creditLimit:       v.creditLimit ?? 0,
    taxExempt:         v.taxExempt ?? false,
    linkGL:            typeof v.businessPartnerCategory === 'object' ? (v.businessPartnerCategory?.id ?? '') : (v.businessPartnerCategory ?? ''),
    active:            v.active ?? true,
    bpLocationId:      v.bpLocationId ?? null,
    locationId:        v.locationId ?? null,
  })
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  formError.value = null; page.mode = 'edit'; page.type = 'vendor'; page.data = v; page.show = true

  // Fetch & autofill contact
  try {
    const contacts = await fetchContacts(v.id)
    const ct = contacts[0] ?? null
    if (ct) {
      form.contactFirstName  = ct.firstName ?? ''
      form.contactLastName   = ct.lastName  ?? ''
      form.contactEmail      = ct.email     ?? ''
      form.contactPhone      = ct.phone     ?? ''
      form.contactPosition   = ct.position  ?? ''
      form.contactId         = ct.id
    }
  } catch (e) { /* silently ignore */ }
}

function closePage() { if (formLoading.value) return; page.show = false }

function validateForm() {
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  if (!form.searchKey.trim())   formErrors.searchKey     = 'Code is required'
  if (!form.name.trim())        formErrors.name          = 'Vendor name is required'
  if (!form.priceList)          formErrors.priceList     = 'Price List is required'
  if (!form.paymentMethod)      formErrors.paymentMethod = 'Payment Method is required'
  if (!form.paymentTerms)       formErrors.paymentTerms  = 'Payment Terms is required'
  return Object.keys(formErrors).length === 0
}

async function submitForm() {
  if (!validateForm()) return
  formLoading.value = true; formError.value = null
  try {
    const payload = {
      searchKey:   form.searchKey.trim(),
      name:        form.name.trim(),
      description: form.description?.trim() || null,
      active:      form.active,
      taxExempt:   form.taxExempt,
      creditLimit: form.creditLimit ?? 0,
      ...(form.linkGL        && { businessPartnerCategory: form.linkGL }),
      ...(form.paymentTerms  && { paymentTerms:  form.paymentTerms }),
      ...(form.priceList     && { priceList:     form.priceList }),
      ...(form.paymentMethod && { paymentMethod: form.paymentMethod }),
      ...(form.account       && { account:       form.account }),
    }

    if (page.mode === 'create') {
      const newVendor = await createVendor(payload)

      // Create Location + BPLocation if address provided
      if (form.streetAddress || form.city || form.province || form.postalCode) {
        const locPayload = {
          addressLine1: form.streetAddress || '-',
          addressLine2: form.otherDetails || null,
          cityName:     form.city || '-',
          postalCode:   form.postalCode || null,
          country:      '209',
        }
        const newLoc = await createLocation(locPayload)
        await createBPLocation({
          name:             form.city || 'Utama',
          phone:            form.contactPhone || null,
          businessPartner:  newVendor.id,
          locationAddress:  newLoc.id,
          invoiceToAddress: true,
          shipToAddress:    true,
          payFromAddress:   true,
          remitToAddress:   true,
        })
      }

      // Create contact if provided
      if (form.contactFirstName?.trim()) {
        await createContact({
          firstName:       form.contactFirstName.trim(),
          lastName:        form.contactLastName?.trim() || null,
          name:            `${form.contactFirstName.trim()} ${form.contactLastName?.trim() || ''}`.trim(),
          email:           form.contactEmail || null,
          phone:           form.contactPhone || null,
          position:        form.contactPosition || null,
          businessPartner: newVendor.id,
        })
      }

      showToast('Vendor created successfully')
      currentPage.value = 1; load(); page.show = false

    } else {
      await updateVendor(page.data.id, payload)

      if (form.streetAddress || form.city || form.province || form.postalCode) {
        const locPayload = {
          addressLine1: form.streetAddress || '-',
          addressLine2: form.otherDetails || null,
          cityName:     form.city || '-',
          postalCode:   form.postalCode || null,
          country:      '209',
        }
        if (form.locationId && form.bpLocationId) {
          await updateLocation(form.locationId, locPayload)
          await updateBPLocation(form.bpLocationId, {
            name:             form.city || 'Utama',
            phone:            form.contactPhone || null,
            businessPartner:  page.data.id,
            locationAddress:  form.locationId,
            invoiceToAddress: true,
            shipToAddress:    true,
            payFromAddress:   true,
            remitToAddress:   true,
          })
        } else {
          const newLoc = await createLocation(locPayload)
          await createBPLocation({
            name:             form.city || 'Utama',
            phone:            form.contactPhone || null,
            businessPartner:  page.data.id,
            locationAddress:  newLoc.id,
            invoiceToAddress: true,
            shipToAddress:    true,
            payFromAddress:   true,
            remitToAddress:   true,
          })
        }
      }

      // Update or create contact
      if (form.contactFirstName?.trim()) {
        const contactPayload = {
          firstName:       form.contactFirstName.trim(),
          lastName:        form.contactLastName?.trim() || null,
          name:            `${form.contactFirstName.trim()} ${form.contactLastName?.trim() || ''}`.trim(),
          email:           form.contactEmail || null,
          phone:           form.contactPhone || null,
          position:        form.contactPosition || null,
          businessPartner: page.data.id,
        }
        if (form.contactId) {
          await updateContact(form.contactId, contactPayload)
        } else {
          await createContact(contactPayload)
        }
      }

      showToast('Vendor updated successfully')
      page.show = false; load()
    }
  } catch (e) {
    formError.value = e.response?.data?.response?.error?.message ?? e.message ?? 'An error occurred.'
  } finally { formLoading.value = false }
}

// ── Toggle Active ─────────────────────────────────────────────
const toggleModal   = reactive({ show: false, vendor: null })
const toggleLoading = ref(false)

function confirmToggle(v) { closeDropdown(); toggleModal.vendor = v; toggleModal.show = true }

async function doToggle() {
  toggleLoading.value = true
  try {
    const newActive = !toggleModal.vendor.active
    await deleteVendor(toggleModal.vendor.id)
    showToast(newActive ? 'Vendor activated' : 'Vendor deactivated')
    toggleModal.show = false; load()
  } catch (e) {
    showToast(e.response?.data?.response?.error?.message ?? 'Failed to change status', 'error')
    toggleModal.show = false
  } finally { toggleLoading.value = false }
}

onMounted(() => { load(); loadLookups() })
</script>

<style scoped>
*, *::before, *::after { box-sizing: border-box; }
:root {
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --bg: #f1f5f9; --surface: #ffffff; --surface2: #f8fafc; --border: #e2e8f0;
  --text-primary: #0f172a; --text-secondary: #475569; --text-muted: #94a3b8;
  --accent: #3b82f6; --accent-hover: #2563eb; --accent-light: #eff6ff;
  --success: #22c55e; --danger: #ef4444;
  --radius: 12px; --radius-sm: 8px;
  --shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.05);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -1px rgba(0,0,0,.06);
}

/* ── Layout ───────────────────────────────────────────── */
.app { font-family: var(--font); color: var(--text-primary); background: var(--bg); min-height: 100vh; }
.page-wrap { padding: 24px; max-width: 1200px; margin: 0 auto; }
.content-card { background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); box-shadow: var(--shadow); overflow: hidden; }
.card-header { padding: 16px 20px; border-bottom: 1px solid var(--border); background: var(--surface); }
.page-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0; }

/* ── Toolbar ──────────────────────────────────────────── */
.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; gap: 12px; border-bottom: 1px solid var(--border); }
.search-wrap { position: relative; flex: 1; max-width: 320px; }
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.search-input { width: 100%; height: 36px; padding: 0 12px 0 32px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; font-family: var(--font); background: var(--surface2); color: var(--text-primary); }
.search-input:focus { border-color: var(--accent); background: #fff; }

/* ── Buttons ──────────────────────────────────────────── */
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; cursor: pointer; border: none; font-family: var(--font); transition: all .15s; white-space: nowrap; }
.btn--primary { background: var(--accent); color: #fff; }
.btn--primary:hover { background: var(--accent-hover); }
.btn--primary:disabled { opacity: .6; cursor: not-allowed; }
.btn--ghost { background: transparent; color: var(--text-secondary); border: 1px solid var(--border); }
.btn--ghost:hover { background: var(--surface2); }
.btn--ghost:disabled { opacity: .5; cursor: not-allowed; }
.btn--danger { background: var(--danger); color: #fff; }
.btn--danger:hover { background: #dc2626; }
.btn--danger:disabled { opacity: .6; cursor: not-allowed; }
.btn--sm { padding: 6px 12px; font-size: 12px; }
.btn-spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Table ────────────────────────────────────────────── */
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table thead th { padding: 10px 16px; text-align: left; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); background: var(--surface2); border-bottom: 1px solid var(--border); white-space: nowrap; }
.table tbody td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.table tbody tr:last-child td { border-bottom: none; }
.tr-data:hover { background: #fafbfc; }
.th-action { text-align: right; }
.td-name { font-weight: 500; color: var(--text-primary); }
.td-secondary { color: var(--text-secondary); font-size: 13px; }
.td-mono { font-family: var(--font-mono); font-size: 12.5px; }
.td-empty { text-align: center; color: var(--text-muted); padding: 48px; font-size: 13px; }
.td-error { color: var(--danger); }
.td-action-cell { text-align: right; overflow: visible !important; }
.code-badge { font-family: var(--font-mono); font-size: 11.5px; font-weight: 500; background: var(--surface2); border: 1px solid var(--border); padding: 3px 8px; border-radius: 4px; color: var(--text-secondary); white-space: nowrap; }
.inactive-pill { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; background: #fff1f2; color: var(--danger); margin-left: 6px; vertical-align: middle; }

/* ── Action Group / Dropdown ──────────────────────────── */
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
.form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-group input, .form-group select { height: 38px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; width: 100%; }
.form-group input:focus, .form-group select:focus { border-color: var(--accent); background: #fff; }
.form-group input:disabled { background: #f1f5f9; color: var(--text-muted); cursor: not-allowed; }
.input-error { border-color: var(--danger) !important; }
.field-error { font-size: 11.5px; color: var(--danger); }
.req { color: var(--danger); }
.form-section-divider { display: flex; align-items: center; gap: 8px; margin-top: 18px; margin-bottom: 2px; }
.form-section-label { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--text-muted); white-space: nowrap; }
.form-section-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
.form-checks { display: flex; gap: 20px; }
.check-label { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 500; color: var(--text-secondary); cursor: pointer; }
.check-label input[type=checkbox] { width: 15px; height: 15px; accent-color: var(--accent); cursor: pointer; }
.form-api-error { padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; margin-bottom: 16px; }
.page-footer { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; margin-top: 8px; }

/* ── Modals ───────────────────────────────────────────── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(2px); }
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); width: 100%; max-width: 480px; overflow: hidden; }
.modal--detail { max-width: 700px; }
.modal--sm { max-width: 400px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); }
.modal-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
.modal-close { background: none; border: none; color: var(--text-muted); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .12s; }
.modal-close:hover { background: var(--surface2); color: var(--text-primary); }
.modal-body { padding: 20px; max-height: 60vh; overflow-y: auto; }
.modal-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; }

/* ── Detail View ──────────────────────────────────────── */
.detail-section-label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.detail-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.detail-col { display: flex; flex-direction: column; gap: 14px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.detail-value { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }
.detail-value.mono { font-family: var(--font-mono); font-size: 12.5px; }
.status-pill { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600; }
.status-pill--active { background: #f0fdf4; color: #16a34a; }
.status-pill--inactive { background: #fff1f2; color: var(--danger); }

/* ── Delete confirm ───────────────────────────────────── */
.delete-text { font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); margin: 0; }
.delete-text strong { color: var(--text-primary); }

/* ── Transitions ──────────────────────────────────────── */
.fade-enter-active,.fade-leave-active { transition: opacity .15s; }
.fade-enter-from,.fade-leave-to { opacity: 0; }
.slide-enter-active,.slide-leave-active { transition: transform .2s ease, opacity .2s ease; }
.slide-enter-from,.slide-leave-to { transform: translateX(24px); opacity: 0; }
</style>