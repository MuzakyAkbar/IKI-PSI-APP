<template>
  <div class="layout">
    <main class="main">
      <div class="content-card">

        <!-- Page Header -->
        <div class="page-header">
          <h2 class="page-title">Vendor</h2>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button :class="['tab', activeTab === 'list' ? 'tab--active' : '']" @click="switchTab('list')">List Vendor</button>
          <button :class="['tab', activeTab === 'linkgl' ? 'tab--active' : '']" @click="switchTab('linkgl')">Link GL</button>
        </div>

        <!-- ══ LIST VENDOR TAB ══ -->
        <div v-if="activeTab === 'list'">
          <div class="toolbar">
            <div class="search-wrap">
              <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input v-model="searchQuery" class="search-input" placeholder="Search vendor..." @input="onSearch" />
            </div>
            <button class="btn btn--primary" @click="openCreateModal('vendor')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Create Vendor
            </button>
          </div>

          <div class="table-wrap">
            <table class="table">
              <colgroup>
                <col style="width:160px">
                <col style="width:35%">
                <col style="width:18%">
                <col style="width:18%">
                <col style="width:100px">
              </colgroup>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Vendor Name</th>
                  <th>City</th>
                  <th>Phone</th>
                  <th class="th-action">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading"><td colspan="5" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
                <tr v-else-if="error"><td colspan="5" class="td-empty td-error">{{ error }}</td></tr>
                <tr v-else-if="vendors.length === 0"><td colspan="5" class="td-empty">No vendors found.</td></tr>
                <template v-else>
                  <tr v-for="v in vendors" :key="v.id" class="tr-data">
                    <td><span class="code-badge">{{ v.searchKey }}</span></td>
                    <td class="td-name">{{ v.name }}</td>
                    <td class="td-secondary">{{ v.name2?.split('|')[1] || v.name2 || '-' }}</td>
                    <td class="td-secondary td-mono">{{ v.hp || '-' }}</td>
                    <td class="td-action-cell">
                      <div class="action-group" v-click-outside="closeDropdown">
                        <button class="action-btn action-btn--more" @click.stop="toggleDropdown(v.id, $event)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <!-- Dropdown Menu (fixed positioned) -->
          <div v-if="openDropdown && dropdownType === 'vendor'" class="dropdown-menu"
            :style="{ top: dropdownPos.top + 'px', right: dropdownPos.right + 'px' }">
            <button class="dropdown-item" @click="openViewModal(dropdownRecord)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>View
            </button>
            <button class="dropdown-item" @click="openEditModal('vendor', dropdownRecord); closeDropdown()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit
            </button>
            <button class="dropdown-item dropdown-item--danger" @click="confirmDeactivate(dropdownRecord); closeDropdown()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Delete
            </button>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="pagination">
            <button class="page-btn" :disabled="currentPage === 1" @click="goPage(currentPage - 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button v-for="p in paginationPages" :key="p" :class="['page-btn', p === currentPage ? 'page-btn--active' : '']" @click="goPage(p)">{{ p }}</button>
            <button class="page-btn" :disabled="currentPage === totalPages" @click="goPage(currentPage + 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>

        <!-- ══ LINK GL TAB ══ -->
        <div v-if="activeTab === 'linkgl'">
          <div class="toolbar">
            <div class="search-wrap">
              <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input v-model="glSearchQuery" class="search-input" placeholder="Search link GL..." @input="onGlSearch" />
            </div>
            <button class="btn btn--primary" @click="openCreateModal('linkgl')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Create Link GL
            </button>
          </div>

          <div class="table-wrap">
            <table class="table">
              <colgroup>
                <col style="width:140px">
                <col style="width:22%">
                <col>
                <col style="width:22%">
                <col style="width:130px">
              </colgroup>
              <thead>
                <tr>
                  <th>Code/SKU</th>
                  <th>Name Category</th>
                  <th>Vendor Liability</th>
                  <th>Pre Payment</th>
                  <th class="th-action">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="glLoading"><td colspan="5" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
                <tr v-else-if="glError"><td colspan="5" class="td-empty td-error">{{ glError }}</td></tr>
                <tr v-else-if="glRows.length === 0"><td colspan="5" class="td-empty">No Link GL found.</td></tr>
                <template v-else>
                  <tr v-for="g in glRows" :key="g.id" class="tr-data">
                    <td><span class="code-badge">{{ g.searchKey || g.value || '—' }}</span></td>
                    <td class="td-name">
                      {{ g['productCategory$_identifier'] || g.categoryName || '—' }}
                      <span v-if="g.isDefault" class="default-badge">Default</span>
                    </td>
                    <td class="td-secondary td-clip">{{ g['vendorLiability$_identifier'] || g.vendorLiability || '—' }}</td>
                    <td class="td-secondary td-clip">{{ g['prePayment$_identifier'] || g.prePayment || '—' }}</td>
                    <td class="td-action-cell">
                      <div class="action-group" v-click-outside="closeDropdown">
                        <button class="action-btn action-btn--more" @click.stop="toggleDropdown(g.id, $event, 'linkgl', g)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <!-- Dropdown Menu for Link GL -->
          <div v-if="openDropdown && dropdownType === 'linkgl'" class="dropdown-menu"
            :style="{ top: dropdownPos.top + 'px', right: dropdownPos.right + 'px' }">
            <button class="dropdown-item" @click="openGlViewModal(dropdownRecord); closeDropdown()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>View
            </button>
            <button class="dropdown-item" @click="openEditModal('linkgl', dropdownRecord); closeDropdown()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit
            </button>
            <button class="dropdown-item dropdown-item--danger" @click="confirmDeleteGl(dropdownRecord); closeDropdown()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Delete
            </button>
            <button class="dropdown-item" @click="setAsDefault(dropdownRecord); closeDropdown()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>Set As Default
            </button>
          </div>

          <!-- GL Pagination -->
          <div v-if="glTotalPages > 1" class="pagination">
            <button class="page-btn" :disabled="glCurrentPage === 1" @click="goGlPage(glCurrentPage - 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button v-for="p in glPaginationPages" :key="p" :class="['page-btn', p === glCurrentPage ? 'page-btn--active' : '']" @click="goGlPage(p)">{{ p }}</button>
            <button class="page-btn" :disabled="glCurrentPage === glTotalPages" @click="goGlPage(glCurrentPage + 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
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

    <!-- ══ VIEW VENDOR MODAL ══ -->
    <Transition name="fade">
      <div v-if="viewModal" class="modal-overlay" @click.self="viewModal = null">
        <div class="modal">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Vendor</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">Vendor Detail</span>
              </div>
              <h3 class="modal-title">Vendor Detail</h3>
            </div>
            <button class="modal-close" @click="viewModal = null">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="detail-tabs">
              <button :class="['detail-tab', detailTab === 'basic' ? 'detail-tab--active' : '']" @click="detailTab = 'basic'">Basic Info</button>
              <button :class="['detail-tab', detailTab === 'contact' ? 'detail-tab--active' : '']" @click="detailTab = 'contact'">Contact</button>
            </div>

            <div v-if="detailTab === 'basic'" class="detail-grid" style="margin-top:16px">
              <div class="detail-item">
                <span class="detail-label">Vendor Code/SKU</span>
                <span class="detail-value mono">{{ viewModal.searchKey }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Street Address</span>
                <span class="detail-value">{{ viewModal.description || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Vendor Name</span>
                <span class="detail-value">{{ viewModal.name }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Other Details</span>
                <span class="detail-value">-</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Province</span>
                <span class="detail-value">{{ viewModal.name2?.split('|')[0] || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Link GL</span>
                <span class="detail-value">-</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">City</span>
                <span class="detail-value">{{ viewModal.name2?.split('|')[1] || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Status</span>
                <span :class="['status-badge', viewModal.active ? 'status-badge--active' : 'status-badge--inactive']">
                  {{ viewModal.active ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Postal Code</span>
                <span class="detail-value">{{ viewModal.postalCode || '-' }}</span>
              </div>
            </div>

            <div v-if="detailTab === 'contact'" class="detail-grid" style="margin-top:16px">
              <div class="detail-item">
                <span class="detail-label">Contact Name</span>
                <span class="detail-value">{{ viewModal.contactName || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Email</span>
                <span class="detail-value">{{ viewModal.email || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Phone</span>
                <span class="detail-value">{{ viewModal.phone || '-' }}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--primary" @click="openEditFromView">Edit</button>
            <button class="btn btn--ghost" @click="viewModal = null">Close</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ══ VIEW LINK GL MODAL ══ -->
    <Transition name="fade">
      <div v-if="glViewModal" class="modal-overlay" @click.self="glViewModal = null">
        <div class="modal">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Link GL</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">Link GL Detail</span>
              </div>
              <h3 class="modal-title">Link GL Detail</h3>
            </div>
            <button class="modal-close" @click="glViewModal = null">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Code/SKU</span>
                <span class="detail-value mono">{{ glViewModal.searchKey || glViewModal.value || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Vendor Liability</span>
                <span class="detail-value">{{ glViewModal['vendorLiability$_identifier'] || glViewModal.vendorLiability || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Category Name</span>
                <span class="detail-value">{{ glViewModal['productCategory$_identifier'] || glViewModal.categoryName || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Pre Payment</span>
                <span class="detail-value">{{ glViewModal['prePayment$_identifier'] || glViewModal.prePayment || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Account Receivable</span>
                <span class="detail-value">{{ glViewModal['accountReceivable$_identifier'] || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Status</span>
                <span :class="['status-badge', glViewModal.active !== false ? 'status-badge--active' : 'status-badge--inactive']">
                  {{ glViewModal.active !== false ? 'Active' : 'Inactive' }}
                </span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--primary" @click="openEditFromGlView">Edit</button>
            <button class="btn btn--ghost" @click="glViewModal = null">Close</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ══ CREATE / EDIT VENDOR MODAL ══ -->
    <Transition name="fade">
      <div v-if="formModal.show && formModal.type === 'vendor'" class="modal-overlay" @click.self="closeFormModal">
        <div class="modal modal--wide">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Vendor</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">{{ formModal.mode === 'create' ? 'Create Vendor' : 'Edit Vendor' }}</span>
              </div>
              <h3 class="modal-title">{{ formModal.mode === 'create' ? 'Create Vendor' : 'Edit Vendor' }}</h3>
            </div>
            <button class="modal-close" @click="closeFormModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="form-section-title">Customer Info</p>
            <div class="form-grid">
              <div class="form-group">
                <label>Vendor Code/SKU <span class="required">*</span></label>
                <input v-model="form.searchKey" type="text" placeholder="e.g. VN-2105-0001" :class="{ 'input-error': formErrors.searchKey }" />
                <span class="field-error" v-if="formErrors.searchKey">{{ formErrors.searchKey }}</span>
              </div>
              <div class="form-group">
                <label>Province</label>
                <select v-model="form.province" @change="form.city = ''">
                  <option value="">Select</option>
                  <option v-for="prov in provinceList" :key="prov" :value="prov">{{ prov }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Vendor Name <span class="required">*</span></label>
                <input v-model="form.name" type="text" placeholder="Vendor Name" :class="{ 'input-error': formErrors.name }" />
                <span class="field-error" v-if="formErrors.name">{{ formErrors.name }}</span>
              </div>
              <div class="form-group">
                <label>Street Address</label>
                <input v-model="form.description" type="text" placeholder="e.g. Jl. Sudirman No. 1" />
              </div>
              <div class="form-group">
                <label>Link GL</label>
                <select v-model="form.linkGL">
                  <option value="">Select</option>
                  <option v-for="g in glRows" :key="g.id" :value="g.id">{{ g['productCategory$_identifier'] || g.categoryName }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>City</label>
                <select v-model="form.city" :disabled="!form.province">
                  <option value="">{{ form.province ? 'Select City' : 'Select Province first' }}</option>
                  <option v-for="city in citiesForProvince" :key="city" :value="city">{{ city }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Postal Code</label>
                <input v-model="form.postalCode" type="text" placeholder="Postal Code" />
              </div>
            </div>

            <p class="form-section-title" style="margin-top:18px">Contact Info</p>
            <div class="form-grid">
              <div class="form-group">
                <label>Contact Name</label>
                <input v-model="form.contactName" type="text" placeholder="Contact name" />
              </div>
              <div class="form-group">
                <label>Email</label>
                <input v-model="form.email" type="email" placeholder="Email address" />
              </div>
              <div class="form-group">
                <label>Phone</label>
                <input v-model="form.phone" type="text" placeholder="Phone number" />
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

    <!-- ══ CREATE / EDIT LINK GL MODAL ══ -->
    <Transition name="fade">
      <div v-if="formModal.show && formModal.type === 'linkgl'" class="modal-overlay" @click.self="closeFormModal">
        <div class="modal modal--wide">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Link GL</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">{{ formModal.mode === 'create' ? 'Create Link GL' : 'Edit Link GL' }}</span>
              </div>
              <h3 class="modal-title">{{ formModal.mode === 'create' ? 'Create Link GL' : 'Edit Link GL' }}</h3>
            </div>
            <button class="modal-close" @click="closeFormModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group">
                <label>Code/SKU <span class="required">*</span></label>
                <input v-model="glForm.searchKey" type="text" placeholder="Code/SKU" :class="{ 'input-error': glFormErrors.searchKey }" />
                <span class="field-error" v-if="glFormErrors.searchKey">{{ glFormErrors.searchKey }}</span>
              </div>
              <div class="form-group">
                <label>Vendor Liability</label>
                <select v-model="glForm.vendorLiability">
                  <option value="">Select</option>
                  <option v-for="a in lookups.accounts" :key="a.id" :value="a.id">{{ a._identifier || a.combination }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Name Category <span class="required">*</span></label>
                <input v-model="glForm.categoryName" type="text" placeholder="Name Category" :class="{ 'input-error': glFormErrors.categoryName }" />
                <span class="field-error" v-if="glFormErrors.categoryName">{{ glFormErrors.categoryName }}</span>
              </div>
              <div class="form-group">
                <label>Pre Payment</label>
                <select v-model="glForm.prePayment">
                  <option value="">Select</option>
                  <option v-for="a in lookups.accounts" :key="a.id" :value="a.id">{{ a._identifier || a.combination }}</option>
                </select>
              </div>
              <div class="form-group" style="grid-column: 1 / -1">
                <label class="check-label">
                  <input type="checkbox" v-model="glForm.isDefault" />
                  Default
                </label>
              </div>
            </div>

            <div v-if="glFormError" class="form-api-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ glFormError }}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="closeFormModal" :disabled="glFormLoading">Cancel</button>
            <button class="btn btn--primary" @click="submitGlForm" :disabled="glFormLoading">
              <span v-if="glFormLoading" class="btn-spinner"></span>
              {{ glFormLoading ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ══ DEACTIVATE VENDOR MODAL ══ -->
    <Transition name="fade">
      <div v-if="deactivateModal.show" class="modal-overlay" @click.self="deactivateModal.show = false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <h3 class="modal-title">{{ deactivateModal.record?.active ? 'Set As Inactive' : 'Set As Active' }}</h3>
            <button class="modal-close" @click="deactivateModal.show = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-text">
              Yakin ingin {{ deactivateModal.record?.active ? 'menonaktifkan' : 'mengaktifkan' }} vendor
              <strong>{{ deactivateModal.record?.name }}</strong>?
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="deactivateModal.show = false" :disabled="deactivateLoading">Cancel</button>
            <button :class="['btn', deactivateModal.record?.active ? 'btn--danger' : 'btn--primary']" @click="doDeactivate" :disabled="deactivateLoading">
              <span v-if="deactivateLoading" class="btn-spinner"></span>
              {{ deactivateLoading ? 'Processing...' : (deactivateModal.record?.active ? 'Set Inactive' : 'Set Active') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ══ DELETE GL MODAL ══ -->
    <Transition name="fade">
      <div v-if="deleteGlModal.show" class="modal-overlay" @click.self="deleteGlModal.show = false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <h3 class="modal-title">Delete Link GL</h3>
            <button class="modal-close" @click="deleteGlModal.show = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-text">
              Yakin ingin menghapus Link GL <strong>{{ deleteGlModal.record?.categoryName }}</strong>?
              Data yang dihapus tidak dapat dikembalikan.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="deleteGlModal.show = false" :disabled="deleteGlLoading">Cancel</button>
            <button class="btn btn--danger" @click="doDeleteGl" :disabled="deleteGlLoading">
              <span v-if="deleteGlLoading" class="btn-spinner"></span>
              {{ deleteGlLoading ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, onBeforeUnmount } from 'vue'
import {
  fetchVendors,
  createVendor,
  updateVendor,
  toggleVendorActive,
  fetchPaymentTerms,
  fetchPriceLists,
  fetchPaymentMethods,
  fetchVendorLinkGL,
  createVendorLinkGL,
  updateVendorLinkGL,
  deleteVendorLinkGL,
  fetchAccountingCombinations,
} from '@/services/vendor'


// ── Indonesia Province → City Data ────────────────────────────
const provinceData = {
  'DKI Jakarta': ['Jakarta Pusat', 'Jakarta Utara', 'Jakarta Barat', 'Jakarta Selatan', 'Jakarta Timur', 'Kepulauan Seribu'],
  'Jawa Barat': ['Bandung', 'Bekasi', 'Bogor', 'Cimahi', 'Cirebon', 'Depok', 'Sukabumi', 'Tasikmalaya', 'Banjar', 'Kab. Bandung', 'Kab. Bekasi', 'Kab. Bogor', 'Kab. Ciamis', 'Kab. Cianjur', 'Kab. Cirebon', 'Kab. Garut', 'Kab. Indramayu', 'Kab. Karawang', 'Kab. Kuningan', 'Kab. Majalengka', 'Kab. Pangandaran', 'Kab. Purwakarta', 'Kab. Subang', 'Kab. Sukabumi', 'Kab. Sumedang', 'Kab. Tasikmalaya'],
  'Jawa Tengah': ['Semarang', 'Surakarta', 'Magelang', 'Pekalongan', 'Salatiga', 'Tegal', 'Kab. Banjarnegara', 'Kab. Banyumas', 'Kab. Batang', 'Kab. Blora', 'Kab. Boyolali', 'Kab. Brebes', 'Kab. Cilacap', 'Kab. Demak', 'Kab. Grobogan', 'Kab. Jepara', 'Kab. Karanganyar', 'Kab. Kebumen', 'Kab. Kendal', 'Kab. Klaten', 'Kab. Kudus', 'Kab. Magelang', 'Kab. Pati', 'Kab. Pekalongan', 'Kab. Pemalang', 'Kab. Purbalingga', 'Kab. Purworejo', 'Kab. Rembang', 'Kab. Semarang', 'Kab. Sragen', 'Kab. Sukoharjo', 'Kab. Tegal', 'Kab. Temanggung', 'Kab. Wonogiri', 'Kab. Wonosobo'],
  'Jawa Timur': ['Surabaya', 'Malang', 'Batu', 'Blitar', 'Kediri', 'Madiun', 'Mojokerto', 'Pasuruan', 'Probolinggo', 'Kab. Bangkalan', 'Kab. Banyuwangi', 'Kab. Blitar', 'Kab. Bojonegoro', 'Kab. Bondowoso', 'Kab. Gresik', 'Kab. Jember', 'Kab. Jombang', 'Kab. Kediri', 'Kab. Lamongan', 'Kab. Lumajang', 'Kab. Madiun', 'Kab. Magetan', 'Kab. Malang', 'Kab. Mojokerto', 'Kab. Nganjuk', 'Kab. Ngawi', 'Kab. Pacitan', 'Kab. Pamekasan', 'Kab. Pasuruan', 'Kab. Ponorogo', 'Kab. Probolinggo', 'Kab. Sampang', 'Kab. Sidoarjo', 'Kab. Situbondo', 'Kab. Sumenep', 'Kab. Trenggalek', 'Kab. Tuban', 'Kab. Tulungagung'],
  'Banten': ['Cilegon', 'Serang', 'Tangerang', 'Tangerang Selatan', 'Kab. Lebak', 'Kab. Pandeglang', 'Kab. Serang', 'Kab. Tangerang'],
  'Bali': ['Denpasar', 'Kab. Badung', 'Kab. Bangli', 'Kab. Buleleng', 'Kab. Gianyar', 'Kab. Jembrana', 'Kab. Karangasem', 'Kab. Klungkung', 'Kab. Tabanan'],
  'Sumatera Utara': ['Medan', 'Binjai', 'Gunungsitoli', 'Pematangsiantar', 'Sibolga', 'Tanjungbalai', 'Tebing Tinggi', 'Kab. Asahan', 'Kab. Batubara', 'Kab. Dairi', 'Kab. Deli Serdang', 'Kab. Humbang Hasundutan', 'Kab. Karo', 'Kab. Labuhanbatu', 'Kab. Labuhanbatu Selatan', 'Kab. Labuhanbatu Utara', 'Kab. Langkat', 'Kab. Mandailing Natal', 'Kab. Nias', 'Kab. Nias Barat', 'Kab. Nias Selatan', 'Kab. Nias Utara', 'Kab. Padang Lawas', 'Kab. Padang Lawas Utara', 'Kab. Pakpak Bharat', 'Kab. Samosir', 'Kab. Serdang Bedagai', 'Kab. Simalungun', 'Kab. Tapanuli Selatan', 'Kab. Tapanuli Tengah', 'Kab. Tapanuli Utara', 'Kab. Toba'],
  'Sumatera Selatan': ['Palembang', 'Lubuklinggau', 'Pagaralam', 'Prabumulih', 'Kab. Banyuasin', 'Kab. Empat Lawang', 'Kab. Lahat', 'Kab. Muara Enim', 'Kab. Musi Banyuasin', 'Kab. Musi Rawas', 'Kab. Musi Rawas Utara', 'Kab. Ogan Ilir', 'Kab. Ogan Komering Ilir', 'Kab. Ogan Komering Ulu', 'Kab. OKU Selatan', 'Kab. OKU Timur', 'Kab. Penukal Abab Lematang Ilir'],
  'Sumatera Barat': ['Padang', 'Bukittinggi', 'Padang Panjang', 'Pariaman', 'Payakumbuh', 'Sawahlunto', 'Solok', 'Kab. Agam', 'Kab. Dharmasraya', 'Kab. Kepulauan Mentawai', 'Kab. Lima Puluh Kota', 'Kab. Padang Pariaman', 'Kab. Pasaman', 'Kab. Pasaman Barat', 'Kab. Pesisir Selatan', 'Kab. Sijunjung', 'Kab. Solok', 'Kab. Solok Selatan', 'Kab. Tanah Datar'],
  'Riau': ['Pekanbaru', 'Dumai', 'Kab. Bengkalis', 'Kab. Indragiri Hilir', 'Kab. Indragiri Hulu', 'Kab. Kampar', 'Kab. Kepulauan Meranti', 'Kab. Kuantan Singingi', 'Kab. Pelalawan', 'Kab. Rokan Hilir', 'Kab. Rokan Hulu', 'Kab. Siak'],
  'Kepulauan Riau': ['Batam', 'Tanjungpinang', 'Kab. Anambas', 'Kab. Bintan', 'Kab. Karimun', 'Kab. Kepulauan Anambas', 'Kab. Lingga', 'Kab. Natuna'],
  'Jambi': ['Jambi', 'Sungaipenuh', 'Kab. Batanghari', 'Kab. Bungo', 'Kab. Kerinci', 'Kab. Merangin', 'Kab. Muaro Jambi', 'Kab. Sarolangun', 'Kab. Tanjung Jabung Barat', 'Kab. Tanjung Jabung Timur', 'Kab. Tebo'],
  'Bengkulu': ['Bengkulu', 'Kab. Bengkulu Selatan', 'Kab. Bengkulu Tengah', 'Kab. Bengkulu Utara', 'Kab. Empat Lawang', 'Kab. Kaur', 'Kab. Kepahiang', 'Kab. Lebong', 'Kab. Muko Muko', 'Kab. Rejang Lebong', 'Kab. Seluma'],
  'Lampung': ['Bandar Lampung', 'Metro', 'Kab. Lampung Barat', 'Kab. Lampung Selatan', 'Kab. Lampung Tengah', 'Kab. Lampung Timur', 'Kab. Lampung Utara', 'Kab. Mesuji', 'Kab. Pesawaran', 'Kab. Pesisir Barat', 'Kab. Pringsewu', 'Kab. Tanggamus', 'Kab. Tulang Bawang', 'Kab. Tulang Bawang Barat', 'Kab. Way Kanan'],
  'Kalimantan Barat': ['Pontianak', 'Singkawang', 'Kab. Bengkayang', 'Kab. Kapuas Hulu', 'Kab. Kayong Utara', 'Kab. Ketapang', 'Kab. Kubu Raya', 'Kab. Landak', 'Kab. Melawi', 'Kab. Mempawah', 'Kab. Sambas', 'Kab. Sanggau', 'Kab. Sekadau', 'Kab. Sintang'],
  'Kalimantan Timur': ['Samarinda', 'Balikpapan', 'Bontang', 'Kab. Berau', 'Kab. Kutai Barat', 'Kab. Kutai Kartanegara', 'Kab. Kutai Timur', 'Kab. Mahakam Ulu', 'Kab. Paser', 'Kab. Penajam Paser Utara'],
  'Kalimantan Selatan': ['Banjarmasin', 'Banjarbaru', 'Kab. Balangan', 'Kab. Banjar', 'Kab. Barito Kuala', 'Kab. Hulu Sungai Selatan', 'Kab. Hulu Sungai Tengah', 'Kab. Hulu Sungai Utara', 'Kab. Kotabaru', 'Kab. Tabalong', 'Kab. Tanah Bumbu', 'Kab. Tanah Laut', 'Kab. Tapin'],
  'Kalimantan Tengah': ['Palangka Raya', 'Kab. Barito Selatan', 'Kab. Barito Timur', 'Kab. Barito Utara', 'Kab. Gunung Mas', 'Kab. Kapuas', 'Kab. Katingan', 'Kab. Kotawaringin Barat', 'Kab. Kotawaringin Timur', 'Kab. Lamandau', 'Kab. Murung Raya', 'Kab. Pulang Pisau', 'Kab. Seruyan', 'Kab. Sukamara'],
  'Kalimantan Utara': ['Tarakan', 'Kab. Bulungan', 'Kab. Malinau', 'Kab. Nunukan', 'Kab. Tana Tidung'],
  'Sulawesi Selatan': ['Makassar', 'Palopo', 'Parepare', 'Kab. Bantaeng', 'Kab. Barru', 'Kab. Bone', 'Kab. Bulukumba', 'Kab. Enrekang', 'Kab. Gowa', 'Kab. Jeneponto', 'Kab. Kepulauan Selayar', 'Kab. Luwu', 'Kab. Luwu Timur', 'Kab. Luwu Utara', 'Kab. Maros', 'Kab. Pangkajene dan Kepulauan', 'Kab. Pinrang', 'Kab. Sidenreng Rappang', 'Kab. Sinjai', 'Kab. Soppeng', 'Kab. Takalar', 'Kab. Tana Toraja', 'Kab. Toraja Utara', 'Kab. Wajo'],
  'Sulawesi Utara': ['Manado', 'Bitung', 'Kotamobagu', 'Tomohon', 'Kab. Bolaang Mongondow', 'Kab. Bolaang Mongondow Selatan', 'Kab. Bolaang Mongondow Timur', 'Kab. Bolaang Mongondow Utara', 'Kab. Kepulauan Sangihe', 'Kab. Kepulauan Siau Tagulandang Biaro', 'Kab. Kepulauan Talaud', 'Kab. Minahasa', 'Kab. Minahasa Selatan', 'Kab. Minahasa Tenggara', 'Kab. Minahasa Utara'],
  'Sulawesi Tengah': ['Palu', 'Kab. Banggai', 'Kab. Banggai Kepulauan', 'Kab. Banggai Laut', 'Kab. Buol', 'Kab. Donggala', 'Kab. Morowali', 'Kab. Morowali Utara', 'Kab. Parigi Moutong', 'Kab. Poso', 'Kab. Sigi', 'Kab. Tojo Una-Una', 'Kab. Tolitoli'],
  'Sulawesi Tenggara': ['Kendari', 'Bau-Bau', 'Kab. Bombana', 'Kab. Buton', 'Kab. Buton Selatan', 'Kab. Buton Tengah', 'Kab. Buton Utara', 'Kab. Kolaka', 'Kab. Kolaka Timur', 'Kab. Kolaka Utara', 'Kab. Konawe', 'Kab. Konawe Kepulauan', 'Kab. Konawe Selatan', 'Kab. Konawe Utara', 'Kab. Muna', 'Kab. Muna Barat', 'Kab. Wakatobi'],
  'Gorontalo': ['Gorontalo', 'Kab. Boalemo', 'Kab. Bone Bolango', 'Kab. Gorontalo', 'Kab. Gorontalo Utara', 'Kab. Pohuwato'],
  'Sulawesi Barat': ['Mamuju', 'Kab. Majene', 'Kab. Mamasa', 'Kab. Mamuju Tengah', 'Kab. Pasangkayu', 'Kab. Polewali Mandar'],
  'Maluku': ['Ambon', 'Tual', 'Kab. Buru', 'Kab. Buru Selatan', 'Kab. Kepulauan Aru', 'Kab. Maluku Barat Daya', 'Kab. Maluku Tengah', 'Kab. Maluku Tenggara', 'Kab. Maluku Tenggara Barat', 'Kab. Seram Bagian Barat', 'Kab. Seram Bagian Timur'],
  'Maluku Utara': ['Ternate', 'Tidore Kepulauan', 'Kab. Halmahera Barat', 'Kab. Halmahera Tengah', 'Kab. Halmahera Timur', 'Kab. Halmahera Utara', 'Kab. Halmahera Selatan', 'Kab. Kepulauan Sula', 'Kab. Pulau Morotai', 'Kab. Pulau Taliabu'],
  'Papua': ['Jayapura', 'Kab. Asmat', 'Kab. Biak Numfor', 'Kab. Boven Digoel', 'Kab. Deiyai', 'Kab. Dogiyai', 'Kab. Intan Jaya', 'Kab. Jayapura', 'Kab. Jayawijaya', 'Kab. Keerom', 'Kab. Kepulauan Yapen', 'Kab. Lanny Jaya', 'Kab. Mamberamo Raya', 'Kab. Mamberamo Tengah', 'Kab. Mappi', 'Kab. Merauke', 'Kab. Mimika', 'Kab. Nabire', 'Kab. Nduga', 'Kab. Paniai', 'Kab. Pegunungan Bintang', 'Kab. Puncak', 'Kab. Puncak Jaya', 'Kab. Sarmi', 'Kab. Supiori', 'Kab. Tolikara', 'Kab. Waropen', 'Kab. Yahukimo', 'Kab. Yalimo'],
  'Papua Barat': ['Manokwari', 'Sorong', 'Kab. Fakfak', 'Kab. Kaimana', 'Kab. Manokwari Selatan', 'Kab. Maybrat', 'Kab. Pegunungan Arfak', 'Kab. Raja Ampat', 'Kab. Sorong', 'Kab. Sorong Selatan', 'Kab. Tambrauw', 'Kab. Teluk Bintuni', 'Kab. Teluk Wondama'],
  'Nusa Tenggara Barat': ['Mataram', 'Bima', 'Kab. Bima', 'Kab. Dompu', 'Kab. Lombok Barat', 'Kab. Lombok Tengah', 'Kab. Lombok Timur', 'Kab. Lombok Utara', 'Kab. Sumbawa', 'Kab. Sumbawa Barat'],
  'Nusa Tenggara Timur': ['Kupang', 'Kab. Alor', 'Kab. Belu', 'Kab. Ende', 'Kab. Flores Timur', 'Kab. Kupang', 'Kab. Lembata', 'Kab. Malaka', 'Kab. Manggarai', 'Kab. Manggarai Barat', 'Kab. Manggarai Timur', 'Kab. Nagekeo', 'Kab. Ngada', 'Kab. Rote Ndao', 'Kab. Sabu Raijua', 'Kab. Sikka', 'Kab. Sumba Barat', 'Kab. Sumba Barat Daya', 'Kab. Sumba Tengah', 'Kab. Sumba Timur', 'Kab. Timor Tengah Selatan', 'Kab. Timor Tengah Utara'],
  'Aceh': ['Banda Aceh', 'Langsa', 'Lhokseumawe', 'Sabang', 'Subulussalam', 'Kab. Aceh Barat', 'Kab. Aceh Barat Daya', 'Kab. Aceh Besar', 'Kab. Aceh Jaya', 'Kab. Aceh Selatan', 'Kab. Aceh Singkil', 'Kab. Aceh Tamiang', 'Kab. Aceh Tengah', 'Kab. Aceh Tenggara', 'Kab. Aceh Timur', 'Kab. Aceh Utara', 'Kab. Bener Meriah', 'Kab. Bireuen', 'Kab. Gayo Lues', 'Kab. Nagan Raya', 'Kab. Pidie', 'Kab. Pidie Jaya', 'Kab. Simeulue'],
  'DI Yogyakarta': ['Yogyakarta', 'Kab. Bantul', 'Kab. Gunungkidul', 'Kab. Kulon Progo', 'Kab. Sleman'],
  'Kep. Bangka Belitung': ['Pangkal Pinang', 'Kab. Bangka', 'Kab. Bangka Barat', 'Kab. Bangka Selatan', 'Kab. Bangka Tengah', 'Kab. Belitung', 'Kab. Belitung Timur'],
}

const provinceList = computed(() => Object.keys(provinceData).sort())
const citiesForProvince = computed(() => {
  if (!form.province) return []
  return provinceData[form.province] ?? []
})

// ── State: Vendor List ─────────────────────────────────────────
const activeTab = ref('list')
const vendors = ref([])
const loading = ref(false)
const error = ref(null)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = 10
const totalRows = ref(0)
let searchTimeout = null

const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize)))
const paginationPages = computed(() => {
  const out = [], s = Math.max(1, currentPage.value - 2), e = Math.min(totalPages.value, currentPage.value + 2)
  for (let i = s; i <= e; i++) out.push(i)
  return out
})

// ── State: Link GL ─────────────────────────────────────────────
const glRows = ref([])
const glLoading = ref(false)
const glError = ref(null)
const glSearchQuery = ref('')
const glCurrentPage = ref(1)
const glTotalRows = ref(0)
const glTotalPages = computed(() => Math.max(1, Math.ceil(glTotalRows.value / pageSize)))
const glPaginationPages = computed(() => {
  const out = [], s = Math.max(1, glCurrentPage.value - 2), e = Math.min(glTotalPages.value, glCurrentPage.value + 2)
  for (let i = s; i <= e; i++) out.push(i)
  return out
})
let glSearchTimeout = null

// ── Dropdown ───────────────────────────────────────────────────
const openDropdown = ref(null)
const dropdownPos = ref({ top: 0, right: 0 })
const dropdownType = ref('vendor')
const dropdownRecord = ref(null)

function toggleDropdown(id, event, type = 'vendor', record = null) {
  if (openDropdown.value === id) { openDropdown.value = null; return }
  const btn = event.currentTarget
  const rect = btn.getBoundingClientRect()
  dropdownPos.value = { top: rect.bottom + 4, right: window.innerWidth - rect.right }
  dropdownType.value = type
  dropdownRecord.value = record || vendors.value.find(v => v.id === id) || glRows.value.find(g => g.id === id)
  openDropdown.value = id
}

function closeDropdown() { openDropdown.value = null }

function handleGlobalClick() { closeDropdown() }
onMounted(() => document.addEventListener('click', handleGlobalClick))
onBeforeUnmount(() => document.removeEventListener('click', handleGlobalClick))

// ── Lookups ────────────────────────────────────────────────────
const lookups = reactive({ accounts: [], paymentTerms: [], priceLists: [], paymentMethods: [] })

async function loadLookups() {
  try {
    const [pt, pl, pm, accounts] = await Promise.all([
      fetchPaymentTerms(),
      fetchPriceLists(),
      fetchPaymentMethods(),
      fetchAccountingCombinations(),
    ])
    lookups.paymentTerms = pt
    lookups.priceLists = pl
    lookups.paymentMethods = pm
    lookups.accounts = accounts
  } catch (e) { console.warn('Lookup failed', e) }
}

// ── Load Vendors ───────────────────────────────────────────────
async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await fetchVendors({
      startRow: (currentPage.value - 1) * pageSize,
      pageSize,
      searchKey: searchQuery.value,
    })
    vendors.value = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : [])
    totalRows.value = res.totalRows ?? vendors.value.length
  } catch (e) {
    error.value = 'Gagal memuat data vendor.'
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
  currentPage.value = p; load()
}

// ── Load Link GL ───────────────────────────────────────────────
async function loadGl() {
  glLoading.value = true
  glError.value = null
  try {
    const res = await fetchVendorLinkGL({
      startRow: (glCurrentPage.value - 1) * pageSize,
      pageSize,
      searchKey: glSearchQuery.value,
    })
    glRows.value = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : [])
    glTotalRows.value = res.totalRows ?? glRows.value.length
  } catch (e) {
    glError.value = 'Gagal memuat data Link GL.'
    console.error(e)
  } finally {
    glLoading.value = false
  }
}

function onGlSearch() {
  clearTimeout(glSearchTimeout)
  glSearchTimeout = setTimeout(() => { glCurrentPage.value = 1; loadGl() }, 400)
}

function goGlPage(p) {
  if (p < 1 || p > glTotalPages.value) return
  glCurrentPage.value = p; loadGl()
}

// ── Tab Switch ─────────────────────────────────────────────────
function switchTab(tab) {
  activeTab.value = tab
  closeDropdown()
  if (tab === 'list') { currentPage.value = 1; searchQuery.value = ''; load() }
  else { glCurrentPage.value = 1; glSearchQuery.value = ''; loadGl() }
}

// ── Toast ──────────────────────────────────────────────────────
const toast = reactive({ show: false, message: '', type: 'success' })
let toastTimer = null
function showToast(message, type = 'success') {
  clearTimeout(toastTimer)
  Object.assign(toast, { show: true, message, type })
  toastTimer = setTimeout(() => { toast.show = false }, 3000)
}

// ── View Modal ─────────────────────────────────────────────────
const viewModal = ref(null)
const detailTab = ref('basic')
const glViewModal = ref(null)

function openViewModal(v) { viewModal.value = v; detailTab.value = 'basic'; closeDropdown() }
function openGlViewModal(g) { glViewModal.value = g }
function openEditFromView() {
  const v = viewModal.value; viewModal.value = null; openEditModal('vendor', v)
}
function openEditFromGlView() {
  const g = glViewModal.value; glViewModal.value = null; openEditModal('linkgl', g)
}

// ── Form Modal ─────────────────────────────────────────────────
const formModal = reactive({ show: false, mode: 'create', type: 'vendor', id: null })
const formLoading = ref(false)
const formError = ref(null)
const formErrors = reactive({})

const defaultVendorForm = () => ({
  searchKey: '', name: '', description: '', province: '', city: '',
  postalCode: '', linkGL: '', contactName: '', email: '', phone: '',
})
const form = reactive(defaultVendorForm())

// Link GL Form
const glFormLoading = ref(false)
const glFormError = ref(null)
const glFormErrors = reactive({})
const defaultGlForm = () => ({ searchKey: '', categoryName: '', vendorLiability: '', prePayment: '', isDefault: false })
const glForm = reactive(defaultGlForm())

function openCreateModal(type) {
  formModal.type = type
  formModal.mode = 'create'
  formModal.id = null
  formError.value = null
  glFormError.value = null
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  Object.keys(glFormErrors).forEach(k => delete glFormErrors[k])
  if (type === 'vendor') Object.assign(form, defaultVendorForm())
  else Object.assign(glForm, defaultGlForm())
  formModal.show = true
}

function openEditModal(type, record) {
  formModal.type = type
  formModal.mode = 'edit'
  formModal.id = record.id
  formError.value = null
  glFormError.value = null
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  Object.keys(glFormErrors).forEach(k => delete glFormErrors[k])
  if (type === 'vendor') {
    Object.assign(form, {
      searchKey: record.searchKey ?? '',
      name: record.name ?? '',
      description: record.description ?? '',
      province: (() => { const p = record.name2?.split('|'); return p?.[0] ?? '' })(),
      city: (() => { const p = record.name2?.split('|'); return p?.[1] ?? '' })(),
      postalCode: record.postalCode ?? '',
      linkGL: record.linkGL ?? '',
      contactName: record.contactName ?? '',
      email: record.email ?? '',
      phone: record.hp ?? record.phone ?? '',
    })
  } else {
    Object.assign(glForm, {
      searchKey: record.searchKey ?? record.value ?? '',
      categoryName: record.categoryName ?? record['productCategory$_identifier'] ?? '',
      vendorLiability: record.vendorLiability ?? '',
      prePayment: record.prePayment ?? '',
      isDefault: record.isDefault ?? false,
    })
  }
  formModal.show = true
}

function closeFormModal() {
  if (formLoading.value || glFormLoading.value) return
  formModal.show = false
}

function validateVendorForm() {
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  if (!form.searchKey.trim()) formErrors.searchKey = 'Code wajib diisi'
  if (!form.name.trim()) formErrors.name = 'Nama vendor wajib diisi'
  return Object.keys(formErrors).length === 0
}

function validateGlForm() {
  Object.keys(glFormErrors).forEach(k => delete glFormErrors[k])
  if (!glForm.searchKey.trim()) glFormErrors.searchKey = 'Code wajib diisi'
  if (!glForm.categoryName.trim()) glFormErrors.categoryName = 'Name Category wajib diisi'
  return Object.keys(glFormErrors).length === 0
}

async function submitForm() {
  if (!validateVendorForm()) return
  formLoading.value = true
  formError.value = null
  try {
    const locationParts = [form.province, form.city].filter(Boolean)
    const payload = {
      searchKey: form.searchKey.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      name2: locationParts.length ? locationParts.join('|') : null,
      postalCode: form.postalCode.trim() || null,
      contactName: form.contactName.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
    }
    if (formModal.mode === 'create') {
      await createVendor(payload)
      showToast('Vendor berhasil dibuat')
    } else {
      await updateVendor(formModal.id, payload)
      showToast('Vendor berhasil diupdate')
    }
    formModal.show = false
    currentPage.value = 1
    load()
  } catch (e) {
    formError.value = e.response?.data?.response?.error?.message ?? e.message ?? 'Terjadi kesalahan.'
  } finally {
    formLoading.value = false
  }
}

async function submitGlForm() {
  if (!validateGlForm()) return
  glFormLoading.value = true
  glFormError.value = null
  try {
    const payload = {
      searchKey: glForm.searchKey.trim(),
      categoryName: glForm.categoryName.trim(),
      vendorLiability: glForm.vendorLiability || null,
      prePayment: glForm.prePayment || null,
      isDefault: glForm.isDefault,
    }
    if (formModal.mode === 'create') {
      await createVendorLinkGL(payload)
      showToast('Link GL berhasil dibuat')
    } else {
      await updateVendorLinkGL(formModal.id, payload)
      showToast('Link GL berhasil diupdate')
    }
    formModal.show = false
    glCurrentPage.value = 1
    loadGl()
  } catch (e) {
    glFormError.value = e.response?.data?.response?.error?.message ?? e.message ?? 'Terjadi kesalahan.'
    console.error(e)
  } finally {
    glFormLoading.value = false
  }
}

// ── Deactivate Vendor ──────────────────────────────────────────
const deactivateModal = reactive({ show: false, record: null })
const deactivateLoading = ref(false)

function confirmDeactivate(v) { deactivateModal.record = v; deactivateModal.show = true }

async function doDeactivate() {
  deactivateLoading.value = true
  try {
    await toggleVendorActive(deactivateModal.record.id, !deactivateModal.record.active)
    showToast(`Vendor berhasil di${deactivateModal.record.active ? 'nonaktifkan' : 'aktifkan'}`)
    deactivateModal.show = false
    load()
  } catch (e) {
    showToast(e.response?.data?.response?.error?.message ?? 'Gagal mengubah status vendor', 'error')
    deactivateModal.show = false
  } finally {
    deactivateLoading.value = false
  }
}

// ── Delete GL ──────────────────────────────────────────────────
const deleteGlModal = reactive({ show: false, record: null })
const deleteGlLoading = ref(false)

function confirmDeleteGl(g) { deleteGlModal.record = g; deleteGlModal.show = true }

async function doDeleteGl() {
  deleteGlLoading.value = true
  try {
    await deleteVendorLinkGL(deleteGlModal.record.id)
    showToast('Link GL berhasil dihapus')
    deleteGlModal.show = false
    if (glRows.value.length === 1 && glCurrentPage.value > 1) glCurrentPage.value--
    loadGl()
  } catch (e) {
    showToast(e.response?.data?.response?.error?.message ?? 'Gagal menghapus Link GL', 'error')
    deleteGlModal.show = false
    console.error(e)
  } finally {
    deleteGlLoading.value = false
  }
}

async function setAsDefault(g) {
  try {
    await updateVendorLinkGL(g.id, { isDefault: true })
    showToast(`"${g.categoryName || g.searchKey}" dijadikan default`)
    loadGl()
  } catch (e) {
    showToast('Gagal mengatur default', 'error')
  }
}

// ── Init ───────────────────────────────────────────────────────
onMounted(() => { load(); loadLookups() })
</script>

<style scoped>
button { box-sizing: border-box; }

:root {
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --bg: #f0f4f9;
  --surface: #ffffff;
  --surface2: #f8fafc;
  --border: #e2e8f0;
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --accent-light: #eff6ff;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --danger: #ef4444;
  --success: #16a34a;
  --radius: 12px;
  --radius-sm: 8px;
  --shadow: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
  --shadow-md: 0 4px 16px rgba(0,0,0,.10), 0 2px 6px rgba(0,0,0,.06);
}

.layout { display: flex; flex-direction: column; min-height: 100vh; background: var(--bg); font-family: var(--font); }
.main { flex: 1; padding: 28px 24px; max-width: 1280px; margin: 0 auto; width: 100%; box-sizing: border-box; }
.content-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); overflow: visible; }

.page-header { padding: 20px 20px 0; }
.page-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0; }

.tabs { display: flex; border-bottom: 1px solid var(--border); padding: 0 20px; gap: 4px; margin-top: 8px; }
.tab { padding: 12px 16px 10px; font-size: 13px; font-weight: 500; background: none; border: none; border-bottom: 2px solid transparent; color: var(--text-secondary); cursor: pointer; transition: color .15s, border-color .15s; margin-bottom: -1px; font-family: var(--font); }
.tab:hover { color: var(--text-primary); }
.tab--active { color: var(--accent); border-bottom-color: var(--accent); }

.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; gap: 12px; }
.search-wrap { position: relative; flex: 1; max-width: 320px; }
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.search-input { width: 100%; padding: 8px 12px 8px 34px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; color: var(--text-primary); background: var(--surface2); outline: none; transition: border-color .15s; font-family: var(--font); box-sizing: border-box; }
.search-input:focus { border-color: var(--accent); background: #fff; box-shadow: 0 0 0 3px rgba(37,99,235,.08); }

.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; border: none; cursor: pointer; transition: background .15s; flex-shrink: 0; font-family: var(--font); }
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
.table { width: 100%; border-collapse: collapse; font-size: 13px; font-family: var(--font); }
.table th { padding: 10px 20px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; color: var(--text-muted); background: var(--surface2); border-bottom: 1px solid var(--border); white-space: nowrap; }
.th-action { text-align: right; }
.table td { padding: 12px 20px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tr-data:last-child td { border-bottom: none; }
.tr-data:hover td { background: var(--accent-light); }
.code-badge { font-family: var(--font-mono); font-size: 11.5px; font-weight: 500; background: var(--surface2); border: 1px solid var(--border); padding: 2px 8px; border-radius: 4px; color: var(--text-secondary); white-space: nowrap; }
.td-name { font-weight: 500; }
.td-secondary { color: var(--text-secondary); font-size: 13px; }
.td-mono { font-family: var(--font-mono); font-size: 12px; }
.td-clip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
.td-empty { text-align: center; color: var(--text-muted); padding: 48px 16px; font-size: 13px; }
.td-error { color: var(--danger); }
.td-action-cell { text-align: right; white-space: nowrap; overflow: visible !important; }
.default-badge { display: inline-block; margin-left: 6px; padding: 1px 7px; background: #eff6ff; color: var(--accent); border-radius: 99px; font-size: 11px; font-weight: 600; }

.action-group { display: flex; gap: 4px; justify-content: flex-end; align-items: center; }
.action-btn { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 5px; font-size: 12px; font-weight: 500; border: none; cursor: pointer; transition: background .12s; font-family: var(--font); }
.action-btn--more { background: var(--surface2); color: var(--text-secondary); padding: 5px 8px; }
.action-btn--more:hover { background: var(--border); }

.dropdown-menu { position: fixed; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); z-index: 9999; min-width: 170px; overflow: hidden; }
.dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 14px; font-size: 12.5px; font-weight: 500; background: none; border: none; cursor: pointer; color: var(--text-secondary); font-family: var(--font); transition: background .1s; white-space: nowrap; box-sizing: border-box; }
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

.pagination { display: flex; align-items: center; justify-content: flex-end; gap: 2px; padding: 14px 20px; }
.page-btn { min-width: 36px; height: 36px; padding: 0 10px; border-radius: 10px; border: none; background: transparent; color: #94a3b8; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; font-family: var(--font); outline: none; appearance: none; -webkit-appearance: none; box-shadow: none; }
.page-btn:hover:not(:disabled):not(.page-btn--active) { color: var(--text-primary); background: rgba(0,0,0,.05); }
.page-btn--active { background: #fff !important; color: #1e293b !important; font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.07); }
.page-btn:disabled { opacity: .3; cursor: not-allowed; }

.toast { position: fixed; bottom: 24px; right: 24px; z-index: 2000; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); }
.toast--success { background: #16a34a; color: #fff; }
.toast--error { background: var(--danger); color: #fff; }
.toast-enter-active, .toast-leave-active { transition: all .25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(2px); }
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); width: 100%; max-width: 480px; overflow: hidden; }
.modal--wide { max-width: 620px; }
.modal--sm { max-width: 400px; }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 20px 12px; border-bottom: 1px solid var(--border); gap: 12px; }
.modal-breadcrumb { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-muted); margin-bottom: 4px; }
.bc-active { color: var(--accent); font-weight: 500; }
.modal-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
.modal-close { background: none; border: none; color: var(--text-muted); display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; transition: background .12s; flex-shrink: 0; }
.modal-close:hover { background: var(--surface2); color: var(--text-primary); }
.modal-body { padding: 20px; max-height: 65vh; overflow-y: auto; }
.modal-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; }

.detail-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); margin: -4px -4px 0; }
.detail-tab { padding: 8px 16px; font-size: 12.5px; font-weight: 500; background: none; border: none; border-bottom: 2px solid transparent; color: var(--text-secondary); cursor: pointer; transition: color .15s, border-color .15s; margin-bottom: -1px; font-family: var(--font); }
.detail-tab:hover { color: var(--text-primary); }
.detail-tab--active { color: var(--accent); border-bottom-color: var(--accent); }

.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.detail-value { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }
.detail-value.mono { font-family: var(--font-mono); font-size: 12.5px; }

.status-badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600; }
.status-badge--active { background: #f0fdf4; color: #16a34a; }
.status-badge--inactive { background: #fff1f2; color: var(--danger); }

.form-section-title { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--text-muted); margin-bottom: 12px; margin-top: 0; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-group input, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.form-group input:focus, .form-group select:focus { border-color: var(--accent); background: #fff; }
.input-error { border-color: var(--danger) !important; }
.field-error { font-size: 11.5px; color: var(--danger); }
.required { color: var(--danger); }
.form-api-error { margin-top: 14px; padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; }
.check-label { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 500; color: var(--text-secondary); cursor: pointer; }
.check-label input[type=checkbox] { width: 15px; height: 15px; cursor: pointer; accent-color: var(--accent); }

.delete-text { font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); margin: 0; }
.delete-text strong { color: var(--text-primary); }
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>