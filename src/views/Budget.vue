<template>
  <div class="layout">
    <main class="main">
      <div class="content-card">

        <div class="page-header">
          <h2 class="page-title">Budget</h2>
        </div>

        <div class="page-tabs">
          <button :class="['page-tab', activeTab === 'budget' ? 'page-tab--active' : '']" @click="switchTab('budget')">Budget</button>
          <button :class="['page-tab', activeTab === 'masterBudget' ? 'page-tab--active' : '']" @click="switchTab('masterBudget')">Master Budget</button>
        </div>

        <template v-if="activeTab === 'budget'">
          <div class="toolbar">
            <div class="search-wrap">
              <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input v-model="searchQuery" class="search-input" placeholder="Search budget name..." @input="onSearch" />
            </div>
            <button class="btn btn--primary" @click="openCreateModal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Create Budget
            </button>
          </div>

          <div class="table-wrap">
            <table class="table">
              <thead><tr>
                <th class="sortable" :class="{ asc: sortCol === 'name' && sortDir === 'asc', desc: sortCol === 'name' && sortDir === 'desc' }" @click="toggleSort('name')">Name</th>
                <th class="sortable" :class="{ asc: sortCol === 'year$_identifier' && sortDir === 'asc', desc: sortCol === 'year$_identifier' && sortDir === 'desc' }" @click="toggleSort('year$_identifier')">Year</th>
                <th class="sortable" :class="{ asc: sortCol === 'cbudTipebudget$_identifier' && sortDir === 'asc', desc: sortCol === 'cbudTipebudget$_identifier' && sortDir === 'desc' }" @click="toggleSort('cbudTipebudget$_identifier')">Tipe Budget</th>
                <th>Export Actual</th>
                <th class="th-action">Action</th>
              </tr></thead>
              <tbody>
                <tr v-if="loading"><td colspan="5" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
                <tr v-else-if="error"><td colspan="5" class="td-empty td-error">{{ error }}</td></tr>
                <tr v-else-if="rows.length === 0"><td colspan="5" class="td-empty">No budgets found.</td></tr>
                <template v-else>
                  <tr v-for="r in rows" :key="r.id" class="tr-data">
                    <td class="td-name">{{ r.name || '—' }}</td>
                    <td class="td-secondary">{{ r['year$_identifier'] || '—' }}</td>
                    <td class="td-secondary">{{ r['cbudTipebudget$_identifier'] || '—' }}</td>
                    <td><span :class="['bool-pill', r.exportActualData ? 'bool-pill--yes' : 'bool-pill--no']">{{ r.exportActualData ? 'Yes' : 'No' }}</span></td>
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
        </template>

        <template v-if="activeTab === 'masterBudget'">
          <div class="toolbar">
            <div class="search-wrap">
              <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input v-model="mbSearchQuery" class="search-input" placeholder="Search code or name..." @input="onMbSearch" />
            </div>
            <button class="btn btn--primary" @click="openMbCreateModal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Create Master Budget
            </button>
          </div>

          <div class="table-wrap">
            <table class="table">
              <thead><tr>
                <th class="sortable" :class="{ asc: mbSortCol === 'value' && mbSortDir === 'asc', desc: mbSortCol === 'value' && mbSortDir === 'desc' }" @click="toggleMbSort('value')">Kode Budget</th>
                <th class="sortable" :class="{ asc: mbSortCol === 'name' && mbSortDir === 'asc', desc: mbSortCol === 'name' && mbSortDir === 'desc' }" @click="toggleMbSort('name')">Nama Budget</th>
                <th class="th-action">Action</th>
              </tr></thead>
              <tbody>
                <tr v-if="mbLoading"><td colspan="3" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
                <tr v-else-if="mbError"><td colspan="3" class="td-empty td-error">{{ mbError }}</td></tr>
                <tr v-else-if="mbRows.length === 0"><td colspan="3" class="td-empty">No master budgets found.</td></tr>
                <template v-else>
                  <tr v-for="r in mbRows" :key="r.id" class="tr-data">
                    <td><span class="code-badge">{{ r.value || '—' }}</span></td>
                    <td class="td-name">{{ r.name || '—' }}</td>
                    <td class="td-action-cell">
                      <div class="action-group">
                        <div class="dropdown-wrap" v-click-outside="closeMbDropdown">
                          <button class="action-btn action-btn--more" @click.stop="toggleMbDropdown(r.id, $event)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                          </button>
                          <div v-if="openMbDropdown === r.id" class="dropdown-menu" :style="{ top: mbDropdownPos.top + 'px', right: mbDropdownPos.right + 'px' }">
                            <button class="dropdown-item" @click="openMbEditModal(r)">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit
                            </button>
                            <button class="dropdown-item dropdown-item--danger" @click="confirmMbDelete(r)">
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

          <div v-if="mbTotalPages > 1" class="pagination">
            <button class="page-btn" :disabled="mbCurrentPage === 1" @click="goMbPage(mbCurrentPage - 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <template v-for="p in mbPageNumbers" :key="p">
              <span v-if="p === '...'" class="page-ellipsis">…</span>
              <button v-else :class="['page-btn', p === mbCurrentPage ? 'page-btn--active' : '']" @click="goMbPage(p)">{{ p }}</button>
            </template>
            <button class="page-btn" :disabled="mbCurrentPage === mbTotalPages" @click="goMbPage(mbCurrentPage + 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </template>

      </div>
    </main>

    <transition name="fade">
      <div v-if="showFormModal" class="modal-overlay" @mousedown.self="closeFormModal">
        <div class="modal modal--fullwidth">
          <div class="modal-header">
            <h3 class="modal-title">{{ isEdit ? 'Edit Budget' : 'Create Budget' }}</h3>
            <button class="modal-close" @click="closeFormModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="section-label">BUDGET HEADER</div>
            <div class="form-grid">
              <div class="form-group">
                <label>Organization</label>
                <select v-model="form.organization" class="form-input">
                  <option v-for="o in organizations" :key="o.id" :value="o.id">{{ o.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Name <span class="req">*</span></label>
                <input v-model="form.name" class="form-input" placeholder="Budget name" />
              </div>

              <div class="form-group">
                <label>Year <span class="req">*</span></label>
                <div class="acc-wrap">
                  <input
                    class="form-input"
                    :value="form.yearLabel"
                    @input="onYearSearch($event.target.value)"
                    @focus="openYearDropdown"
                    @blur="closeYearDropdownDelayed"
                    placeholder="Type or select year..."
                    autocomplete="off"
                  />
                  <svg class="acc-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                  <ul v-if="yearDropdownOpen" class="acc-dropdown">
                    <li v-if="filteredYears.length === 0" class="acc-empty">Tidak ada tahun ditemukan.</li>
                    <li v-for="y in filteredYears" :key="y.id" class="acc-opt" @mousedown.prevent="selectYear(y)">{{ y._identifier || y.year }}</li>
                  </ul>
                </div>
              </div>

              <div class="form-group">
                <label>Tipe Budget</label>
                <div class="acc-wrap">
                  <input
                    class="form-input"
                    :value="form.tipeBudgetLabel"
                    @input="onTipeSearch($event.target.value)"
                    @focus="openTipeDropdown"
                    @blur="closeTipeDropdownDelayed"
                    placeholder="Type or select type..."
                    autocomplete="off"
                  />
                  <svg class="acc-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                  <ul v-if="tipeDropdownOpen" class="acc-dropdown">
                    <li v-if="filteredTipes.length === 0" class="acc-empty">Tidak ada tipe ditemukan.</li>
                    <li v-for="t in filteredTipes" :key="t.id" class="acc-opt" @mousedown.prevent="selectTipe(t)">{{ t.name }}</li>
                  </ul>
                </div>
              </div>

              <div class="form-group form-group--full">
                <label>Description</label>
                <textarea v-model="form.description" class="form-input form-textarea" rows="2" placeholder="Optional description"></textarea>
              </div>
              <div class="form-group form-group--checkbox">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="form.exportActualData" class="checkbox-input" />
                  <span>Export Actual Data</span>
                </label>
              </div>
            </div>

            <div class="lines-section">
              <div class="section-divider">
                <span>Budget Lines</span>
                <div style="display:flex;gap:8px;">
                  <button class="btn-add-line" @click="addLine">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                    Add Line
                  </button>
                  <label class="btn-import-excel">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Import Excel
                    <input type="file" accept=".xlsx,.xls" @change="handleExcelImport" style="display:none" ref="excelInput" />
                  </label>
                </div>
              </div>

              <div v-if="importError" class="error-banner">
                <div class="error-banner__icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div class="error-banner__body">
                  <div class="error-banner__title">Import Gagal</div>
                  <div class="error-banner__message">{{ importError }}</div>
                </div>
                <button class="error-banner__close" @click="importError = null">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <div class="table-scroll">
                <table class="table table--lines">
                  <thead><tr>
                    <th style="width:48px">No.</th>
                    <th class="sortable-line" :class="{ asc: lineSortCol === 'accountElement' && lineSortDir === 'asc', desc: lineSortCol === 'accountElement' && lineSortDir === 'desc' }" style="width:220px" @click="toggleLineSort('accountElement')">Account Element <span class="req">*</span></th>
                    <th class="sortable-line" :class="{ asc: lineSortCol === 'cbudMasterbudget' && lineSortDir === 'asc', desc: lineSortCol === 'cbudMasterbudget' && lineSortDir === 'desc' }" style="width:180px" @click="toggleLineSort('cbudMasterbudget')">Kode Budget</th>
                    <th style="width:150px">Tipe Budget</th>
                    <th style="width:110px">Currency</th>
                    <th class="sortable-line" :class="{ asc: lineSortCol === 'amount' && lineSortDir === 'asc', desc: lineSortCol === 'amount' && lineSortDir === 'desc' }" style="width:120px" @click="toggleLineSort('amount')">Amount</th>
                    <th style="width:90px">Qty</th>
                    <th style="width:120px">Period</th>
                    <th style="width:200px">Description</th>
                    <th style="width:36px"></th>
                  </tr></thead>
                  <tbody>
                    <tr v-if="sortedLines.length === 0">
                      <td colspan="10" class="td-empty">No lines yet. Add a line or import from Excel.</td>
                    </tr>
                    <tr v-for="(ln, idx) in sortedLines" :key="idx" class="tr-data">
                      <td class="td-secondary text-center">{{ idx + 1 }}</td>
                      <td>
                        <div class="acc-wrap">
                          <input
                            class="acc-input acc-input--sm"
                            :value="ln['accountElement$_identifier'] || ''"
                            @input="onAccSearch(lines.indexOf(ln), $event.target.value)"
                            @focus="openAccDropdown(lines.indexOf(ln))"
                            placeholder="Search account..."
                          />
                          <svg class="acc-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                          <ul v-if="accDropdownOpen === lines.indexOf(ln) && accOptions.length" class="acc-dropdown">
                            <li v-for="opt in accOptions" :key="opt.id" class="acc-opt" @mousedown.prevent="selectAcc(lines.indexOf(ln), opt)">{{ opt.searchKey || opt.value }} - {{ opt.name }}</li>
                          </ul>
                          <li v-if="accDropdownOpen === lines.indexOf(ln) && accOptions.length === 0 && accSearching" class="acc-empty">Searching...</li>
                        </div>
                      </td>
                      <td>
                        <div class="acc-wrap">
                          <input
                            class="acc-input acc-input--sm"
                            :value="ln['cbudMasterbudget$_identifier'] || ''"
                            @input="onMasterBudgetSearch(lines.indexOf(ln), $event.target.value)"
                            @focus="openMasterBudgetDropdown(lines.indexOf(ln))"
                            placeholder="Search kode..."
                          />
                          <svg class="acc-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                          <ul v-if="mbDropdownOpen === lines.indexOf(ln) && mbOptions.length" class="acc-dropdown">
                            <li v-for="opt in mbOptions" :key="opt.id" class="acc-opt" @mousedown.prevent="selectMasterBudget(lines.indexOf(ln), opt)">{{ opt.searchKey || opt.value }} - {{ opt.name }}</li>
                          </ul>
                        </div>
                      </td>
                      <td>
                        <select v-model="ln.cbudTipebudget" class="form-input form-input--sm">
                          <option value="">—</option>
                          <option v-for="t in tipeBudgets" :key="t.id" :value="t.id">{{ t.name }}</option>
                        </select>
                      </td>
                      <td>
                        <select v-model="ln.currency" class="form-input form-input--sm">
                          <option v-for="c in currencies" :key="c.id" :value="c.id">{{ c.iSOCode }}</option>
                        </select>
                      </td>
                      <td><input v-model="ln.amount" type="number" class="form-input form-input--sm" placeholder="0" /></td>
                      <td><input v-model="ln.quantity" type="number" class="form-input form-input--sm" placeholder="0" /></td>
                      <td>
                        <select v-model="ln.period" class="form-input form-input--sm">
                          <option value="">—</option>
                          <option v-for="p in periods" :key="p.id" :value="p.id">{{ p.name }}</option>
                        </select>
                      </td>
                      <td><input v-model="ln.description" class="form-input form-input--sm" placeholder="Description" /></td>
                      <td>
                        <button class="btn-rm-line" @click="removeLine(lines.indexOf(ln))" title="Remove line">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div v-if="formError" class="form-api-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
              {{ formError }}
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn--ghost" @click="closeFormModal">Cancel</button>
            <button class="btn btn--primary" :disabled="formSaving" @click="saveForm">
              <span v-if="formSaving" class="spinner"></span>
              {{ isEdit ? 'Save Changes' : 'Create Budget' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showViewModal" class="modal-overlay" @mousedown.self="closeViewModal">
        <div class="modal modal--fullwidth">
          <div class="modal-header">
            <h3 class="modal-title">Budget — {{ viewData?.name }}</h3>
            <button class="modal-close" @click="closeViewModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Name</span>
                <span class="detail-value">{{ viewData?.name || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Year</span>
                <span class="detail-value">{{ viewData?.['year$_identifier'] || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Tipe Budget</span>
                <span class="detail-value">{{ viewData?.['cbudTipebudget$_identifier'] || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Export Actual Data</span>
                <span class="detail-value">{{ viewData?.exportActualData ? 'Yes' : 'No' }}</span>
              </div>
              <div class="detail-item detail-item--full">
                <span class="detail-label">Description</span>
                <span class="detail-value">{{ viewData?.description || '—' }}</span>
              </div>
            </div>

            <div class="section-divider" style="margin-top:20px">
              <span>Budget Lines</span>
              <button class="btn-add-line" @click="openEditFromView">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                Add Line
              </button>
            </div>

            <div v-if="viewLinesLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>
            <div v-else class="table-scroll">
              <table class="table table--lines table--view">
                <thead><tr>
                  <th style="width:48px">No.</th>
                  <th class="sortable-line" :class="{ asc: viewLineSortCol === 'accountElement' && viewLineSortDir === 'asc', desc: viewLineSortCol === 'accountElement' && viewLineSortDir === 'desc' }" style="min-width:200px" @click="toggleViewLineSort('accountElement')">Account Element</th>
                  <th class="sortable-line" :class="{ asc: viewLineSortCol === 'cbudMasterbudget' && viewLineSortDir === 'asc', desc: viewLineSortCol === 'cbudMasterbudget' && viewLineSortDir === 'desc' }" style="min-width:160px" @click="toggleViewLineSort('cbudMasterbudget')">Kode Budget</th>
                  <th style="min-width:120px">Tipe Budget</th>
                  <th style="width:80px">Currency</th>
                  <th class="sortable-line" :class="{ asc: viewLineSortCol === 'amount' && viewLineSortDir === 'asc', desc: viewLineSortCol === 'amount' && viewLineSortDir === 'desc' }" style="width:110px" @click="toggleViewLineSort('amount')">Amount</th>
                  <th style="width:110px">Actual Amt</th>
                  <th style="width:70px">Qty</th>
                  <th style="min-width:120px">Period</th>
                  <th style="min-width:160px">Description</th>
                </tr></thead>
                <tbody>
                  <tr v-if="sortedViewLines.length === 0"><td colspan="10" class="td-empty">No lines.</td></tr>
                  <tr v-for="(ln, idx) in sortedViewLines" :key="ln.id" class="tr-data">
                    <td class="td-secondary text-center">{{ idx + 1 }}</td>
                    <td class="td-clip">{{ ln['accountElement$_identifier'] || '—' }}</td>
                    <td class="td-secondary td-clip">{{ ln['cbudMasterbudget$_identifier'] || '—' }}</td>
                    <td class="td-secondary">{{ ln['cbudTipebudget$_identifier'] || '—' }}</td>
                    <td class="td-secondary">{{ ln['currency$_identifier'] || '—' }}</td>
                    <td class="td-secondary td-num">{{ formatNumber(ln.amount) }}</td>
                    <td class="td-secondary td-num">{{ formatNumber(ln.actualAmount) }}</td>
                    <td class="td-secondary td-num">{{ ln.quantity ?? '—' }}</td>
                    <td class="td-secondary">{{ ln['period$_identifier'] || '—' }}</td>
                    <td class="td-secondary td-clip">{{ ln.description || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="closeViewModal">Close</button>
            <button class="btn btn--primary" @click="openEditFromView">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit Budget
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showMbFormModal" class="modal-overlay" @mousedown.self="closeMbFormModal">
        <div class="modal modal--sm">
          <div class="modal-header">
            <h3 class="modal-title">{{ isMbEdit ? 'Edit Master Budget' : 'Create Master Budget' }}</h3>
            <button class="modal-close" @click="closeMbFormModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-grid" style="grid-template-columns:1fr;">
              <div class="form-group">
                <label>Kode Budget <span class="req">*</span></label>
                <input v-model="mbForm.value" class="form-input" placeholder="Kode budget" />
              </div>
              <div class="form-group">
                <label>Nama Budget <span class="req">*</span></label>
                <input v-model="mbForm.name" class="form-input" placeholder="Nama budget" />
              </div>
            </div>
            <div v-if="mbFormError" class="form-api-error" style="margin-top:12px">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
              {{ mbFormError }}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="closeMbFormModal">Cancel</button>
            <button class="btn btn--primary" :disabled="mbFormSaving" @click="saveMbForm">
              <span v-if="mbFormSaving" class="spinner"></span>
              {{ isMbEdit ? 'Save Changes' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showDeleteModal" class="modal-overlay" @mousedown.self="showDeleteModal = false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <h3 class="modal-title modal-title--danger">Delete Budget</h3>
            <button class="modal-close" @click="showDeleteModal = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-text">Are you sure you want to delete budget <strong>{{ deleteTarget?.name }}</strong>? This action cannot be undone.</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="showDeleteModal = false">Cancel</button>
            <button class="btn btn--danger" :disabled="deleting" @click="doDelete">
              <span v-if="deleting" class="spinner"></span>
              Delete
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showMbDeleteModal" class="modal-overlay" @mousedown.self="showMbDeleteModal = false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <h3 class="modal-title modal-title--danger">Delete Master Budget</h3>
            <button class="modal-close" @click="showMbDeleteModal = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-text">Are you sure you want to delete <strong>{{ mbDeleteTarget?.value }} - {{ mbDeleteTarget?.name }}</strong>? This action cannot be undone.</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="showMbDeleteModal = false">Cancel</button>
            <button class="btn btn--danger" :disabled="mbDeleting" @click="doMbDelete">
              <span v-if="mbDeleting" class="spinner"></span>
              Delete
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="apiErrorDialog.show" class="modal-overlay" @mousedown.self="apiErrorDialog.show = false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <h3 class="modal-title modal-title--danger">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:middle"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ apiErrorDialog.title }}
            </h3>
            <button class="modal-close" @click="apiErrorDialog.show = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="error-dialog-body">
              <div class="error-dialog-msg">{{ apiErrorDialog.message }}</div>
              <div v-if="apiErrorDialog.detail" class="error-dialog-detail">
                <div class="error-dialog-detail-label">Detail Teknis</div>
                <pre class="error-dialog-code">{{ apiErrorDialog.detail }}</pre>
              </div>
              <div v-if="apiErrorDialog.status" class="error-dialog-meta">
                <span class="error-badge">HTTP {{ apiErrorDialog.status }}</span>
                <span v-if="apiErrorDialog.endpoint" class="error-endpoint">{{ apiErrorDialog.endpoint }}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="apiErrorDialog.show = false">Tutup</button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="toast.show" :class="['toast', `toast--${toast.type}`]">
        <svg v-if="toast.type === 'success'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
        {{ toast.message }}
      </div>
    </transition>

  </div>
</template>

<script>
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs'
import {
  fetchAllBudgets, fetchBudget,
  createBudget, updateBudget, deleteBudget,
  fetchBudgetLines, createBudgetLine, updateBudgetLine, deleteBudgetLine,
  fetchAllMasterBudgets, createMasterBudget, updateMasterBudget, deleteMasterBudget,
  fetchYears, fetchTipeBudget, fetchMasterBudget,
  fetchAccountElements, fetchCurrencies, fetchPeriods, fetchOrganizations,
  DEFAULT_ORGANIZATION, DEFAULT_CURRENCY,
} from '@/services/budget.js'

const PAGE_SIZE = 20

export default {
  name: 'BudgetView',
  directives: {
    clickOutside: {
      mounted(el, binding) {
        el._handler = (e) => { if (!el.contains(e.target)) binding.value(e) }
        document.addEventListener('click', el._handler)
      },
      unmounted(el) { document.removeEventListener('click', el._handler) },
    },
  },

  data() {
    return {
      // ── Tab ──
      activeTab: 'budget',

      // ── Budget List ──
      rows: [], loading: false, error: null,
      searchQuery: '', searchTimer: null,
      sortCol: 'name', sortDir: 'asc',
      currentPage: 1, totalCount: 0,
      openDropdown: null, dropdownPos: { top: 0, right: 0 },

      // ── Master Budget List ──
      mbRows: [], mbLoading: false, mbError: null,
      mbSearchQuery: '', mbSearchTimer: null,
      mbSortCol: 'value', mbSortDir: 'asc',
      mbCurrentPage: 1, mbTotalCount: 0,
      openMbDropdown: null, mbDropdownPos: { top: 0, right: 0 },

      // ── Lookup data ──
      organizations: [], years: [], tipeBudgets: [], currencies: [], periods: [],

      // ── Year combobox ──
      yearDropdownOpen: false, yearSearch: '', yearCloseTimer: null,
      // ── Tipe Budget combobox ──
      tipeDropdownOpen: false, tipeSearch: '', tipeCloseTimer: null,

      // ── Budget Form Modal ──
      showFormModal: false, isEdit: false, formSaving: false, formError: null,
      form: this.emptyForm(),

      // ── Lines ──
      lines: [],
      deletedLines: [], // Array untuk menyimpan ID line yang dihapus dari grid
      lineSortCol: null, lineSortDir: 'asc',
      accDropdownOpen: null, accOptions: [], accSearching: false, accTimer: null,
      mbDropdownOpen: null, mbOptions: [], mbTimer: null,
      importError: null,

      // ── View Modal ──
      showViewModal: false, viewData: null, viewLines: [], viewLinesLoading: false,
      viewLineSortCol: null, viewLineSortDir: 'asc',

      // ── Delete Modal (Budget) ──
      showDeleteModal: false, deleteTarget: null, deleting: false,

      // ── Master Budget Form Modal ──
      showMbFormModal: false, isMbEdit: false, mbFormSaving: false, mbFormError: null,
      mbForm: { value: '', name: '', _id: null },

      // ── Delete Modal (Master Budget) ──
      showMbDeleteModal: false, mbDeleteTarget: null, mbDeleting: false,

      // ── API Error dialog ──
      apiErrorDialog: { show: false, title: '', message: '', detail: '', status: null, endpoint: '' },

      // ── Toast ──
      toast: { show: false, type: 'success', message: '' },
    }
  },

  computed: {
    // Budget pagination
    totalPages() { return Math.max(1, Math.ceil(this.totalCount / PAGE_SIZE)) },
    pageNumbers() { return this.buildPageNumbers(this.currentPage, this.totalPages) },

    // Master Budget pagination
    mbTotalPages() { return Math.max(1, Math.ceil(this.mbTotalCount / PAGE_SIZE)) },
    mbPageNumbers() { return this.buildPageNumbers(this.mbCurrentPage, this.mbTotalPages) },

    // Year filter (Memakai fallback _identifier jika year tdk ada)
    filteredYears() {
      const q = (this.form.yearLabel || '').toLowerCase().trim()
      if (!q) return this.years
      return this.years.filter(y => {
          const label = String(y._identifier || y.year || '')
          return label.toLowerCase().includes(q)
      })
    },

    // Tipe filter
    filteredTipes() {
      const q = (this.form.tipeBudgetLabel || '').toLowerCase().trim()
      if (!q) return this.tipeBudgets
      return this.tipeBudgets.filter(t => t.name?.toLowerCase().includes(q))
    },

    // Sorted lines for form modal
    sortedLines() {
      if (!this.lineSortCol) return this.lines
      return [...this.lines].sort((a, b) => {
        const va = a[this.lineSortCol] ?? a[`${this.lineSortCol}$_identifier`] ?? ''
        const vb = b[this.lineSortCol] ?? b[`${this.lineSortCol}$_identifier`] ?? ''
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true })
        return this.lineSortDir === 'asc' ? cmp : -cmp
      })
    },

    // Sorted lines for view modal
    sortedViewLines() {
      if (!this.viewLineSortCol) return this.viewLines
      return [...this.viewLines].sort((a, b) => {
        const va = a[this.viewLineSortCol] ?? a[`${this.viewLineSortCol}$_identifier`] ?? ''
        const vb = b[this.viewLineSortCol] ?? b[`${this.viewLineSortCol}$_identifier`] ?? ''
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true })
        return this.viewLineSortDir === 'asc' ? cmp : -cmp
      })
    },
  },

  async mounted() {
    await this.loadLookups()
    await this.loadList()
  },

  methods: {
    emptyForm() {
      return {
        organization: DEFAULT_ORGANIZATION,
        name: '', description: '', year: '',
        yearLabel: '',
        cbudTipebudget: '', tipeBudgetLabel: '',
        exportActualData: false,
      }
    },

    buildPageNumbers(cur, total) {
      if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
      const pages = [1]
      if (cur > 3) pages.push('...')
      for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i)
      if (cur < total - 2) pages.push('...')
      pages.push(total)
      return pages
    },

    async loadLookups() {
      try {
        const [orgs, yrs, tipos, curs, pers] = await Promise.all([
          fetchOrganizations(), fetchYears(), fetchTipeBudget(), fetchCurrencies(), fetchPeriods(),
        ])
        this.organizations = orgs
        this.years = yrs
        this.tipeBudgets = tipos
        this.currencies = curs
        this.periods = pers
      } catch (e) {
        console.error('Failed to load lookups', e)
      }
    },

    // ══ BUDGET LIST ══
    async loadList() {
      this.loading = true; this.error = null
      try {
        const result = await fetchAllBudgets({
          startRow: (this.currentPage - 1) * PAGE_SIZE,
          pageSize: PAGE_SIZE,
          searchKey: this.searchQuery,
          sortCol: this.sortCol,
          sortDir: this.sortDir,
        })
        this.rows = result?.data ?? []
        this.totalCount = result?.totalRows ?? this.rows.length
      } catch (e) {
        this.error = e.message || 'Failed to load budgets.'
      } finally {
        this.loading = false
      }
    },

    onSearch() {
      clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => { this.currentPage = 1; this.loadList() }, 400)
    },

    toggleSort(col) {
      if (this.sortCol === col) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc'
      else { this.sortCol = col; this.sortDir = 'asc' }
      this.currentPage = 1; this.loadList()
    },

    goPage(p) { this.currentPage = p; this.loadList() },

    toggleDropdown(id, e) {
      if (this.openDropdown === id) { this.openDropdown = null; return }
      const rect = e.currentTarget.getBoundingClientRect()
      this.dropdownPos = { top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right }
      this.openDropdown = id
    },
    closeDropdown() { this.openDropdown = null },

    // ══ TAB SWITCH ══
    switchTab(tab) {
      this.activeTab = tab
      if (tab === 'masterBudget' && this.mbRows.length === 0) {
        this.loadMbList()
      }
    },

    // ══ MASTER BUDGET LIST ══
    async loadMbList() {
      this.mbLoading = true; this.mbError = null
      try {
        const result = await fetchAllMasterBudgets({
          startRow: (this.mbCurrentPage - 1) * PAGE_SIZE,
          pageSize: PAGE_SIZE,
          searchKey: this.mbSearchQuery,
          sortCol: this.mbSortCol,
          sortDir: this.mbSortDir,
        })
        this.mbRows = result?.data ?? []
        this.mbTotalCount = result?.totalRows ?? this.mbRows.length
      } catch (e) {
        this.mbError = e.message || 'Failed to load master budgets.'
      } finally {
        this.mbLoading = false
      }
    },

    onMbSearch() {
      clearTimeout(this.mbSearchTimer)
      this.mbSearchTimer = setTimeout(() => { this.mbCurrentPage = 1; this.loadMbList() }, 400)
    },

    toggleMbSort(col) {
      if (this.mbSortCol === col) this.mbSortDir = this.mbSortDir === 'asc' ? 'desc' : 'asc'
      else { this.mbSortCol = col; this.mbSortDir = 'asc' }
      this.mbCurrentPage = 1; this.loadMbList()
    },

    goMbPage(p) { this.mbCurrentPage = p; this.loadMbList() },

    toggleMbDropdown(id, e) {
      if (this.openMbDropdown === id) { this.openMbDropdown = null; return }
      const rect = e.currentTarget.getBoundingClientRect()
      this.mbDropdownPos = { top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right }
      this.openMbDropdown = id
    },
    closeMbDropdown() { this.openMbDropdown = null },

    openMbCreateModal() {
      this.mbForm = { value: '', name: '', _id: null }
      this.mbFormError = null; this.isMbEdit = false
      this.showMbFormModal = true
    },

    openMbEditModal(row) {
      this.openMbDropdown = null
      this.mbForm = { value: row.value, name: row.name, _id: row.id }
      this.mbFormError = null; this.isMbEdit = true
      this.showMbFormModal = true
    },

    closeMbFormModal() { this.showMbFormModal = false },

    async saveMbForm() {
      if (!this.mbForm.value.trim()) { this.mbFormError = 'Kode Budget is required.'; return }
      if (!this.mbForm.name.trim()) { this.mbFormError = 'Nama Budget is required.'; return }
      this.mbFormSaving = true; this.mbFormError = null
      try {
        if (this.isMbEdit) {
          await updateMasterBudget(this.mbForm._id, this.mbForm)
        } else {
          await createMasterBudget(this.mbForm)
        }
        this.showToast('success', `Master Budget ${this.isMbEdit ? 'updated' : 'created'} successfully.`)
        this.closeMbFormModal()
        await this.loadMbList()
      } catch (e) {
        this.mbFormError = this.extractErrorMessage(e)
      } finally {
        this.mbFormSaving = false
      }
    },

    confirmMbDelete(row) {
      this.openMbDropdown = null
      this.mbDeleteTarget = row
      this.showMbDeleteModal = true
    },

    async doMbDelete() {
      this.mbDeleting = true
      try {
        await deleteMasterBudget(this.mbDeleteTarget.id)
        this.showMbDeleteModal = false
        this.showToast('success', 'Master Budget deleted.')
        await this.loadMbList()
      } catch (e) {
        this.showMbDeleteModal = false
        this.showApiErrorDialog(e, 'Gagal menghapus master budget')
      } finally {
        this.mbDeleting = false
      }
    },

    // ══ YEAR COMBOBOX ══
    openYearDropdown() { this.yearDropdownOpen = true },
    closeYearDropdownDelayed() {
      this.yearCloseTimer = setTimeout(() => { this.yearDropdownOpen = false }, 200)
    },
    onYearSearch(val) {
      this.form.yearLabel = val
      this.form.year = ''
      this.yearDropdownOpen = true
    },
    selectYear(y) {
      this.form.year = y.id
      this.form.yearLabel = String(y._identifier || y.year || '')
      this.yearDropdownOpen = false
      clearTimeout(this.yearCloseTimer)
    },

    // ══ TIPE BUDGET COMBOBOX ══
    openTipeDropdown() { this.tipeDropdownOpen = true },
    closeTipeDropdownDelayed() {
      this.tipeCloseTimer = setTimeout(() => { this.tipeDropdownOpen = false }, 200)
    },
    onTipeSearch(val) {
      this.form.tipeBudgetLabel = val
      this.form.cbudTipebudget = ''
      this.tipeDropdownOpen = true
    },
    selectTipe(t) {
      this.form.cbudTipebudget = t.id
      this.form.tipeBudgetLabel = t.name
      this.tipeDropdownOpen = false
      clearTimeout(this.tipeCloseTimer)
    },

    // ══ BUDGET FORM MODAL ══
    async openCreateModal() {
      this.form = this.emptyForm()
      this.lines = []
      this.deletedLines = [] // Reset state yang dihapus saat tambah baru
      this.lineSortCol = null
      this.importError = null
      this.formError = null
      this.isEdit = false
      this.showFormModal = true
    },

    async openEditModal(row) {
      this.openDropdown = null
      // Find year — try by ID first, fallback to identifier match
      let yearObj = this.years.find(y => y.id === row.year)
      if (!yearObj && row['year$_identifier']) {
        yearObj = this.years.find(y => String(y._identifier || y.year) === row['year$_identifier'])
      }
      const tipeObj = this.tipeBudgets.find(t => t.id === row.cbudTipebudget)
      this.form = {
        organization: row.organization || DEFAULT_ORGANIZATION,
        name: row.name,
        description: row.description || '',
        year: row.year || '',
        yearLabel: yearObj ? String(yearObj._identifier || yearObj.year) : (row['year$_identifier'] || ''),
        cbudTipebudget: row.cbudTipebudget || '',
        tipeBudgetLabel: tipeObj ? tipeObj.name : (row['cbudTipebudget$_identifier'] || ''),
        exportActualData: row.exportActualData || false,
        _id: row.id,
      }
      
      if (this.form.year && !this.form.yearLabel) {
        const found = this.years.find(y => y.id === this.form.year)
        if (found) this.form.yearLabel = String(found._identifier || found.year)
      }

      this.formError = null; this.importError = null
      this.lineSortCol = null
      this.isEdit = true
      this.deletedLines = [] // Reset state deletedLines ketika edit
      this.showFormModal = true
      
      const lns = await fetchBudgetLines(row.id)
      this.lines = lns.map(l => ({
        _id: l.id,
        accountElement: l.accountElement || '',
        'accountElement$_identifier': l['accountElement$_identifier'] || '',
        cbudMasterbudget: l.cbudMasterbudget || '',
        'cbudMasterbudget$_identifier': l['cbudMasterbudget$_identifier'] || '',
        cbudTipebudget: l.cbudTipebudget || '',
        currency: l.currency || DEFAULT_CURRENCY,
        amount: l.amount ?? '',
        quantity: l.quantity ?? 0,
        period: l.period || '',
        description: l.description || '',
      }))
    },

    closeFormModal() { this.showFormModal = false },

    addLine() {
      this.lines.push({
        _id: null,
        accountElement: '', 'accountElement$_identifier': '',
        cbudMasterbudget: '', 'cbudMasterbudget$_identifier': '',
        cbudTipebudget: '', currency: DEFAULT_CURRENCY,
        amount: '', quantity: 0, period: '', description: '',
      })
    },

    removeLine(idx) {
      // Potong baris dari UI, lalu push ID-nya ke array khusus untuk proses DELETE ke server
      const removed = this.lines.splice(idx, 1)[0]
      if (removed._id) {
        this.deletedLines.push(removed._id)
      }
    },

    toggleLineSort(col) {
      if (this.lineSortCol === col) this.lineSortDir = this.lineSortDir === 'asc' ? 'desc' : 'asc'
      else { this.lineSortCol = col; this.lineSortDir = 'asc' }
    },

    async saveForm() {
      if (!this.form.name.trim()) { this.formError = 'Name is required.'; return }
      if (!this.form.year) { this.formError = 'Year is required. Pilih tahun dari dropdown.'; return }
      this.formSaving = true; this.formError = null
      try {
        let budgetId
        if (this.isEdit) {
          await updateBudget(this.form._id, this.form)
          budgetId = this.form._id
        } else {
          const created = await createBudget(this.form)
          budgetId = created.id
        }

        // 1. Eksekusi proses penghapusan line (yang sebelumnya di click silang/remove UI)
        for (const lnId of this.deletedLines) {
           await deleteBudgetLine(lnId)
        }

        // 2. Eksekusi Create atau Update line
        for (const ln of this.lines) {
          if (ln._id) {
            await updateBudgetLine(ln._id, ln)
          } else {
            const seq = (this.lines.indexOf(ln) + 1) * 10
            await createBudgetLine(budgetId, { ...ln, sequenceNumber: seq })
          }
        }
        
        this.showToast('success', `Budget ${this.isEdit ? 'updated' : 'created'} successfully.`)
        this.closeFormModal()
        await this.loadList()
      } catch (e) {
        this.formError = this.extractErrorMessage(e)
      } finally {
        this.formSaving = false
      }
    },

    // ══ EXCEL IMPORT ══
    async handleExcelImport(e) {
      this.importError = null
      const file = e.target.files[0]
      if (!file) return
      try {
        const data = await file.arrayBuffer()
        const wb = XLSX.read(data)
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws)

        for (const row of rows) {
          const accSearch = String(row['Account'] || '').trim()
          const mbSearch = String(row['Master Budget'] || '').trim()
          const tipeName = String(row['Tipe Budget'] || '').trim()
          const currCode = String(row['Currency'] || 'IDR').trim()

          let accountElement = '', accIdentifier = ''
          if (accSearch) {
            try {
              const accs = await fetchAccountElements(accSearch)
              if (accs.length) {
                accountElement = accs[0].id
                const code = accs[0].searchKey || accs[0].value || ''
                accIdentifier = code ? `${code} - ${accs[0].name}` : accs[0].name
              }
            } catch (apiErr) {
              this.showApiErrorDialog(apiErr, `Gagal mencari Account Element "${accSearch}"`)
              if (this.$refs.excelInput) this.$refs.excelInput.value = ''
              return
            }
          }

          let mbId = '', mbIdentifier = ''
          if (mbSearch) {
            const mbs = await fetchMasterBudget(mbSearch)
            if (mbs.length) { 
                mbId = mbs[0].id
                const mbCode = mbs[0].searchKey || mbs[0].value || ''
                mbIdentifier = mbCode ? `${mbCode} - ${mbs[0].name}` : mbs[0].name
            }
          }

          const tipe = this.tipeBudgets.find(t => t.name?.toLowerCase() === tipeName.toLowerCase())
          const cur = this.currencies.find(c => c.iSOCode?.toLowerCase() === currCode.toLowerCase())

          this.lines.push({
            _id: null,
            accountElement,
            'accountElement$_identifier': accIdentifier,
            cbudMasterbudget: mbId,
            'cbudMasterbudget$_identifier': mbIdentifier,
            cbudTipebudget: tipe?.id || '',
            currency: cur?.id || DEFAULT_CURRENCY,
            amount: row['Amount'] ?? '',
            quantity: row['Qty'] ?? 0,
            period: '',
            description: String(row['Description'] || '').trim(),
          })
        }
        this.showToast('success', `${rows.length} line(s) imported from Excel.`)
      } catch (err) {
        this.importError = this.extractErrorMessage(err, 'Gagal membaca file Excel')
      } finally {
        if (this.$refs.excelInput) this.$refs.excelInput.value = ''
      }
    },

    // ══ ACCOUNT ELEMENT COMBOBOX ══
    openAccDropdown(idx) {
      this.accDropdownOpen = idx
      this.accOptions = []
      this.onAccSearch(idx, this.lines[idx]?.['accountElement$_identifier'] || '')
    },
    onAccSearch(idx, val) {
      if (this.lines[idx]) this.lines[idx]['accountElement$_identifier'] = val
      clearTimeout(this.accTimer)
      this.accSearching = true
      this.accTimer = setTimeout(async () => {
        try {
          this.accOptions = await fetchAccountElements(val)
        } catch (e) {
          this.showApiErrorDialog(e, 'Gagal mencari Account Element')
          this.accOptions = []
        } finally { this.accSearching = false }
      }, 300)
    },
    selectAcc(idx, opt) {
      if (this.lines[idx]) {
        // Fallback untuk mapping kode akun: di openbravo pake searchKey
        const code = opt.searchKey || opt.value || '' 
        this.lines[idx].accountElement = opt.id
        this.lines[idx]['accountElement$_identifier'] = code ? `${code} - ${opt.name}` : opt.name
      }
      this.accDropdownOpen = null
    },

    // ══ MASTER BUDGET COMBOBOX (line) ══
    openMasterBudgetDropdown(idx) {
      this.mbDropdownOpen = idx
      this.mbOptions = []
      this.onMasterBudgetSearch(idx, this.lines[idx]?.['cbudMasterbudget$_identifier'] || '')
    },
    onMasterBudgetSearch(idx, val) {
      if (this.lines[idx]) this.lines[idx]['cbudMasterbudget$_identifier'] = val
      clearTimeout(this.mbTimer)
      this.mbTimer = setTimeout(async () => {
        try {
          this.mbOptions = await fetchMasterBudget(val)
        } catch (e) {
          this.mbOptions = []
        }
      }, 300)
    },
    selectMasterBudget(idx, opt) {
      if (this.lines[idx]) {
        const code = opt.searchKey || opt.value || ''
        this.lines[idx].cbudMasterbudget = opt.id
        this.lines[idx]['cbudMasterbudget$_identifier'] = code ? `${code} - ${opt.name}` : opt.name
      }
      this.mbDropdownOpen = null
    },

    // ══ VIEW MODAL ══
    async openViewModal(row) {
      this.openDropdown = null
      this.viewData = row
      this.viewLines = []
      this.viewLineSortCol = null
      this.viewLinesLoading = true
      this.showViewModal = true
      try {
        this.viewLines = await fetchBudgetLines(row.id)
      } catch (e) {
        this.showApiErrorDialog(e, 'Gagal memuat budget lines')
      } finally { this.viewLinesLoading = false }
    },

    closeViewModal() { this.showViewModal = false },

    toggleViewLineSort(col) {
      if (this.viewLineSortCol === col) this.viewLineSortDir = this.viewLineSortDir === 'asc' ? 'desc' : 'asc'
      else { this.viewLineSortCol = col; this.viewLineSortDir = 'asc' }
    },

    // Open edit modal from view modal (with "Add Line" behaviour = open edit)
    async openEditFromView() {
      const row = this.viewData
      if (!row) return
      this.closeViewModal()
      await this.openEditModal(row)
      // Scroll to lines section
      this.$nextTick(() => {
        const el = this.$el.querySelector('.lines-section')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    },

    // ══ DELETE BUDGET ══
    confirmDelete(row) {
      this.openDropdown = null
      this.deleteTarget = row
      this.showDeleteModal = true
    },
    async doDelete() {
      this.deleting = true
      try {
        await deleteBudget(this.deleteTarget.id)
        this.showDeleteModal = false
        this.showToast('success', 'Budget deleted.')
        await this.loadList()
      } catch (e) {
        this.showDeleteModal = false
        this.showApiErrorDialog(e, 'Gagal menghapus budget')
      } finally { this.deleting = false }
    },

    // ══ ERROR HELPERS ══
    extractErrorMessage(e, fallback = 'Terjadi kesalahan') {
      if (e?.response) {
        const resp = e.response
        const serverMsg = resp.data?.response?.error?.message || resp.data?.message || resp.data?.error
        if (serverMsg) return serverMsg
        return `${fallback}: HTTP ${resp.status} ${resp.statusText}`
      }
      return e?.message || fallback
    },

    showApiErrorDialog(e, title = 'API Error') {
      let message = this.extractErrorMessage(e, title)
      let detail = '', status = null, endpoint = ''
      if (e?.response) {
        status = e.response.status
        endpoint = e.config?.url || ''
        const raw = e.response.data
        if (raw && typeof raw === 'object') detail = JSON.stringify(raw, null, 2)
      } else if (e?.message) {
        detail = e.stack || ''
      }
      this.apiErrorDialog = { show: true, title, message, detail, status, endpoint }
    },

    formatNumber(val) {
      if (val == null || val === '') return '—'
      return Number(val).toLocaleString('id-ID')
    },

    showToast(type, message) {
      this.toast = { show: true, type, message }
      setTimeout(() => { this.toast.show = false }, 3500)
    },
  },
}
</script>


<style scoped>
/* ── CSS Variables ── */
:root, * {
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --accent: #2563eb;
  --accent-light: #eff6ff;
  --danger: #dc2626;
  --surface: #ffffff;
  --surface2: #f8fafc;
  --border: #e2e8f0;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --radius-sm: 6px;
  --radius: 10px;
  --shadow-md: 0 4px 16px rgba(0,0,0,.10);
}

/* ── Layout ── */
.layout { display: flex; min-height: 100vh; background: #f1f5f9; font-family: var(--font); }
.main { flex: 1; padding: 28px 32px; }
.content-card { background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); box-shadow: 0 1px 4px rgba(0,0,0,.04); padding: 28px; }
.page-header { margin-bottom: 16px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }

/* ── Page Tabs ── */
.page-tabs { display: flex; gap: 0; border-bottom: 2px solid var(--border); margin-bottom: 20px; }
.page-tab { padding: 10px 20px; font-size: 13.5px; font-weight: 600; color: var(--text-secondary); background: none; border: none; cursor: pointer; font-family: var(--font); border-bottom: 2px solid transparent; margin-bottom: -2px; transition: color .15s, border-color .15s; }
.page-tab:hover { color: var(--accent); }
.page-tab--active { color: var(--accent); border-bottom-color: var(--accent); }

/* ── Toolbar ── */
.toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
.search-wrap { position: relative; flex: 1; max-width: 360px; }
.search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
.search-input { width: 100%; height: 36px; padding: 0 12px 0 34px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; font-family: var(--font); color: var(--text-primary); background: var(--surface2); }
.search-input:focus { border-color: var(--accent); background: #fff; }

/* ── Buttons ── */
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 0 14px; height: 34px; border-radius: var(--radius-sm); font-size: 12.5px; font-weight: 600; border: none; cursor: pointer; font-family: var(--font); transition: background .12s; }
.btn--primary { background: var(--accent); color: #fff; }
.btn--primary:hover:not(:disabled) { background: #1d4ed8; }
.btn--ghost { background: transparent; color: var(--text-secondary); border: 1px solid var(--border); }
.btn--ghost:hover { background: var(--surface2); }
.btn--danger { background: var(--danger); color: #fff; }
.btn--danger:hover:not(:disabled) { background: #b91c1c; }
.btn:disabled { opacity: .55; cursor: not-allowed; }

/* ── Table ── */
.table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius-sm); }
.table-scroll { overflow-x: auto; margin-top: 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); max-height: 380px; overflow-y: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th { background: var(--surface2); padding: 10px 14px; text-align: left; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); border-bottom: 1px solid var(--border); white-space: nowrap; }
.table td { padding: 10px 14px; border-bottom: 1px solid var(--border); color: var(--text-primary); }
.tr-data:last-child td { border-bottom: none; }
.tr-data:hover { background: #f8fafc; }

/* ── Sorting (CustomerInvoice style: CSS ::before/::after arrows) ── */
.sortable, .sortable-line {
  cursor: pointer;
  user-select: none;
  position: relative;
  padding-right: 20px !important;
  transition: color 0.15s;
}
.sortable:hover, .sortable-line:hover { color: var(--text-primary); }
.sortable::after, .sortable::before,
.sortable-line::after, .sortable-line::before {
  content: '';
  position: absolute;
  right: 6px;
  top: 50%;
  border: 4px solid transparent;
  opacity: 0.3;
}
.sortable::before, .sortable-line::before {
  border-bottom-color: currentColor;
  margin-top: -9px;
}
.sortable::after, .sortable-line::after {
  border-top-color: currentColor;
  margin-top: 1px;
}
.sortable.asc::before, .sortable-line.asc::before { opacity: 1; color: var(--accent); }
.sortable.desc::after, .sortable-line.desc::after { opacity: 1; color: var(--accent); }

.th-action { text-align: center; }
.td-secondary { color: var(--text-secondary); }
.td-empty { text-align: center; padding: 32px; color: var(--text-muted); font-style: italic; font-size: 13px; }
.td-error { color: var(--danger); }
.td-clip { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.td-name { font-weight: 500; }
.td-action-cell { text-align: center; }
.td-num { text-align: right; font-variant-numeric: tabular-nums; }
.text-center { text-align: center; }

.code-badge { font-family: var(--font-mono); font-size: 11.5px; font-weight: 500; background: var(--surface2); border: 1px solid var(--border); padding: 3px 8px; border-radius: 4px; color: var(--text-secondary); white-space: nowrap; }

/* ── Loading dots ── */
.loading-dots { display: inline-flex; gap: 5px; }
.loading-dots span { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); animation: bounce .7s infinite alternate; }
.loading-dots span:nth-child(2) { animation-delay: .2s; }
.loading-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes bounce { to { transform: translateY(-5px); opacity: .5; } }

/* ── Pagination ── */
.pagination { display: flex; align-items: center; justify-content: center; gap: 4px; margin-top: 20px; }
.page-btn { width: 34px; height: 34px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary); font-size: 13px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-family: var(--font); transition: background .12s, border-color .12s; }
.page-btn:hover:not(:disabled) { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
.page-btn--active { background: var(--accent); color: #fff; border-color: var(--accent); }
.page-btn:disabled { opacity: .45; cursor: not-allowed; }
.page-ellipsis { padding: 0 4px; color: var(--text-muted); font-size: 13px; }

/* ── Action dropdown ── */
.action-group { display: flex; align-items: center; justify-content: center; gap: 5px; }
.dropdown-wrap { position: relative; }
.action-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); cursor: pointer; color: var(--text-secondary); transition: background .1s; }
.action-btn--more:hover { background: var(--surface2); }
.dropdown-menu { position: fixed; z-index: 500; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); min-width: 140px; padding: 4px 0; }
.dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 14px; font-size: 12.5px; color: var(--text-primary); background: none; border: none; cursor: pointer; font-family: var(--font); }
.dropdown-item:hover { background: var(--surface2); }
.dropdown-item--danger { color: var(--danger); }
.dropdown-item--danger:hover { background: #fff1f2; }

/* ── Bool pill ── */
.bool-pill { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.bool-pill--yes { background: #dcfce7; color: #16a34a; }
.bool-pill--no { background: #f1f5f9; color: var(--text-muted); }

/* ── Modal ── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 400; display: flex; align-items: flex-start; justify-content: center; padding: 24px 16px; overflow-y: auto; }
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: 0 20px 60px rgba(0,0,0,.2); width: 100%; display: flex; flex-direction: column; max-height: calc(100vh - 48px); overflow: hidden; }
.modal--sm { max-width: 480px; }
.modal--xl { max-width: 900px; }
.modal--fullwidth { max-width: calc(100vw - 48px); }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.modal-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0; display: flex; align-items: center; }
.modal-title--danger { color: var(--danger); }
.modal-close { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; border: none; background: none; cursor: pointer; color: var(--text-muted); }
.modal-close:hover { background: var(--surface2); }
.modal-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; flex-shrink: 0; }

/* ── Form ── */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group--full { grid-column: 1 / -1; }
.form-group--checkbox { align-items: flex-start; justify-content: center; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-input { width: 100%; height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.form-input:focus { border-color: var(--accent); background: #fff; }
.form-input--sm { height: 32px; font-size: 12.5px; }
.form-textarea { height: auto; padding: 8px 12px; resize: vertical; }
.checkbox-label { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 500; color: var(--text-primary); padding-top: 20px; }
.checkbox-input { width: 15px; height: 15px; cursor: pointer; accent-color: var(--accent); }
.req { color: var(--danger); }
.form-api-error { margin-top: 14px; padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; }

/* ── Section ── */
.section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--accent); margin-bottom: 14px; padding-bottom: 8px; border-bottom: 2px solid var(--accent-light); }
.section-divider { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin: 20px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.lines-section { margin-top: 8px; }

/* ── Line Table Buttons ── */
.btn-add-line { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--accent); background: var(--accent-light); border: 1px solid #bfdbfe; border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-family: var(--font); transition: background .12s; }
.btn-add-line:hover { background: #dbeafe; }
.btn-import-excel { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: #16a34a; background: #dcfce7; border: 1px solid #bbf7d0; border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-family: var(--font); transition: background .12s; }
.btn-import-excel:hover { background: #bbf7d0; }
.btn-rm-line { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: #fee2e2; color: var(--danger); border: none; cursor: pointer; }
.btn-rm-line:hover { background: #fecaca; }
.table--lines { table-layout: fixed; min-width: 1100px; }
.table--lines th, .table--lines td { padding: 8px 10px; vertical-align: middle; }
.table--view { table-layout: auto; min-width: 900px; }

/* ── Import Error Banner ── */
.error-banner { display: flex; align-items: flex-start; gap: 12px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); padding: 12px 14px; margin-bottom: 12px; }
.error-banner__icon { color: var(--danger); flex-shrink: 0; margin-top: 1px; }
.error-banner__body { flex: 1; }
.error-banner__title { font-size: 12.5px; font-weight: 700; color: var(--danger); margin-bottom: 2px; }
.error-banner__message { font-size: 12.5px; color: #991b1b; line-height: 1.5; }
.error-banner__close { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; border: none; background: none; cursor: pointer; color: #991b1b; flex-shrink: 0; }
.error-banner__close:hover { background: #fecaca; }

/* ── API Error Dialog ── */
.error-dialog-body { display: flex; flex-direction: column; gap: 14px; }
.error-dialog-msg { font-size: 13.5px; color: var(--text-primary); line-height: 1.6; }
.error-dialog-detail { background: #f8fafc; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 12px; }
.error-dialog-detail-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin-bottom: 6px; }
.error-dialog-code { font-family: var(--font-mono); font-size: 11.5px; color: var(--text-secondary); white-space: pre-wrap; word-break: break-all; max-height: 180px; overflow-y: auto; margin: 0; }
.error-dialog-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.error-badge { display: inline-block; padding: 2px 8px; background: #fee2e2; color: var(--danger); border-radius: 20px; font-size: 11.5px; font-weight: 700; font-family: var(--font-mono); }
.error-endpoint { font-size: 11.5px; color: var(--text-muted); font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300px; }

/* ── Combobox ── */
.acc-wrap { position: relative; width: 100%; }
.acc-input { display: block; width: 100%; height: 32px; padding: 0 28px 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 12.5px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.acc-input:focus { border-color: var(--accent); background: #fff; }
.acc-chevron { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.acc-dropdown { position: absolute; z-index: 600; top: calc(100% + 3px); left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); max-height: 200px; overflow-y: auto; list-style: none; margin: 0; padding: 4px 0; }
.acc-opt { padding: 7px 12px; font-size: 12.5px; color: var(--text-primary); cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.acc-opt:hover { background: var(--accent-light); }
.acc-empty { padding: 8px 12px; font-size: 12.5px; color: var(--text-muted); font-style: italic; list-style: none; }

/* ── Detail view ── */
.detail-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-item--full { grid-column: 1 / -1; }
.detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.detail-value { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }

/* ── Delete modal ── */
.delete-text { font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); }
.delete-text strong { color: var(--text-primary); }

/* ── Toast ── */
.toast { position: fixed; bottom: 24px; right: 24px; z-index: 2000; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); }
.toast--success { background: #16a34a; color: #fff; }
.toast--error { background: var(--danger); color: #fff; }

/* ── Spinner ── */
.spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Fade transition ── */
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>