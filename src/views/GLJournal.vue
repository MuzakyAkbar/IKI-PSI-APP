<template>
  <div class="layout">
    <main class="main">
      <div class="content-card">

        <div class="page-header">
          <h2 class="page-title">G/L Journal</h2>
        </div>

        <div class="toolbar">
          <div class="search-wrap">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input v-model="searchQuery" class="search-input" placeholder="Search journal no or description..." @input="onSearch" />
          </div>
          <button class="btn btn--primary" @click="openCreateModal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Create G/L Journal
          </button>
        </div>

        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th class="sortable" :class="{ asc: sortCol === 'documentNo', desc: sortCol === 'documentNo' && sortDir === 'desc' }" @click="toggleSort('documentNo')">Journal No.</th>
              <th class="sortable" :class="{ asc: sortCol === 'documentDate', desc: sortCol === 'documentDate' && sortDir === 'desc' }" @click="toggleSort('documentDate')">Doc. Date</th>
              <th class="sortable" :class="{ asc: sortCol === 'description', desc: sortCol === 'description' && sortDir === 'desc' }" @click="toggleSort('description')">Description</th>
              <th class="sortable" :class="{ asc: sortCol === 'documentStatus', desc: sortCol === 'documentStatus' && sortDir === 'desc' }" @click="toggleSort('documentStatus')">Status</th>
              <th class="sortable" :class="{ asc: sortCol === 'posted', desc: sortCol === 'posted' && sortDir === 'desc' }" @click="toggleSort('posted')">Posted</th>
              <th class="sortable" :class="{ asc: sortCol === 'totalDebitAmount', desc: sortCol === 'totalDebitAmount' && sortDir === 'desc' }" @click="toggleSort('totalDebitAmount')">Total Debit</th>
              <th class="sortable" :class="{ asc: sortCol === 'totalCreditAmount', desc: sortCol === 'totalCreditAmount' && sortDir === 'desc' }" @click="toggleSort('totalCreditAmount')">Total Credit</th>
              <th class="th-action">Action</th>
            </tr></thead>
            <tbody>
              <tr v-if="loading"><td colspan="8" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
              <tr v-else-if="error"><td colspan="8" class="td-empty td-error">{{ error }}</td></tr>
              <tr v-else-if="rows.length===0"><td colspan="8" class="td-empty">No journals found.</td></tr>
              <template v-else>
                <tr v-for="r in rows" :key="r.id" class="tr-data">
                  <td><span class="code-badge">{{ r.documentNo || '—' }}</span></td>
                  <td class="td-secondary">{{ formatDate(r.documentDate) }}</td>
                  <td class="td-clip td-name">{{ r.description || '—' }}</td>
                  <td><span :class="['status-pill', statusClass(r.documentStatus)]">{{ statusLabel(r.documentStatus) }}</span></td>
                  <td>
                    <span :class="['posted-badge', isPostedVal(r) ? 'posted-badge--yes' : 'posted-badge--no']">
                      {{ isPostedVal(r) ? 'Posted' : 'Unposted' }}
                    </span>
                  </td>
                  <td class="td-secondary">{{ formatCurrency(r.totalDebitAmount) }}</td>
                  <td class="td-secondary">{{ formatCurrency(r.totalCreditAmount) }}</td>
                  <td class="td-action-cell">
                    <div class="action-group">
                      <div class="dropdown-wrap" v-click-outside="closeDropdown">
                        <button class="action-btn action-btn--more" @click.stop="toggleDropdown(r.id, $event)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                        <div v-if="openDropdown===r.id" class="dropdown-menu" :style="{top: dropdownPos.top+'px', right: dropdownPos.right+'px'}" @click.stop>
                          <button class="dropdown-item" @click="openViewModal(r)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>View
                          </button>
                          <button v-if="r.documentStatus==='DR'" class="dropdown-item" @click="openEditModal(r)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit
                          </button>
                          <button v-if="r.documentStatus==='DR'" class="dropdown-item dropdown-item--danger" @click="confirmDelete(r)">
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
          <template v-for="p in pageNumbers" :key="p">
            <span v-if="p==='...'" class="page-ellipsis">…</span>
            <button v-else :class="['page-btn', p===currentPage?'page-btn--active':'']" @click="goPage(p)">{{ p }}</button>
          </template>
          <button class="page-btn" :disabled="currentPage===totalPages" @click="goPage(currentPage+1)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

      </div>
    </main>

    <transition name="fade">
      <div v-if="showFormModal" class="modal-overlay" @mousedown.self="closeFormModal">
        <div class="modal modal--xl">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Dashboard</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span>List G/L Journal</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">{{ isEdit ? 'Edit' : 'Create' }} G/L Journal</span>
              </div>
              <div class="modal-title">{{ isEdit ? 'Edit' : 'Create' }} G/L Journal</div>
            </div>
            <button class="modal-close" @click="closeFormModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-grid-3">

              <div class="form-group">
                <label>Organization <span class="req">*</span></label>
                <input :value="form.organization_name" class="form-input" disabled />
              </div>

              <div class="form-group">
                <label>Accounting Schema <span class="req">*</span></label>
                <select v-model="form.accountingSchema" class="form-input">
                  <option value="">Select</option>
                  <option v-for="s in accountingSchemas" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
              </div>

              <div class="form-group">
                <label>Document Type <span class="req">*</span></label>
                <div class="acc-wrap">
                  <input v-model="docTypeSearch" class="acc-input" placeholder="Search doc type..." @input="showDocTypeDrop=true" @focus="showDocTypeDrop=true" @blur="onDocTypeBlur" />
                  <svg class="acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                  <ul v-if="showDocTypeDrop && filteredDocTypes.length" class="acc-dropdown">
                    <li v-for="d in filteredDocTypes" :key="d.id" class="acc-opt" @mousedown.prevent="selectDocType(d)">{{ d.name }}</li>
                  </ul>
                  <ul v-else-if="showDocTypeDrop && docTypeSearch.length > 0 && !filteredDocTypes.length" class="acc-dropdown">
                    <li class="acc-empty">No document types found</li>
                  </ul>
                </div>
              </div>

              <div class="form-group">
                <label>Document Date <span class="req">*</span></label>
                <input v-model="form.documentDate" type="date" class="form-input" @change="onDateChange" />
              </div>

              <div class="form-group">
                <label>Accounting Date</label>
                <input v-model="form.accountingDate" type="date" class="form-input" @change="onAccDateChange" />
              </div>

              <div class="form-group">
                <label>Period</label>
                <input :value="periodLabel" class="form-input" disabled placeholder="Auto from date" />
              </div>

              <div class="form-group">
                <label>GL Category <span class="req">*</span></label>
                <select v-model="form.gLCategory" class="form-input">
                  <option value="">Select</option>
                  <option v-for="c in glCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>

              <div class="form-group">
                <label>Currency <span class="req">*</span></label>
                <div class="acc-wrap">
                  <input v-model="currencySearch" class="acc-input" placeholder="Search currency..." @input="onCurrencySearch" @focus="showCurrencyDrop=true" @blur="onCurrencyBlur" />
                  <svg class="acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                  <ul v-if="showCurrencyDrop && filteredCurrencies.length" class="acc-dropdown">
                    <li v-for="c in filteredCurrencies" :key="c.id" class="acc-opt" @mousedown.prevent="selectCurrency(c)">{{ c.iSOCode }} — {{ c.description }}</li>
                  </ul>
                  <ul v-else-if="showCurrencyDrop && currencySearch.length > 0 && !filteredCurrencies.length" class="acc-dropdown">
                    <li class="acc-empty">No currencies found</li>
                  </ul>
                </div>
              </div>

              <div class="form-group">
                <label>Posting Type</label>
                <input value="Actual" class="form-input" disabled />
              </div>

              <div class="form-group form-group--full">
                <label>Description <span class="req">*</span></label>
                <input v-model="form.description" class="form-input" placeholder="Journal description..." />
              </div>

            </div>

            <div class="section-divider">
              Journal Lines
              <button class="btn-add-line" @click="addLine">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                Add Line
              </button>
            </div>

            <div class="balance-bar" :class="isBalanced ? 'balance-bar--ok' : 'balance-bar--warn'">
              <div class="balance-item">
                <span class="balance-label">Total Debit</span>
                <span class="balance-value">{{ formatCurrency(totalDebit) }}</span>
              </div>
              <div class="balance-separator">
                <svg v-if="isBalanced" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                <span>{{ isBalanced ? 'Balanced' : 'Unbalanced' }}</span>
              </div>
              <div class="balance-item balance-item--right">
                <span class="balance-label">Total Credit</span>
                <span class="balance-value">{{ formatCurrency(totalCredit) }}</span>
              </div>
            </div>

            <div class="table-wrap" style="margin-bottom:0">
              <table class="table table--lines">
                <thead><tr>
                  <th style="width:38px">#</th>
                  <th>Account</th>
                  <th style="width:180px">Description</th>
                  <th style="width:140px">Debit</th>
                  <th style="width:140px">Credit</th>
                  <th style="width:36px"></th>
                </tr></thead>
                <tbody>
                  <tr v-if="lines.length===0">
                    <td colspan="6" class="td-empty">No lines yet. Click "Add Line" to begin.</td>
                  </tr>
                  <tr v-for="(line, idx) in lines" :key="idx">
                    <td class="td-secondary" style="text-align:center">{{ idx + 1 }}</td>
                    <td>
                      <div class="acc-wrap">
                        <input
                          v-model="line.accSearch"
                          class="acc-input acc-input--sm"
                          placeholder="Search account..."
                          @input="onAccSearch(line)"
                          @focus="(e) => onAccFocus(line, e)"
                          @blur="onAccBlur(line)"
                        />
                        <svg class="acc-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                        <teleport to="body">
                          <ul
                            v-if="line.showAccDrop && line.accOptions.length"
                            class="acc-dropdown-fixed"
                            :style="line.dropStyle"
                          >
                            <li v-for="a in line.accOptions" :key="a.id" class="acc-opt" @mousedown.prevent="selectAccount(line, a)">{{ a['_identifier'] || a.combination || a.id }}</li>
                          </ul>
                          <ul
                            v-else-if="line.showAccDrop && line.accSearch.length > 1 && !line.accOptions.length"
                            class="acc-dropdown-fixed"
                            :style="line.dropStyle"
                          >
                            <li class="acc-empty">No accounts found</li>
                          </ul>
                        </teleport>
                      </div>
                    </td>
                    <td><input v-model="line.description" class="form-input form-input--sm" placeholder="Description" /></td>
                    <td><input v-model.number="line.debit" type="number" class="form-input form-input--sm" placeholder="0" min="0" @input="onDebitInput(line)" /></td>
                    <td><input v-model.number="line.credit" type="number" class="form-input form-input--sm" placeholder="0" min="0" @input="onCreditInput(line)" /></td>
                    <td style="text-align:center">
                      <button class="btn-rm-line" @click="removeLine(idx)">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="formError" class="form-api-error" style="margin-top:14px">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ formError }}
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn--ghost" @click="closeFormModal">Cancel</button>
            <button class="btn btn--primary" :disabled="saving" @click="saveJournal">
              <span v-if="saving" class="spinner"></span>
              {{ saving ? 'Saving...' : (isEdit ? 'Update Journal' : 'Create Journal') }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showViewModal" class="modal-overlay" @mousedown.self="showViewModal=false">
        <div class="modal modal--xl">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Dashboard</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span>List G/L Journal</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">View G/L Journal</span>
              </div>
              <div class="modal-title" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                G/L Journal — {{ viewRow?.documentNo }}
                <span :class="['status-pill', statusClass(viewRow?.documentStatus)]">{{ statusLabel(viewRow?.documentStatus) }}</span>
                <span v-if="viewIsPosted" class="posted-badge posted-badge--yes">Posted</span>
              </div>
            </div>
            <button class="modal-close" @click="showViewModal=false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="modal-tabs">
            <button :class="['modal-tab', viewTab==='detail'?'modal-tab--active':'']" @click="viewTab='detail'">Journal Lines</button>
            <button :class="['modal-tab', viewTab==='accounting'?'modal-tab--active':'']" @click="switchToAccounting">Accounting</button>
          </div>

          <div class="modal-body" v-if="viewRow">

            <div v-if="viewTab==='detail'">
              <div class="detail-grid" style="margin-bottom:16px">
                <div class="detail-item"><span class="detail-label">Journal No.</span><span class="detail-value mono">{{ viewRow.documentNo }}</span></div>
                <div class="detail-item"><span class="detail-label">Document Date</span><span class="detail-value">{{ formatDate(viewRow.documentDate) }}</span></div>
                <div class="detail-item"><span class="detail-label">Accounting Date</span><span class="detail-value">{{ formatDate(viewRow.accountingDate) }}</span></div>
                <div class="detail-item"><span class="detail-label">Period</span><span class="detail-value">{{ viewRow['period$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">GL Category</span><span class="detail-value">{{ viewRow['gLCategory$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Currency</span><span class="detail-value">{{ viewRow['currency$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Total Debit</span><span class="detail-value acc-debit">{{ formatCurrency(viewRow.totalDebitAmount) }}</span></div>
                <div class="detail-item"><span class="detail-label">Total Credit</span><span class="detail-value acc-credit">{{ formatCurrency(viewRow.totalCreditAmount) }}</span></div>
                <div class="detail-item detail-item--full"><span class="detail-label">Description</span><span class="detail-value">{{ viewRow.description || '—' }}</span></div>
              </div>

              <div class="section-divider" style="margin-top:0">Journal Lines</div>
              <div v-if="viewLinesLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>
              <div v-else class="table-wrap" style="margin-bottom:0">
                <table class="table table--lines">
                  <thead><tr>
                    <th>#</th><th>Account</th><th>Description</th>
                    <th style="text-align:right">Debit</th>
                    <th style="text-align:right">Credit</th>
                  </tr></thead>
                  <tbody>
                    <tr v-if="viewLines.length===0"><td colspan="5" class="td-empty">No lines.</td></tr>
                    <tr v-for="(l, i) in viewLines" :key="l.id">
                      <td class="td-secondary">{{ i+1 }}</td>
                      <td>{{ l['accountingCombination$_identifier'] || '—' }}</td>
                      <td class="td-secondary">{{ l.description || '—' }}</td>
                      <td style="text-align:right" class="acc-debit">{{ l.debit > 0 ? formatCurrency(l.debit) : '—' }}</td>
                      <td style="text-align:right" class="acc-credit">{{ l.credit > 0 ? formatCurrency(l.credit) : '—' }}</td>
                    </tr>
                    <tr v-if="viewLines.length > 0" class="acc-totals-row">
                      <td colspan="3" style="text-align:right;font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em">Total</td>
                      <td style="text-align:right" class="acc-debit">{{ formatCurrency(viewLines.reduce((s,l)=>s+(l.debit||0),0)) }}</td>
                      <td style="text-align:right" class="acc-credit">{{ formatCurrency(viewLines.reduce((s,l)=>s+(l.credit||0),0)) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div v-if="viewTab==='accounting'">
              <div v-if="accountingLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>
              <div v-else-if="accountingError" class="form-api-error" style="margin-top:0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ accountingError }}
              </div>
              <div v-else-if="accountingFacts.length===0" class="td-empty" style="padding:40px 16px">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 10px;display:block;color:#94a3b8"><path d="M9 17H5a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v0a2 2 0 0 0-2-2h-4"/><path d="M12 2v13"/><path d="m9 12 3 3 3-3"/></svg>
                No accounting entries. Post the journal to generate entries.
              </div>
              <div v-else>
                <div class="acc-summary-grid">
                  <div class="acc-summary-item">
                    <span class="acc-summary-label">Total Debit</span>
                    <span class="acc-summary-value acc-summary-value--debit">{{ formatCurrency(accountingFacts.reduce((s,f)=>s+(f.debit||0),0)) }}</span>
                  </div>
                  <div class="acc-summary-item">
                    <span class="acc-summary-label">Total Credit</span>
                    <span class="acc-summary-value acc-summary-value--credit">{{ formatCurrency(accountingFacts.reduce((s,f)=>s+(f.credit||0),0)) }}</span>
                  </div>
                  <div class="acc-summary-item">
                    <span class="acc-summary-label">Entries</span>
                    <span class="acc-summary-value">{{ accountingFacts.length }}</span>
                  </div>
                  <div class="acc-summary-item">
                    <span class="acc-summary-label">Period</span>
                    <span class="acc-summary-value">{{ accountingFacts[0]?.['period$_identifier'] || '—' }}</span>
                  </div>
                </div>
                <div class="table-wrap" style="margin-bottom:0">
                  <table class="table table--lines">
                    <thead><tr>
                      <th>#</th>
                      <th>Account</th>
                      <th>Description</th>
                      <th>Acc. Date</th>
                      <th style="text-align:right">Debit</th>
                      <th style="text-align:right">Credit</th>
                    </tr></thead>
                    <tbody>
                      <tr v-for="(f, i) in accountingFacts" :key="f.id">
                        <td class="td-secondary">{{ i+1 }}</td>
                        <td><span class="acc-code">{{ f.value }}</span> {{ f.accountingEntryDescription }}</td>
                        <td class="td-secondary">{{ f.description || '—' }}</td>
                        <td class="td-secondary">{{ formatDate(f.accountingDate) }}</td>
                        <td style="text-align:right" class="acc-debit">{{ f.debit > 0 ? formatCurrency(f.debit) : '—' }}</td>
                        <td style="text-align:right" class="acc-credit">{{ f.credit > 0 ? formatCurrency(f.credit) : '—' }}</td>
                      </tr>
                      <tr class="acc-totals-row">
                        <td colspan="4" style="text-align:right;font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em">Total</td>
                        <td style="text-align:right" class="acc-debit">{{ formatCurrency(accountingFacts.reduce((s,f)=>s+(f.debit||0),0)) }}</td>
                        <td style="text-align:right" class="acc-credit">{{ formatCurrency(accountingFacts.reduce((s,f)=>s+(f.credit||0),0)) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn--ghost" @click="showViewModal=false">Close</button>

            <template v-if="viewRow?.documentStatus==='DR'">
              <button class="btn btn--edit" @click="openEditFromView">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit
              </button>
              <button class="btn btn--complete" :disabled="completing" @click="doCompleteJournal">
                <span v-if="completing" class="spinner"></span>
                <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                {{ completing ? 'Completing...' : 'Complete' }}
              </button>
            </template>

            <template v-else-if="viewRow?.documentStatus==='CO' && !viewIsPosted">
              <button class="btn btn--post" :disabled="posting" @click="doPostAccounting">
                <span v-if="posting" class="spinner"></span>
                <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="10"/></svg>
                {{ posting ? 'Posting...' : 'Post' }}
              </button>
            </template>

            <template v-else-if="viewRow?.documentStatus==='CO' && viewIsPosted">
              <button class="btn btn--unpost" :disabled="unposting" @click="doUnpostAccounting">
                <span v-if="unposting" class="spinner"></span>
                <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                {{ unposting ? 'Unposting...' : 'Unpost' }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showDeleteModal" class="modal-overlay" @mousedown.self="showDeleteModal=false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <div class="modal-title">Delete G/L Journal</div>
            <button class="modal-close" @click="showDeleteModal=false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-text">Are you sure you want to delete journal <strong>{{ deleteRow?.documentNo }}</strong>? This action cannot be undone.</p>
            <div v-if="deleteError" class="form-api-error" style="margin-top:10px">{{ deleteError }}</div>
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

    <transition name="fade">
      <div v-if="toast.show" :class="['toast', `toast--${toast.type}`]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path v-if="toast.type==='success'" d="M20 6 9 17l-5-5"/>
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
  fetchAllJournals, fetchJournal, createJournal, updateJournal, deleteJournal,
  runJournalComplete, postAccountingProcess, unpostAccountingProcess,
  fetchJournalLines, createJournalLine, updateJournalLine, deleteJournalLine,
  fetchAccountingFacts,
  fetchCurrentUser, fetchAccountingSchemas, fetchGLCategories,
  fetchDocumentTypes, fetchPeriodByDate,
  fetchCurrencies, fetchAccountingCombinations,
} from '@/services/glJournal.js'

// ── directive
const vClickOutside = {
  mounted(el, binding) {
    el._handler = (e) => { if (!el.contains(e.target)) binding.value(e) }
    document.addEventListener('click', el._handler, true)
  },
  unmounted(el) { document.removeEventListener('click', el._handler, true) },
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

const sortCol = ref('documentNo')
const sortDir = ref('desc')

function toggleSort(col) {
  if (sortCol.value === col) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortCol.value = col
    sortDir.value = 'desc'
  }
  currentPage.value = 1 
  loadJournals()
}

// ── dropdown
const openDropdown = ref(null)
const dropdownPos = ref({ top: 0, right: 0 })

// ── lookups
const defaultUserOrg = ref({ id: '', name: '' })
const accountingSchemas = ref([])
const glCategories = ref([])
const documentTypes = ref([])

// ── period auto-resolve
const resolvedPeriod = ref(null)
const periodLabel = computed(() => resolvedPeriod.value?.['_identifier'] || resolvedPeriod.value?.name || '')

// ── form
const showFormModal = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const saving = ref(false)
const formError = ref('')

// Doc type combobox
const docTypeSearch = ref('')
const showDocTypeDrop = ref(false)
const filteredDocTypes = computed(() => {
  const q = docTypeSearch.value.toLowerCase()
  return documentTypes.value.filter(d => !q || d.name?.toLowerCase().includes(q)).slice(0, 30)
})
function selectDocType(d) { form.value.documentType = d.id; docTypeSearch.value = d.name; showDocTypeDrop.value = false }
function onDocTypeBlur() { setTimeout(() => { showDocTypeDrop.value = false }, 150) }

// Currency combobox
const currencySearch = ref('')
const showCurrencyDrop = ref(false)
const filteredCurrencies = ref([])
let currencyTimer = null
async function onCurrencySearch() {
  showCurrencyDrop.value = true
  clearTimeout(currencyTimer)
  currencyTimer = setTimeout(async () => {
    filteredCurrencies.value = await fetchCurrencies(currencySearch.value)
  }, 300)
}
function selectCurrency(c) { form.value.currency = c.id; currencySearch.value = c.iSOCode; showCurrencyDrop.value = false }
function onCurrencyBlur() { setTimeout(() => { showCurrencyDrop.value = false }, 150) }

const emptyForm = () => ({
  documentNo: '', 
  organization: defaultUserOrg.value.id,
  organization_name: defaultUserOrg.value.name, 
  accountingSchema: '',
  documentType: '', documentDate: today(), accountingDate: today(),
  period: '', gLCategory: '', currency: '303', postingType: 'A',
  controlAmount: 0, description: '',
})
const form = ref(emptyForm())
const lines = ref([])

// ── view modal
const showViewModal = ref(false)
const viewRow = ref(null)
const viewLines = ref([])
const viewLinesLoading = ref(false)
const viewTab = ref('detail')
const accountingFacts = ref([])
const accountingLoading = ref(false)
const accountingError = ref('')

// action states — sama persis dengan CustomerInvoice
const completing = ref(false)
const posting = ref(false)
const unposting = ref(false)

// computed posted status dari viewRow
const viewIsPosted = computed(() => {
  return viewRow.value?.posted === true || viewRow.value?.posted === 'Y'
})

// helper untuk tabel list
function isPostedVal(r) { return r.posted === true || r.posted === 'Y' }

// ── delete
const showDeleteModal = ref(false)
const deleteRow = ref(null)
const deleting = ref(false)
const deleteError = ref('')

// ── toast
const toast = ref({ show: false, type: 'success', message: '' })
function showToast(msg, type = 'success') {
  toast.value = { show: true, type, message: msg }
  setTimeout(() => { toast.value.show = false }, 3500)
}

// ── helpers
function today() { return new Date().toISOString().slice(0, 10) }
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatCurrency(v) {
  if (v == null || v === 0) return 'IDR 0'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)
}
function statusLabel(s) {
  const map = { DR: 'Draft', CO: 'Completed', VO: 'Voided' }
  return map[s] || s || 'Unknown'
}
function statusClass(s) {
  if (s === 'DR') return 'status-pill--draft'
  if (s === 'CO') return 'status-pill--completed'
  if (s === 'VO') return 'status-pill--voided'
  return 'status-pill--draft'
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

const totalDebit = computed(() => lines.value.reduce((s, l) => s + (Number(l.debit) || 0), 0))
const totalCredit = computed(() => lines.value.reduce((s, l) => s + (Number(l.credit) || 0), 0))
const isBalanced = computed(() => lines.value.length > 0 && Math.abs(totalDebit.value - totalCredit.value) < 0.01)

// ── date → period
async function onDateChange() {
  if (!form.value.accountingDate) form.value.accountingDate = form.value.documentDate
  await resolvePeriod(form.value.documentDate)
}
async function onAccDateChange() { await resolvePeriod(form.value.accountingDate) }
async function resolvePeriod(dateStr) {
  if (!dateStr) return
  try {
    const p = await fetchPeriodByDate(dateStr)
    if (p) { resolvedPeriod.value = p; form.value.period = p.id }
    else { resolvedPeriod.value = null; form.value.period = '' }
  } catch { /* silent */ }
}

// ── load list
async function loadJournals() {
  loading.value = true; error.value = ''
  try {
    const data = await fetchAllJournals({ 
      startRow: (currentPage.value - 1) * pageSize, 
      pageSize, 
      searchKey: searchQuery.value,
      sortCol: sortCol.value, // <--- Kirim kolom sort
      sortDir: sortDir.value  // <--- Kirim arah sort
    })
    rows.value = data.data ?? []
    totalCount.value = data.totalRows ?? rows.value.length
  } catch (e) {
    error.value = e?.response?.data?.response?.error?.message || e.message
  } finally { loading.value = false }
}
function goPage(p) { if (p >= 1 && p <= totalPages.value) { currentPage.value = p; loadJournals() } }
function onSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(() => { currentPage.value = 1; loadJournals() }, 400) }

function toggleDropdown(id, e) {
  if (openDropdown.value === id) { openDropdown.value = null; return }
  openDropdown.value = id
  const btn = e.currentTarget.getBoundingClientRect()
  dropdownPos.value = { top: btn.bottom + 4, right: window.innerWidth - btn.right }
}
function closeDropdown() { openDropdown.value = null }

// ── load lookups
async function loadLookups() {
  const [user, schema, cat, dt, cur] = await Promise.allSettled([
    fetchCurrentUser(), fetchAccountingSchemas(), fetchGLCategories(),
    fetchDocumentTypes(), fetchCurrencies('IDR'),
  ])
  
  if (user.value) {
    defaultUserOrg.value = {
      id: user.value.organization || '',
      name: user.value['organization$_identifier'] || ''
    }
  }

  accountingSchemas.value = schema.value ?? []
  glCategories.value = cat.value ?? []
  documentTypes.value = dt.value ?? []
  const idrList = cur.value ?? []
  filteredCurrencies.value = idrList
  const idr = idrList.find(c => c.id === '303' || c.iSOCode === 'IDR')
  if (idr) currencySearch.value = idr.iSOCode
}

function applyDefaults() {
  const glDT = documentTypes.value.find(d => d.name?.toLowerCase() === 'gl journal')
  if (glDT) { form.value.documentType = glDT.id; docTypeSearch.value = glDT.name }
  const stdCat = glCategories.value.find(c => c.name?.toLowerCase() === 'standard')
  if (stdCat) form.value.gLCategory = stdCat.id

  if (accountingSchemas.value.length === 1) form.value.accountingSchema = accountingSchemas.value[0].id
}

// ── lines
function newLine() {
  return { accountingCombination: '', accSearch: '', accOptions: [], showAccDrop: false, dropStyle: {}, description: '', debit: 0, credit: 0 }
}
function addLine() { lines.value.push(newLine()) }
function removeLine(idx) { lines.value.splice(idx, 1) }
function onDebitInput(line) { if (Number(line.debit) > 0) line.credit = 0 }
function onCreditInput(line) { if (Number(line.credit) > 0) line.debit = 0 }

function onAccFocus(line, e) {
  line.showAccDrop = true
  const rect = e.target.getBoundingClientRect()
  line.dropStyle = {
    position: 'fixed',
    top:      rect.bottom + 2 + 'px',
    left:     rect.left + 'px',
    width:    rect.width + 'px',
    zIndex:   9999,
  }
}

let accTimers = new WeakMap()
async function onAccSearch(line) {
  line.showAccDrop = true
  const t = accTimers.get(line); if (t) clearTimeout(t)
  accTimers.set(line, setTimeout(async () => {
    if (line.accSearch.length < 2) { line.accOptions = []; return }
    line.accOptions = await fetchAccountingCombinations(line.accSearch)
  }, 300))
}
function selectAccount(line, a) {
  line.accountingCombination = a.id
  line.accSearch = a['_identifier'] || a.combination || a.id
  line.showAccDrop = false; line.accOptions = []
}
function onAccBlur(line) { setTimeout(() => { line.showAccDrop = false }, 150) }

// ── open modals
async function openCreateModal() {
  isEdit.value = false; editId.value = null
  form.value = emptyForm(); lines.value = []; formError.value = ''
  resolvedPeriod.value = null; openDropdown.value = null
  applyDefaults()
  await resolvePeriod(form.value.documentDate)
  showFormModal.value = true
}

async function openEditModal(r) {
  openDropdown.value = null; isEdit.value = true; editId.value = r.id; formError.value = ''
  const extractId = (v) => (v && typeof v === 'object') ? v.id : (v || '')
  form.value = {
    documentNo: r.documentNo || '',
    organization: extractId(r.organization),
    organization_name: r['organization$_identifier'] || defaultUserOrg.value.name,
    accountingSchema: extractId(r.accountingSchema),
    documentType: extractId(r.documentType),
    documentDate: r.documentDate?.slice(0, 10) || today(),
    accountingDate: r.accountingDate?.slice(0, 10) || today(),
    period: extractId(r.period),
    gLCategory: extractId(r.gLCategory),
    currency: extractId(r.currency) || '303',
    postingType: r.postingType || 'A',
    controlAmount: r.controlAmount ?? 0,
    description: r.description || '',
  }
  const dt = documentTypes.value.find(d => d.id === form.value.documentType)
  docTypeSearch.value = dt?.name || r['documentType$_identifier'] || ''
  const curList = await fetchCurrencies(r['currency$_identifier'] || 'IDR')
  filteredCurrencies.value = curList
  currencySearch.value = curList.find(c => c.id === form.value.currency)?.iSOCode || r['currency$_identifier'] || 'IDR'
  resolvedPeriod.value = r.period ? { id: extractId(r.period), '_identifier': r['period$_identifier'] } : null
  try {
    const existingLines = await fetchJournalLines(r.id)
    lines.value = existingLines.map(l => ({
      _id: l.id,
      accountingCombination: extractId(l.accountingCombination),
      accSearch: l['accountingCombination$_identifier'] || '',
      accOptions: [], showAccDrop: false,
      description: l.description || '',
      debit: l.debit || 0, credit: l.credit || 0,
    }))
  } catch { lines.value = [] }
  showFormModal.value = true
}

async function openViewModal(r) {
  closeDropdown()
  viewRow.value = r
  viewTab.value = 'detail'
  accountingFacts.value = []
  accountingError.value = ''
  showViewModal.value = true
  viewLinesLoading.value = true
  const rawLines = await fetchJournalLines(r.id).catch(() => [])
  viewLines.value = rawLines.sort((a, b) => (a.lineNo ?? 0) - (b.lineNo ?? 0))
  viewLinesLoading.value = false
}

function openEditFromView() {
  const r = viewRow.value
  if (!r) return
  showViewModal.value = false
  openEditModal(r)
}

async function switchToAccounting() {
  viewTab.value = 'accounting'
  if (accountingFacts.value.length > 0 || accountingLoading.value) return
  accountingLoading.value = true; accountingError.value = ''
  try {
    accountingFacts.value = await fetchAccountingFacts(viewRow.value.id)
  } catch (e) {
    accountingError.value = e?.response?.data?.response?.error?.message || e.message || 'Failed to load accounting data'
  } finally { accountingLoading.value = false }
}

function closeFormModal() { showFormModal.value = false }

// ── save
async function saveJournal() {
  formError.value = ''
  if (!form.value.organization) { formError.value = 'Organization is required.'; return }
  if (!form.value.accountingSchema) { formError.value = 'Accounting Schema is required.'; return }
  if (!form.value.documentType) { formError.value = 'Document Type is required.'; return }
  if (!form.value.gLCategory) { formError.value = 'GL Category is required.'; return }
  if (!form.value.documentDate) { formError.value = 'Document Date is required.'; return }
  if (!form.value.description?.trim()) { formError.value = 'Description is required.'; return }
  if (lines.value.length === 0) { formError.value = 'At least one journal line is required.'; return }
  for (const [i, l] of lines.value.entries()) {
    if (!l.accountingCombination) { formError.value = `Line ${i + 1}: Account is required.`; return }
    if (!l.debit && !l.credit) { formError.value = `Line ${i + 1}: Debit or Credit must be filled.`; return }
  }
  saving.value = true
  try {
    let journalId
    if (isEdit.value) {
      await updateJournal(editId.value, form.value)
      journalId = editId.value
      const existingLines = await fetchJournalLines(journalId)
      const localIds = new Set(lines.value.filter(l => l._id).map(l => l._id))
      for (const el of existingLines) { if (!localIds.has(el.id)) await deleteJournalLine(el.id) }
      for (const line of lines.value) {
        const lp = buildLinePayload(line, lines.value.indexOf(line), form.value)
        if (line._id) await updateJournalLine(line._id, lp)
        else await createJournalLine(journalId, lp)
      }
    } else {
      const created = await createJournal(form.value)
      journalId = created.id
      for (const [idx, line] of lines.value.entries()) {
        await createJournalLine(journalId, buildLinePayload(line, idx, form.value))
      }
    }
    showFormModal.value = false
    showToast(isEdit.value ? 'Journal updated successfully.' : 'Journal created successfully.')
    await loadJournals()
  } catch (e) {
    formError.value = e?.response?.data?.response?.error?.message || e.message
  } finally { saving.value = false }
}

function buildLinePayload(line, idx, formData) {
  return {
    lineNo: (idx + 1) * 10,
    description: line.description || formData.description || '',
    debit: Number(line.debit) || 0,
    credit: Number(line.credit) || 0,
    foreignCurrencyDebit: Number(line.debit) || 0,
    foreignCurrencyCredit: Number(line.credit) || 0,
    accountingCombination: line.accountingCombination,
    currency: formData.currency || '303',
    uOM: '100',
    quantity: 0,
    accountingDate: formData.accountingDate || formData.documentDate,
  }
}

// ── COMPLETE — mengikuti pola doCompleteInvoice di CustomerInvoice
async function doCompleteJournal() {
  if (!viewRow.value) return
  const journalId = viewRow.value.id
  completing.value = true
  try {
    await runJournalComplete(journalId, viewRow.value)
    showToast('Journal completed!')
    await loadJournals()
    const fresh = await fetchJournal(journalId)
    if (fresh) viewRow.value = fresh
    else {
      const updated = rows.value.find(r => r.id === journalId)
      if (updated) viewRow.value = updated
      else showViewModal.value = false
    }
  } catch (e) {
    showToast(e?.message || 'Failed to complete journal', 'error')
  } finally { completing.value = false }
}

// ── POST ACCOUNTING — mengikuti pola doPostAccounting di CustomerInvoice
async function doPostAccounting() {
  if (!viewRow.value) return
  const journalId = viewRow.value.id
  posting.value = true
  try {
    await postAccountingProcess(journalId, viewRow.value)
    showToast('Journal posted. Jurnal accounting terbentuk.')
    await loadJournals()
    const fresh = await fetchJournal(journalId)
    if (fresh) viewRow.value = fresh
    else { const updated = rows.value.find(r => r.id === journalId); if (updated) viewRow.value = updated }
    // Refresh accounting tab
    accountingFacts.value = []
    if (viewTab.value === 'accounting') {
      accountingLoading.value = true
      accountingFacts.value = await fetchAccountingFacts(journalId).catch(() => [])
      accountingLoading.value = false
    }
  } catch (e) {
    showToast(e?.message || 'Failed to post journal', 'error')
  } finally { posting.value = false }
}

// ── UNPOST — mengikuti pola doUnpostAccounting di CustomerInvoice
// Hapus semua AccountingFact, set posted='N'
async function doUnpostAccounting() {
  if (!viewRow.value) return
  const journalId = viewRow.value.id
  unposting.value = true
  try {
    await unpostAccountingProcess(journalId, viewRow.value)
    showToast('Journal unposted. Jurnal accounting dihapus.')
    await loadJournals()
    const fresh = await fetchJournal(journalId)
    if (fresh) viewRow.value = fresh
    else { const updated = rows.value.find(r => r.id === journalId); if (updated) viewRow.value = updated }
    // Clear accounting facts dari tampilan
    accountingFacts.value = []
  } catch (e) {
    showToast(e?.message || 'Failed to unpost journal', 'error')
  } finally { unposting.value = false }
}

// ── delete
function confirmDelete(r) { closeDropdown(); deleteRow.value = r; deleteError.value = ''; showDeleteModal.value = true }
async function doDelete() {
  deleting.value = true; deleteError.value = ''
  try {
    await deleteJournal(deleteRow.value.id)
    showDeleteModal.value = false
    showToast('Journal deleted.')
    await loadJournals()
  } catch (e) {
    deleteError.value = e?.response?.data?.response?.error?.message || e.message
  } finally { deleting.value = false }
}

onMounted(async () => {
  await loadJournals()
  await loadLookups()
})
</script>

<style scoped>
:root {
  --font: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --accent: #2563eb;
  --accent-light: #eff6ff;
  --danger: #dc2626;
  --bg: #f1f5f9;
  --surface: #ffffff;
  --surface2: #f8fafc;
  --border: #e2e8f0;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --radius: 12px;
  --radius-sm: 7px;
  --shadow-md: 0 4px 20px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,.04);
}

.layout { display: flex; min-height: 100vh; background: var(--bg); font-family: var(--font); }
.main { flex: 1; padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.content-card { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); overflow: hidden; }
.page-header { padding: 20px 20px 0; }
.page-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0 0 16px; }

.toolbar { display: flex; align-items: center; gap: 10px; padding: 0 20px 16px; flex-wrap: wrap; }
.search-wrap { position: relative; flex: 1; min-width: 200px; }
.search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.search-input { width: 100%; height: 36px; padding: 0 12px 0 34px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.search-input:focus { border-color: var(--accent); background: #fff; }

/* Buttons */
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 0 14px; height: 36px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; border: none; cursor: pointer; transition: all .15s; font-family: var(--font); white-space: nowrap; }
.btn--primary  { background: var(--accent); color: #fff; }
.btn--primary:hover { background: #1d4ed8; }
.btn--primary:disabled { opacity: .6; cursor: not-allowed; }
.btn--ghost    { background: var(--surface2); color: var(--text-secondary); border: 1px solid var(--border); }
.btn--ghost:hover { background: var(--border); }
.btn--danger   { background: var(--danger); color: #fff; }
.btn--danger:hover { background: #b91c1c; }
.btn--danger:disabled { opacity: .6; cursor: not-allowed; }
.btn--edit     { background: #f8fafc; color: #475569; border: 1px solid var(--border); }
.btn--edit:hover { background: #e2e8f0; }
.btn--complete { background: #16a34a; color: #fff; }
.btn--complete:hover { background: #15803d; }
.btn--complete:disabled { opacity: .6; cursor: not-allowed; }
.btn--post     { background: #7c3aed; color: #fff; }
.btn--post:hover { background: #6d28d9; }
.btn--post:disabled { opacity: .6; cursor: not-allowed; }
.btn--unpost   { background: #ea580c; color: #fff; }
.btn--unpost:hover { background: #c2410c; }
.btn--unpost:disabled { opacity: .6; cursor: not-allowed; }

/* Table */
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th { padding: 9px 14px; text-align: left; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); background: var(--surface2); border-bottom: 1px solid var(--border); white-space: nowrap; }
.table td { padding: 11px 14px; border-bottom: 1px solid var(--border); color: var(--text-primary); vertical-align: middle; }
.table tr:last-child td { border-bottom: none; }
.table--lines th, .table--lines td { padding: 8px 10px; }
.th-action { text-align: right; }
.tr-data:hover td { background: #f8fafc; }
.code-badge { font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: var(--accent); background: var(--accent-light); padding: 2px 8px; border-radius: 5px; }
.acc-code { font-family: var(--font-mono); font-size: 11.5px; font-weight: 600; color: var(--text-primary); background: var(--surface2); padding: 1px 6px; border-radius: 4px; margin-right: 4px; border: 1px solid var(--border); }
.td-secondary { color: var(--text-secondary); }
.td-clip { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.td-name { font-weight: 500; }
.td-empty { text-align: center; color: var(--text-muted); padding: 48px 16px; font-size: 13px; }
.td-error { color: var(--danger); }
.td-action-cell { text-align: right; overflow: visible !important; }

.status-pill { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
.status-pill--draft     { background: #f1f5f9; color: #64748b; }
.status-pill--completed { background: #eff6ff; color: #1d4ed8; }
.status-pill--voided    { background: #fff1f2; color: #dc2626; }

.posted-badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; white-space: nowrap; }
.posted-badge--yes { background: #f0fdf4; color: #15803d; }
.posted-badge--no  { background: #fef9c3; color: #854d0e; }

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
.page-ellipsis { color: var(--text-muted); padding: 0 4px; }

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
.modal-close:hover { background: var(--surface2); }
.modal-tabs { display: flex; border-bottom: 1px solid var(--border); padding: 0 20px; flex-shrink: 0; }
.modal-tab { padding: 10px 14px; font-size: 13px; font-weight: 500; color: var(--text-secondary); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-family: var(--font); transition: all .15s; margin-bottom: -1px; }
.modal-tab--active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
.modal-body { padding: 20px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0; align-items: center; }

/* Form */
.form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group--full { grid-column: 1 / -1; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-input { width: 100%; height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.form-input:focus { border-color: var(--accent); background: #fff; }
.form-input:disabled { opacity: .6; cursor: not-allowed; background: #f1f5f9; }
.form-input--sm { height: 32px; font-size: 12.5px; }
.req { color: var(--danger); }
.form-api-error { padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; }

.section-divider { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin: 20px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.btn-add-line { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--accent); background: var(--accent-light); border: 1px solid #bfdbfe; border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-family: var(--font); transition: background .12s; }
.btn-add-line:hover { background: #dbeafe; }
.btn-rm-line { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: #fee2e2; color: var(--danger); border: none; cursor: pointer; transition: background .12s; }
.btn-rm-line:hover { background: #fecaca; }

/* Balance bar */
.balance-bar { display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; border-radius: var(--radius-sm); margin-bottom: 12px; }
.balance-bar--ok   { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; }
.balance-bar--warn { background: #fff7ed; border: 1px solid #fed7aa; color: #c2410c; }
.balance-item { display: flex; flex-direction: column; gap: 2px; }
.balance-item--right { text-align: right; }
.balance-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; opacity: .7; }
.balance-value { font-size: 14px; font-weight: 700; }
.balance-separator { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; }

/* Combobox */
.acc-wrap { position: relative; width: 100%; }
.acc-input { display: block; width: 100%; height: 36px; padding: 0 32px 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.acc-input:focus { border-color: var(--accent); background: #fff; }
.acc-input--sm { height: 32px; font-size: 12.5px; }
.acc-chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.acc-dropdown { position: absolute; z-index: 300; top: calc(100% + 3px); left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); max-height: 220px; overflow-y: auto; list-style: none; margin: 0; padding: 4px 0; }
.acc-dropdown-fixed { position: fixed; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: 0 8px 24px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.08); max-height: 220px; overflow-y: auto; list-style: none; margin: 0; padding: 4px 0; }
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

/* Accounting */
.acc-summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; }
.acc-summary-item { display: flex; flex-direction: column; gap: 4px; }
.acc-summary-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); }
.acc-summary-value { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.acc-summary-value--debit  { color: #2563eb; }
.acc-summary-value--credit { color: #16a34a; }
.acc-debit  { color: #2563eb; font-weight: 600; }
.acc-credit { color: #16a34a; font-weight: 600; }
.acc-totals-row { background: var(--surface2); border-top: 2px solid var(--border); }
.acc-totals-row td { border-bottom: none !important; }

/* Delete */
.delete-text { font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); }
.delete-text strong { color: var(--text-primary); }

/* Toast */
.toast { position: fixed; bottom: 24px; right: 24px; z-index: 2000; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); }
.toast--success { background: #16a34a; color: #fff; }
.toast--error   { background: var(--danger); color: #fff; }
.fade-enter-active,.fade-leave-active { transition: opacity .15s; }
.fade-enter-from,.fade-leave-to { opacity: 0; }

/* Spinner */
.spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Sorting Headers ── */
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
</style>