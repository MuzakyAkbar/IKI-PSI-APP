<template>
  <div class="layout">
    <main class="main">
      <div class="content-card">

        <div class="page-header">
          <h2 class="page-title">Purchase Requisition</h2>
        </div>

        <!-- ══ TOOLBAR ══ -->
        <div class="toolbar">
          <div class="search-wrap">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input v-model="searchQuery" class="search-input" placeholder="Search document no or vendor..." @input="onSearch" />
          </div>
          <button class="btn btn--primary" @click="openCreateModal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Create PR
          </button>
        </div>

        <!-- ══ TABLE ══ -->
        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th class="sortable" :class="{ asc: sortCol==='documentNo'&&sortDir==='asc', desc: sortCol==='documentNo'&&sortDir==='desc' }" @click="toggleSort('documentNo')">Doc No.</th>
              <th class="sortable" :class="{ asc: sortCol==='businessPartner.name'&&sortDir==='asc', desc: sortCol==='businessPartner.name'&&sortDir==='desc' }" @click="toggleSort('businessPartner.name')">Vendor</th>
              <th>Department</th>
              <th>Requester</th>
              <th>Price List</th>
              <th>Currency</th>
              <th class="sortable" :class="{ asc: sortCol==='documentStatus'&&sortDir==='asc', desc: sortCol==='documentStatus'&&sortDir==='desc' }" @click="toggleSort('documentStatus')">Status</th>
              <th>Approval</th>
              <th class="th-action">Action</th>
            </tr></thead>
            <tbody>
              <tr v-if="loading"><td colspan="9" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
              <tr v-else-if="error"><td colspan="9" class="td-empty td-error">{{ error }}</td></tr>
              <tr v-else-if="rows.length === 0"><td colspan="9" class="td-empty">No purchase requisitions found.</td></tr>
              <template v-else>
                <tr v-for="r in rows" :key="r.id" class="tr-data">
                  <td><span class="code-badge">{{ r.documentNo || '—' }}</span></td>
                  <td class="td-clip td-name">{{ bpName(r['businessPartner$_identifier']) }}</td>
                  <td class="td-secondary">{{ r['gmmDepartement$_identifier'] || '—' }}</td>
                  <td class="td-secondary">{{ r['userContact$_identifier'] || '—' }}</td>
                  <td class="td-secondary">{{ r['priceList$_identifier'] || '—' }}</td>
                  <td class="td-secondary">{{ r['currency$_identifier'] || '—' }}</td>
                  <td><span :class="['status-pill', statusClass(r.documentStatus)]">{{ statusLabel(r.documentStatus) }}</span></td>
                  <td><span :class="['approval-pill', approvalClass(r.rapvStatus)]">{{ approvalLabel(r.rapvStatus) }}</span></td>
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
                          <button v-if="r.documentStatus === 'DR'" class="dropdown-item" @click="openEditModal(r)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit
                          </button>
                          <button v-if="r.documentStatus === 'DR'" class="dropdown-item dropdown-item--danger" @click="confirmDelete(r)">
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
    <!-- CREATE / EDIT MODAL                                    -->
    <!-- ══════════════════════════════════════════════════════ -->
    <transition name="fade">
      <div v-if="showFormModal" class="modal-overlay" @mousedown.self="closeFormModal">
        <div class="modal modal--xxl">

          <!-- Header -->
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Dashboard</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span>Purchase Requisition</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">{{ isEdit ? 'Edit' : 'Create' }} PR</span>
              </div>
              <div class="modal-title">{{ isEdit ? 'Edit' : 'Create' }} Purchase Requisition</div>
            </div>
            <button class="modal-close" @click="closeFormModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body">

            <!-- Header Fields -->
            <div class="form-grid-4">

              <div class="form-group">
                <label>Document No.</label>
                <input :value="form.documentNo || '<auto>'" class="form-input" disabled />
              </div>

              <div class="form-group">
                <label>Organization</label>
                <input value="XYZ" class="form-input" disabled />
              </div>

              <div class="form-group">
                <label>Requester</label>
                <input value="APIService" class="form-input" disabled />
              </div>

              <div class="form-group">
                <label>Approval Status</label>
                <input value="Submit Approval" class="form-input" disabled />
              </div>

              <!-- Business Partner (Vendor only) -->
              <div class="form-group">
                <label>Business Partner</label>
                <div class="acc-wrap">
                  <input v-model="bpSearch" class="acc-input" placeholder="Search vendor..." @input="onBpSearch" @focus="showBpDrop=true" @blur="onBpBlur" />
                  <svg class="acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                  <ul v-if="showBpDrop && bpOptions.length" class="acc-dropdown">
                    <li v-for="bp in bpOptions" :key="bp.id" class="acc-opt" @mousedown.prevent="selectBp(bp)">{{ bp['_identifier'] || bp.name }}</li>
                  </ul>
                  <ul v-else-if="showBpDrop && bpSearch.length > 1 && !bpOptions.length" class="acc-dropdown">
                    <li class="acc-empty">No vendors found</li>
                  </ul>
                </div>
              </div>

              <!-- Price List -->
              <div class="form-group">
                <label>Price List</label>
                <input value="Purchase Price IDR" class="form-input" disabled />
              </div>

              <!-- Currency -->
              <div class="form-group">
                <label>Currency</label>
                <input value="IDR" class="form-input" disabled />
              </div>

              <!-- Department -->
              <div class="form-group">
                <label>Department <span class="req">*</span></label>
                <div class="acc-wrap">
                  <input v-model="deptSearch" class="acc-input" placeholder="Search department..." @input="onDeptSearch" @focus="showDeptDrop=true" @blur="onDeptBlur" />
                  <svg class="acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                  <ul v-if="showDeptDrop && deptOptions.length" class="acc-dropdown">
                    <li v-for="d in deptOptions" :key="d.id" class="acc-opt" @mousedown.prevent="selectDept(d)">{{ d.value }} - {{ d.name }}</li>
                  </ul>
                  <ul v-else-if="showDeptDrop && deptSearch.length > 0 && !deptOptions.length" class="acc-dropdown">
                    <li class="acc-empty">No departments found</li>
                  </ul>
                </div>
              </div>

              <div class="form-group form-group--full">
                <label>Description</label>
                <textarea v-model="form.description" class="form-input form-textarea" rows="2" placeholder="Description..." />
              </div>

            </div>

            <!-- Lines Section -->
            <div class="section-divider">
              Lines
              <button class="btn-add-line" @click="addLine">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                Add Line
              </button>
            </div>

            <div class="table-wrap" style="margin-bottom:0">
              <table class="table table--lines">
                <thead><tr>
                    <th class="sortable" :class="{ asc: sortCol==='documentNo' && sortDir==='asc', desc: sortCol==='documentNo' && sortDir==='desc' }" @click="toggleSort('documentNo')">Doc No.</th>
                    <th class="sortable" :class="{ asc: sortCol==='businessPartner.name' && sortDir==='asc', desc: sortCol==='businessPartner.name' && sortDir==='desc' }" @click="toggleSort('businessPartner.name')">Vendor</th>
                    <th class="sortable" :class="{ asc: sortCol==='gmmDepartement.name' && sortDir==='asc', desc: sortCol==='gmmDepartement.name' && sortDir==='desc' }" @click="toggleSort('gmmDepartement.name')">Department</th>
                    <th class="sortable" :class="{ asc: sortCol==='userContact.name' && sortDir==='asc', desc: sortCol==='userContact.name' && sortDir==='desc' }" @click="toggleSort('userContact.name')">Requester</th>
                    <th class="sortable" :class="{ asc: sortCol==='priceList.name' && sortDir==='asc', desc: sortCol==='priceList.name' && sortDir==='desc' }" @click="toggleSort('priceList.name')">Price List</th>
                    <th class="sortable" :class="{ asc: sortCol==='currency.isoCode' && sortDir==='asc', desc: sortCol==='currency.isoCode' && sortDir==='desc' }" @click="toggleSort('currency.isoCode')">Currency</th>
                    <th class="sortable" :class="{ asc: sortCol==='documentStatus' && sortDir==='asc', desc: sortCol==='documentStatus' && sortDir==='desc' }" @click="toggleSort('documentStatus')">Status</th>
                    <th class="sortable" :class="{ asc: sortCol==='rapvStatus' && sortDir==='asc', desc: sortCol==='rapvStatus' && sortDir==='desc' }" @click="toggleSort('rapvStatus')">Approval</th>
                    <th class="th-action">Action</th>
                    </tr></thead>
                <tbody>
                  <tr v-if="lines.length === 0"><td colspan="10" class="td-empty" style="padding:20px">No lines yet. Click "Add Line".</td></tr>
                  <tr v-for="(ln, idx) in lines" :key="idx">
                    <td class="td-secondary" style="text-align:center">{{ idx + 1 }}</td>

                    <!-- Need By Date -->
                    <td><input v-model="ln.needByDate" type="date" class="form-input form-input--sm" /></td>

                    <!-- Product combobox -->
                    <td>
                      <input v-model="ln.productSearch" class="acc-input acc-input--sm" placeholder="Search product..." @input="onLineProductSearch(ln)" @focus="openLineProductDrop(ln, $event)" @blur="onLineProductBlur(ln)" />
                      <teleport to="body">
                        <ul v-if="ln.showProductDrop && ln.productOptions.length" class="acc-dropdown acc-dropdown--teleport" :style="ln.productDropStyle">
                          <li v-for="p in ln.productOptions" :key="p.id" class="acc-opt" @mousedown.prevent="selectLineProduct(ln, p)">{{ p['_identifier'] || p.name }}</li>
                        </ul>
                        <ul v-else-if="ln.showProductDrop && ln.productSearch.length > 1 && !ln.productOptions.length" class="acc-dropdown acc-dropdown--teleport" :style="ln.productDropStyle">
                          <li class="acc-empty">No products found</li>
                        </ul>
                      </teleport>
                    </td>

                    <!-- Quantity -->
                    <td><input v-model.number="ln.quantity" type="number" min="1" class="form-input form-input--sm" style="text-align:center" @input="calcLineAmt(ln)" /></td>

                    <!-- UOM (read-only from product) -->
                    <td class="td-secondary" style="font-size:12px">{{ ln.uomName || 'Unit' }}</td>

                    <!-- Business Partner (Vendor only) -->
                    <td>
                      <input v-model="ln.bpSearch" class="acc-input acc-input--sm" placeholder="Vendor..." @input="onLineBpSearch(ln)" @focus="openLineBpDrop(ln, $event)" @blur="onLineBpBlur(ln)" />
                      <teleport to="body">
                        <ul v-if="ln.showBpDrop && ln.bpOptions.length" class="acc-dropdown acc-dropdown--teleport" :style="ln.bpDropStyle">
                          <li v-for="bp in ln.bpOptions" :key="bp.id" class="acc-opt" @mousedown.prevent="selectLineBp(ln, bp)">{{ bp['_identifier'] || bp.name }}</li>
                        </ul>
                        <ul v-else-if="ln.showBpDrop && ln.bpSearch.length > 1 && !ln.bpOptions.length" class="acc-dropdown acc-dropdown--teleport" :style="ln.bpDropStyle">
                          <li class="acc-empty">No vendors found</li>
                        </ul>
                      </teleport>
                    </td>

                    <!-- Budget -->
                    <td>
                      <input v-model="ln.budgetSearch" class="acc-input acc-input--sm" placeholder="Budget..." @input="onLineBudgetSearch(ln)" @focus="openLineBudgetDrop(ln, $event)" @blur="onLineBudgetBlur(ln)" />
                      <teleport to="body">
                        <ul v-if="ln.showBudgetDrop && ln.budgetOptions.length" class="acc-dropdown acc-dropdown--teleport" :style="ln.budgetDropStyle">
                          <li v-for="b in ln.budgetOptions" :key="b.id" class="acc-opt" @mousedown.prevent="selectLineBudget(ln, b)">{{ b['_identifier'] || b.name }}</li>
                        </ul>
                        <ul v-else-if="ln.showBudgetDrop && ln.budgetSearch.length > 1 && !ln.budgetOptions.length" class="acc-dropdown acc-dropdown--teleport" :style="ln.budgetDropStyle">
                          <li class="acc-empty">No budget found</li>
                        </ul>
                      </teleport>
                    </td>

                    <!-- Net Unit Price -->
                    <td><input v-model.number="ln.unitPrice" type="number" min="0" class="form-input form-input--sm" style="text-align:right" @input="calcLineAmt(ln)" /></td>

                    <!-- Line Net Amount -->
                    <td class="td-secondary" style="text-align:right;font-weight:600;white-space:nowrap;font-size:12px">{{ formatCurrency(ln.lineNetAmount) }}</td>

                    <!-- Remove -->
                    <td>
                      <button class="btn-rm-line" @click="removeLine(idx)">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
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

          <!-- Footer -->
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="closeFormModal">Cancel</button>
            <button class="btn btn--primary" :disabled="saving" @click="doSavePR">
              <span v-if="saving" class="spinner"></span>
              {{ saving ? 'Saving...' : 'Save' }}
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
        <div class="modal modal--xxl">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Dashboard</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span>Purchase Requisition</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">View PR</span>
              </div>
              <div class="modal-title">PR — {{ viewRow?.documentNo }}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <!-- Complete: hanya untuk Draft -->
              <button v-if="viewRow?.documentStatus === 'DR'" class="btn btn--complete" :disabled="!!actionLoading" @click="doCompletePR">
                <span v-if="actionLoading === 'complete'" class="spinner"></span>
                <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                Complete
              </button>
              <!-- Close: hanya untuk Completed, dan hanya jika semua line sudah matched -->
              <button
                v-if="viewRow?.documentStatus === 'CO'"
                class="btn btn--closed"
                :disabled="!!actionLoading || !canClose"
                :title="canClose ? 'Close PR' : 'Semua line harus sudah matched sebelum bisa di-close'"
                @click="doClosePR"
              >
                <span v-if="actionLoading === 'close'" class="spinner"></span>
                <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Close
              </button>
              <button class="modal-close" @click="showViewModal = false">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          <!-- Tabs: Header + Lines di satu halaman, Matched PO terpisah -->
          <div class="modal-tabs">
            <button :class="['modal-tab', viewTab==='main' ? 'modal-tab--active' : '']" @click="switchViewTab('main')">Header & Lines</button>
            <button :class="['modal-tab', viewTab==='matchedPO' ? 'modal-tab--active' : '']" @click="switchViewTab('matchedPO')">Matched PO Lines</button>
          </div>

          <div class="modal-body" v-if="viewRow">

            <!-- ── Header + Lines Tab (satu halaman) ── -->
            <div v-if="viewTab==='main'">

              <!-- Header Info -->
              <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">Document No.</span><span class="detail-value mono">{{ viewRow.documentNo }}</span></div>
                <div class="detail-item"><span class="detail-label">Status</span><span :class="['status-pill', statusClass(viewRow.documentStatus)]">{{ statusLabel(viewRow.documentStatus) }}</span></div>
                <div class="detail-item"><span class="detail-label">Approval Status</span><span :class="['approval-pill', approvalClass(viewRow.rapvStatus)]">{{ approvalLabel(viewRow.rapvStatus) }}</span></div>
                <div class="detail-item"><span class="detail-label">Organization</span><span class="detail-value">{{ viewRow['organization$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Business Partner</span><span class="detail-value">{{ bpName(viewRow['businessPartner$_identifier']) || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Requester</span><span class="detail-value">{{ viewRow['userContact$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Department</span><span class="detail-value">{{ viewRow['gmmDepartement$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Price List</span><span class="detail-value">{{ viewRow['priceList$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Currency</span><span class="detail-value">{{ viewRow['currency$_identifier'] || '—' }}</span></div>
                <div class="detail-item detail-item--full"><span class="detail-label">Description</span><span class="detail-value">{{ viewRow.description || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Created By</span><span class="detail-value">{{ viewRow['createdBy$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Created Date</span><span class="detail-value">{{ formatDate(viewRow.creationDate) }}</span></div>
                <div class="detail-item"><span class="detail-label">Updated</span><span class="detail-value">{{ formatDate(viewRow.updated) }}</span></div>
              </div>

              <!-- Lines Section -->
              <div class="section-divider" style="margin-top:24px">Lines</div>

              <div v-if="viewLinesLoading" class="td-empty" style="padding:32px"><div class="loading-dots"><span></span><span></span><span></span></div></div>
              <div v-else class="table-wrap" style="margin-bottom:0">
                <table class="table">
                  <thead><tr>
                    <th>Line No.</th>
                    <th>Product</th>
                    <th style="text-align:center">Qty</th>
                    <th>UOM</th>
                    <th>Need By Date</th>
                    <th>Business Partner</th>
                    <th>Budget</th>
                    <th style="text-align:right">Net Unit Price</th>
                    <th style="text-align:right">Line Net Amt</th>
                    <th>Status</th>
                    <th style="width:120px;text-align:center">Action</th>
                  </tr></thead>
                  <tbody>
                    <tr v-if="viewLines.length === 0"><td colspan="11" class="td-empty" style="padding:24px">No lines found.</td></tr>
                    <tr v-for="ln in viewLines" :key="ln.id">
                      <td class="td-secondary">{{ ln.lineNo }}</td>
                      <td class="td-name">{{ ln['product$_identifier'] || '—' }}</td>
                      <td class="td-secondary" style="text-align:center">{{ ln.quantity }}</td>
                      <td class="td-secondary">{{ ln['uOM$_identifier'] || '—' }}</td>
                      <td class="td-secondary">{{ formatDate(ln.needByDate) }}</td>
                      <td class="td-secondary">{{ bpName(ln['businessPartner$_identifier']) || '—' }}</td>
                      <td class="td-secondary">{{ ln['bgtCBudgetline$_identifier'] || '—' }}</td>
                      <td class="td-secondary" style="text-align:right">{{ formatCurrency(ln.unitPrice) }}</td>
                      <td class="td-secondary" style="text-align:right;font-weight:600">{{ formatCurrency(ln.lineNetAmount) }}</td>
                      <td><span :class="['status-pill', lineStatusClass(ln.requisitionLineStatus)]">{{ lineStatusLabel(ln.requisitionLineStatus) }}</span></td>
                      <!-- Line Action Buttons -->
                      <td style="text-align:center">
                        <div class="line-action-group">
                          <button
                            v-if="ln.requisitionLineStatus !== 'O'"
                            class="line-btn line-btn--open"
                            :disabled="!!lineActionLoading[ln.id]"
                            title="Set Open"
                            @click="doUpdateLineStatus(ln, 'O')"
                          >
                            <span v-if="lineActionLoading[ln.id] === 'O'" class="spinner spinner--sm"></span>
                            <svg v-else width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            Open
                          </button>
                          <button
                            v-if="ln.requisitionLineStatus !== 'C'"
                            class="line-btn line-btn--close"
                            :disabled="!!lineActionLoading[ln.id]"
                            title="Set Closed"
                            @click="doUpdateLineStatus(ln, 'C')"
                          >
                            <span v-if="lineActionLoading[ln.id] === 'C'" class="spinner spinner--sm"></span>
                            <svg v-else width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            Close
                          </button>
                          <button
                            v-if="ln.requisitionLineStatus !== 'CA'"
                            class="line-btn line-btn--cancel"
                            :disabled="!!lineActionLoading[ln.id]"
                            title="Cancel Line"
                            @click="doUpdateLineStatus(ln, 'CA')"
                          >
                            <span v-if="lineActionLoading[ln.id] === 'CA'" class="spinner spinner--sm"></span>
                            <svg v-else width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- ── Matched PO Lines Tab ── -->
            <div v-if="viewTab==='matchedPO'">
              <div v-if="viewMatchedPOLoading" class="td-empty" style="padding:32px"><div class="loading-dots"><span></span><span></span><span></span></div></div>
              <div v-else class="table-wrap" style="margin-bottom:0">
                <table class="table">
                  <thead><tr>
                    <th>Purchase Order Line</th>
                    <th style="text-align:right">Quantity</th>
                  </tr></thead>
                  <tbody>
                    <tr v-if="viewMatchedPO.length === 0"><td colspan="2" class="td-empty" style="padding:24px">No matched PO lines found.</td></tr>
                    <tr v-for="m in viewMatchedPO" :key="m.id">
                      <td class="td-secondary">{{ m['salesOrderLine$_identifier'] || m['_identifier'] || '—' }}</td>
                      <td class="td-secondary" style="text-align:right">{{ m.quantity ?? '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
      <div v-if="showDeleteModal" class="modal-overlay" @mousedown.self="showDeleteModal=false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <div class="modal-title modal-title--danger">Delete Purchase Requisition</div>
            <button class="modal-close" @click="showDeleteModal=false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-text">Are you sure you want to delete PR <strong>{{ deleteTarget?.documentNo }}</strong>? This action cannot be undone.</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="showDeleteModal=false">Cancel</button>
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
        <svg v-if="toast.type==='success'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>
        <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import {
  fetchPRList, fetchPRLines, fetchMatchedPO,
  searchVendors, searchDepts, searchProducts, searchBudgets,
  savePR as apiSavePR, completePR as apiCompletePR, closePR as apiClosePR,
  deletePR as apiDeletePR, updateLineStatus as apiUpdateLineStatus, isFullyMatched,
  statusLabel, statusClass, approvalLabel, approvalClass,
  lineStatusLabel, lineStatusClass, bpName, formatCurrency, formatDate,
} from '@/services/purchaseRequisition.js'

// ── List State ────────────────────────────────────────────
const rows        = ref([])
const loading     = ref(false)
const error       = ref('')
const searchQuery = ref('')
const sortCol     = ref('documentNo')
const sortDir     = ref('desc')
const currentPage = ref(1)
const pageSize    = 20
const totalRows   = ref(0)
let searchTimer   = null

const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize)))
const pageNumbers = computed(() => {
  const pages = []
  const total = totalPages.value
  const cur   = currentPage.value
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (cur > 3) pages.push('...')
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i)
    if (cur < total - 2) pages.push('...')
    pages.push(total)
  }
  return pages
})

// ── Dropdown ──────────────────────────────────────────────
const openDropdown = ref(null)
const dropdownPos  = ref({ top: 0, right: 0 })

function toggleDropdown(id, evt) {
  if (openDropdown.value === id) { openDropdown.value = null; return }
  const rect = evt.target.closest('button').getBoundingClientRect()
  dropdownPos.value = { top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right + window.scrollX }
  openDropdown.value = id
}
function closeDropdown() { openDropdown.value = null }

// ── Toast ─────────────────────────────────────────────────
const toast = ref({ show: false, type: 'success', message: '' })
function showToast(message, type = 'success') {
  toast.value = { show: true, type, message }
  setTimeout(() => { toast.value.show = false }, 3000)
}

// ── Fetch List ────────────────────────────────────────────
async function loadRows() {
  loading.value = true
  error.value   = ''
  try {
    const result = await fetchPRList({ searchQuery: searchQuery.value, sortCol: sortCol.value, sortDir: sortDir.value, currentPage: currentPage.value, pageSize })
    rows.value      = result.rows
    totalRows.value = result.totalRows
  } catch (e) {
    error.value = e.message || 'Failed to load data'
  } finally {
    loading.value = false
  }
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { currentPage.value = 1; loadRows() }, 400)
}
function toggleSort(col) {
  if (sortCol.value === col) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortCol.value = col; sortDir.value = 'asc' }
  currentPage.value = 1; loadRows()
}
function goPage(p) { currentPage.value = p; loadRows() }

// ── Form Modal ────────────────────────────────────────────
const showFormModal = ref(false)
const isEdit        = ref(false)
const saving        = ref(false)
const formError     = ref('')

const emptyForm = () => ({ id: null, documentNo: '', description: '', businessPartner: null, gmmDepartement: null })
const form  = ref(emptyForm())
const lines = ref([])

// Header combos
const bpSearch     = ref('')
const bpOptions    = ref([])
const showBpDrop   = ref(false)
const deptSearch   = ref('')
const deptOptions  = ref([])
const showDeptDrop = ref(false)

let bpTimer = null
async function onBpSearch() {
  clearTimeout(bpTimer)
  bpTimer = setTimeout(async () => {
    bpOptions.value = await searchVendors(bpSearch.value)
  }, 300)
}
function selectBp(bp) { form.value.businessPartner = bp.id; bpSearch.value = bpName(bp['_identifier']) || bp.name; showBpDrop.value = false; bpOptions.value = [] }
function onBpBlur() { setTimeout(() => { showBpDrop.value = false }, 200) }

let deptTimer = null
async function onDeptSearch() {
  clearTimeout(deptTimer)
  deptTimer = setTimeout(async () => {
    deptOptions.value = await searchDepts(deptSearch.value)
  }, 300)
}
function selectDept(d) { form.value.gmmDepartement = d.id; deptSearch.value = `${d.value} - ${d.name}`; showDeptDrop.value = false; deptOptions.value = [] }
function onDeptBlur() { setTimeout(() => { showDeptDrop.value = false }, 200) }

async function loadInitialDepts() {
  deptOptions.value = await searchDepts()
}

// ── Lines ─────────────────────────────────────────────────
function newLine() {
  return {
    id: null, lineNo: null, needByDate: '',
    product: null, productSearch: '', productOptions: [], showProductDrop: false, productDropStyle: {},
    quantity: 1, uomName: 'Unit', uom: '100',
    businessPartner: null, bpSearch: '', bpOptions: [], showBpDrop: false, bpDropStyle: {},
    budget: null, budgetSearch: '', budgetOptions: [], showBudgetDrop: false, budgetDropStyle: {},
    unitPrice: 0, listPrice: 0, lineNetAmount: 0,
  }
}
function addLine() { lines.value.push(newLine()) }
function removeLine(idx) { lines.value.splice(idx, 1) }
function calcLineAmt(ln) { ln.lineNetAmount = (ln.quantity || 0) * (ln.unitPrice || 0) }

// Product combobox
let prodTimers = new WeakMap()
async function onLineProductSearch(ln) {
  clearTimeout(prodTimers.get(ln))
  prodTimers.set(ln, setTimeout(async () => {
    ln.productOptions = await searchProducts(ln.productSearch)
  }, 300))
}
function openLineProductDrop(ln, evt) {
  ln.showProductDrop = true
  const rect = evt.target.getBoundingClientRect()
  ln.productDropStyle = { top: `${rect.bottom + window.scrollY + 2}px`, left: `${rect.left + window.scrollX}px`, width: `${rect.width}px`, zIndex: 600 }
}
function onLineProductBlur(ln) { setTimeout(() => { ln.showProductDrop = false }, 200) }
function selectLineProduct(ln, p) {
  ln.product = p.id; ln.productSearch = p['_identifier'] || p.name
  ln.uomName = p['uOM$_identifier'] || 'Unit'; ln.uom = p.uOM || '100'
  ln.showProductDrop = false; ln.productOptions = []
}

// BP (vendor) combobox for line
let lineBpTimers = new WeakMap()
async function onLineBpSearch(ln) {
  clearTimeout(lineBpTimers.get(ln))
  lineBpTimers.set(ln, setTimeout(async () => {
    ln.bpOptions = await searchVendors(ln.bpSearch)
  }, 300))
}
function openLineBpDrop(ln, evt) {
  ln.showBpDrop = true
  const rect = evt.target.getBoundingClientRect()
  ln.bpDropStyle = { top: `${rect.bottom + window.scrollY + 2}px`, left: `${rect.left + window.scrollX}px`, width: `${rect.width}px`, zIndex: 600 }
}
function onLineBpBlur(ln) { setTimeout(() => { ln.showBpDrop = false }, 200) }
function selectLineBp(ln, bp) { ln.businessPartner = bp.id; ln.bpSearch = bpName(bp['_identifier']) || bp.name; ln.showBpDrop = false; ln.bpOptions = [] }

// Budget combobox for line
let budgetTimers = new WeakMap()
async function onLineBudgetSearch(ln) {
  clearTimeout(budgetTimers.get(ln))
  budgetTimers.set(ln, setTimeout(async () => {
    ln.budgetOptions = await searchBudgets(ln.budgetSearch)
  }, 300))
}
function openLineBudgetDrop(ln, evt) {
  ln.showBudgetDrop = true
  const rect = evt.target.getBoundingClientRect()
  ln.budgetDropStyle = { top: `${rect.bottom + window.scrollY + 2}px`, left: `${rect.left + window.scrollX}px`, width: `${rect.width}px`, zIndex: 600 }
}
function onLineBudgetBlur(ln) { setTimeout(() => { ln.showBudgetDrop = false }, 200) }
function selectLineBudget(ln, b) { ln.budget = b.id; ln.budgetSearch = b['_identifier'] || b.id; ln.showBudgetDrop = false; ln.budgetOptions = [] }

// ── Open Modals ───────────────────────────────────────────
function openCreateModal() {
  isEdit.value = false
  form.value   = emptyForm()
  lines.value  = []
  bpSearch.value = ''; deptSearch.value = ''
  formError.value = ''
  loadInitialDepts()
  showFormModal.value = true
}

async function openEditModal(r) {
  openDropdown.value = null
  isEdit.value  = true
  form.value    = { id: r.id, documentNo: r.documentNo, description: r.description, businessPartner: r.businessPartner, gmmDepartement: r.gmmDepartement }
  bpSearch.value   = bpName(r['businessPartner$_identifier'])
  deptSearch.value = r['gmmDepartement$_identifier'] || ''
  formError.value  = ''
  await loadInitialDepts()
  try {
    const raw = await fetchPRLines(r.id)
    lines.value = raw.map(ln => ({
      id: ln.id, lineNo: ln.lineNo, needByDate: ln.needByDate || '',
      product: ln.product, productSearch: ln['product$_identifier'] || '',
      productOptions: [], showProductDrop: false, productDropStyle: {},
      quantity: ln.quantity || 1, uomName: ln['uOM$_identifier'] || 'Unit', uom: ln.uOM || '100',
      businessPartner: ln.businessPartner, bpSearch: bpName(ln['businessPartner$_identifier']),
      bpOptions: [], showBpDrop: false, bpDropStyle: {},
      budget: ln.bgtCBudgetline, budgetSearch: ln['bgtCBudgetline$_identifier'] || '',
      budgetOptions: [], showBudgetDrop: false, budgetDropStyle: {},
      unitPrice: ln.unitPrice || 0, listPrice: ln.listPrice || 0, lineNetAmount: ln.lineNetAmount || 0,
    }))
  } catch { lines.value = [] }
  showFormModal.value = true
}

function closeFormModal() { showFormModal.value = false }

async function doSavePR() {
  formError.value = ''
  if (!form.value.gmmDepartement) { formError.value = 'Department is required.'; return }
  saving.value = true
  try {
    await apiSavePR({ form: form.value, lines: lines.value, isEdit: isEdit.value })
    showToast(isEdit.value ? 'PR updated successfully' : 'PR created successfully')
    closeFormModal(); loadRows()
  } catch (e) {
    formError.value = e.response?.data?.response?.error?.message || e.message || 'Save failed'
  } finally { saving.value = false }
}

// ── View Modal ────────────────────────────────────────────
const showViewModal        = ref(false)
const viewRow              = ref(null)
const viewTab              = ref('main')
const viewLines            = ref([])
const viewLinesLoading     = ref(false)
const viewMatchedPO        = ref([])
const viewMatchedPOLoading = ref(false)
const actionLoading        = ref(null)
const lineActionLoading    = reactive({}) // { [lineId]: statusCode | null }

// canClose: semua line matched ATAU semua line status Closed/Cancelled
const canClose = computed(() => {
  if (!viewLines.value.length) return false
  return isFullyMatched(viewLines.value, viewMatchedPO.value) ||
    viewLines.value.every(ln => ['C', 'CA'].includes(ln.requisitionLineStatus))
})

async function openViewModal(r) {
  openDropdown.value = null
  viewRow.value      = r
  viewTab.value      = 'main'
  viewLines.value    = []
  viewMatchedPO.value = []
  showViewModal.value = true
  // Langsung load lines + matched PO sekaligus
  await loadViewLines(r.id)
  loadMatchedPO(r.id)
}

async function loadViewLines(prId) {
  viewLinesLoading.value = true
  try { viewLines.value = await fetchPRLines(prId) }
  catch { viewLines.value = [] }
  finally { viewLinesLoading.value = false }
}

async function loadMatchedPO(prId) {
  viewMatchedPOLoading.value = true
  try { viewMatchedPO.value = await fetchMatchedPO(prId) }
  catch { viewMatchedPO.value = [] }
  finally { viewMatchedPOLoading.value = false }
}

async function switchViewTab(tab) {
  viewTab.value = tab
  if (tab === 'matchedPO' && viewMatchedPO.value.length === 0) {
    await loadMatchedPO(viewRow.value.id)
  }
}

// ── Complete PR ───────────────────────────────────────────
async function doCompletePR() {
  actionLoading.value = 'complete'
  try {
    await apiCompletePR(viewRow.value.id)
    viewRow.value = { ...viewRow.value, documentStatus: 'CO' }
    const idx = rows.value.findIndex(x => x.id === viewRow.value.id)
    if (idx !== -1) rows.value[idx] = { ...rows.value[idx], documentStatus: 'CO' }
    showToast('PR completed successfully')
  } catch (e) {
    showToast(e.response?.data?.response?.error?.message || 'Failed to complete PR', 'error')
  } finally { actionLoading.value = null }
}

// ── Close PR ──────────────────────────────────────────────
async function doClosePR() {
  if (!canClose.value) return
  actionLoading.value = 'close'
  try {
    await apiClosePR(viewRow.value.id)
    viewRow.value = { ...viewRow.value, documentStatus: 'CL' }
    const idx = rows.value.findIndex(x => x.id === viewRow.value.id)
    if (idx !== -1) rows.value[idx] = { ...rows.value[idx], documentStatus: 'CL' }
    showToast('PR closed successfully')
  } catch (e) {
    showToast(e.response?.data?.response?.error?.message || 'Failed to close PR', 'error')
  } finally { actionLoading.value = null }
}

// ── Update Line Status ────────────────────────────────────
async function doUpdateLineStatus(ln, status) {
  lineActionLoading[ln.id] = status
  try {
    await apiUpdateLineStatus(ln.id, status)
    ln.requisitionLineStatus = status
    showToast(`Line set to ${lineStatusLabel(status)}`)
  } catch (e) {
    showToast(e.response?.data?.response?.error?.message || 'Failed to update line status', 'error')
  } finally { lineActionLoading[ln.id] = null }
}

// ── Delete ────────────────────────────────────────────────
const showDeleteModal = ref(false)
const deleteTarget    = ref(null)
const deleting        = ref(false)

function confirmDelete(r) { openDropdown.value = null; deleteTarget.value = r; showDeleteModal.value = true }

async function doDelete() {
  deleting.value = true
  try {
    await apiDeletePR(deleteTarget.value.id)
    showToast('PR deleted')
    showDeleteModal.value = false
    loadRows()
  } catch (e) {
    showToast(e.response?.data?.response?.error?.message || 'Delete failed', 'error')
  } finally { deleting.value = false }
}

// ── Click-outside directive ───────────────────────────────
const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (e) => { if (!el.contains(e.target)) binding.value(e) }
    document.addEventListener('click', el._clickOutside)
  },
  unmounted(el) { document.removeEventListener('click', el._clickOutside) },
}

onMounted(() => { loadRows() })
</script>

<style scoped>
/* ── CSS Variables ── */
:root {
  --font: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --accent: #2563eb;
  --accent-light: #eff6ff;
  --danger: #dc2626;
  --surface: #fff;
  --surface2: #f8fafc;
  --border: #e2e8f0;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --radius: 10px;
  --radius-sm: 6px;
  --shadow-md: 0 4px 16px rgba(0,0,0,.12);
}

/* ── Layout ── */
.layout { display: flex; min-height: 100vh; background: var(--surface2); }
.main   { flex: 1; padding: 24px; overflow: auto; }
.content-card { background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); padding: 24px; }

/* ── Page Header ── */
.page-header { margin-bottom: 20px; }
.page-title  { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }

/* ── Toolbar ── */
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.search-wrap  { position: relative; flex: 1; max-width: 360px; }
.search-icon  { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
.search-input { width: 100%; height: 36px; padding: 0 12px 0 34px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.search-input:focus { border-color: var(--accent); background: #fff; }

/* ── Buttons ── */
.btn { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 16px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--font); border: none; transition: background .12s, opacity .12s; }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.btn--primary  { background: var(--accent); color: #fff; }
.btn--primary:hover:not(:disabled)  { background: #1d4ed8; }
.btn--ghost    { background: transparent; color: var(--text-secondary); border: 1px solid var(--border); }
.btn--ghost:hover:not(:disabled)    { background: var(--surface2); }
.btn--danger   { background: var(--danger); color: #fff; }
.btn--danger:hover:not(:disabled)   { background: #b91c1c; }
.btn--complete { background: #16a34a; color: #fff; }
.btn--complete:hover:not(:disabled) { background: #15803d; }
.btn--closed   { background: #64748b; color: #fff; }
.btn--closed:hover:not(:disabled)   { background: #475569; }

/* ── Line Action Buttons ── */
.line-action-group { display: flex; align-items: center; gap: 4px; justify-content: center; flex-wrap: wrap; }
.line-btn { display: inline-flex; align-items: center; gap: 3px; height: 24px; padding: 0 8px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: var(--font); border: none; transition: background .12s, opacity .12s; white-space: nowrap; }
.line-btn:disabled { opacity: .5; cursor: not-allowed; }
.line-btn--open   { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
.line-btn--open:hover:not(:disabled)   { background: #dbeafe; }
.line-btn--close  { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
.line-btn--close:hover:not(:disabled)  { background: #e2e8f0; }
.line-btn--cancel { background: #fff1f2; color: #dc2626; border: 1px solid #fecaca; }
.line-btn--cancel:hover:not(:disabled) { background: #fecaca; }

/* ── Table ── */
.table-wrap { overflow-x: auto; margin-bottom: 8px; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }

/* Menyesuaikan header tabel persis seperti Vendor Invoice (uppercase, padding, muted color) */
.table thead th { 
  background: var(--surface2); 
  color: var(--text-muted); 
  font-size: 11.5px; 
  font-weight: 600; 
  text-transform: uppercase; 
  letter-spacing: .05em; 
  padding: 10px 16px; 
  border-bottom: 1px solid var(--border); 
  white-space: nowrap; 
  text-align: left; 
}

.table td { padding: 10px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tr-data:hover td { background: var(--surface2); }
.td-empty { text-align: center; color: var(--text-muted); font-size: 13px; padding: 40px; }
.td-error { color: var(--danger); }
.td-secondary { color: var(--text-secondary); }
.td-name { font-weight: 500; color: var(--text-primary); }
.td-clip { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.td-action-cell { width: 56px; }
.th-action { width: 56px; }

/* ── Sorting Headers & Icons ── */
.sortable {
  cursor: pointer;
  user-select: none;
  position: relative;
  padding-right: 20px !important; 
  transition: color 0.15s;
}
.sortable:hover {
  color: var(--text-primary);
}
.sortable::after, .sortable::before {
  content: '';
  position: absolute;
  right: 6px;
  top: 50%;
  border: 4px solid transparent;
  opacity: 0.3;
}
.sortable::before {
  border-bottom-color: currentColor;
  margin-top: -9px;
}
.sortable::after {
  border-top-color: currentColor;
  margin-top: 1px;
}
.sortable.asc::before {
  opacity: 1; 
  color: var(--accent);
}
.sortable.desc::after {
  opacity: 1; 
  color: var(--accent);
}

/* ── Status Pills ── */
.code-badge { font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: var(--accent); background: var(--accent-light); padding: 2px 8px; border-radius: 4px; }
.status-pill, .approval-pill { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
.status-pill--draft     { background: #fef9c3; color: #854d0e; }
.status-pill--completed { background: #dcfce7; color: #166534; }
.status-pill--closed    { background: #e2e8f0; color: #475569; }
.status-pill--voided    { background: #fee2e2; color: #991b1b; }
.approval-pill--submit   { background: var(--accent-light); color: var(--accent); }
.approval-pill--pending  { background: #fef3c7; color: #92400e; }
.approval-pill--approved { background: #dcfce7; color: #166534; }
.approval-pill--rejected { background: #fee2e2; color: #991b1b; }

/* ── Loading Dots ── */
.loading-dots { display: flex; gap: 6px; justify-content: center; align-items: center; }
.loading-dots span { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: dot-bounce .8s infinite alternate; }
.loading-dots span:nth-child(2) { animation-delay: .2s; }
.loading-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes dot-bounce { from { transform: translateY(0); opacity: .5; } to { transform: translateY(-6px); opacity: 1; } }

/* ── Action Dropdown ── */
.action-group { display: flex; align-items: center; gap: 4px; }
.action-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary); cursor: pointer; }
.action-btn:hover { background: var(--surface2); }
.dropdown-menu   { position: fixed; z-index: 500; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); min-width: 140px; padding: 4px 0; }
.dropdown-item   { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; font-size: 12.5px; font-weight: 500; color: var(--text-primary); background: none; border: none; cursor: pointer; font-family: var(--font); }
.dropdown-item:hover { background: var(--surface2); }
.dropdown-item--danger       { color: var(--danger); }
.dropdown-item--danger:hover { background: #fff1f2; }

/* ── Pagination ── */
.pagination  { display: flex; align-items: center; justify-content: flex-end; gap: 4px; margin-top: 8px; }
.page-btn    { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; height: 32px; padding: 0 8px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); font-size: 13px; font-weight: 500; color: var(--text-secondary); cursor: pointer; font-family: var(--font); transition: background .1s; }
.page-btn:hover:not(:disabled) { background: var(--surface2); }
.page-btn:disabled { opacity: .4; cursor: not-allowed; }
.page-btn--active { background: var(--accent); color: #fff; border-color: var(--accent); }
.page-ellipsis   { color: var(--text-muted); font-size: 13px; padding: 0 4px; }

/* ── Modal ── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 400; display: flex; align-items: flex-start; justify-content: center; padding: 24px 16px; overflow-y: auto; }
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: 0 20px 60px rgba(0,0,0,.2); width: 100%; display: flex; flex-direction: column; max-height: calc(100vh - 48px); overflow: hidden; }
.modal--sm  { max-width: 480px; }
.modal--xxl { max-width: 1200px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.modal-title  { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0; }
.modal-title--danger { color: var(--danger); }
.modal-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
.bc-active { color: var(--text-primary); font-weight: 600; }
.modal-close { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; border: none; background: none; cursor: pointer; color: var(--text-muted); }
.modal-close:hover { background: var(--surface2); }
.modal-tabs { display: flex; border-bottom: 1px solid var(--border); padding: 0 24px; flex-shrink: 0; }
.modal-tab  { padding: 10px 16px; font-size: 13px; font-weight: 600; color: var(--text-muted); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-family: var(--font); transition: color .12s, border-color .12s; margin-bottom: -1px; }
.modal-tab--active { color: var(--accent); border-bottom-color: var(--accent); }
.modal-body   { padding: 20px 24px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; flex-shrink: 0; }

/* ── Form ── */
.form-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.form-group  { display: flex; flex-direction: column; gap: 5px; }
.form-group--full { grid-column: 1 / -1; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-input  { width: 100%; height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.form-input:focus { border-color: var(--accent); background: #fff; }
.form-input:disabled { opacity: .6; cursor: not-allowed; background: #f1f5f9; }
.form-input--sm { height: 32px; font-size: 12.5px; }
.form-textarea  { height: auto; padding: 8px 12px; resize: vertical; }
.req { color: var(--danger); }
.form-api-error { margin-top: 14px; padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; }

/* ── Section Divider ── */
.section-divider { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin: 20px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.btn-add-line { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--accent); background: var(--accent-light); border: 1px solid #bfdbfe; border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-family: var(--font); transition: background .12s; }
.btn-add-line:hover { background: #dbeafe; }
.btn-rm-line { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: #fee2e2; color: var(--danger); border: none; cursor: pointer; }
.btn-rm-line:hover { background: #fecaca; }
.table--lines { table-layout: fixed; min-width: 1100px; }
.table--lines th, .table--lines td { padding: 8px 10px; vertical-align: middle; }

/* ── Combobox ── */
.acc-wrap { position: relative; width: 100%; }
.acc-input { display: block; width: 100%; height: 36px; padding: 0 32px 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.acc-input:focus { border-color: var(--accent); background: #fff; }
.acc-input--sm { height: 32px; font-size: 12.5px; }
.acc-chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.acc-dropdown { position: absolute; z-index: 300; top: calc(100% + 3px); left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); max-height: 200px; overflow-y: auto; list-style: none; margin: 0; padding: 4px 0; }
.acc-dropdown--teleport { position: fixed; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); max-height: 200px; overflow-y: auto; list-style: none; margin: 0; padding: 4px 0; }
.acc-opt { padding: 8px 12px; font-size: 12.5px; color: var(--text-primary); cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.acc-opt:hover { background: var(--accent-light); }
.acc-empty { padding: 8px 12px; font-size: 12.5px; color: var(--text-muted); font-style: italic; }

/* ── Detail View ── */
.detail-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-item--full { grid-column: 1 / -1; }
.detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.detail-value { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }
.detail-value.mono { font-family: var(--font-mono); font-size: 12.5px; }

/* ── Delete Modal ── */
.delete-text { font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); }
.delete-text strong { color: var(--text-primary); }

/* ── Toast ── */
.toast { position: fixed; bottom: 24px; right: 24px; z-index: 2000; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); }
.toast--success { background: #16a34a; color: #fff; }
.toast--error   { background: var(--danger); color: #fff; }

/* ── Spinner ── */
.spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
.spinner--sm { width: 10px; height: 10px; border-width: 1.5px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Fade ── */
.fade-enter-active,.fade-leave-active { transition: opacity .15s; }
.fade-enter-from,.fade-leave-to       { opacity: 0; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .form-grid-4 { grid-template-columns: 1fr 1fr; }
  .detail-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 480px) {
  .form-grid-4 { grid-template-columns: 1fr; }
  .detail-grid { grid-column: 1fr; }
}
</style>