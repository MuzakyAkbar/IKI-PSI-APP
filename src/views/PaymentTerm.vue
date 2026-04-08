<template>
  <div class="app">

    <!-- ══════════════════════════════════════════════════════════
         LIST VIEW
    ══════════════════════════════════════════════════════════ -->
    <div v-if="!page.show" class="page-wrap">
      <div class="content-card">

        <!-- Header -->
        <div class="card-header">
          <div class="header-left">
            <div class="header-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </div>
            <div>
              <h2 class="page-title">Payment Term</h2>
              <p class="page-subtitle">Manage payment terms and schedules</p>
            </div>
          </div>
          <button class="btn btn--primary" @click="openCreatePage">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Create Payment Term
          </button>
        </div>

        <!-- Toolbar -->
        <div class="toolbar">
          <div class="search-wrap">
            <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input v-model="searchQuery" class="search-input" placeholder="Search by name or key..." @input="onSearch" />
          </div>
          <div class="toolbar-right">
            <span class="row-count" v-if="!loading && rows.length > 0">{{ totalRows }} result{{ totalRows !== 1 ? 's' : '' }}</span>
          </div>
        </div>

        <!-- Table -->
        <div class="table-wrap">
          <table class="table">
            <colgroup>
              <col style="width:130px">
              <col>
              <col style="width:140px">
              <col style="width:130px">
              <col style="width:80px">
              <col style="width:80px">
              <col style="width:120px">
            </colgroup>
            <thead>
              <tr>
                <th>Search Key</th>
                <th>Name</th>
                <th>Overdue Days</th>
                <th>Offset Month</th>
                <th>Status</th>
                <th>Default</th>
                <th class="th-action">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="7" class="td-empty">
                  <div class="loading-wrap">
                    <div class="loading-dots"><span></span><span></span><span></span></div>
                    <span class="loading-text">Loading...</span>
                  </div>
                </td>
              </tr>
              <tr v-else-if="error">
                <td colspan="7" class="td-empty td-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {{ error }}
                </td>
              </tr>
              <tr v-else-if="rows.length === 0">
                <td colspan="7" class="td-empty">
                  <div class="empty-state">
                    <div class="empty-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                    </div>
                    <p class="empty-title">No payment terms found</p>
                    <p class="empty-desc">Try adjusting your search or create a new payment term</p>
                  </div>
                </td>
              </tr>
              <template v-else>
                <tr v-for="r in rows" :key="r.id" class="tr-data">
                  <td><span class="code-badge">{{ r.searchKey || '—' }}</span></td>
                  <td class="td-name">{{ r.name }}</td>
                  <td class="td-num">{{ r.overduePaymentDaysRule ?? '—' }}</td>
                  <td class="td-num">{{ r.offsetMonthDue ?? '—' }}</td>
                  <td>
                    <span :class="['status-chip', r.active ? 'status-chip--active' : 'status-chip--inactive']">
                      <span class="status-dot"></span>
                      {{ r.active ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>
                    <span v-if="r.default" class="default-chip">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Default
                    </span>
                    <span v-else class="td-secondary">—</span>
                  </td>
                  <td class="td-action-cell">
                    <div class="action-group" v-click-outside="closeDropdown">
                      <button class="action-btn" @click.stop="toggleDropdown(r.id, $event)" :class="{ 'action-btn--active': openDropdown === r.id }">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                      </button>
                      <Teleport to="body">
                        <div v-if="openDropdown === r.id" class="dropdown-menu" :style="{ top: dropdownPos.top + 'px', right: dropdownPos.right + 'px' }">
                          <button class="dropdown-item" @click="openViewModal(r)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            View Detail
                          </button>
                          <button class="dropdown-item" @click="openEditPage(r)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Edit
                          </button>
                          <div class="dropdown-divider"></div>
                          <button class="dropdown-item dropdown-item--danger" @click="confirmDelete(r)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                            Delete
                          </button>
                        </div>
                      </Teleport>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pagination">
          <span class="pagination-info">Page {{ currentPage }} of {{ totalPages }}</span>
          <div class="pagination-btns">
            <button class="page-btn" :disabled="currentPage === 1" @click="goPage(currentPage - 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button
              v-for="p in paginationPages"
              :key="p"
              :class="['page-btn', p === currentPage ? 'page-btn--active' : '']"
              @click="typeof p === 'number' && goPage(p)"
            >{{ p }}</button>
            <button class="page-btn" :disabled="currentPage === totalPages" @click="goPage(currentPage + 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════
         CREATE / EDIT PAGE
    ══════════════════════════════════════════════════════════ -->
    <Transition name="slide">
      <div v-if="page.show" class="page-wrap">
        <div class="content-card form-card-outer">

          <!-- Breadcrumb -->
          <div class="breadcrumb-row">
            <button class="breadcrumb-back" @click="closePage">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              List Payment Term
            </button>
            <span class="breadcrumb-sep">/</span>
            <span class="breadcrumb-cur">{{ page.mode === 'create' ? 'Create Payment Term' : 'Edit Payment Term' }}</span>
          </div>

          <div class="form-page-header">
            <div class="form-page-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </div>
            <div>
              <h1 class="form-page-title">{{ page.mode === 'create' ? 'Create Payment Term' : 'Edit Payment Term' }}</h1>
              <p class="form-page-desc">{{ page.mode === 'create' ? 'Fill in the details below to add a new payment term' : 'Update the information for this payment term' }}</p>
            </div>
          </div>

          <!-- ── Payment Term Info ── -->
          <div class="form-section">
            <div class="form-section-header">
              <div class="form-section-icon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              </div>
              <span class="form-section-title">Payment Term Info</span>
            </div>

            <div class="form-grid-3">
              <div class="form-group">
                <label class="form-label">Search Key <span class="req">*</span></label>
                <input
                  v-model="form.searchKey"
                  class="form-input"
                  placeholder="e.g. 14D"
                  :class="{ 'input-error': formErrors.searchKey }"
                  :disabled="page.mode === 'edit'"
                />
                <span class="field-error" v-if="formErrors.searchKey">{{ formErrors.searchKey }}</span>
              </div>
              <div class="form-group">
                <label class="form-label">Name <span class="req">*</span></label>
                <input
                  v-model="form.name"
                  class="form-input"
                  placeholder="e.g. 14 Day"
                  :class="{ 'input-error': formErrors.name }"
                />
                <span class="field-error" v-if="formErrors.name">{{ formErrors.name }}</span>
              </div>
              <div class="form-group">
                <label class="form-label">Description</label>
                <input v-model="form.description" class="form-input" placeholder="Optional description" />
              </div>
            </div>

            <div class="form-divider">
              <div class="form-divider-label">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Rules
              </div>
            </div>

            <div class="form-grid-2" style="margin-top:16px">
              <div class="form-group">
                <label class="form-label">Offset Month Due</label>
                <input v-model.number="form.offsetMonthDue" class="form-input" type="number" min="0" placeholder="0" />
              </div>
              <div class="form-group">
                <label class="form-label">Overdue Payment Days Rule</label>
                <input v-model.number="form.overduePaymentDaysRule" class="form-input" type="number" min="0" placeholder="0" />
              </div>
            </div>

            <div class="form-checks">
              <label class="check-label">
                <input type="checkbox" v-model="form.active" class="check-input" />
                <span class="check-box"><svg v-if="form.active" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>
                Active
              </label>
              <label class="check-label">
                <input type="checkbox" v-model="form.default" class="check-input" />
                <span class="check-box"><svg v-if="form.default" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>
                Default
              </label>
              <label class="check-label">
                <input type="checkbox" v-model="form.fixedDueDate" class="check-input" />
                <span class="check-box"><svg v-if="form.fixedDueDate" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>
                Fixed Due Date
              </label>
              <label class="check-label">
                <input type="checkbox" v-model="form.nextBusinessDay" class="check-input" />
                <span class="check-box"><svg v-if="form.nextBusinessDay" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>
                Next Business Day
              </label>
            </div>
          </div>

          <!-- ── Payment Term Lines ── -->
          <div class="form-section">
            <div class="form-section-header" style="justify-content:space-between">
              <div style="display:flex;align-items:center;gap:10px">
                <div class="form-section-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                </div>
                <span class="form-section-title">Payment Term Lines</span>
                <span v-if="form.lines.length > 0" class="count-badge">{{ form.lines.length }}</span>
              </div>
              <button type="button" class="btn btn--outline btn--sm" @click="addLine">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                Add Line
              </button>
            </div>

            <div v-if="form.lines.length === 0" class="section-empty">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              No lines added yet.
            </div>

            <div v-else class="lines-table-wrap">
              <table class="lines-table">
                <thead>
                  <tr>
                    <th style="width:80px">Line No</th>
                    <th style="width:110px">% Due</th>
                    <th style="width:120px">Overdue Days</th>
                    <th style="width:120px">Offset Month</th>
                    <th style="width:70px">Rest</th>
                    <th style="width:90px">Next Biz Day</th>
                    <th style="width:90px">Excl. Tax</th>
                    <th style="width:48px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(line, idx) in form.lines" :key="idx" class="line-row">
                    <td><input class="line-input" v-model.number="line.lineNo" type="number" min="0" /></td>
                    <td><input class="line-input" v-model.number="line.percentageDue" type="number" min="0" max="100" step="0.01" /></td>
                    <td><input class="line-input" v-model.number="line.overduePaymentDaysRule" type="number" min="0" /></td>
                    <td><input class="line-input" v-model.number="line.offsetMonthDue" type="number" min="0" /></td>
                    <td class="td-center"><label class="toggle-check"><input type="checkbox" v-model="line.rest" /><span class="toggle-box"><svg v-if="line.rest" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span></label></td>
                    <td class="td-center"><label class="toggle-check"><input type="checkbox" v-model="line.nextBusinessDay" /><span class="toggle-box"><svg v-if="line.nextBusinessDay" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span></label></td>
                    <td class="td-center"><label class="toggle-check"><input type="checkbox" v-model="line.excludeTax" /><span class="toggle-box"><svg v-if="line.excludeTax" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span></label></td>
                    <td class="td-center">
                      <button type="button" class="line-del-btn" @click="removeLine(idx)" title="Remove line">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ── Translations ── -->
          <div class="form-section">
            <div class="form-section-header" style="justify-content:space-between">
              <div style="display:flex;align-items:center;gap:10px">
                <div class="form-section-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 8l6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
                </div>
                <span class="form-section-title">Translations</span>
                <span v-if="form.translations.length > 0" class="count-badge">{{ form.translations.length }}</span>
              </div>
              <button type="button" class="btn btn--outline btn--sm" @click="addTranslation">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                Add Translation
              </button>
            </div>

            <div v-if="form.translations.length === 0" class="section-empty">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 8l6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
              No translations added yet.
            </div>

            <div v-else class="lines-table-wrap">
              <table class="lines-table">
                <thead>
                  <tr>
                    <th style="width:160px">Language</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th style="width:48px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(trl, idx) in form.translations" :key="idx" class="line-row">
                    <td><input class="line-input" v-model="trl.language" placeholder="e.g. en_US" /></td>
                    <td><input class="line-input" v-model="trl.name" placeholder="Translation name" /></td>
                    <td><input class="line-input" v-model="trl.description" placeholder="Optional" /></td>
                    <td class="td-center">
                      <button type="button" class="line-del-btn" @click="removeTranslation(idx)" title="Remove translation">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Error & Footer -->
          <div v-if="formError" class="form-api-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {{ formError }}
          </div>

          <div class="page-footer">
            <button class="btn btn--ghost" @click="closePage" :disabled="formLoading">Cancel</button>
            <button class="btn btn--primary" @click="submitForm" :disabled="formLoading">
              <span v-if="formLoading" class="btn-spinner"></span>
              {{ formLoading ? 'Saving...' : (page.mode === 'create' ? 'Create Payment Term' : 'Save Changes') }}
            </button>
          </div>

        </div>
      </div>
    </Transition>

    <!-- ══════════════════════════════════════════════════════════
         VIEW DETAIL MODAL
    ══════════════════════════════════════════════════════════ -->
    <Transition name="fade">
      <div v-if="viewModal.show" class="modal-overlay" @click.self="viewModal.show = false">
        <div class="modal modal--detail">
          <div class="modal-header">
            <div class="modal-header-left">
              <div class="modal-header-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              </div>
              <div>
                <h3 class="modal-title">Payment Term Detail</h3>
                <p class="modal-subtitle" v-if="viewModal.data">{{ viewModal.data.name }}</p>
              </div>
            </div>
            <button class="modal-close" @click="viewModal.show = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="modal-body" v-if="viewModal.data">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Search Key</span>
                <span class="detail-value mono">{{ viewModal.data.searchKey || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Name</span>
                <span class="detail-value">{{ viewModal.data.name || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Description</span>
                <span class="detail-value">{{ viewModal.data.description || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Status</span>
                <span :class="['status-chip', viewModal.data.active ? 'status-chip--active' : 'status-chip--inactive']">
                  <span class="status-dot"></span>
                  {{ viewModal.data.active ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Default</span>
                <span class="detail-value">{{ viewModal.data.default ? 'Yes' : 'No' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Offset Month Due</span>
                <span class="detail-value mono">{{ viewModal.data.offsetMonthDue ?? '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Overdue Days Rule</span>
                <span class="detail-value mono">{{ viewModal.data.overduePaymentDaysRule ?? '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Fixed Due Date</span>
                <span class="detail-value">{{ viewModal.data.fixedDueDate ? 'Yes' : 'No' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Next Business Day</span>
                <span class="detail-value">{{ viewModal.data.nextBusinessDay ? 'Yes' : 'No' }}</span>
              </div>
            </div>

            <!-- Lines -->
            <div v-if="viewModal.lines.length" class="modal-sub-section">
              <div class="modal-sub-header">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/></svg>
                Lines <span class="count-badge">{{ viewModal.lines.length }}</span>
              </div>
              <table class="lines-table">
                <thead>
                  <tr>
                    <th>Line No</th><th>% Due</th><th>Overdue Days</th><th>Offset Month</th><th>Rest</th><th>Next Biz Day</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="l in viewModal.lines" :key="l.id">
                    <td class="td-mono">{{ l.lineNo }}</td>
                    <td class="td-mono">{{ l.percentageDue }}%</td>
                    <td class="td-mono">{{ l.overduePaymentDaysRule ?? '—' }}</td>
                    <td class="td-mono">{{ l.offsetMonthDue ?? '—' }}</td>
                    <td><span v-if="l.rest" class="check-yes">✓</span><span v-else class="td-secondary">—</span></td>
                    <td><span v-if="l.nextBusinessDay" class="check-yes">✓</span><span v-else class="td-secondary">—</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Translations -->
            <div v-if="viewModal.translations.length" class="modal-sub-section">
              <div class="modal-sub-header">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 8l6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
                Translations <span class="count-badge">{{ viewModal.translations.length }}</span>
              </div>
              <table class="lines-table">
                <thead><tr><th>Language</th><th>Name</th><th>Description</th></tr></thead>
                <tbody>
                  <tr v-for="t in viewModal.translations" :key="t.id">
                    <td class="td-mono">{{ t.language$_identifier || t.language }}</td>
                    <td>{{ t.name || '—' }}</td>
                    <td>{{ t.description || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn--ghost" @click="viewModal.show = false">Close</button>
            <button class="btn btn--primary" @click="editFromView">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ══ DELETE CONFIRM MODAL ══ -->
    <Transition name="fade">
      <div v-if="deleteModal.show" class="modal-overlay" @click.self="deleteModal.show = false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <div class="modal-header-left">
              <div class="modal-header-icon modal-header-icon--danger">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </div>
              <h3 class="modal-title">Delete Payment Term</h3>
            </div>
            <button class="modal-close" @click="deleteModal.show = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-text">
              Are you sure you want to permanently delete <strong>{{ deleteModal.row?.name }}</strong>?
              This action <strong>cannot be undone</strong> and will also remove all associated lines and translations.
            </p>
            <div v-if="deleteError" class="form-api-error" style="margin-top:12px">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ deleteError }}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="deleteModal.show = false" :disabled="deleteLoading">Cancel</button>
            <button class="btn btn--danger" @click="doDelete" :disabled="deleteLoading">
              <span v-if="deleteLoading" class="btn-spinner"></span>
              <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              {{ deleteLoading ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ══ TOAST ══ -->
    <Transition name="toast">
      <div v-if="toast.show" :class="['toast', `toast--${toast.type}`]">
        <svg v-if="toast.type === 'success'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>
        {{ toast.message }}
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import {
  fetchPaymentTerms,
  createPaymentTerm, updatePaymentTerm, deletePaymentTerm,
  fetchPaymentTermLines, createPaymentTermLine, updatePaymentTermLine, deletePaymentTermLine,
  fetchPaymentTermTranslations, createPaymentTermTranslation, updatePaymentTermTranslation, deletePaymentTermTranslation,
} from '@/services/paymentTerm'

// ── click-outside directive ──────────────────────────────────
const vClickOutside = {
  mounted(el, binding) {
    el._co = (e) => { if (!el.contains(e.target)) binding.value(e) }
    document.addEventListener('click', el._co)
  },
  unmounted(el) { document.removeEventListener('click', el._co) },
}

// ════════════════════════════════════════════════════════════
// LIST STATE
// ════════════════════════════════════════════════════════════
const rows        = ref([])
const loading     = ref(false)
const error       = ref(null)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize    = 20
const totalRows   = ref(0)
let searchTimeout = null

const openDropdown = ref(null)
const dropdownPos  = ref({ top: 0, right: 0 })

const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize)))
const paginationPages = computed(() => {
  const p = []; const t = totalPages.value; const c = currentPage.value
  if (t <= 7) { for (let i = 1; i <= t; i++) p.push(i); return p }
  p.push(1); if (c > 3) p.push('…')
  for (let i = Math.max(2, c - 1); i <= Math.min(t - 1, c + 1); i++) p.push(i)
  if (c < t - 2) p.push('…'); p.push(t); return p
})

async function load() {
  loading.value = true; error.value = null
  try {
    const res = await fetchPaymentTerms({ startRow: (currentPage.value - 1) * pageSize, pageSize, searchKey: searchQuery.value })
    rows.value = Array.isArray(res.data) ? res.data : []
    totalRows.value = res.totalRows ?? rows.value.length
  } catch (e) { error.value = 'Failed to load payment terms.' }
  finally { loading.value = false }
}

function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { currentPage.value = 1; load() }, 400)
}
function goPage(p) { if (p < 1 || p > totalPages.value) return; currentPage.value = p; load() }

function toggleDropdown(id, event) {
  if (openDropdown.value === id) { openDropdown.value = null; return }
  const rect = event.currentTarget.getBoundingClientRect()
  dropdownPos.value = { top: rect.bottom + 4, right: window.innerWidth - rect.right }
  openDropdown.value = id
}
function closeDropdown() { openDropdown.value = null }

// ════════════════════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════════════════════
const toast = reactive({ show: false, message: '', type: 'success' })
let toastTimer = null
function showToast(message, type = 'success') {
  clearTimeout(toastTimer)
  Object.assign(toast, { show: true, message, type })
  toastTimer = setTimeout(() => { toast.show = false }, 3000)
}

// ════════════════════════════════════════════════════════════
// CREATE / EDIT PAGE
// ════════════════════════════════════════════════════════════
const page        = reactive({ show: false, mode: 'create', data: null })
const formLoading = ref(false)
const formError   = ref(null)
const formErrors  = reactive({})

const defaultForm = () => ({
  searchKey: '',
  name: '',
  description: '',
  offsetMonthDue: 0,
  overduePaymentDaysRule: 0,
  fixedDueDate: false,
  nextBusinessDay: false,
  default: false,
  active: true,
  lines: [],
  translations: [],
  _origLineIds: [],
  _origTrlIds: [],
})
const form = reactive(defaultForm())

const defaultLine = () => ({
  lineNo: (form.lines.length + 1) * 10,
  percentageDue: 100,
  overduePaymentDaysRule: 0,
  offsetMonthDue: 0,
  rest: true,
  nextBusinessDay: false,
  excludeTax: false,
  _id: null,
})

const defaultTranslation = () => ({
  language: '',
  name: '',
  description: '',
  _id: null,
})

function addLine() { form.lines.push(defaultLine()) }
function removeLine(idx) { form.lines.splice(idx, 1) }
function addTranslation() { form.translations.push(defaultTranslation()) }
function removeTranslation(idx) { form.translations.splice(idx, 1) }

function openCreatePage() {
  Object.assign(form, defaultForm())
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  formError.value = null
  page.mode = 'create'; page.data = null; page.show = true
}

async function openEditPage(r) {
  closeDropdown()
  Object.assign(form, {
    ...defaultForm(),
    searchKey: r.searchKey ?? '',
    name: r.name ?? '',
    description: r.description ?? '',
    offsetMonthDue: r.offsetMonthDue ?? 0,
    overduePaymentDaysRule: r.overduePaymentDaysRule ?? 0,
    fixedDueDate: r.fixedDueDate ?? false,
    nextBusinessDay: r.nextBusinessDay ?? false,
    default: r.default ?? false,
    active: r.active ?? true,
  })
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  formError.value = null
  page.mode = 'edit'; page.data = r; page.show = true

  try {
    const [lines, trls] = await Promise.all([
      fetchPaymentTermLines(r.id),
      fetchPaymentTermTranslations(r.id),
    ])
    form.lines = lines.map(l => ({
      lineNo: l.lineNo,
      percentageDue: l.percentageDue,
      overduePaymentDaysRule: l.overduePaymentDaysRule ?? 0,
      offsetMonthDue: l.offsetMonthDue ?? 0,
      rest: l.rest ?? false,
      nextBusinessDay: l.nextBusinessDay ?? false,
      excludeTax: l.excludeTax ?? false,
      _id: l.id,
    }))
    form.translations = trls.map(t => ({
      language: t.language ?? '',
      name: t.name ?? '',
      description: t.description ?? '',
      _id: t.id,
    }))
    form._origLineIds = lines.map(l => l.id)
    form._origTrlIds  = trls.map(t => t.id)
  } catch (e) {
    console.warn('Failed to load lines/translations', e)
  }
}

function closePage() { if (formLoading.value) return; page.show = false }

function validateForm() {
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  if (!form.searchKey.trim()) formErrors.searchKey = 'Search Key is required'
  if (!form.name.trim())      formErrors.name      = 'Name is required'
  return Object.keys(formErrors).length === 0
}

async function submitForm() {
  if (!validateForm()) return
  formLoading.value = true; formError.value = null
  try {
    const payload = {
      searchKey:              form.searchKey.trim(),
      name:                   form.name.trim(),
      description:            form.description.trim() || null,
      offsetMonthDue:         form.offsetMonthDue ?? 0,
      overduePaymentDaysRule: form.overduePaymentDaysRule ?? 0,
      fixedDueDate:           form.fixedDueDate,
      nextBusinessDay:        form.nextBusinessDay,
      default:                form.default,
      active:                 form.active,
    }

    let termId
    if (page.mode === 'create') {
      const created = await createPaymentTerm(payload)
      termId = created.id
    } else {
      await updatePaymentTerm(page.data.id, payload)
      termId = page.data.id
    }

    // ── Sync Lines ──
    const linesWithId    = form.lines.filter(l => l._id)
    const linesWithoutId = form.lines.filter(l => !l._id)

    const keptIds = linesWithId.map(l => l._id)
    for (const origId of (form._origLineIds || [])) {
      if (!keptIds.includes(origId)) {
        await deletePaymentTermLine(origId)
      }
    }
    for (const l of linesWithId) {
      await updatePaymentTermLine(l._id, {
        paymentTerms: termId,
        lineNo: l.lineNo,
        percentageDue: l.percentageDue,
        overduePaymentDaysRule: l.overduePaymentDaysRule ?? 0,
        offsetMonthDue: l.offsetMonthDue ?? null,
        rest: l.rest,
        nextBusinessDay: l.nextBusinessDay,
        excludeTax: l.excludeTax,
      })
    }
    for (const l of linesWithoutId) {
      await createPaymentTermLine({
        paymentTerms: termId,
        lineNo: l.lineNo,
        percentageDue: l.percentageDue,
        overduePaymentDaysRule: l.overduePaymentDaysRule ?? 0,
        offsetMonthDue: l.offsetMonthDue ?? null,
        rest: l.rest,
        nextBusinessDay: l.nextBusinessDay,
        excludeTax: l.excludeTax,
      })
    }

    // ── Sync Translations ──
    const trlsWithId    = form.translations.filter(t => t._id)
    const trlsWithoutId = form.translations.filter(t => !t._id)

    const keptTrlIds = trlsWithId.map(t => t._id)
    for (const origId of (form._origTrlIds || [])) {
      if (!keptTrlIds.includes(origId)) {
        await deletePaymentTermTranslation(origId)
      }
    }
    for (const t of trlsWithId) {
      await updatePaymentTermTranslation(t._id, {
        paymentTerms: termId,
        language: t.language,
        name: t.name,
        description: t.description || null,
      })
    }
    for (const t of trlsWithoutId) {
      if (!t.language || !t.name) continue
      await createPaymentTermTranslation({
        paymentTerms: termId,
        language: t.language,
        name: t.name,
        description: t.description || null,
      })
    }

    showToast(page.mode === 'create' ? 'Payment Term created successfully' : 'Payment Term updated successfully')
    page.show = false
    currentPage.value = 1; load()
  } catch (e) {
    formError.value = e?.response?.data?.response?.error?.message ?? e.message ?? 'An error occurred.'
  } finally { formLoading.value = false }
}

// ════════════════════════════════════════════════════════════
// VIEW MODAL
// ════════════════════════════════════════════════════════════
const viewModal = reactive({ show: false, data: null, lines: [], translations: [] })

async function openViewModal(r) {
  closeDropdown()
  viewModal.data = r; viewModal.lines = []; viewModal.translations = []; viewModal.show = true
  try {
    const [lines, trls] = await Promise.all([
      fetchPaymentTermLines(r.id),
      fetchPaymentTermTranslations(r.id),
    ])
    viewModal.lines = lines
    viewModal.translations = trls
  } catch (e) { console.warn('Failed to load detail data', e) }
}

function editFromView() {
  viewModal.show = false
  openEditPage(viewModal.data)
}

// ════════════════════════════════════════════════════════════
// DELETE MODAL (hard delete)
// ════════════════════════════════════════════════════════════
const deleteModal   = reactive({ show: false, row: null })
const deleteLoading = ref(false)
const deleteError   = ref(null)

function confirmDelete(r) {
  closeDropdown()
  deleteModal.row = r; deleteError.value = null; deleteModal.show = true
}

async function doDelete() {
  deleteLoading.value = true; deleteError.value = null
  try {
    await deletePaymentTerm(deleteModal.row.id)
    showToast('Payment Term deleted successfully')
    deleteModal.show = false
    load()
  } catch (e) {
    deleteError.value = e?.response?.data?.response?.error?.message ?? e.message ?? 'Failed to delete.'
  } finally { deleteLoading.value = false }
}

// ════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════
onMounted(load)
</script>

<style scoped>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --font: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Mono', monospace;
  --accent: #2563eb;
  --accent-light: #eff6ff;
  --danger: #dc2626;
  --danger-light: #fef2f2;
  --success: #16a34a;
  --success-light: #f0fdf4;
  --bg: #f1f5f9;
  --surface: #ffffff;
  --surface2: #f8fafc;
  --border: #e2e8f0;
  --border-focus: #93c5fd;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --shadow-sm: 0 1px 2px rgba(0,0,0,.05);
  --shadow: 0 1px 3px rgba(0,0,0,.07), 0 1px 2px rgba(0,0,0,.05);
  --shadow-md: 0 4px 16px rgba(0,0,0,.10), 0 1px 4px rgba(0,0,0,.06);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-xs: 6px;
}

.app { font-family: var(--font); background: var(--bg); min-height: 100vh; color: var(--text-primary); }
.page-wrap { padding: 24px; max-width: 1280px; margin: 0 auto; }

/* ── Content Card ── */
.content-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }
.form-card-outer { overflow: visible; }

/* ── Header ── */
.card-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 16px; border-bottom: 1px solid var(--border); }
.header-left { display: flex; align-items: center; gap: 14px; }
.header-icon { width: 40px; height: 40px; background: var(--accent-light); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; color: var(--accent); flex-shrink: 0; }
.page-title { font-size: 17px; font-weight: 700; color: var(--text-primary); line-height: 1.3; }
.page-subtitle { font-size: 12.5px; color: var(--text-muted); margin-top: 1px; }

/* ── Toolbar ── */
.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; gap: 12px; border-bottom: 1px solid var(--border); background: var(--surface2); }
.toolbar-right { display: flex; align-items: center; gap: 8px; }
.row-count { font-size: 12px; color: var(--text-muted); font-weight: 500; }
.search-wrap { position: relative; flex: 1; max-width: 300px; }
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.search-input { width: 100%; height: 34px; padding: 0 10px 0 32px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface); color: var(--text-primary); font-family: var(--font); transition: border-color .15s, box-shadow .15s; }
.search-input:focus { border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(37,99,235,.08); }

/* ── Buttons ── */
.btn { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; border: none; cursor: pointer; font-family: var(--font); transition: all .15s; letter-spacing: -.01em; }
.btn--primary { background: var(--accent); color: #fff; box-shadow: 0 1px 3px rgba(37,99,235,.3); }
.btn--primary:hover:not(:disabled) { background: #1d4ed8; box-shadow: 0 2px 6px rgba(37,99,235,.4); }
.btn--ghost { background: transparent; color: var(--text-secondary); border: 1px solid var(--border); }
.btn--ghost:hover:not(:disabled) { background: var(--surface2); color: var(--text-primary); }
.btn--outline { background: var(--surface); color: var(--text-secondary); border: 1px solid var(--border); }
.btn--outline:hover:not(:disabled) { background: var(--surface2); border-color: var(--accent); color: var(--accent); }
.btn--danger { background: var(--danger); color: #fff; box-shadow: 0 1px 3px rgba(220,38,38,.3); }
.btn--danger:hover:not(:disabled) { background: #b91c1c; }
.btn--sm { height: 30px; padding: 0 10px; font-size: 12px; }
.btn:disabled { opacity: .45; cursor: not-allowed; }
.btn-spinner { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,.35); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Table ── */
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table thead tr { border-bottom: 1px solid var(--border); }
.table th { padding: 9px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em; white-space: nowrap; background: var(--surface2); }
.table td { padding: 11px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tr-data:last-child td { border-bottom: none; }
.tr-data { transition: background .1s; }
.tr-data:hover td { background: #fafbfc; }
.th-action { text-align: right; }
.td-name { font-weight: 500; color: var(--text-primary); max-width: 240px; }
.td-secondary { color: var(--text-muted); font-size: 12.5px; }
.td-num { font-family: var(--font-mono); font-size: 12px; color: var(--text-secondary); }
.td-center { text-align: center; }
.td-empty { text-align: center; color: var(--text-muted); padding: 40px; font-size: 13px; }
.td-error { color: var(--danger); display: flex; align-items: center; gap: 6px; justify-content: center; }
.td-action-cell { text-align: right; overflow: visible !important; }
.code-badge { font-family: var(--font-mono); font-size: 11.5px; font-weight: 500; background: var(--surface2); border: 1px solid var(--border); padding: 3px 8px; border-radius: 5px; color: var(--text-secondary); white-space: nowrap; }

/* ── Status & Pills ── */
.status-chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 99px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
.status-chip--active { background: var(--success-light); color: var(--success); }
.status-chip--inactive { background: var(--danger-light); color: var(--danger); }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.default-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 99px; font-size: 11.5px; font-weight: 600; background: var(--accent-light); color: var(--accent); }

/* ── Empty State ── */
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 20px 0; color: var(--text-muted); }
.empty-icon { width: 44px; height: 44px; background: var(--surface2); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
.empty-title { font-size: 13.5px; font-weight: 600; color: var(--text-secondary); }
.empty-desc { font-size: 12.5px; color: var(--text-muted); }

/* ── Loading ── */
.loading-wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.loading-text { font-size: 12.5px; color: var(--text-muted); }
.loading-dots { display: flex; gap: 5px; }
.loading-dots span { width: 7px; height: 7px; background: var(--accent); border-radius: 50%; animation: bounce 1.2s infinite ease-in-out; }
.loading-dots span:nth-child(2) { animation-delay: .2s; }
.loading-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes bounce { 0%,80%,100%{transform:scale(.55);opacity:.3}40%{transform:scale(1);opacity:1} }

/* ── Dropdown ── */
.action-group { display: flex; justify-content: flex-end; }
.action-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: var(--radius-xs); background: transparent; border: 1px solid transparent; cursor: pointer; color: var(--text-muted); transition: all .12s; }
.action-btn:hover, .action-btn--active { background: var(--surface2); border-color: var(--border); color: var(--text-primary); }
.dropdown-menu { position: fixed; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); z-index: 9999; min-width: 168px; overflow: hidden; padding: 4px; }
.dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 10px; font-size: 12.5px; font-weight: 500; background: none; border: none; cursor: pointer; color: var(--text-secondary); font-family: var(--font); transition: background .1s, color .1s; white-space: nowrap; border-radius: var(--radius-xs); }
.dropdown-item:hover { background: var(--surface2); color: var(--text-primary); }
.dropdown-item--danger { color: var(--danger); }
.dropdown-item--danger:hover { background: var(--danger-light); color: var(--danger); }
.dropdown-divider { height: 1px; background: var(--border); margin: 3px 0; }

/* ── Pagination ── */
.pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; background: var(--surface2); border-top: 1px solid var(--border); }
.pagination-info { font-size: 12.5px; color: var(--text-muted); }
.pagination-btns { display: flex; align-items: center; gap: 2px; }
.page-btn { min-width: 34px; height: 34px; padding: 0 8px; border-radius: var(--radius-xs); border: none; background: transparent; color: var(--text-muted); font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; font-family: var(--font); }
.page-btn:hover:not(:disabled):not(.page-btn--active) { background: var(--border); color: var(--text-primary); }
.page-btn--active { background: var(--accent) !important; color: #fff !important; font-weight: 600; }
.page-btn:disabled { opacity: .3; cursor: not-allowed; }

/* ── Toast ── */
.toast { position: fixed; bottom: 24px; right: 24px; z-index: 3000; display: flex; align-items: center; gap: 8px; padding: 11px 16px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); }
.toast--success { background: #15803d; color: #fff; }
.toast--error { background: var(--danger); color: #fff; }
.toast-enter-active, .toast-leave-active { transition: all .25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(10px); }

/* ── Breadcrumb ── */
.breadcrumb-row { display: flex; align-items: center; gap: 6px; font-size: 12.5px; margin-bottom: 20px; padding: 20px 24px 0; }
.breadcrumb-back { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; color: var(--accent); font-size: 12.5px; font-weight: 500; cursor: pointer; padding: 0; font-family: var(--font); transition: opacity .15s; }
.breadcrumb-back:hover { opacity: .75; text-decoration: underline; }
.breadcrumb-sep { color: var(--text-muted); }
.breadcrumb-cur { color: var(--text-primary); font-weight: 500; }

/* ── Form Page Header ── */
.form-page-header { display: flex; align-items: center; gap: 14px; padding: 0 24px 20px; border-bottom: 1px solid var(--border); margin-bottom: 0; }
.form-page-icon { width: 44px; height: 44px; background: var(--accent-light); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; color: var(--accent); flex-shrink: 0; }
.form-page-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.form-page-desc { font-size: 12.5px; color: var(--text-muted); margin-top: 2px; }

/* ── Form Sections ── */
.form-section { padding: 20px 24px; border-bottom: 1px solid var(--border); }
.form-section:last-of-type { border-bottom: none; }
.form-section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
.form-section-icon { width: 28px; height: 28px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-xs); display: flex; align-items: center; justify-content: center; color: var(--text-muted); flex-shrink: 0; }
.form-section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--text-secondary); }
.count-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 6px; background: var(--accent-light); color: var(--accent); border-radius: 99px; font-size: 11px; font-weight: 700; }

/* ── Form Layout ── */
.form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-input { height: 38px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface); transition: border-color .15s, box-shadow .15s; font-family: var(--font); color: var(--text-primary); width: 100%; }
.form-input:focus { border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(37,99,235,.08); }
.form-input:disabled { background: var(--surface2); color: var(--text-muted); cursor: not-allowed; }
.input-error { border-color: var(--danger) !important; }
.field-error { font-size: 11.5px; color: var(--danger); font-weight: 500; }
.req { color: var(--danger); }

/* ── Form Divider ── */
.form-divider { display: flex; align-items: center; gap: 8px; margin-top: 18px; }
.form-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
.form-divider-label { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--text-muted); white-space: nowrap; }

/* ── Checkboxes ── */
.form-checks { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 16px; }
.check-label { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: var(--text-secondary); cursor: pointer; user-select: none; }
.check-input { display: none; }
.check-box { width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid var(--border); background: var(--surface); display: flex; align-items: center; justify-content: center; transition: all .15s; flex-shrink: 0; color: #fff; }
.check-input:checked + .check-box { background: var(--accent); border-color: var(--accent); }
.check-label:hover .check-box { border-color: var(--accent); }

/* ── Section Empty ── */
.section-empty { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 28px 0; font-size: 13px; color: var(--text-muted); }

/* ── Lines Table ── */
.lines-table-wrap { overflow-x: auto; border-radius: var(--radius-sm); border: 1px solid var(--border); }
.lines-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.lines-table th { padding: 8px 10px; text-align: left; font-size: 10.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em; border-bottom: 1px solid var(--border); white-space: nowrap; background: var(--surface2); }
.lines-table td { padding: 7px 10px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.lines-table tbody tr:last-child td { border-bottom: none; }
.line-row:hover td { background: #fafbfc; }
.line-input { width: 100%; height: 32px; padding: 0 8px; border: 1px solid var(--border); border-radius: 5px; font-size: 12.5px; outline: none; background: var(--surface); font-family: var(--font); color: var(--text-primary); transition: border-color .15s; }
.line-input:focus { border-color: var(--border-focus); box-shadow: 0 0 0 2px rgba(37,99,235,.07); }
.toggle-check { display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
.toggle-check input { display: none; }
.toggle-box { width: 15px; height: 15px; border-radius: 4px; border: 1.5px solid var(--border); background: var(--surface); display: flex; align-items: center; justify-content: center; transition: all .15s; color: #fff; }
.toggle-check input:checked + .toggle-box { background: var(--accent); border-color: var(--accent); }
.line-del-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 5px; border: 1px solid #fecaca; background: var(--danger-light); color: var(--danger); cursor: pointer; transition: background .12s; }
.line-del-btn:hover { background: #fecaca; }
.check-yes { color: var(--success); font-weight: 700; font-size: 13px; }

/* ── Form API Error ── */
.form-api-error { display: flex; align-items: flex-start; gap: 8px; padding: 10px 14px; background: var(--danger-light); border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; margin: 0 24px 16px; }

/* ── Page Footer ── */
.page-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 24px; border-top: 1px solid var(--border); background: var(--surface2); }

/* ── Modals ── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(3px); }
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: 0 20px 60px rgba(0,0,0,.2); width: 100%; max-width: 500px; overflow: hidden; }
.modal--detail { max-width: 680px; }
.modal--sm { max-width: 420px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); }
.modal-header-left { display: flex; align-items: center; gap: 12px; }
.modal-header-icon { width: 34px; height: 34px; background: var(--accent-light); border-radius: var(--radius-xs); display: flex; align-items: center; justify-content: center; color: var(--accent); flex-shrink: 0; }
.modal-header-icon--danger { background: var(--danger-light); color: var(--danger); }
.modal-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.modal-subtitle { font-size: 12px; color: var(--text-muted); margin-top: 1px; }
.modal-close { background: none; border: none; color: var(--text-muted); width: 28px; height: 28px; border-radius: var(--radius-xs); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .12s; }
.modal-close:hover { background: var(--surface2); color: var(--text-primary); }
.modal-body { padding: 20px; max-height: 68vh; overflow-y: auto; }
.modal-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; background: var(--surface2); }

/* ── Detail Grid ── */
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.detail-value { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }
.detail-value.mono { font-family: var(--font-mono); font-size: 12.5px; }
.mono { font-family: var(--font-mono); font-size: 12px; }
.modal-sub-section { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border); }
.modal-sub-header { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin-bottom: 12px; }

/* ── Delete Modal ── */
.delete-text { font-size: 13.5px; line-height: 1.65; color: var(--text-secondary); }
.delete-text strong { color: var(--text-primary); }

/* ── Transitions ── */
.fade-enter-active, .fade-leave-active { transition: opacity .18s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: transform .22s ease, opacity .22s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(28px); opacity: 0; }
</style>