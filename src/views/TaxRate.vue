<template>
  <div class="layout">
    <main class="main">
      <div class="content-card">

        <div class="page-header">
          <h2 class="page-title">Tax Rate</h2>
        </div>

        <!-- ══ TOOLBAR ══ -->
        <div class="toolbar">
          <div class="toolbar-left">
            <div class="search-wrap">
              <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input v-model="searchQuery" class="search-input" placeholder="Search tax name..." @input="onSearch" />
            </div>
            <select v-model="filterCategory" class="filter-select" @change="onSearch">
              <option value="">All Categories</option>
              <option v-for="tc in taxCategories" :key="tc.id" :value="tc.id">{{ tc.name }}</option>
            </select>
          </div>
          <div class="toolbar-right">
            <button class="btn btn--secondary" @click="openTaxCategoryModal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2z"/><path d="M7 7h.01"/></svg>
              Tax Category
            </button>
            <button class="btn btn--primary" @click="openCreateModal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Create Tax Rate
            </button>
          </div>
        </div>

        <!-- ══ TABLE ══ -->
        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th>Name</th>
              <th>Rate (%)</th>
              <th>Valid From</th>
              <th>Tax Category</th>
              <th>Sales/Purchase</th>
              <th>Country</th>
              <th>Base Amount</th>
              <th class="th-action">Action</th>
            </tr></thead>
            <tbody>
              <tr v-if="loading"><td colspan="8" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
              <tr v-else-if="error"><td colspan="8" class="td-empty td-error">{{ error }}</td></tr>
              <tr v-else-if="rows.length === 0"><td colspan="8" class="td-empty">No tax rates found.</td></tr>
              <template v-else>
                <tr v-for="r in rows" :key="r.id" class="tr-data">
                  <td class="td-name">{{ r.name }}</td>
                  <td><span class="rate-badge">{{ r.rate }}%</span></td>
                  <td class="td-secondary">{{ formatDate(r.validFromDate) }}</td>
                  <td class="td-secondary">{{ r['taxCategory$_identifier'] || '—' }}</td>
                  <td><span :class="['sptype-pill', spTypeClass(r.salesPurchaseType)]">{{ spTypeLabel(r.salesPurchaseType) }}</span></td>
                  <td class="td-secondary">{{ r['country$_identifier'] || '—' }}</td>
                  <td class="td-secondary">{{ baseAmountLabel(r.baseAmount) }}</td>
                  <td class="td-action-cell">
                    <div class="action-group">
                      <div class="dropdown-wrap">
                        <button class="action-btn action-btn--more" @click.stop="toggleDropdown(r.id, $event)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                        <teleport to="body">
                          <div v-if="openDropdown === r.id" class="dropdown-menu dropdown-menu--fixed" :style="{ top: dropdownPos.top + 'px', right: dropdownPos.right + 'px' }">
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
                        </teleport>
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

    <!-- ═══════════════════════════════════════════════ -->
    <!-- CREATE / EDIT MODAL                             -->
    <!-- ═══════════════════════════════════════════════ -->
    <transition name="fade">
      <div v-if="showFormModal" class="modal-overlay" @mousedown.self="closeFormModal">
        <div class="modal modal--xl">

          <!-- Header -->
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Tax Rate</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">{{ isEdit ? 'Edit' : 'Create' }} Tax Rate</span>
              </div>
              <div class="modal-title">{{ isEdit ? 'Edit' : 'Create' }} Tax Rate</div>
            </div>
            <button class="modal-close" @click="closeFormModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Tabs -->
          <div class="modal-tabs">
            <button :class="['modal-tab', activeFormTab === 'main' ? 'modal-tab--active' : '']" @click="activeFormTab = 'main'">Tax Rate</button>
            <button :class="['modal-tab', activeFormTab === 'accounting' ? 'modal-tab--active' : '']" @click="activeFormTab = 'accounting'">Accounting</button>
            <button :class="['modal-tab', activeFormTab === 'zone' ? 'modal-tab--active' : '']" @click="activeFormTab = 'zone'">Tax Zone</button>
          </div>

          <!-- Body -->
          <div class="modal-body">

            <!-- ── Main Tab ── -->
            <div v-if="activeFormTab === 'main'">
              <div class="form-grid-4">

                <div class="form-group">
                  <label>Name <span class="req">*</span></label>
                  <input v-model="form.name" class="form-input" placeholder="Tax rate name" />
                </div>

                <div class="form-group">
                  <label>Rate (%) <span class="req">*</span></label>
                  <input v-model.number="form.rate" type="number" min="0" max="100" class="form-input" placeholder="0" />
                </div>

                <div class="form-group">
                  <label>Valid From Date <span class="req">*</span></label>
                  <input v-model="form.validFromDate" type="date" class="form-input" />
                </div>

                <div class="form-group">
                  <label>Tax Category <span class="req">*</span></label>
                  <div class="acc-wrap">
                    <input v-model="taxCategorySearch" class="acc-input" placeholder="Select category..." @input="onTaxCategorySearch" @focus="showTaxCategoryDrop = true" @blur="onTaxCategoryBlur" />
                    <svg class="acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                    <ul v-if="showTaxCategoryDrop && filteredTaxCategories.length" class="acc-dropdown">
                      <li v-for="c in filteredTaxCategories" :key="c.id" class="acc-opt" @mousedown.prevent="selectTaxCategory(c)">{{ c.name }}</li>
                    </ul>
                    <ul v-else-if="showTaxCategoryDrop && taxCategorySearch.length > 0 && !filteredTaxCategories.length" class="acc-dropdown">
                      <li class="acc-empty">No category found</li>
                    </ul>
                  </div>
                </div>

                <div class="form-group">
                  <label>Sales/Purchase Type <span class="req">*</span></label>
                  <select v-model="form.salesPurchaseType" class="form-input">
                    <option value="B">Both</option>
                    <option value="S">Sales Tax</option>
                    <option value="P">Purchase Tax</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Base Amount <span class="req">*</span></label>
                  <select v-model="form.baseAmount" class="form-input">
                    <option value="LNA">Line Net Amount</option>
                    <option value="TBA">Tax Base Amount</option>
                    <option value="LNATAX">Line Net Amount + Tax Amount</option>
                    <option value="TBATAX">Tax Base Amount + Tax Amount</option>
                    <option value="TAX">Tax Amount</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Document Tax Amount Calc <span class="req">*</span></label>
                  <select v-model="form.docTaxAmount" class="form-input">
                    <option value="D">Document based amount by rate</option>
                    <option value="L">Line based amount by rate</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Country</label>
                  <div class="acc-wrap">
                    <input v-model="countrySearch" class="acc-input" placeholder="Search country..." @input="onCountrySearch" @focus="showCountryDrop = true" @blur="onCountryBlur" />
                    <svg class="acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                    <ul v-if="showCountryDrop && filteredCountries.length" class="acc-dropdown">
                      <li v-for="c in filteredCountries" :key="c.id" class="acc-opt" @mousedown.prevent="selectCountry(c)">{{ c.name }}</li>
                    </ul>
                    <ul v-else-if="showCountryDrop && countrySearch.length > 1 && !filteredCountries.length" class="acc-dropdown">
                      <li class="acc-empty">No country found</li>
                    </ul>
                  </div>
                </div>

                <div class="form-group">
                  <label>Destination Country</label>
                  <div class="acc-wrap">
                    <input v-model="destCountrySearch" class="acc-input" placeholder="Search country..." @input="onDestCountrySearch" @focus="showDestCountryDrop = true" @blur="onDestCountryBlur" />
                    <svg class="acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                    <ul v-if="showDestCountryDrop && filteredDestCountries.length" class="acc-dropdown">
                      <li v-for="c in filteredDestCountries" :key="c.id" class="acc-opt" @mousedown.prevent="selectDestCountry(c)">{{ c.name }}</li>
                    </ul>
                  </div>
                </div>

                <div class="form-group">
                  <label>Line No</label>
                  <input v-model.number="form.lineNo" type="number" min="0" class="form-input" placeholder="10" />
                </div>

                <div class="form-group form-group--full">
                  <label>Description</label>
                  <input v-model="form.description" class="form-input" placeholder="Description (optional)" />
                </div>

                <div class="form-group">
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="form.summaryLevel" class="checkbox-input" />
                    Summary Level
                  </label>
                </div>

                <div class="form-group">
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="form.default" class="checkbox-input" />
                    Default
                  </label>
                </div>

                <div class="form-group">
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="form.taxExempt" class="checkbox-input" />
                    Tax Exempt
                  </label>
                </div>

                <div class="form-group">
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="form.cascade" class="checkbox-input" />
                    Cascade
                  </label>
                </div>

              </div>
            </div>

            <!-- ── Accounting Tab ── -->
            <div v-if="activeFormTab === 'accounting'">
              <div v-if="!isEdit" class="td-empty" style="padding:32px">
                Save the Tax Rate first to configure accounting entries.
              </div>
              <div v-else>
                <div v-if="accountingLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>
                <div v-else>
                  <p class="acc-info-text">Configure General Ledger accounts for tax due and tax credit.</p>
                  <div class="table-wrap" style="margin-bottom:0">
                    <table class="table">
                      <thead><tr>
                        <th>Organization</th>
                        <th>Tax Due (GL)</th>
                        <th>Tax Credit (GL)</th>
                      </tr></thead>
                      <tbody>
                        <tr v-if="accountingRows.length === 0"><td colspan="3" class="td-empty">No accounting entries found.</td></tr>
                        <tr v-for="acc in accountingRows" :key="acc.id">
                          <td class="td-secondary">{{ acc['organization$_identifier'] || '—' }}</td>
                          <td>
                            <div class="acc-wrap">
                              <input
                                v-model="acc.taxDueSearch"
                                class="acc-input acc-input--sm"
                                placeholder="Search GL account..."
                                @input="() => onGLSearch(acc, 'taxDue')"
                                @focus="() => { acc.showTaxDueDrop = true }"
                                @blur="() => onGLBlur(acc, 'taxDue')"
                              />
                              <ul v-if="acc.showTaxDueDrop && acc.taxDueOptions?.length" class="acc-dropdown">
                                <li v-for="g in acc.taxDueOptions" :key="g.id" class="acc-opt" @mousedown.prevent="selectGL(acc, 'taxDue', g)">
                                  <span class="gl-code">{{ g.value }}</span> — {{ g.name }}
                                </li>
                              </ul>
                            </div>
                          </td>
                          <td>
                            <div class="acc-wrap">
                              <input
                                v-model="acc.taxCreditSearch"
                                class="acc-input acc-input--sm"
                                placeholder="Search GL account..."
                                @input="() => onGLSearch(acc, 'taxCredit')"
                                @focus="() => { acc.showTaxCreditDrop = true }"
                                @blur="() => onGLBlur(acc, 'taxCredit')"
                              />
                              <ul v-if="acc.showTaxCreditDrop && acc.taxCreditOptions?.length" class="acc-dropdown">
                                <li v-for="g in acc.taxCreditOptions" :key="g.id" class="acc-opt" @mousedown.prevent="selectGL(acc, 'taxCredit', g)">
                                  <span class="gl-code">{{ g.value }}</span> — {{ g.name }}
                                </li>
                              </ul>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div style="margin-top:12px;display:flex;justify-content:flex-end">
                    <button class="btn btn--primary" :disabled="savingAccounting" @click="saveAccounting">
                      <span v-if="savingAccounting" class="spinner"></span>
                      {{ savingAccounting ? 'Saving...' : 'Save Accounting' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- ── Zone Tab ── -->
            <div v-if="activeFormTab === 'zone'">
              <div v-if="!isEdit" class="td-empty" style="padding:32px">
                Save the Tax Rate first to configure tax zones.
              </div>
              <div v-else>
                <div v-if="zonesLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>
                <div v-else>
                  <div class="table-wrap" style="margin-bottom:0">
                    <table class="table">
                      <thead><tr>
                        <th>Organization</th>
                        <th>Tax Zone</th>
                        <th>Country</th>
                      </tr></thead>
                      <tbody>
                        <tr v-if="zoneRows.length === 0"><td colspan="3" class="td-empty">No tax zones configured. Tax zones are optional.</td></tr>
                        <tr v-for="z in zoneRows" :key="z.id">
                          <td class="td-secondary">{{ z['organization$_identifier'] || '—' }}</td>
                          <td class="td-secondary">{{ z['_identifier'] || z.id }}</td>
                          <td class="td-secondary">{{ z['country$_identifier'] || '—' }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <!-- API Error -->
            <div v-if="formError" class="form-api-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ formError }}
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="closeFormModal">Cancel</button>
            <button v-if="activeFormTab === 'main'" class="btn btn--primary" :disabled="formSaving" @click="submitForm">
              <span v-if="formSaving" class="spinner"></span>
              {{ formSaving ? 'Saving...' : (isEdit ? 'Update' : 'Create') }}
            </button>
          </div>

        </div>
      </div>
    </transition>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- VIEW MODAL                                      -->
    <!-- ═══════════════════════════════════════════════ -->
    <transition name="fade">
      <div v-if="showViewModal" class="modal-overlay" @mousedown.self="closeViewModal">
        <div class="modal modal--lg">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Tax Rate</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">Detail</span>
              </div>
              <div class="modal-title">{{ viewData?.name }}</div>
            </div>
            <button class="modal-close" @click="closeViewModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="modal-tabs">
            <button :class="['modal-tab', activeViewTab === 'main' ? 'modal-tab--active' : '']" @click="activeViewTab = 'main'">Tax Rate</button>
            <button :class="['modal-tab', activeViewTab === 'accounting' ? 'modal-tab--active' : '']" @click="activeViewTab = 'accounting'; loadViewAccounting()">Accounting</button>
            <button :class="['modal-tab', activeViewTab === 'translations' ? 'modal-tab--active' : '']" @click="activeViewTab = 'translations'; loadViewTranslations()">Translations</button>
          </div>

          <div class="modal-body">
            <!-- Main detail -->
            <div v-if="activeViewTab === 'main' && viewData">
              <div class="detail-grid">
                <div class="detail-item">
                  <div class="detail-label">Name</div>
                  <div class="detail-value">{{ viewData.name }}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Rate</div>
                  <div class="detail-value"><span class="rate-badge">{{ viewData.rate }}%</span></div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Valid From Date</div>
                  <div class="detail-value">{{ formatDate(viewData.validFromDate) }}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Tax Category</div>
                  <div class="detail-value">{{ viewData['taxCategory$_identifier'] || '—' }}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Sales/Purchase Type</div>
                  <div class="detail-value"><span :class="['sptype-pill', spTypeClass(viewData.salesPurchaseType)]">{{ spTypeLabel(viewData.salesPurchaseType) }}</span></div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Country</div>
                  <div class="detail-value">{{ viewData['country$_identifier'] || '—' }}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Destination Country</div>
                  <div class="detail-value">{{ viewData['destinationCountry$_identifier'] || '—' }}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Base Amount</div>
                  <div class="detail-value">{{ baseAmountLabel(viewData.baseAmount) }}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Doc Tax Amount Calc</div>
                  <div class="detail-value">{{ docTaxAmountLabel(viewData.docTaxAmount) }}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Summary Level</div>
                  <div class="detail-value">{{ viewData.summaryLevel ? 'Yes' : 'No' }}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Tax Exempt</div>
                  <div class="detail-value">{{ viewData.taxExempt ? 'Yes' : 'No' }}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Line No</div>
                  <div class="detail-value">{{ viewData.lineNo || '—' }}</div>
                </div>
                <div v-if="viewData.description" class="detail-item detail-item--full">
                  <div class="detail-label">Description</div>
                  <div class="detail-value">{{ viewData.description }}</div>
                </div>
              </div>
            </div>

            <!-- Accounting detail -->
            <div v-if="activeViewTab === 'accounting'">
              <div v-if="viewAccountingLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>
              <div v-else class="table-wrap" style="margin-bottom:0">
                <table class="table">
                  <thead><tr>
                    <th>Organization</th>
                    <th>Tax Due</th>
                    <th>Tax Credit</th>
                  </tr></thead>
                  <tbody>
                    <tr v-if="viewAccountingRows.length === 0"><td colspan="3" class="td-empty">No accounting entries found.</td></tr>
                    <tr v-for="acc in viewAccountingRows" :key="acc.id">
                      <td class="td-secondary">{{ acc['organization$_identifier'] || '—' }}</td>
                      <td class="td-secondary">{{ acc['taxDue$_identifier'] || '—' }}</td>
                      <td class="td-secondary">{{ acc['taxCredit$_identifier'] || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Translations detail -->
            <div v-if="activeViewTab === 'translations'">
              <div v-if="viewTranslationsLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>
              <div v-else class="table-wrap" style="margin-bottom:0">
                <table class="table">
                  <thead><tr>
                    <th>Language</th>
                    <th>Name</th>
                    <th>Translated</th>
                  </tr></thead>
                  <tbody>
                    <tr v-if="viewTranslationRows.length === 0"><td colspan="3" class="td-empty">No translations found.</td></tr>
                    <tr v-for="t in viewTranslationRows" :key="t.id">
                      <td class="td-secondary">{{ t['language$_identifier'] || t.language }}</td>
                      <td class="td-secondary">{{ t.name || '—' }}</td>
                      <td><span :class="['bool-pill', t.translation ? 'bool-pill--yes' : 'bool-pill--no']">{{ t.translation ? 'Yes' : 'No' }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn--ghost" @click="closeViewModal">Close</button>
            <button class="btn btn--primary" @click="openEditFromView">Edit</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- TAX CATEGORY MODAL                              -->
    <!-- ═══════════════════════════════════════════════ -->
    <transition name="fade">
      <div v-if="showTaxCategoryModal" class="modal-overlay" @mousedown.self="closeTaxCategoryModal">
        <div class="modal modal--md">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb"><span>Tax Category</span></div>
              <div class="modal-title">Manage Tax Categories</div>
            </div>
            <button class="modal-close" @click="closeTaxCategoryModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="modal-body">
            <!-- Category list -->
            <div class="table-wrap" style="margin-bottom:16px">
              <table class="table">
                <thead><tr>
                  <th>Name</th>
                  <th>Default</th>
                  <th class="th-action">Action</th>
                </tr></thead>
                <tbody>
                  <tr v-if="tcLoading"><td colspan="3" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
                  <tr v-else-if="taxCategories.length === 0"><td colspan="3" class="td-empty">No tax categories found.</td></tr>
                  <tr v-for="tc in taxCategories" :key="tc.id" class="tr-data">
                    <td>{{ tc.name }}</td>
                    <td><span v-if="tc.default" class="bool-pill bool-pill--yes">Default</span></td>
                    <td class="td-action-cell">
                      <div class="action-group">
                        <button class="action-btn" @click="editTaxCategory(tc)" title="Edit">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="action-btn action-btn--danger" @click="deleteTaxCategoryConfirm(tc)" title="Delete">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Add/Edit form inline -->
            <div class="tc-form-card">
              <div class="tc-form-title">{{ tcFormEdit ? 'Edit Category' : 'Add New Category' }}</div>
              <div class="form-grid-3">
                <div class="form-group">
                  <label>Name <span class="req">*</span></label>
                  <input v-model="tcForm.name" class="form-input" placeholder="Category name" />
                </div>
                <div class="form-group">
                  <label>Description</label>
                  <input v-model="tcForm.description" class="form-input" placeholder="Optional" />
                </div>
                <div class="form-group" style="justify-content:flex-end">
                  <label class="checkbox-label" style="margin-top:auto;padding-bottom:6px">
                    <input type="checkbox" v-model="tcForm.default" class="checkbox-input" />
                    Default
                  </label>
                </div>
              </div>
              <div v-if="tcError" class="form-api-error" style="margin-top:8px">{{ tcError }}</div>
              <div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end">
                <button v-if="tcFormEdit" class="btn btn--ghost btn--sm" @click="cancelTcEdit">Cancel</button>
                <button class="btn btn--primary btn--sm" :disabled="tcSaving" @click="saveTaxCategory">
                  <span v-if="tcSaving" class="spinner"></span>
                  {{ tcSaving ? 'Saving...' : (tcFormEdit ? 'Update' : 'Add Category') }}
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn--ghost" @click="closeTaxCategoryModal">Close</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- DELETE CONFIRM MODAL                            -->
    <!-- ═══════════════════════════════════════════════ -->
    <transition name="fade">
      <div v-if="showDeleteModal" class="modal-overlay" @mousedown.self="showDeleteModal = false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <div class="modal-title">Confirm Delete</div>
            <button class="modal-close" @click="showDeleteModal = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-text">Are you sure you want to delete tax rate <strong>{{ deleteTarget?.name }}</strong>? This action cannot be undone.</p>
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
      <div v-if="toast.show" :class="['toast', toast.type === 'success' ? 'toast--success' : 'toast--error']">
        <svg v-if="toast.type === 'success'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ toast.msg }}
      </div>
    </transition>

  </div>
</template>

<script>
import {
  fetchTaxRates, fetchTaxRate, createTaxRate, updateTaxRate, deleteTaxRate,
  fetchTaxCategories, createTaxCategory, updateTaxCategory, deleteTaxCategory,
  fetchTaxAccounting, upsertTaxAccounting,
  fetchTaxTranslations, fetchTaxZones,
  fetchGLAccounts, fetchCountries,
} from '@/services/taxRate.js'

const PAGE_SIZE = 20

const defaultForm = () => ({
  name: '',
  rate: 0,
  validFromDate: '',
  taxCategory: '',
  salesPurchaseType: 'B',
  baseAmount: 'LNA',
  docTaxAmount: 'L',
  summaryLevel: false,
  default: false,
  taxExempt: false,
  cascade: false,
  lineNo: 10,
  description: '',
  country: '',
  destinationCountry: '',
  region: '',
  destinationRegion: '',
})

export default {
  name: 'TaxRateView',

  data() {
    return {
      // List
      rows: [],
      loading: false,
      error: null,
      searchQuery: '',
      filterCategory: '',
      currentPage: 1,
      totalRows: 0,

      // Dropdown
      openDropdown: null,
      dropdownPos: { top: 0, right: 0 },

      // Tax Categories (for filter + combobox)
      taxCategories: [],

      // Form modal
      showFormModal: false,
      isEdit: false,
      editId: null,
      activeFormTab: 'main',
      form: defaultForm(),
      formSaving: false,
      formError: null,

      // Tax category combobox in form
      taxCategorySearch: '',
      showTaxCategoryDrop: false,
      filteredTaxCategories: [],

      // Country combobox
      countrySearch: '',
      showCountryDrop: false,
      filteredCountries: [],
      destCountrySearch: '',
      showDestCountryDrop: false,
      filteredDestCountries: [],

      // Accounting tab
      accountingLoading: false,
      accountingRows: [],
      savingAccounting: false,

      // Zone tab
      zonesLoading: false,
      zoneRows: [],

      // View modal
      showViewModal: false,
      viewData: null,
      activeViewTab: 'main',
      viewAccountingLoading: false,
      viewAccountingRows: [],
      viewTranslationsLoading: false,
      viewTranslationRows: [],

      // Tax Category Modal
      showTaxCategoryModal: false,
      tcLoading: false,
      tcForm: { name: '', description: '', default: false },
      tcFormEdit: null,
      tcSaving: false,
      tcError: null,

      // Delete
      showDeleteModal: false,
      deleteTarget: null,
      deleting: false,

      // Toast
      toast: { show: false, msg: '', type: 'success' },
      toastTimer: null,
    }
  },

  computed: {
    totalPages() { return Math.ceil(this.totalRows / PAGE_SIZE) || 1 },
    pageNumbers() {
      const total = this.totalPages, cur = this.currentPage, pages = []
      if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i); return pages }
      pages.push(1)
      if (cur > 3) pages.push('...')
      for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i)
      if (cur < total - 2) pages.push('...')
      pages.push(total)
      return pages
    },
  },

  mounted() {
    this.loadTaxCategories()
    this.loadList()
    this._globalClick = (e) => { this.openDropdown = null }
    document.addEventListener('click', this._globalClick)
  },

  beforeUnmount() {
    document.removeEventListener('click', this._globalClick)
  },

  methods: {
    // ── Data loading ──
    async loadList() {
      this.loading = true; this.error = null
      try {
        const startRow = (this.currentPage - 1) * PAGE_SIZE
        const result = await fetchTaxRates({
          startRow,
          pageSize: PAGE_SIZE,
          searchKey: this.searchQuery,
          categoryId: this.filterCategory,
        })
        this.rows = result.data ?? []
        this.totalRows = result.totalRows ?? this.rows.length
      } catch (e) {
        this.error = e.response?.data?.response?.error?.message || e.message
      } finally {
        this.loading = false
      }
    },

    async loadTaxCategories() {
      try {
        const result = await fetchTaxCategories({ pageSize: 200 })
        this.taxCategories = result.data ?? []
      } catch (e) { console.warn('Failed to load tax categories', e) }
    },

    onSearch() { this.currentPage = 1; this.loadList() },
    goPage(p) { if (p >= 1 && p <= this.totalPages) { this.currentPage = p; this.loadList() } },

    // ── Formatters ──
    formatDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return d } },

    spTypeLabel(v) { return { B: 'Both', S: 'Sales', P: 'Purchase' }[v] || v || '—' },
    spTypeClass(v) { return { B: 'sptype--both', S: 'sptype--sales', P: 'sptype--purchase' }[v] || '' },

    baseAmountLabel(v) {
      return { LNA: 'Line Net Amount', TBA: 'Tax Base Amount', LNATAX: 'Line Net + Tax Amount', TBATAX: 'Tax Base + Tax Amount', TAX: 'Tax Amount' }[v] || v || '—'
    },
    docTaxAmountLabel(v) {
      return { D: 'Document based', L: 'Line based' }[v] || v || '—'
    },

    // ── Dropdown ──
    toggleDropdown(id, event) {
      event.stopPropagation()
      if (this.openDropdown === id) { this.openDropdown = null; return }
      const btn = event.currentTarget
      const rect = btn.getBoundingClientRect()
      // position:fixed → koordinat relatif ke viewport, tidak perlu scrollY
      this.dropdownPos = { top: rect.bottom + 4, right: window.innerWidth - rect.right }
      this.openDropdown = id
    },
    closeDropdown() { this.openDropdown = null },

    // ── Form Modal ──
    openCreateModal() {
      this.isEdit = false; this.editId = null
      this.form = defaultForm()
      this.taxCategorySearch = ''; this.countrySearch = ''; this.destCountrySearch = ''
      this.activeFormTab = 'main'; this.formError = null
      this.showFormModal = true
    },

    async openEditModal(row) {
      this.openDropdown = null
      this.isEdit = true; this.editId = row.id
      this.formError = null; this.activeFormTab = 'main'
      try {
        const full = await fetchTaxRate(row.id)
        const d = full || row
        this.form = {
          name: d.name || '',
          rate: d.rate ?? 0,
          validFromDate: d.validFromDate || '',
          taxCategory: d.taxCategory?.id || d.taxCategory || '',
          salesPurchaseType: d.salesPurchaseType || 'B',
          baseAmount: d.baseAmount || 'LNA',
          docTaxAmount: d.docTaxAmount || 'L',
          summaryLevel: d.summaryLevel ?? false,
          default: d.default ?? false,
          taxExempt: d.taxExempt ?? false,
          cascade: d.cascade ?? false,
          lineNo: d.lineNo ?? 10,
          description: d.description || '',
          country: d.country?.id || d.country || '',
          destinationCountry: d.destinationCountry?.id || d.destinationCountry || '',
          region: d.region?.id || d.region || '',
          destinationRegion: d.destinationRegion?.id || d.destinationRegion || '',
        }
        this.taxCategorySearch = d['taxCategory$_identifier'] || ''
        this.countrySearch = d['country$_identifier'] || ''
        this.destCountrySearch = d['destinationCountry$_identifier'] || ''
      } catch (e) {
        this.form = defaultForm()
      }
      this.showFormModal = true
      this.loadAccountingTab()
      this.loadZonesTab()
    },

    closeFormModal() { this.showFormModal = false; this.formError = null },

    async submitForm() {
      if (!this.form.name.trim()) { this.formError = 'Name is required.'; return }
      if (!this.form.validFromDate) { this.formError = 'Valid From Date is required.'; return }
      if (!this.form.taxCategory) { this.formError = 'Tax Category is required.'; return }
      this.formSaving = true; this.formError = null
      try {
        if (this.isEdit) {
          await updateTaxRate(this.editId, this.form)
          this.showToast('Tax rate updated successfully.')
        } else {
          await createTaxRate(this.form)
          this.showToast('Tax rate created successfully.')
        }
        this.closeFormModal()
        this.loadList()
      } catch (e) {
        this.formError = e.response?.data?.response?.error?.message || e.message
      } finally {
        this.formSaving = false
      }
    },

    // ── Tax Category Combobox ──
    onTaxCategorySearch() {
      const q = this.taxCategorySearch.toLowerCase()
      this.filteredTaxCategories = this.taxCategories.filter(c => c.name.toLowerCase().includes(q))
    },
    onTaxCategoryBlur() { setTimeout(() => { this.showTaxCategoryDrop = false }, 150) },
    selectTaxCategory(c) {
      this.form.taxCategory = c.id
      this.taxCategorySearch = c.name
      this.showTaxCategoryDrop = false
    },

    // ── Country Combobox ──
    async onCountrySearch() {
      if (this.countrySearch.length < 2) { this.filteredCountries = []; return }
      try { this.filteredCountries = await fetchCountries({ searchKey: this.countrySearch }) } catch {}
    },
    onCountryBlur() { setTimeout(() => { this.showCountryDrop = false }, 150) },
    selectCountry(c) { this.form.country = c.id; this.countrySearch = c.name; this.showCountryDrop = false },

    async onDestCountrySearch() {
      if (this.destCountrySearch.length < 2) { this.filteredDestCountries = []; return }
      try { this.filteredDestCountries = await fetchCountries({ searchKey: this.destCountrySearch }) } catch {}
    },
    onDestCountryBlur() { setTimeout(() => { this.showDestCountryDrop = false }, 150) },
    selectDestCountry(c) { this.form.destinationCountry = c.id; this.destCountrySearch = c.name; this.showDestCountryDrop = false },

    // ── Accounting Tab ──
    async loadAccountingTab() {
      if (!this.isEdit || !this.editId) return
      this.accountingLoading = true
      try {
        const data = await fetchTaxAccounting(this.editId)
        this.accountingRows = data.map(acc => ({
          ...acc,
          taxDueSearch: acc['taxDue$_identifier'] || '',
          taxCreditSearch: acc['taxCredit$_identifier'] || '',
          taxDueOptions: [],
          taxCreditOptions: [],
          showTaxDueDrop: false,
          showTaxCreditDrop: false,
        }))
      } catch (e) { console.warn(e) } finally { this.accountingLoading = false }
    },

    async onGLSearch(acc, field) {
      const q = field === 'taxDue' ? acc.taxDueSearch : acc.taxCreditSearch
      if (!q || q.length < 1) return
      try {
        const results = await fetchGLAccounts({ searchKey: q })
        if (field === 'taxDue') acc.taxDueOptions = results
        else acc.taxCreditOptions = results
      } catch {}
    },

    onGLBlur(acc, field) {
      setTimeout(() => {
        if (field === 'taxDue') acc.showTaxDueDrop = false
        else acc.showTaxCreditDrop = false
      }, 150)
    },

    selectGL(acc, field, g) {
      if (field === 'taxDue') {
        acc.taxDue = g.id
        acc.taxDueSearch = `${g.value} - ${g.name}`
        acc.showTaxDueDrop = false
      } else {
        acc.taxCredit = g.id
        acc.taxCreditSearch = `${g.value} - ${g.name}`
        acc.showTaxCreditDrop = false
      }
    },

    async saveAccounting() {
      this.savingAccounting = true
      try {
        for (const acc of this.accountingRows) {
          await upsertTaxAccounting(this.editId, acc)
        }
        this.showToast('Accounting saved successfully.')
      } catch (e) {
        this.showToast(e.response?.data?.response?.error?.message || e.message, 'error')
      } finally { this.savingAccounting = false }
    },

    // ── Zone Tab ──
    async loadZonesTab() {
      if (!this.isEdit || !this.editId) return
      this.zonesLoading = true
      try { this.zoneRows = await fetchTaxZones(this.editId) } catch {} finally { this.zonesLoading = false }
    },

    // ── View Modal ──
    async openViewModal(row) {
      this.openDropdown = null
      this.activeViewTab = 'main'
      this.viewAccountingRows = []; this.viewTranslationRows = []
      try { this.viewData = await fetchTaxRate(row.id) || row } catch { this.viewData = row }
      this.showViewModal = true
    },

    closeViewModal() { this.showViewModal = false },

    openEditFromView() {
      this.closeViewModal()
      this.openEditModal(this.viewData)
    },

    async loadViewAccounting() {
      if (!this.viewData?.id || this.viewAccountingRows.length) return
      this.viewAccountingLoading = true
      try { this.viewAccountingRows = await fetchTaxAccounting(this.viewData.id) } catch {} finally { this.viewAccountingLoading = false }
    },

    async loadViewTranslations() {
      if (!this.viewData?.id || this.viewTranslationRows.length) return
      this.viewTranslationsLoading = true
      try { this.viewTranslationRows = await fetchTaxTranslations(this.viewData.id) } catch {} finally { this.viewTranslationsLoading = false }
    },

    // ── Tax Category Modal ──
    openTaxCategoryModal() {
      this.tcForm = { name: '', description: '', default: false }
      this.tcFormEdit = null; this.tcError = null
      this.showTaxCategoryModal = true
      this.loadTaxCategoriesForModal()
    },

    async loadTaxCategoriesForModal() {
      this.tcLoading = true
      try { await this.loadTaxCategories() } finally { this.tcLoading = false }
    },

    closeTaxCategoryModal() { this.showTaxCategoryModal = false },

    editTaxCategory(tc) {
      this.tcFormEdit = tc.id
      this.tcForm = { name: tc.name, description: tc.description || '', default: tc.default ?? false }
      this.tcError = null
    },

    cancelTcEdit() {
      this.tcFormEdit = null
      this.tcForm = { name: '', description: '', default: false }
      this.tcError = null
    },

    async saveTaxCategory() {
      if (!this.tcForm.name.trim()) { this.tcError = 'Name is required.'; return }
      this.tcSaving = true; this.tcError = null
      try {
        if (this.tcFormEdit) {
          await updateTaxCategory(this.tcFormEdit, this.tcForm)
          this.showToast('Tax category updated.')
        } else {
          await createTaxCategory(this.tcForm)
          this.showToast('Tax category created.')
        }
        this.tcFormEdit = null
        this.tcForm = { name: '', description: '', default: false }
        await this.loadTaxCategories()
      } catch (e) {
        this.tcError = e.response?.data?.response?.error?.message || e.message
      } finally { this.tcSaving = false }
    },

    async deleteTaxCategoryConfirm(tc) {
      if (!confirm(`Delete tax category "${tc.name}"?`)) return
      try {
        await deleteTaxCategory(tc.id)
        this.showToast('Tax category deleted.')
        await this.loadTaxCategories()
      } catch (e) {
        this.showToast(e.response?.data?.response?.error?.message || e.message, 'error')
      }
    },

    // ── Delete ──
    confirmDelete(row) { this.openDropdown = null; this.deleteTarget = row; this.showDeleteModal = true },

    async doDelete() {
      this.deleting = true
      try {
        await deleteTaxRate(this.deleteTarget.id)
        this.showDeleteModal = false
        this.showToast('Tax rate deleted.')
        this.loadList()
      } catch (e) {
        this.showToast(e.response?.data?.response?.error?.message || e.message, 'error')
        this.showDeleteModal = false
      } finally { this.deleting = false }
    },

    // ── Toast ──
    showToast(msg, type = 'success') {
      clearTimeout(this.toastTimer)
      this.toast = { show: true, msg, type }
      this.toastTimer = setTimeout(() => { this.toast.show = false }, 3200)
    },
  },
}
</script>

<style scoped>
/* ══ CSS Variables ══ */
:root {
  --font: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --accent: #2563eb;
  --accent-light: #eff6ff;
  --danger: #dc2626;
  --border: #e2e8f0;
  --surface: #ffffff;
  --surface2: #f8fafc;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --radius-sm: 6px;
  --radius: 10px;
  --shadow-md: 0 4px 16px rgba(0,0,0,.10);
}

/* ── Layout ── */
.layout { display: flex; min-height: 100vh; background: var(--surface2); font-family: var(--font); }
.main { flex: 1; padding: 24px; overflow: auto; }
.content-card { background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); padding: 24px; }

/* ── Header ── */
.page-header { margin-bottom: 18px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }

/* ── Toolbar ── */
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.toolbar-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.toolbar-right { display: flex; align-items: center; gap: 8px; }
.search-wrap { position: relative; }
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
.search-input { height: 36px; padding: 0 12px 0 34px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; min-width: 240px; font-family: var(--font); color: var(--text-primary); background: var(--surface2); transition: border-color .15s; }
.search-input:focus { border-color: var(--accent); background: #fff; }
.filter-select { height: 36px; padding: 0 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; font-family: var(--font); color: var(--text-secondary); background: var(--surface2); outline: none; cursor: pointer; }

/* ── Buttons ── */
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 0 14px; height: 36px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font); transition: background .12s, opacity .12s; }
.btn--primary { background: var(--accent); color: #fff; }
.btn--primary:hover:not(:disabled) { background: #1d4ed8; }
.btn--secondary { background: var(--surface2); color: var(--text-secondary); border: 1px solid var(--border); }
.btn--secondary:hover:not(:disabled) { background: #e2e8f0; }
.btn--ghost { background: transparent; color: var(--text-secondary); border: 1px solid var(--border); }
.btn--ghost:hover:not(:disabled) { background: var(--surface2); }
.btn--danger { background: var(--danger); color: #fff; }
.btn--danger:hover:not(:disabled) { background: #b91c1c; }
.btn--sm { height: 30px; padding: 0 12px; font-size: 12.5px; }
.btn:disabled { opacity: .55; cursor: not-allowed; }

/* ── Table ── */
.table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius-sm); margin-bottom: 16px; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table thead { background: var(--surface2); }
.table th { padding: 10px 14px; text-align: left; font-weight: 600; font-size: 11.5px; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); border-bottom: 1px solid var(--border); white-space: nowrap; }
.table td { padding: 11px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.table tbody tr:last-child td { border-bottom: none; }
.tr-data:hover { background: #f8fafc; }
.td-empty { text-align: center; color: var(--text-muted); font-size: 13px; padding: 32px !important; }
.td-error { color: var(--danger); }
.td-secondary { color: var(--text-secondary); }
.td-name { font-weight: 600; color: var(--text-primary); }
.th-action { text-align: center !important; }
.td-action-cell { text-align: center; }

/* ── Badges & Pills ── */
.rate-badge { display: inline-block; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 2px 8px; border-radius: 20px; font-size: 12px; font-weight: 700; }
.sptype-pill { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; white-space: nowrap; }
.sptype--both { background: #f0fdf4; color: #15803d; }
.sptype--sales { background: #eff6ff; color: #1d4ed8; }
.sptype--purchase { background: #fef9c3; color: #b45309; }
.bool-pill { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.bool-pill--yes { background: #dcfce7; color: #16a34a; }
.bool-pill--no { background: #f1f5f9; color: var(--text-muted); }

/* ── Action buttons ── */
.action-group { display: flex; align-items: center; justify-content: center; gap: 4px; }
.action-btn { width: 30px; height: 30px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: background .1s, border-color .1s; }
.action-btn:hover { background: var(--surface2); border-color: #cbd5e1; }
.action-btn--more:hover { background: var(--surface2); }
.action-btn--danger { color: var(--danger); }
.action-btn--danger:hover { background: #fee2e2; border-color: #fca5a5; }
.dropdown-wrap { position: relative; }
.dropdown-menu--fixed { position: fixed !important; }
.dropdown-menu { position: fixed; z-index: 999; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); min-width: 140px; padding: 4px 0; }
.dropdown-item { display: flex; align-items: center; gap: 7px; width: 100%; padding: 8px 12px; font-size: 12.5px; color: var(--text-primary); background: none; border: none; cursor: pointer; font-family: var(--font); transition: background .1s; }
.dropdown-item:hover { background: var(--surface2); }
.dropdown-item--danger { color: var(--danger); }
.dropdown-item--danger:hover { background: #fee2e2; }

/* ── Loading ── */
.loading-dots { display: flex; align-items: center; justify-content: center; gap: 5px; }
.loading-dots span { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); animation: bounce .8s infinite alternate; }
.loading-dots span:nth-child(2) { animation-delay: .2s; }
.loading-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes bounce { to { transform: translateY(-6px); opacity: .5; } }

/* ── Pagination ── */
.pagination { display: flex; align-items: center; gap: 4px; justify-content: center; padding-top: 8px; }
.page-btn { width: 32px; height: 32px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: var(--text-secondary); font-family: var(--font); transition: background .1s; }
.page-btn:hover:not(:disabled) { background: var(--surface2); }
.page-btn:disabled { opacity: .4; cursor: not-allowed; }
.page-btn--active { background: var(--accent); color: #fff; border-color: var(--accent); font-weight: 600; }
.page-ellipsis { font-size: 14px; color: var(--text-muted); padding: 0 4px; }

/* ── Modal ── */
.modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.45); z-index: 500; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: 0 20px 60px rgba(0,0,0,.18); display: flex; flex-direction: column; max-height: 90vh; width: 100%; }
.modal--sm { max-width: 440px; }
.modal--md { max-width: 680px; }
.modal--lg { max-width: 800px; }
.modal--xl { max-width: 960px; }
.modal-header { padding: 18px 20px 14px; border-bottom: 1px solid var(--border); display: flex; align-items: flex-start; justify-content: space-between; flex-shrink: 0; }
.modal-breadcrumb { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-muted); margin-bottom: 4px; }
.bc-active { color: var(--text-secondary); font-weight: 600; }
.modal-title { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.modal-close { width: 30px; height: 30px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); transition: background .1s; flex-shrink: 0; }
.modal-close:hover { background: var(--surface2); }
.modal-tabs { display: flex; gap: 0; padding: 0 20px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.modal-tab { padding: 10px 16px; font-size: 13px; font-weight: 500; color: var(--text-muted); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-family: var(--font); transition: color .15s, border-color .15s; }
.modal-tab--active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
.modal-body { padding: 20px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0; }

/* ── Form ── */
.form-grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 14px; }
.form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group--full { grid-column: 1 / -1; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-input { width: 100%; height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.form-input:focus { border-color: var(--accent); background: #fff; }
.form-input:disabled { opacity: .6; cursor: not-allowed; }
.req { color: var(--danger); }
.form-api-error { margin-top: 14px; padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; }
.checkbox-label { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--text-secondary); cursor: pointer; user-select: none; padding-top: 20px; }
.checkbox-input { width: 15px; height: 15px; accent-color: var(--accent); cursor: pointer; }

/* ── Combobox ── */
.acc-wrap { position: relative; width: 100%; }
.acc-input { display: block; width: 100%; height: 36px; padding: 0 32px 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.acc-input:focus { border-color: var(--accent); background: #fff; }
.acc-input--sm { height: 32px; font-size: 12.5px; }
.acc-chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.acc-dropdown { position: absolute; z-index: 300; top: calc(100% + 3px); left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); max-height: 200px; overflow-y: auto; list-style: none; margin: 0; padding: 4px 0; }
.acc-opt { padding: 8px 12px; font-size: 12.5px; color: var(--text-primary); cursor: pointer; transition: background .1s; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.acc-opt:hover { background: var(--accent-light); }
.acc-empty { padding: 8px 12px; font-size: 12.5px; color: var(--text-muted); font-style: italic; }

/* ── GL code ── */
.gl-code { font-family: var(--font-mono); font-size: 11.5px; font-weight: 600; color: var(--text-primary); }

/* ── Accounting info ── */
.acc-info-text { font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; }

/* ── Tax Category Modal inline form ── */
.tc-form-card { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 16px; }
.tc-form-title { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }

/* ── Detail view ── */
.detail-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-item--full { grid-column: 1 / -1; }
.detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.detail-value { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }

/* ── Delete ── */
.delete-text { font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); }
.delete-text strong { color: var(--text-primary); }

/* ── Toast ── */
.toast { position: fixed; bottom: 24px; right: 24px; z-index: 2000; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); }
.toast--success { background: #16a34a; color: #fff; }
.toast--error { background: var(--danger); color: #fff; }
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── Spinner ── */
.spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>