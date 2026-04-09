<template>
  <div class="app">

    <div v-if="!page.show" class="page-wrap">
      <div class="content-card">

        <div class="card-header">
          <h2 class="page-title">Business Partner Category</h2>
        </div>

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

        <div class="page-tabs">
          <button
            :class="['page-tab', pageTab==='info' ? 'page-tab--active' : '']"
            @click="pageTab = 'info'"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Category Info
          </button>
          <button
            :class="['page-tab', pageTab==='coa' ? 'page-tab--active' : '']"
            @click="switchToCoaTab"
            :disabled="page.mode==='create' && !page.id"
            :title="page.mode==='create' && !page.id ? 'Save category first to configure Chart of Accounts' : ''"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Chart of Accounts
            <span v-if="page.mode==='create' && !page.id" class="tab-lock-icon">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </span>
          </button>
        </div>

        <div v-if="pageTab==='info'">
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
              {{ formLoading ? 'Saving...' : (page.mode === 'create' ? 'Save & Continue' : 'Save') }}
            </button>
          </div>
        </div>

        <div v-if="pageTab==='coa'">
          <div class="form-card">
            <div class="form-card-title" style="justify-content: space-between; display: flex; align-items: center;">
              <div style="display:flex;align-items:center;gap:7px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                Chart of Accounts
              </div>
              <button
                v-if="!coaEntry && !coaLoading"
                class="btn btn--primary btn--sm"
                @click="openCoaForm('create')"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                Add Accounts
              </button>
              <button
                v-if="coaEntry"
                class="btn btn--ghost btn--sm"
                @click="openCoaForm('edit')"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit Accounts
              </button>
            </div>

            <div v-if="coaLoading" class="coa-loading">
              <div class="loading-dots"><span></span><span></span><span></span></div>
              <p>Loading account configuration...</p>
            </div>

            <div v-else-if="!coaEntry" class="coa-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="color:var(--text-muted)"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              <p>No Chart of Accounts configured for this category.</p>
              <button class="btn btn--primary" @click="openCoaForm('create')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                Configure Accounts
              </button>
            </div>

            <div v-else class="coa-summary">
              <div class="coa-schema-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Accounting Schema: <strong>{{ coaSchemaName }}</strong>
              </div>
              <table class="coa-table">
                <thead>
                  <tr>
                    <th>Account Type</th>
                    <th>Account Code</th>
                    <th>Account Name</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in coaSummaryRows" :key="row.key">
                    <td class="coa-label-cell">{{ row.label }}</td>
                    <td>
                      <span v-if="row.value" class="code-badge">{{ row.value }}</span>
                      <span v-else class="td-secondary">—</span>
                    </td>
                    <td class="td-secondary">{{ row.name || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="page-footer">
            <button class="btn btn--ghost" @click="closePage">Close</button>
          </div>
        </div>

      </div>
    </Transition>

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

            <div class="detail-divider"></div>
            <h4 class="detail-section-title">Chart of Accounts</h4>
            <div v-if="viewModal.loadingCoa" class="coa-loading" style="padding: 20px 0;">
              <div class="loading-dots"><span></span><span></span><span></span></div>
            </div>
            <div v-else-if="!viewModal.coa" class="td-secondary" style="font-size:13.5px; text-align:center; padding: 20px 0;">
              No Chart of Accounts configured for this category.
            </div>
            <div v-else class="detail-cols">
              <div class="detail-col">
                <div class="detail-item">
                  <span class="detail-label">Accounting Schema</span>
                  <span class="detail-value">{{ getCoaLabel(viewModal.coa, 'accountingSchema') }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Vendor Liability</span>
                  <span class="detail-value">{{ getCoaLabel(viewModal.coa, 'vendorLiability') }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Vendor Prepayment</span>
                  <span class="detail-value">{{ getCoaLabel(viewModal.coa, 'vendorPrepayment') }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Write-off</span>
                  <span class="detail-value">{{ getCoaLabel(viewModal.coa, 'writeoff') }}</span>
                </div>
              </div>
              <div class="detail-col">
                <div class="detail-item" style="visibility:hidden">
                  <span class="detail-label">Spacer</span><span class="detail-value">—</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Customer Receivables</span>
                  <span class="detail-value">{{ getCoaLabel(viewModal.coa, 'customerReceivablesNo') }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Customer Prepayment</span>
                  <span class="detail-value">{{ getCoaLabel(viewModal.coa, 'customerPrepayment') }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Non-Invoiced Receipts</span>
                  <span class="detail-value">{{ getCoaLabel(viewModal.coa, 'nonInvoicedReceipts') }}</span>
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

    <Transition name="fade">
      <div v-if="coaModal.show" class="modal-overlay" @click.self="coaModal.show=false">
        <div class="modal modal--coa">
          <div class="modal-header">
            <h3 class="modal-title">
              {{ coaModal.mode==='create' ? 'Configure' : 'Edit' }} Chart of Accounts
            </h3>
            <button class="modal-close" @click="coaModal.show=false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">

            <div class="form-group" style="margin-bottom:16px">
              <label>Accounting Schema <span class="req">*</span></label>
              <select
                v-model="coaForm.accountingSchema"
                class="form-select"
                :class="{'input-error': coaFormErrors.accountingSchema}"
                :disabled="coaModal.mode==='edit'"
              >
                <option value="">— Select Schema —</option>
                <option v-for="s in accountingSchemas" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
              <span class="field-error" v-if="coaFormErrors.accountingSchema">{{ coaFormErrors.accountingSchema }}</span>
            </div>

            <div class="coa-section-title">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              Vendor Accounts
            </div>
            <div class="form-grid-2" style="margin-bottom:16px">
              <div class="form-group">
                <label>Vendor Liability</label>
                <div class="account-select-wrap">
                  <input
                    v-model="coaForm._search.vendorLiability"
                    class="form-input"
                    placeholder="Search account..."
                    @input="debouncedAccountSearch('vendorLiability')"
                    @focus="showAccountDropdown='vendorLiability'; searchAccounts('vendorLiability')"
                    autocomplete="off"
                  />
                  <div v-if="showAccountDropdown==='vendorLiability'" class="account-dropdown">
                    <div v-if="!accountOptions.vendorLiability.length" class="account-option account-option--empty">
                      {{ coaForm._search.vendorLiability ? 'No accounts found / Loading...' : 'Start typing to search...' }}
                    </div>
                    <template v-else>
                      <div
                        v-for="a in accountOptions.vendorLiability"
                        :key="a.id"
                        class="account-option"
                        @mousedown.prevent="selectAccount('vendorLiability', a)"
                      >
                        <span class="account-option-name">{{ a._identifier || a.id }}</span>
                      </div>
                    </template>
                  </div>
                  <button v-if="coaForm.vendorLiability" class="account-clear" @click.stop.prevent="clearAccount('vendorLiability')" title="Clear">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <span v-if="coaForm.vendorLiability" class="account-selected-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {{ coaForm._labels.vendorLiability }}
                </span>
              </div>
              
              <div class="form-group">
                <label>Vendor Prepayment</label>
                <div class="account-select-wrap">
                  <input
                    v-model="coaForm._search.vendorPrepayment"
                    class="form-input"
                    placeholder="Search account..."
                    @input="debouncedAccountSearch('vendorPrepayment')"
                    @focus="showAccountDropdown='vendorPrepayment'; searchAccounts('vendorPrepayment')"
                    autocomplete="off"
                  />
                  <div v-if="showAccountDropdown==='vendorPrepayment'" class="account-dropdown">
                    <div v-if="!accountOptions.vendorPrepayment.length" class="account-option account-option--empty">
                      {{ coaForm._search.vendorPrepayment ? 'No accounts found / Loading...' : 'Start typing to search...' }}
                    </div>
                    <template v-else>
                      <div
                        v-for="a in accountOptions.vendorPrepayment"
                        :key="a.id"
                        class="account-option"
                        @mousedown.prevent="selectAccount('vendorPrepayment', a)"
                      >
                        <span class="account-option-name">{{ a._identifier || a.id }}</span>
                      </div>
                    </template>
                  </div>
                  <button v-if="coaForm.vendorPrepayment" class="account-clear" @click.stop.prevent="clearAccount('vendorPrepayment')" title="Clear">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <span v-if="coaForm.vendorPrepayment" class="account-selected-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {{ coaForm._labels.vendorPrepayment }}
                </span>
              </div>
            </div>

            <div class="coa-section-title">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Customer Accounts
            </div>
            <div class="form-grid-2" style="margin-bottom:16px">
              <div class="form-group">
                <label>Customer Receivables</label>
                <div class="account-select-wrap">
                  <input
                    v-model="coaForm._search.customerReceivablesNo"
                    class="form-input"
                    placeholder="Search account..."
                    @input="debouncedAccountSearch('customerReceivablesNo')"
                    @focus="showAccountDropdown='customerReceivablesNo'; searchAccounts('customerReceivablesNo')"
                    autocomplete="off"
                  />
                  <div v-if="showAccountDropdown==='customerReceivablesNo'" class="account-dropdown">
                    <div v-if="!accountOptions.customerReceivablesNo.length" class="account-option account-option--empty">
                      {{ coaForm._search.customerReceivablesNo ? 'No accounts found / Loading...' : 'Start typing to search...' }}
                    </div>
                    <template v-else>
                      <div
                        v-for="a in accountOptions.customerReceivablesNo"
                        :key="a.id"
                        class="account-option"
                        @mousedown.prevent="selectAccount('customerReceivablesNo', a)"
                      >
                        <span class="account-option-name">{{ a._identifier || a.id }}</span>
                      </div>
                    </template>
                  </div>
                  <button v-if="coaForm.customerReceivablesNo" class="account-clear" @click.stop.prevent="clearAccount('customerReceivablesNo')" title="Clear">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <span v-if="coaForm.customerReceivablesNo" class="account-selected-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {{ coaForm._labels.customerReceivablesNo }}
                </span>
              </div>
              
              <div class="form-group">
                <label>Customer Prepayment</label>
                <div class="account-select-wrap">
                  <input
                    v-model="coaForm._search.customerPrepayment"
                    class="form-input"
                    placeholder="Search account..."
                    @input="debouncedAccountSearch('customerPrepayment')"
                    @focus="showAccountDropdown='customerPrepayment'; searchAccounts('customerPrepayment')"
                    autocomplete="off"
                  />
                  <div v-if="showAccountDropdown==='customerPrepayment'" class="account-dropdown">
                    <div v-if="!accountOptions.customerPrepayment.length" class="account-option account-option--empty">
                      {{ coaForm._search.customerPrepayment ? 'No accounts found / Loading...' : 'Start typing to search...' }}
                    </div>
                    <template v-else>
                      <div
                        v-for="a in accountOptions.customerPrepayment"
                        :key="a.id"
                        class="account-option"
                        @mousedown.prevent="selectAccount('customerPrepayment', a)"
                      >
                        <span class="account-option-name">{{ a._identifier || a.id }}</span>
                      </div>
                    </template>
                  </div>
                  <button v-if="coaForm.customerPrepayment" class="account-clear" @click.stop.prevent="clearAccount('customerPrepayment')" title="Clear">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <span v-if="coaForm.customerPrepayment" class="account-selected-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {{ coaForm._labels.customerPrepayment }}
                </span>
              </div>
            </div>

            <div class="coa-section-title">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              Other Accounts
            </div>
            <div class="form-grid-2">
              <div class="form-group">
                <label>Write-off</label>
                <div class="account-select-wrap">
                  <input
                    v-model="coaForm._search.writeoff"
                    class="form-input"
                    placeholder="Search account..."
                    @input="debouncedAccountSearch('writeoff')"
                    @focus="showAccountDropdown='writeoff'; searchAccounts('writeoff')"
                    autocomplete="off"
                  />
                  <div v-if="showAccountDropdown==='writeoff'" class="account-dropdown">
                    <div v-if="!accountOptions.writeoff.length" class="account-option account-option--empty">
                      {{ coaForm._search.writeoff ? 'No accounts found / Loading...' : 'Start typing to search...' }}
                    </div>
                    <template v-else>
                      <div
                        v-for="a in accountOptions.writeoff"
                        :key="a.id"
                        class="account-option"
                        @mousedown.prevent="selectAccount('writeoff', a)"
                      >
                        <span class="account-option-name">{{ a._identifier || a.id }}</span>
                      </div>
                    </template>
                  </div>
                  <button v-if="coaForm.writeoff" class="account-clear" @click.stop.prevent="clearAccount('writeoff')" title="Clear">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <span v-if="coaForm.writeoff" class="account-selected-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {{ coaForm._labels.writeoff }}
                </span>
              </div>
              
              <div class="form-group">
                <label>Non-Invoiced Receipts</label>
                <div class="account-select-wrap">
                  <input
                    v-model="coaForm._search.nonInvoicedReceipts"
                    class="form-input"
                    placeholder="Search account..."
                    @input="debouncedAccountSearch('nonInvoicedReceipts')"
                    @focus="showAccountDropdown='nonInvoicedReceipts'; searchAccounts('nonInvoicedReceipts')"
                    autocomplete="off"
                  />
                  <div v-if="showAccountDropdown==='nonInvoicedReceipts'" class="account-dropdown">
                    <div v-if="!accountOptions.nonInvoicedReceipts.length" class="account-option account-option--empty">
                      {{ coaForm._search.nonInvoicedReceipts ? 'No accounts found / Loading...' : 'Start typing to search...' }}
                    </div>
                    <template v-else>
                      <div
                        v-for="a in accountOptions.nonInvoicedReceipts"
                        :key="a.id"
                        class="account-option"
                        @mousedown.prevent="selectAccount('nonInvoicedReceipts', a)"
                      >
                        <span class="account-option-name">{{ a._identifier || a.id }}</span>
                      </div>
                    </template>
                  </div>
                  <button v-if="coaForm.nonInvoicedReceipts" class="account-clear" @click.stop.prevent="clearAccount('nonInvoicedReceipts')" title="Clear">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <span v-if="coaForm.nonInvoicedReceipts" class="account-selected-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {{ coaForm._labels.nonInvoicedReceipts }}
                </span>
              </div>
            </div>

            <div v-if="coaFormError" class="form-api-error" style="margin-top:16px">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ coaFormError }}
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn--ghost" @click="coaModal.show=false" :disabled="coaSaving">Cancel</button>
            <button class="btn btn--primary" @click="saveCoaForm" :disabled="coaSaving">
              <span v-if="coaSaving" class="btn-spinner"></span>
              {{ coaSaving ? 'Saving...' : 'Save Accounts' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

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
  fetchBPCategoryAccount,
  createBPCategoryAccount,
  updateBPCategoryAccount,
  fetchGLAccounts,
  fetchAccountingSchemas,
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

// Global click listener untuk dropdown COA di dalam modal
onMounted(() => {
  loadCategories(1)
  document.addEventListener('click', (e) => {
    // Jika user click di luar wrapper dropdown, maka tutup.
    if (e.target && e.target.closest && !e.target.closest('.account-select-wrap')) {
      showAccountDropdown.value = null
    }
  })
})

// ════════════════════════════════════════════════════════════
// PAGE TAB (Info / CoA)
// ════════════════════════════════════════════════════════════
const pageTab = ref('info')

async function switchToCoaTab() {
  if (page.mode === 'create' && !page.id) return
  pageTab.value = 'coa'
  await loadCoaData()
}

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
  pageTab.value = 'info'
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
  pageTab.value = 'info'
  coaEntry.value = null
  closeDropdown()
}

function closePage() {
  page.show = false
  pageTab.value = 'info'
  coaEntry.value = null
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
      const result = await createBPCategory({ ...form })
      page.id   = result.id
      page.mode = 'edit'
      showToast('Category created. You can now configure Chart of Accounts.', 'success')
      pageTab.value = 'coa'
      await loadCoaData()
    } else {
      await updateBPCategory(page.id, { ...form })
      showToast('Category updated successfully.', 'success')
    }
    await loadCategories(currentPage.value)
  } catch (e) {
    formError.value = e.message || 'Failed to save category.'
  } finally {
    formLoading.value = false
  }
}

// ════════════════════════════════════════════════════════════
// VIEW MODAL (WITH COA)
// ════════════════════════════════════════════════════════════
const viewModal = reactive({ show: false, data: null, coa: null, loadingCoa: false })

async function openViewModal(item) {
  viewModal.data = item
  viewModal.show = true
  viewModal.coa = null
  viewModal.loadingCoa = true
  closeDropdown()

  try {
    const coaData = await fetchBPCategoryAccount(item.id)
    viewModal.coa = coaData ?? null
  } catch (e) {
    console.error('Gagal mengambil data COA untuk modal View', e)
  } finally {
    viewModal.loadingCoa = false
  }
}

// Format Label untuk Modal View
function getCoaLabel(coaRecord, key) {
  if (!coaRecord) return '—'
  const identifier = coaRecord[`${key}$_identifier`]
  if (identifier) return identifier
  const fk = coaRecord[key]
  if (!fk) return '—'
  if (typeof fk === 'object') {
    const code = fk.searchKey || fk.value || ''
    const name = fk.name || ''
    return code ? `${code} - ${name}` : name
  }
  return fk
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
// CHART OF ACCOUNTS
// ════════════════════════════════════════════════════════════
const coaEntry      = ref(null) 
const coaLoading    = ref(false)
const accountingSchemas = ref([])

const COA_FIELDS = ['vendorLiability', 'vendorPrepayment', 'customerReceivablesNo', 'customerPrepayment', 'writeoff', 'nonInvoicedReceipts']

const COA_LABELS = {
  vendorLiability:       'Vendor Liability',
  vendorPrepayment:      'Vendor Prepayment',
  customerReceivablesNo: 'Customer Receivables',
  customerPrepayment:    'Customer Prepayment',
  writeoff:              'Write-off',
  nonInvoicedReceipts:   'Non-Invoiced Receipts',
}

async function loadCoaData() {
  coaLoading.value = true
  try {
    const [found, schemas] = await Promise.all([
      fetchBPCategoryAccount(page.id),
      fetchAccountingSchemas(),
    ])
    accountingSchemas.value = schemas
    coaEntry.value = found ?? null
  } catch (e) {
    showToast('Failed to load CoA data: ' + (e.message || ''), 'error')
  } finally {
    coaLoading.value = false
  }
}

const coaSchemaName = computed(() => {
  if (!coaEntry.value) return '—'
  const identifier = coaEntry.value['accountingSchema$_identifier']
  if (identifier) return identifier
  const s = coaEntry.value.accountingSchema
  return typeof s === 'object' ? (s?.name ?? s?.id ?? '—') : (s ?? '—')
})

const coaSummaryRows = computed(() => {
  if (!coaEntry.value) return []
  return COA_FIELDS.map(key => {
    const fk = coaEntry.value[key]
    const identifier = coaEntry.value[`${key}$_identifier`]
    const id = typeof fk === 'object' ? fk?.id : fk
    
    let displayCode = null
    let displayName = null

    if (identifier) {
      const parts = identifier.split(' - ')
      if (parts.length >= 2) {
        displayCode = parts[0].trim()
        displayName = parts.slice(1).join(' - ').trim()
      } else {
        displayName = identifier
      }
    } else if (typeof fk === 'object') {
      displayCode = fk?.value ?? fk?.searchKey ?? null
      displayName = fk?.name ?? null
    }

    return { 
      key, 
      label: COA_LABELS[key], 
      value: displayCode || (id ? id.substring(0, 8) + '…' : null), 
      name: displayName, 
      id 
    }
  })
})

// ── CoA Form Modal ──────────────────────────────────────────
const coaModal    = reactive({ show: false, mode: 'create' })
const coaSaving   = ref(false)
const coaFormError = ref('')

function makeCoaForm() {
  const f = { accountingSchema: '', _search: {}, _labels: {} }
  COA_FIELDS.forEach(key => {
    f[key]         = ''
    f._search[key] = ''
    f._labels[key] = ''
  })
  return f
}

const coaForm = reactive(makeCoaForm())
const coaFormErrors = reactive({ accountingSchema: '' })

const accountOptions   = reactive(Object.fromEntries(COA_FIELDS.map(k => [k, []])))
const showAccountDropdown = ref(null)

let _accountSearchTimers = {}
function debouncedAccountSearch(field) {
  clearTimeout(_accountSearchTimers[field])
  _accountSearchTimers[field] = setTimeout(() => searchAccounts(field), 300)
}

async function searchAccounts(field) {
  const q = coaForm._search[field] || ''
  try {
    accountOptions[field] = await fetchGLAccounts(q)
  } catch { accountOptions[field] = [] }
}

function selectAccount(field, account) {
  coaForm[field]         = account.id
  // FinancialMgmtAccountingCombination returns _identifier directly
  const label = account._identifier || account.searchKey || account.name || account.id
  coaForm._search[field] = label
  coaForm._labels[field] = label
  accountOptions[field]  = []
  showAccountDropdown.value = null
}

function clearAccount(field) {
  coaForm[field]          = ''
  coaForm._search[field]  = ''
  coaForm._labels[field]  = ''
  accountOptions[field]   = []
}

function openCoaForm(mode) {
  coaModal.mode = mode
  coaFormError.value = ''
  coaFormErrors.accountingSchema = ''

  const fresh = makeCoaForm()
  Object.assign(coaForm, fresh)
  COA_FIELDS.forEach(k => { accountOptions[k] = [] })

  if (mode === 'edit' && coaEntry.value) {
    const e = coaEntry.value
    const schemaId = typeof e.accountingSchema === 'object' ? e.accountingSchema?.id : e.accountingSchema
    coaForm.accountingSchema = schemaId ?? ''

    COA_FIELDS.forEach(key => {
      const fk = e[key]
      if (!fk) return
      
      const id = typeof fk === 'object' ? fk?.id : fk
      const identifier = e[`${key}$_identifier`]
      
      let displayLabel = id
      if (identifier) {
        displayLabel = identifier
      } else if (typeof fk === 'object') {
        const name = fk?.name ?? ''
        const code = fk?.value ?? fk?.searchKey ?? ''
        if (code || name) displayLabel = code ? `${code} — ${name}` : name
      }

      coaForm[key]           = id ?? ''
      coaForm._search[key]   = displayLabel
      coaForm._labels[key]   = displayLabel
    })
  }

  coaModal.show = true
}

async function saveCoaForm() {
  coaFormError.value = ''
  coaFormErrors.accountingSchema = ''

  if (!coaForm.accountingSchema) {
    coaFormErrors.accountingSchema = 'Accounting schema is required.'
    return
  }

  coaSaving.value = true
  try {
    const payload = {
      businessPartnerCategory: page.id,
      accountingSchema:        coaForm.accountingSchema,
    }
    COA_FIELDS.forEach(key => {
      if (coaForm[key]) payload[key] = coaForm[key]
    })

    if (coaModal.mode === 'create') {
      await createBPCategoryAccount(payload)
      showToast('Chart of Accounts configured successfully.', 'success')
    } else {
      await updateBPCategoryAccount(coaEntry.value.id, payload)
      showToast('Chart of Accounts updated successfully.', 'success')
    }

    coaModal.show = false
    await loadCoaData()
  } catch (e) {
    coaFormError.value = e.message || 'Failed to save accounts.'
  } finally {
    coaSaving.value = false
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
.btn--primary { background: #4f46e5; color: #fff; }
.btn--primary:hover:not(:disabled) { background: #4338ca; color: #fff; }
.btn--ghost { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
.btn--ghost:hover:not(:disabled) { background: #e2e8f0; color: #475569; }
.btn--danger { background: #dc2626; color: #fff; }
.btn--danger:hover:not(:disabled) { background: #b91c1c; color: #fff; }
.btn--sm { height: 30px; padding: 0 12px; font-size: 12px; }
.btn-spinner { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,.35); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Page Tabs ──────────────────────────────────────────────── */
.page-tabs { display: flex; gap: 4px; margin-bottom: 20px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 4px; width: fit-content; }
.page-tab { display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; border-radius: 6px; font-size: 13px; font-weight: 500; border: none; background: none; cursor: pointer; color: var(--text-secondary); font-family: var(--font); transition: all .15s; }
.page-tab:hover:not(:disabled) { color: var(--text-primary); background: rgba(0,0,0,.04); }
.page-tab--active { background: var(--surface); color: var(--accent); font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
.page-tab:disabled { opacity: .5; cursor: not-allowed; }
.tab-lock-icon { color: var(--text-muted); }

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
.action-btn:hover { background: #1d4ed8; }
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
.form-group input, .form-input { height: 38px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; width: 100%; }
.form-input:focus { border-color: var(--accent); background: #fff; }
.form-group input:focus { border-color: var(--accent); background: #fff; }
.form-group input:disabled { background: #f1f5f9; color: var(--text-muted); cursor: not-allowed; }
.form-select { height: 38px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; width: 100%; cursor: pointer; }
.form-select:focus { border-color: var(--accent); background: #fff; }
.form-select:disabled { background: #f1f5f9; color: var(--text-muted); cursor: not-allowed; }
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
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); width: 100%; max-width: 480px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; }
.modal--detail { max-width: 720px; }
.modal--sm { max-width: 400px; }
.modal--coa { max-width: 680px; }
.modal-header { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); }
.modal-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
.modal-close { background: none; border: none; color: var(--text-muted); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .12s; }
.modal-close:hover { background: var(--surface2); color: var(--text-primary); }
.modal-body { flex: 1; padding: 20px; overflow-y: auto; }
.modal-footer { flex-shrink: 0; padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; }

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
.detail-divider { height: 1px; background: var(--border); margin: 20px 0; }
.detail-section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin-bottom: 16px; margin-top: 0; }

/* ── CoA section ──────────────────────────────────────── */
.coa-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px 0; color: var(--text-muted); font-size: 13px; }
.coa-empty { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 40px 0; color: var(--text-muted); font-size: 13.5px; text-align: center; }
.coa-schema-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 5px 10px; margin-bottom: 14px; }
.coa-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.coa-table th { padding: 9px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); background: var(--surface2); border-bottom: 2px solid var(--border); }
.coa-table td { padding: 10px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.coa-table tr:last-child td { border-bottom: none; }
.coa-label-cell { font-weight: 600; color: var(--text-secondary); font-size: 12.5px; width: 200px; }
.coa-section-title { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--text-muted); margin-bottom: 10px; margin-top: 4px; padding-bottom: 6px; border-bottom: 1px solid var(--border); }

/* ── Account Select ───────────────────────────────────── */
.account-select-wrap { position: relative; }
.account-dropdown { position: absolute; top: calc(100% + 2px); left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); z-index: 2000; max-height: 200px; overflow-y: auto; }
.account-option { display: flex; align-items: center; gap: 10px; padding: 8px 12px; cursor: pointer; transition: background .1s; }
.account-option:hover { background: var(--surface2); }
.account-option--empty { justify-content: center; color: var(--text-muted); font-size: 12px; font-style: italic; cursor: default; }
.account-option--empty:hover { background: transparent; }
.account-option-code { font-family: var(--font-mono); font-size: 11.5px; font-weight: 600; color: #1d4ed8; background: #eff6ff; padding: 1px 6px; border-radius: 4px; white-space: nowrap; }
.account-option-name { font-size: 12.5px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.account-clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; padding: 2px; border-radius: 4px; transition: color .1s; }
.account-clear:hover { color: var(--danger); }
.account-selected-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--success); font-weight: 500; margin-top: 2px; }

/* ── Transitions ──────────────────────────────────────── */
.fade-enter-active,.fade-leave-active { transition: opacity .15s; }
.fade-enter-from,.fade-leave-to { opacity: 0; }
.slide-enter-active,.slide-leave-active { transition: transform .2s ease, opacity .2s ease; }
.slide-enter-from,.slide-leave-to { transform: translateX(24px); opacity: 0; }
</style>