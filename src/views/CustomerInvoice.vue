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

        <!-- ══ TABLE ══ -->
        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th class="sortable" :class="{ asc: sortCol === 'documentNo', desc: sortCol === 'documentNo' && sortDir === 'desc' }" @click="toggleSort('documentNo')">Invoice No.</th>
              <th class="sortable" :class="{ asc: sortCol === 'invoiceDate', desc: sortCol === 'invoiceDate' && sortDir === 'desc' }" @click="toggleSort('invoiceDate')">Invoice Date</th>
              <th class="sortable" :class="{ asc: sortCol === 'businessPartner.name', desc: sortCol === 'businessPartner.name' && sortDir === 'desc' }" @click="toggleSort('businessPartner.name')">Customer</th>
              <th class="sortable" :class="{ asc: sortCol === 'kodePelanggan', desc: sortCol === 'kodePelanggan' && sortDir === 'desc' }" @click="toggleSort('kodePelanggan')">Customer Code</th>
              <th class="sortable" :class="{ asc: sortCol === 'grandTotalAmount', desc: sortCol === 'grandTotalAmount' && sortDir === 'desc' }" @click="toggleSort('grandTotalAmount')">Grand Total</th>
              <th class="sortable" :class="{ asc: sortCol === 'documentStatus', desc: sortCol === 'documentStatus' && sortDir === 'desc' }" @click="toggleSort('documentStatus')">Status</th>
              <th class="sortable" :class="{ asc: sortCol === 'paymentComplete', desc: sortCol === 'paymentComplete' && sortDir === 'desc' }" @click="toggleSort('paymentComplete')">Payment</th>
              <th class="th-action">Action</th>
            </tr></thead>
            <tbody>
              <tr v-if="loading"><td colspan="8" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
              <tr v-else-if="error"><td colspan="8" class="td-empty td-error">{{ error }}</td></tr>
              <tr v-else-if="rows.length === 0"><td colspan="8" class="td-empty">No customer invoices found.</td></tr>
              <template v-else>
                <tr v-for="r in rows" :key="r.id" class="tr-data">
                  <td><span class="code-badge">{{ r.documentNo || '—' }}</span></td>
                  <td class="td-secondary">{{ formatDate(r.invoiceDate) }}</td>
                  <td class="td-clip td-name">{{ r['businessPartner$_identifier']?.includes(' - ') ? r['businessPartner$_identifier'].split(' - ').slice(1).join(' - ') : (r['businessPartner$_identifier'] || '—') }}</td>
                  <td class="td-secondary">{{ r.kodePelanggan || (r['businessPartner$_identifier']?.includes(' - ') ? r['businessPartner$_identifier'].split(' - ')[0] : '—') }}</td>
                  <td class="td-secondary">{{ formatCurrency(r.grandTotalAmount) }}</td>
                  <td><span :class="['status-pill', statusClass(r.documentStatus)]">{{ statusLabel(r.documentStatus) }}</span></td>
                  <td><span :class="['pay-pill', paymentStatusClass(r)]">{{ paymentStatusLabel(r) }}</span></td>
                  <td class="td-action-cell">
                    <div class="action-group">
                      <div class="dropdown-wrap" v-click-outside="closeDropdown">
                        <button class="action-btn action-btn--more" @click.stop="toggleDropdown(r.id, $event)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                        <div v-if="openDropdown === r.id" class="dropdown-menu" :style="{ top: dropdownPos.top + 'px', right: dropdownPos.right + 'px' }" >
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
                <span>List Invoice</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">{{ isEdit ? 'Edit' : 'Create' }} Invoice</span>
              </div>
              <div class="modal-title">{{ isEdit ? 'Edit' : 'Create' }} Customer Invoice</div>
            </div>
            <button class="modal-close" @click="closeFormModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Tabs -->
          <div class="modal-tabs">
            <button :class="['modal-tab', activeFormTab === 'transaction' ? 'modal-tab--active' : '']" @click="activeFormTab = 'transaction'">Transaction</button>
            <button :class="['modal-tab', activeFormTab === 'payment' ? 'modal-tab--active' : '']" @click="activeFormTab = 'payment'">Payment Term</button>
          </div>

          <!-- Body -->
          <div class="modal-body">

            <!-- ── Transaction Tab ── -->
            <div v-if="activeFormTab === 'transaction'">
              <div class="form-grid-4">

                <div class="form-group">
                  <label>Invoice No.</label>
                  <input v-model="form.documentNo" class="form-input" placeholder="Auto-generated" disabled />
                </div>
                <div class="form-group">
                  <label>Invoice Date</label>
                  <input v-model="form.invoiceDate" type="date" class="form-input" />
                </div>
                <div class="form-group">
                  <label>Accounting Date</label>
                  <input v-model="form.accountingDate" type="date" class="form-input" />
                </div>

                <div class="form-group form-group--full">
                  <label>Customer <span class="req">*</span></label>
                  <div class="acc-wrap">
                    <input v-model="customerSearch" class="acc-input" placeholder="Search customer..." @input="onCustomerSearch" @focus="showCustomerDrop = true" @blur="onCustomerBlur" />
                    <svg class="acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                    <ul v-if="showCustomerDrop && filteredCustomers.length" class="acc-dropdown">
                      <li v-for="c in filteredCustomers" :key="c.id" class="acc-opt" @mousedown.prevent="selectCustomer(c)">{{ c.name }}</li>
                    </ul>
                    <ul v-else-if="showCustomerDrop && customerSearch.length > 1" class="acc-dropdown">
                      <li class="acc-empty">No customers found</li>
                    </ul>
                  </div>
                </div>

                <div class="form-group">
                  <label>Partner Address</label>
                  <select v-model="form.partnerAddress" class="form-input" :disabled="!form.businessPartner">
                    <option value="">Select</option>
                    <option v-for="l in partnerLocations" :key="l.id" :value="l.id">{{ l['locationAddress$_identifier'] || l.id }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Payment Term <span class="req">*</span></label>
                  <input :value="paymentTermLabel" class="form-input" disabled placeholder="Auto dari customer" />
                </div>
                <div class="form-group">
                  <label>Payment Method</label>
                  <input :value="paymentMethodLabel" class="form-input" disabled placeholder="Auto dari customer" />
                </div>

                <div class="form-group">
                  <label>Price List</label>
                  <input :value="priceListLabel" class="form-input" disabled placeholder="Auto dari customer" />
                </div>
                <template v-if="!isEdit">
                  <div class="form-group">
                    <label>Kode Pelanggan</label>
                    <input v-model="form.kodePelanggan" class="form-input" placeholder="Auto dari customer" readonly style="background:#f8fafc" />
                  </div>
                  <div class="form-group">
                    <label>Order Reference</label>
                    <input v-model="form.orderReference" class="form-input" placeholder="Order Reference" />
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
                    <label>Total Usage</label>
                    <input :value="form.totalUsage" class="form-input" disabled placeholder="0" style="background:#f8fafc" />
                  </div>
                </template>

                <div class="form-group form-group--full">
                  <label>Description</label>
                  <input v-model="form.description" class="form-input" placeholder="Description" />
                </div>

              </div>

              <!-- Invoice Lines -->
              <div class="section-divider">
                Invoice Lines
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
                    <th style="width:90px;text-align:center">Qty</th>
                    <th style="width:120px;text-align:center">UOM</th>
                    <th style="width:160px">Tax</th>
                    <th style="width:150px;text-align:right">Unit Price</th>
                    <th style="width:150px;text-align:right">Net Amount</th>
                    <th style="width:36px"></th>
                  </tr></thead>
                  <tbody>
                    <tr v-if="lines.length === 0"><td colspan="8" class="td-empty" style="padding:20px">No lines yet. Click "Add Line".</td></tr>
                    <tr v-for="(line, idx) in lines" :key="idx">
                      <td class="td-secondary" style="text-align:center">{{ idx + 1 }}</td>

                      <!-- Product combobox — dropdown fixed agar tidak ter-clip table overflow -->
                      <td>
                        <input
                          v-model="line.productSearch"
                          class="acc-input acc-input--sm"
                          placeholder="Search product..."
                          @input="onProductSearch(line)"
                          @focus="openProductDrop(line, $event)"
                          @blur="onProductBlur(line)"
                        />
                        <teleport to="body">
                          <ul
                            v-if="line.showDrop && line.productOptions.length"
                            class="acc-dropdown acc-dropdown--teleport"
                            :style="line.dropStyle"
                          >
                            <li v-for="p in line.productOptions" :key="p.id" class="acc-opt" @mousedown.prevent="selectProduct(line, p)">{{ p.name }}</li>
                          </ul>
                        </teleport>
                      </td>

                      <!-- Qty -->
                      <td style="text-align:center">
                        <input v-model.number="line.invoicedQuantity" type="number" class="form-input form-input--sm" style="text-align:center" @input="calcLine(line)" />
                      </td>

                      <!-- UOM combobox -->
                      <td style="text-align:center">
                        <div class="acc-wrap">
                          <input v-model="line.uomSearch" class="acc-input acc-input--sm" placeholder="UOM..." style="text-align:center;padding-right:24px" @input="onUomSearch(line)" @focus="line.showUomDrop = true" @blur="() => onUomBlur(line)" />
                          <ul v-if="line.showUomDrop && line.uomOptions.length" class="acc-dropdown">
                            <li v-for="u in line.uomOptions" :key="u.id" class="acc-opt" @mousedown.prevent="selectUom(line, u)">{{ u.uOMSymbol || u.name }}</li>
                          </ul>
                          <ul v-else-if="line.showUomDrop && line.uomSearch.length > 0 && !line.uomOptions.length" class="acc-dropdown">
                            <li class="acc-empty">No UOM found</li>
                          </ul>
                        </div>
                      </td>

                      <!-- Tax combobox — dropdown fixed -->
                      <td>
                        <input
                          v-model="line.taxSearch"
                          class="acc-input acc-input--sm"
                          placeholder="Select tax..."
                          @input="onTaxSearch(line)"
                          @focus="openTaxDrop(line, $event)"
                          @blur="onTaxBlur(line)"
                        />
                        <teleport to="body">
                          <ul
                            v-if="line.showTaxDrop && line.taxOptions.length"
                            class="acc-dropdown acc-dropdown--teleport"
                            :style="line.taxDropStyle"
                          >
                            <li v-for="tx in line.taxOptions" :key="tx.id" class="acc-opt" @mousedown.prevent="selectTax(line, tx)">
                              {{ tx.name }}<span v-if="tx.rate != null" class="tax-rate-badge">{{ tx.rate }}%</span>
                            </li>
                          </ul>
                          <ul v-else-if="line.showTaxDrop && line.taxSearch?.length > 0 && !line.taxOptions.length" class="acc-dropdown acc-dropdown--teleport" :style="line.taxDropStyle">
                            <li class="acc-empty">No tax found</li>
                          </ul>
                        </teleport>
                      </td>

                      <!-- Unit Price -->
                      <td style="text-align:right">
                        <input v-model.number="line.unitPrice" type="number" min="0" class="form-input form-input--sm" style="text-align:right" @input="calcLine(line)" />
                      </td>

                      <!-- Net Amount -->
                      <td class="td-secondary" style="text-align:right;font-weight:600;white-space:nowrap">{{ formatCurrency(line.lineNetAmount) }}</td>

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
            </div>

            <!-- ── Payment Term Tab ── -->
            <div v-if="activeFormTab === 'payment'">
              <div v-if="!form.paymentTerms" class="td-empty" style="padding:32px">
                Please select a Customer in the Transaction tab first.
              </div>
              <div v-else>
                <div v-if="paymentLinesLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>
                <div v-else class="table-wrap" style="margin-bottom:0">
                  <table class="table">
                    <thead><tr>
                      <th>Line</th>
                      <th>Due Date Offset</th>
                      <th>Percentage</th>
                      <th>Fixed Amount</th>
                    </tr></thead>
                    <tbody>
                      <tr v-if="paymentLines.length === 0"><td colspan="4" class="td-empty" style="padding:20px">No lines found for this Payment Term.</td></tr>
                      <tr v-for="pl in paymentLines" :key="pl.id">
                        <td class="td-secondary">{{ pl.line ?? pl.lineNo ?? '—' }}</td>
                        <td class="td-secondary">{{ pl.offsetDays ?? pl.netDays ?? pl.dueDateOffset ?? pl.dayOffset ?? '—' }}</td>
                        <td class="td-secondary">{{ pl.percentage != null ? pl.percentage + '%' : (pl.fixedPercentage != null ? pl.fixedPercentage + '%' : '—') }}</td>
                        <td class="td-secondary">{{ pl.fixedAmount != null ? formatCurrency(pl.fixedAmount) : (pl.amount != null ? formatCurrency(pl.amount) : '—') }}</td>
                      </tr>
                    </tbody>
                  </table>
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
            <button class="btn btn--primary" :disabled="saving" @click="saveInvoice">
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

          <!-- View Tabs -->
          <div class="modal-tabs">
            <button :class="['modal-tab', viewTab === 'basic' ? 'modal-tab--active' : '']" @click="viewTab = 'basic'">Basic</button>
            <button :class="['modal-tab', viewTab === 'paymentPlan' ? 'modal-tab--active' : '']" @click="switchToPaymentPlan">Payment Plan</button>
            <button :class="['modal-tab', viewTab === 'accounting' ? 'modal-tab--active' : '']" @click="switchToAccounting">Accounting</button>
          </div>

          <div class="modal-body" v-if="viewRow">

            <!-- ── Basic Tab ── -->
            <div v-if="viewTab === 'basic'">
              <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">Invoice No.</span><span class="detail-value mono">{{ viewRow.documentNo }}</span></div>
                <div class="detail-item"><span class="detail-label">Invoice Date</span><span class="detail-value">{{ formatDate(viewRow.invoiceDate) }}</span></div>
                <div class="detail-item"><span class="detail-label">Status</span><span :class="['status-pill', statusClass(viewRow.documentStatus)]">{{ statusLabel(viewRow.documentStatus) }}</span></div>
                <div class="detail-item">
                  <span class="detail-label">Customer Name</span>
                  <span class="detail-value">{{ viewRow['businessPartner$_identifier']?.includes(' - ') ? viewRow['businessPartner$_identifier'].split(' - ').slice(1).join(' - ') : (viewRow['businessPartner$_identifier'] || '—') }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Code Customer</span>
                  <span class="detail-value">{{ viewRow.kodePelanggan || (viewRow['businessPartner$_identifier']?.includes(' - ') ? viewRow['businessPartner$_identifier'].split(' - ')[0] : '—') }}</span>
                </div>
                <div class="detail-item"><span class="detail-label">Total Usage</span><span class="detail-value">{{ viewRow.totalUsage ?? '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Payment Terms</span><span class="detail-value">{{ viewRow['paymentTerms$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Payment Method</span><span class="detail-value">{{ viewRow['paymentMethod$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Grand Total</span><span class="detail-value">{{ formatCurrency(viewRow.grandTotalAmount) }}</span></div>
                <div class="detail-item"><span class="detail-label">Organization</span><span class="detail-value">{{ viewRow['organization$_identifier'] || '—' }}</span></div>
                <div class="detail-item detail-item--full"><span class="detail-label">Description</span><span class="detail-value">{{ viewRow.description || '—' }}</span></div>
              </div>

              <!-- Item Detail -->
              <div class="section-divider" style="margin-top:20px">Item Detail</div>
              <div v-if="viewLinesLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>
              <div v-else class="table-wrap" style="margin-bottom:0">
                <table class="table table--lines">
                  <thead><tr><th>#</th><th>Product</th><th>Qty</th><th>UOM</th><th>Unit Price</th><th>Tax</th><th>Net Amount</th></tr></thead>
                  <tbody>
                    <tr v-if="viewLines.length === 0"><td colspan="7" class="td-empty">No items.</td></tr>
                    <tr v-for="(l, i) in viewLines" :key="l.id">
                      <td class="td-secondary">{{ i + 1 }}</td>
                      <td>{{ l['product$_identifier'] || '—' }}</td>
                      <td class="td-secondary">{{ l.invoicedQuantity }}</td>
                      <td class="td-secondary">{{ l['uOM$_identifier'] || '—' }}</td>
                      <td class="td-secondary">{{ formatCurrency(l.unitPrice) }}</td>
                      <td class="td-secondary">{{ l['tax$_identifier'] || '—' }}</td>
                      <td class="td-secondary">{{ formatCurrency(l.lineNetAmount) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="totals-block">
                <div class="totals-row"><span>Subtotal</span><span>{{ formatCurrency(viewRow.summedLineAmount) }}</span></div>
                <div class="totals-row"><span>Tax</span><span>{{ formatCurrency((viewRow.grandTotalAmount ?? 0) - (viewRow.summedLineAmount ?? 0)) }}</span></div>
                <div class="totals-row totals-row--grand"><span>Total Invoice</span><span>{{ formatCurrency(viewRow.grandTotalAmount) }}</span></div>
              </div>

            </div>

            <!-- ── Payment Plan Tab ── -->
            <div v-if="viewTab === 'paymentPlan'">
              <div class="section-divider" style="margin-top:0">
                Payment Plan
                <span v-if="paymentSchedules.length" class="pp-badge">{{ paymentSchedules.length }} instalment{{ paymentSchedules.length > 1 ? 's' : '' }}</span>
              </div>
              <div v-if="paymentSchedulesLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>
              <div v-else-if="paymentSchedules.length === 0" class="pp-empty">No payment plan found.</div>
              <div v-else class="table-wrap" style="margin-bottom:0">
                <table class="table">
                  <thead><tr>
                    <th>#</th>
                    <th>Due Date</th>
                    <th>Expected Date</th>
                    <th>Payment Method</th>
                    <th style="text-align:right">Expected Amount</th>
                    <th style="text-align:right">Received</th>
                    <th style="text-align:right">Outstanding</th>
                    <th>Status</th>
                  </tr></thead>
                  <tbody>
                    <tr v-for="(ps, idx) in paymentSchedules" :key="ps.id" class="tr-data">
                      <td class="td-secondary" style="text-align:center">{{ idx + 1 }}</td>
                      <td>{{ formatDate(ps.dueDate) }}</td>
                      <td class="td-secondary">{{ formatDate(ps.expectedDate) }}</td>
                      <td class="td-secondary">{{ ps['finPaymentmethod$_identifier'] || '—' }}</td>
                      <td style="text-align:right;font-variant-numeric:tabular-nums">{{ formatCurrency(ps.amount) }}</td>
                      <td style="text-align:right;font-variant-numeric:tabular-nums">
                        <span :class="ps.paidAmount > 0 ? 'pp-paid' : 'td-muted'">{{ ps.paidAmount > 0 ? formatCurrency(ps.paidAmount) : '—' }}</span>
                      </td>
                      <td style="text-align:right;font-variant-numeric:tabular-nums">
                        <span :class="ps.outstandingAmount > 0 ? 'pp-outstanding' : 'pp-paid'">{{ formatCurrency(ps.outstandingAmount) }}</span>
                      </td>
                      <td>
                        <span :class="['pp-status', ps.outstandingAmount <= 0 ? 'pp-status--paid' : (ps.paidAmount > 0 ? 'pp-status--partial' : 'pp-status--unpaid')]">
                          {{ ps.outstandingAmount <= 0 ? 'Paid' : (ps.paidAmount > 0 ? 'Partial' : 'Unpaid') }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot v-if="paymentSchedules.length > 1">
                    <tr class="acc-totals-row">
                      <td colspan="4" style="text-align:right;font-size:12px;font-weight:600;color:var(--text-muted);padding:10px 16px">TOTAL</td>
                      <td style="text-align:right;padding:10px 16px;font-weight:700;color:var(--text-primary)">{{ formatCurrency(paymentSchedules.reduce((s, p) => s + (p.amount || 0), 0)) }}</td>
                      <td style="text-align:right;padding:10px 16px;font-weight:700;color:#16a34a">{{ formatCurrency(paymentSchedules.reduce((s, p) => s + (p.paidAmount || 0), 0)) }}</td>
                      <td style="text-align:right;padding:10px 16px;font-weight:700;color:#dc2626">{{ formatCurrency(paymentSchedules.reduce((s, p) => s + (p.outstandingAmount || 0), 0)) }}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <!-- ── Accounting Tab ── -->
            <div v-if="viewTab === 'accounting'">
              <div v-if="accountingLoading" class="td-empty" style="padding:40px">
                <div class="loading-dots"><span></span><span></span><span></span></div>
              </div>
              <div v-else-if="accountingError" class="form-api-error" style="margin-top:0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ accountingError }}
              </div>
              <div v-else>
                <div v-if="accountingFacts.length === 0" class="td-empty" style="padding:40px">No accounting entries found.</div>
                <div v-else>
                  <!-- Summary -->
                  <div class="acc-summary-grid">
                    <div class="acc-summary-item">
                      <span class="acc-summary-label">Date</span>
                      <span class="acc-summary-value">{{ formatDate(viewRow.invoiceDate) }}</span>
                    </div>
                    <div class="acc-summary-item">
                      <span class="acc-summary-label">Invoice No</span>
                      <span class="acc-summary-value">{{ accountingFacts[0]?.['journalEntry$_identifier'] || viewRow.documentNo || '—' }}</span>
                    </div>
                    <div class="acc-summary-item">
                      <span class="acc-summary-label">Total Debet</span>
                      <span class="acc-summary-value acc-summary-value--debit">{{ formatCurrency(accountingFacts.reduce((s, f) => s + (f.debit || 0), 0)) }}</span>
                    </div>
                    <div class="acc-summary-item">
                      <span class="acc-summary-label">Total Credit</span>
                      <span class="acc-summary-value acc-summary-value--credit">{{ formatCurrency(accountingFacts.reduce((s, f) => s + (f.credit || 0), 0)) }}</span>
                    </div>
                  </div>
                  <!-- Table -->
                  <div class="table-wrap" style="margin-bottom:0">
                    <table class="table">
                      <thead><tr>
                        <th>COA</th>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Period</th>
                        <th style="text-align:right">Debit</th>
                        <th style="text-align:right">Credit</th>
                        <th>Type</th>
                      </tr></thead>
                      <tbody>
                        <tr v-for="fact in accountingFacts" :key="fact.id" class="tr-data">
                          <td><span class="acc-code">{{ fact.value || fact['account$_identifier']?.split(' - ')[0] || '—' }}</span></td>
                          <td class="td-secondary">{{ fact.accountingEntryDescription || fact['account$_identifier']?.split(' - ').slice(1).join(' - ') || '—' }}</td>
                          <td class="td-secondary" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ fact.description || '—' }}</td>
                          <td class="td-secondary">{{ fact['period$_identifier'] || '—' }}</td>
                          <td class="td-secondary" style="text-align:right;font-variant-numeric:tabular-nums">
                            <span v-if="fact.debit > 0" class="acc-debit">{{ formatCurrency(fact.debit) }}</span>
                            <span v-else class="td-muted">—</span>
                          </td>
                          <td class="td-secondary" style="text-align:right;font-variant-numeric:tabular-nums">
                            <span v-if="fact.credit > 0" class="acc-credit">{{ formatCurrency(fact.credit) }}</span>
                            <span v-else class="td-muted">—</span>
                          </td>
                          <td>
                            <span :class="['acc-type-badge', fact.postingType === 'A' ? 'acc-type--actual' : 'acc-type--other']">
                              {{ fact.postingType === 'A' ? 'Actual' : (fact.postingType || '—') }}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr class="acc-totals-row">
                          <td colspan="4" style="text-align:right;font-size:12px;font-weight:600;color:var(--text-muted);padding:10px 16px">TOTAL</td>
                          <td style="text-align:right;padding:10px 16px;font-weight:700;color:var(--text-primary)">{{ formatCurrency(accountingFacts.reduce((s, f) => s + (f.debit || 0), 0)) }}</td>
                          <td style="text-align:right;padding:10px 16px;font-weight:700;color:var(--text-primary)">{{ formatCurrency(accountingFacts.reduce((s, f) => s + (f.credit || 0), 0)) }}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div class="modal-footer">
           <button class="btn btn--ghost" @click="showViewModal = false">Close</button>
  
          <button class="btn btn--ghost" @click="doPrint">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print
          </button>

            <!-- DR: Edit + Complete -->
            <template v-if="viewRow?.documentStatus === 'DR'">
              <button class="btn btn--edit" @click="openEditFromView">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit
              </button>
              <button class="btn btn--complete" :disabled="completing" @click="doCompleteInvoice">
                <span v-if="completing" class="spinner"></span>
                <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                {{ completing ? 'Completing...' : 'Complete' }}
              </button>
            </template>

            <!-- CO + belum posted: Cancel + Reactivate + Post -->
            <template v-else-if="viewRow?.documentStatus === 'CO' && !isPosted">
              <button class="btn btn--cancel" :disabled="cancelling" @click="doCancelInvoice">
                <span v-if="cancelling" class="spinner"></span>
                <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                {{ cancelling ? 'Cancelling...' : 'Cancel Invoice' }}
              </button>
              <button class="btn btn--adjustment" :disabled="adjusting" @click="doAdjustmentInvoice">
                <span v-if="adjusting" class="spinner"></span>
                <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                {{ adjusting ? 'Processing...' : 'Adjustment' }}
              </button>
              <button class="btn btn--reactivate" :disabled="reactivating" @click="doReactivateInvoice">
                <span v-if="reactivating" class="spinner"></span>
                <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                {{ reactivating ? 'Reactivating...' : 'Reactivate' }}
              </button>
              <button class="btn btn--post" :disabled="posting" @click="doPostAccounting">
                <span v-if="posting" class="spinner"></span>
                <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="10"/></svg>
                {{ posting ? 'Posting...' : 'Post' }}
              </button>
            </template>

            <!-- CO + posted: Cancel + Unpost -->
            <template v-else-if="viewRow?.documentStatus === 'CO' && isPosted">
              <button class="btn btn--cancel" :disabled="cancelling" @click="doCancelInvoice">
                <span v-if="cancelling" class="spinner"></span>
                <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                {{ cancelling ? 'Cancelling...' : 'Cancel Invoice' }}
              </button>
              <button class="btn btn--adjustment" :disabled="adjusting" @click="doAdjustmentInvoice">
                <span v-if="adjusting" class="spinner"></span>
                <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                {{ adjusting ? 'Processing...' : 'Adjustment' }}
              </button>
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

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- DELETE CONFIRM MODAL                                   -->
    <!-- ══════════════════════════════════════════════════════ -->
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
            <p class="delete-text">Are you sure you want to delete invoice <strong>{{ deleteRow?.documentNo }}</strong>? This action cannot be undone.</p>
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
          <path v-else-if="toast.type === 'warning'" d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <path v-else d="M18 6 6 18M6 6l12 12"/>
        </svg>
        {{ toast.message }}
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import {
  fetchAllInvoices, fetchInvoice, createInvoice, updateInvoice, deleteInvoice, postInvoice,
  fetchInvoiceLines, createInvoiceLine, updateInvoiceLine, deleteInvoiceLine,
  fetchAccountingFacts,
  fetchCustomers, fetchCustomerById, fetchPartnerLocations,
  fetchPaymentTerms, fetchPaymentTermLines, fetchPaymentMethods,
  fetchPriceLists, fetchProducts, fetchUOMs, fetchTaxRates,
  runInvoiceProcess, postAccountingProcess,
  unpostAccountingProcess, reactivateInvoice, voidInvoice, cancelInvoice, adjustmentInvoice,
  createPaymentPlan, fetchPaymentSchedules,
  DEFAULT_ORGANIZATION, ADJUSTMENT_PRODUCT_ID,
} from '@/services/customerInvoice.js'
import { generateDocumentPDF } from '@/services/pdfGenerator.js'

// ── directive
const vClickOutside = {
  mounted(el, binding) {
    el._handler = (e) => { if (!el.contains(e.target)) binding.value(e) }
    document.addEventListener('click', el._handler)
  },
  unmounted(el) { document.removeEventListener('click', el._handler) },
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

// ── sorting state
const sortCol = ref('invoiceDate')
const sortDir = ref('desc')

function toggleSort(col) {
  if (sortCol.value === col) {
    // Jika kolom yang sama diklik, balik arahnya
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    // Jika ganti kolom, defaultkan ke descending
    sortCol.value = col
    sortDir.value = 'desc'
  }
  currentPage.value = 1 // Reset ke halaman 1 saat sorting berubah
  loadInvoices()
}

// ── dropdown
const openDropdown = ref(null)
const dropdownPos = ref({ top: 0, right: 0 })

// ── lookup data
const partnerLocations = ref([])
const paymentTerms = ref([])
const paymentMethods = ref([])
const uoms = ref([])
const priceLists = ref([])
const taxRates = ref([])

// ── form state
const showFormModal = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const activeFormTab = ref('transaction')
const saving = ref(false)
const formError = ref('')

const emptyForm = () => ({
  documentNo: '',
  invoiceDate: today(),
  accountingDate: today(),
  businessPartner: '',
  partnerAddress: '',
  paymentTerms: '',
  paymentMethod: '',
  priceList: '',
  kodePelanggan: '',
  orderReference: '',
  description: '',
  standAwal: 0,
  standAkhir: 0,
  totalUsage: 0,
})
const form = ref(emptyForm())

// ── customer combobox
const customerSearch = ref('')
const filteredCustomers = ref([])
const showCustomerDrop = ref(false)

// ── payment term lines
const paymentLines = ref([])
const paymentLinesLoading = ref(false)

// ── invoice lines
const lines = ref([])

// ── view modal
const showViewModal = ref(false)
const viewRow = ref(null)
const viewTab = ref('basic')
const viewLines = ref([])
const viewLinesLoading = ref(false)

// ── payment schedules
const paymentSchedules = ref([])
const paymentSchedulesLoading = ref(false)

// ── accounting
const accountingFacts = ref([])
const accountingLoading = ref(false)
const accountingError = ref('')

// ── delete modal
const showDeleteModal = ref(false)
const deleteRow = ref(null)
const deleting = ref(false)
const deleteError = ref('')

// ── posting
const posting = ref(false)

// ── completing
const completing = ref(false)

// ── unposting / reactivating / voiding / cancelling
const unposting    = ref(false)
const reactivating = ref(false)
const voiding      = ref(false)
const cancelling   = ref(false)
const adjusting    = ref(false)

// posted bisa boolean true atau string 'Y' tergantung Openbravo response
const isPosted = computed(() => {
  const p = viewRow.value?.posted
  return p === true || p === 'Y'
})

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

function formatCurrency(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)
}

function statusLabel(s) {
  const map = { DR: 'Draft', CO: 'Completed', CL: 'Closed', VO: 'Voided', RE: 'Reversed' }
  return map[s] || s || 'Unknown'
}

function statusClass(s) {
  if (s === 'DR') return 'status-pill--draft'
  if (s === 'CO') return 'status-pill--completed'
  if (s === 'CL') return 'status-pill--closed'
  return 'status-pill--draft'
}

// Payment status: rely solely on outstandingAmount from the API.
// NOTE: Openbravo sets paymentComplete=Y when invoice is Completed (not when paid),
// so paymentComplete cannot be used to determine payment status.
function paymentStatusLabel(r) {
  if (r.documentStatus === 'DR') return '—'
  if (r.documentStatus === 'VO') return '—'
  if (r.documentStatus === 'CL') return '—'
  // paymentComplete adalah field boolean asli di entity Invoice Openbravo
  if (r.paymentComplete === true || r.paymentComplete === 'Y') return 'Paid'
  return 'Unpaid'
}

function paymentStatusClass(r) {
  const label = paymentStatusLabel(r)
  if (label === 'Paid')    return 'pay-pill--paid'
  if (label === 'Partial') return 'pay-pill--partial'
  if (label === 'Unpaid')  return 'pay-pill--unpaid'
  return 'pay-pill--none'
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

// ── stored labels from full invoice fetch (fallback for edit modal)
const storedPaymentTermLabel  = ref('')
const storedPaymentMethodLabel = ref('')
const storedPriceListLabel     = ref('')

// ── computed labels
const paymentTermLabel = computed(() => {
  const found = paymentTerms.value.find(pt => pt.id === form.value.paymentTerms)
  return found?.name || storedPaymentTermLabel.value || ''
})
const paymentMethodLabel = computed(() => {
  const found = paymentMethods.value.find(pm => pm.id === form.value.paymentMethod)
  return found?.['_identifier'] || found?.name || storedPaymentMethodLabel.value || ''
})
const priceListLabel = computed(() => {
  const found = priceLists.value.find(pl => pl.id === form.value.priceList)
  return found?.name || storedPriceListLabel.value || ''
})

// ── load invoices
async function loadInvoices() {
  loading.value = true; error.value = ''
  try {
    const startRow = (currentPage.value - 1) * pageSize
    
    // Pastikan sortCol dan sortDir ikut dikirim ke dalam fungsi API!
    const data = await fetchAllInvoices({ 
      startRow, 
      pageSize, 
      searchKey: searchQuery.value,
      sortCol: sortCol.value, // <--- Baris ini wajib ada
      sortDir: sortDir.value  // <--- Baris ini wajib ada
    })
    
    rows.value = data.data ?? []
    const apiTotal = Number(data.totalRows ?? data.total ?? 0)
    if (startRow === 0 || totalCount.value === 0) {
      totalCount.value = apiTotal > 0 ? apiTotal : rows.value.length
    }
  } catch (e) {
    error.value = e?.response?.data?.response?.error?.message || e.message
  } finally { loading.value = false }
}

function goPage(p) { if (p >= 1 && p <= totalPages.value) { currentPage.value = p; loadInvoices() } }
function onSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(() => { currentPage.value = 1; totalCount.value = 0; loadInvoices() }, 400) }

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
  const [pt, pm, u, pl, tx] = await Promise.allSettled([
    fetchPaymentTerms(), fetchPaymentMethods(), fetchUOMs(), fetchPriceLists(), fetchTaxRates(),
  ])
  paymentTerms.value   = pt.status === 'fulfilled' ? (pt.value  ?? []) : []
  paymentMethods.value = pm.status === 'fulfilled' ? (pm.value ?? []) : []
  uoms.value           = u.status  === 'fulfilled' ? (u.value   ?? []) : []
  priceLists.value     = pl.status === 'fulfilled' ? (pl.value  ?? []) : []
  taxRates.value       = tx.status === 'fulfilled' ? (tx.value  ?? []) : []
}

// ── customer search
let customerTimer = null
async function onCustomerSearch() {
  showCustomerDrop.value = true
  clearTimeout(customerTimer)
  customerTimer = setTimeout(async () => {
    if (customerSearch.value.length < 1) { filteredCustomers.value = []; return }
    filteredCustomers.value = await fetchCustomers(customerSearch.value)
  }, 300)
}

function selectCustomer(c) {
  form.value.businessPartner = c.id
  customerSearch.value = c.name
  showCustomerDrop.value = false

  const extractId = (v) => {
    if (!v) return ''
    if (typeof v === 'object') return v.id || ''
    return String(v)
  }

  // Auto-fill kode pelanggan dari searchKey customer
  form.value.kodePelanggan = c.searchKey || c.value || ''

  const ptId = extractId(c.paymentTerms)
  const pmId = extractId(c.paymentMethod)
  const plId = extractId(c.priceList)

  if (ptId) form.value.paymentTerms  = ptId
  if (pmId) form.value.paymentMethod = pmId
  if (plId) form.value.priceList     = plId

  if (!ptId || !pmId || !plId || !form.value.kodePelanggan) {
    fetchCustomerById(c.id).then(detail => {
      if (!detail) return
      if (!form.value.kodePelanggan) form.value.kodePelanggan = detail.searchKey || detail.value || ''
      if (!form.value.paymentTerms)  form.value.paymentTerms  = extractId(detail.paymentTerms)
      if (!form.value.paymentMethod) form.value.paymentMethod = extractId(detail.paymentMethod)
      if (!form.value.priceList)     form.value.priceList     = extractId(detail.priceList)
    }).catch(e => console.warn('[selectCustomer] fallback failed:', e))
  }

  loadPartnerLocations(c.id)
}

async function loadPartnerLocations(bpId) {
  form.value.partnerAddress = ''
  partnerLocations.value = await fetchPartnerLocations(bpId)
  if (partnerLocations.value.length === 1) form.value.partnerAddress = partnerLocations.value[0].id
}

function onCustomerBlur() { setTimeout(() => { showCustomerDrop.value = false }, 150) }

// ── usage calc
function calcUsage() {
  const aw = Number(form.value.standAwal) || 0
  const ak = Number(form.value.standAkhir) || 0
  form.value.totalUsage = ak > aw ? ak - aw : 0
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
function openProductDrop(line, event) {
  const rect = event.currentTarget.getBoundingClientRect()
  line.dropStyle = {
    position: 'fixed',
    top:  rect.bottom + 2 + 'px',
    left: rect.left + 'px',
    width: rect.width + 'px',
    zIndex: 9999,
  }
  line.showDrop = true
}
function selectProduct(line, p) {
  line.product = p.id
  line.productSearch = p.name
  line.showDrop = false
  line.dropStyle = {}
  const uomId = p.uOM ? (typeof p.uOM === 'object' ? p.uOM.id : p.uOM) : ''
  if (uomId) {
    line.uOM = uomId
    const found = uoms.value.find(u => u.id === uomId)
    line.uomSearch = found ? (found.uOMSymbol || found.name) : (p['uOM$_identifier'] || uomId)
    line.uomOptions = found ? [found] : []
  }
  line.unitPrice = p.listPrice ?? p.standardPrice ?? 0
  calcLine(line)
}
function onProductBlur(line) { setTimeout(() => { line.showDrop = false; line.dropStyle = {} }, 150) }

// ── tax search per line
let taxTimers = new WeakMap()
function onTaxSearch(line) {
  line.showTaxDrop = true
  const t = taxTimers.get(line)
  if (t) clearTimeout(t)
  taxTimers.set(line, setTimeout(() => {
    const q = (line.taxSearch || '').toLowerCase()
    line.taxOptions = !q
      ? taxRates.value.slice(0, 30)
      : taxRates.value.filter(tx => (tx.name || '').toLowerCase().includes(q) || (tx.rate != null && String(tx.rate).includes(q))).slice(0, 30)
  }, 150))
}
function openTaxDrop(line, event) {
  if (!line.taxOptions.length) line.taxOptions = taxRates.value.slice(0, 30)
  const rect = event.currentTarget.getBoundingClientRect()
  line.taxDropStyle = {
    position: 'fixed',
    top:  rect.bottom + 2 + 'px',
    left: rect.left + 'px',
    width: Math.max(rect.width, 180) + 'px',
    zIndex: 9999,
  }
  line.showTaxDrop = true
}
function selectTax(line, tx) {
  line.tax = tx.id
  line.taxSearch = tx.name + (tx.rate != null ? ` (${tx.rate}%)` : '')
  line.showTaxDrop = false
  line.taxDropStyle = {}
}
function onTaxBlur(line) { setTimeout(() => { line.showTaxDrop = false }, 150) }

// ── UOM search per line
let uomTimers = new WeakMap()
async function onUomSearch(line) {
  line.showUomDrop = true
  const t = uomTimers.get(line)
  if (t) clearTimeout(t)
  uomTimers.set(line, setTimeout(async () => {
    const q = (line.uomSearch || '').toLowerCase()
    line.uomOptions = !q
      ? uoms.value.slice(0, 20)
      : uoms.value.filter(u => (u.uOMSymbol || '').toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q)).slice(0, 20)
  }, 200))
}
function selectUom(line, u) { line.uOM = u.id; line.uomSearch = u.uOMSymbol || u.name; line.showUomDrop = false }
function onUomBlur(line) { setTimeout(() => { line.showUomDrop = false }, 150) }

// ── line helpers
function newLine() {
  return {
    product: '', productSearch: '', invoicedQuantity: 1,
    uOM: '', uomSearch: '', uomOptions: [], showUomDrop: false,
    unitPrice: 0, lineNetAmount: 0, showDrop: false, productOptions: [],
    dropStyle: {},
    tax: '', taxSearch: '', taxOptions: [], showTaxDrop: false,
  }
}
function addLine() { lines.value.push(newLine()) }
async function removeLine(i) {
  const line = lines.value[i]
  if (line?.id) {
    try {
      await deleteInvoiceLine(line.id)
    } catch (e) {
      console.warn('[removeLine] Gagal hapus line dari ERP:', e.message)
    }
  }
  lines.value.splice(i, 1)
}
function calcLine(line) { line.lineNetAmount = parseFloat(line.invoicedQuantity || 0) * parseFloat(line.unitPrice || 0) }

// ── open modals
function openCreateModal() {
  isEdit.value = false; editId.value = null
  form.value = emptyForm(); lines.value = []; paymentLines.value = []
  customerSearch.value = ''; partnerLocations.value = []
  storedPaymentTermLabel.value = ''; storedPaymentMethodLabel.value = ''; storedPriceListLabel.value = ''
  formError.value = ''; activeFormTab.value = 'transaction'
  showFormModal.value = true
}

async function openEditModal(r) {
  closeDropdown()
  isEdit.value = true; editId.value = r.id
  activeFormTab.value = 'transaction'; formError.value = ''
  // showFormModal ditunda sampai data full invoice siap agar form tidak render dengan nilai kosong

  // Fetch full invoice data agar paymentTerms/paymentMethod/priceList terisi lengkap
  const extractId = (v) => !v ? '' : (typeof v === 'object' ? (v.id || '') : String(v))
  const extractName = (v) => !v ? '' : (typeof v === 'object' ? (v['_identifier'] || v.name || '') : '')
  let full = r
  try { full = await fetchInvoice(r.id) ?? r } catch (_) {}

  const bpId = extractId(full.businessPartner)

  // Isi form dengan data invoice
  form.value = {
    documentNo:      full.documentNo || '',
    invoiceDate:     full.invoiceDate?.slice(0, 10) || today(),
    accountingDate:  full.accountingDate?.slice(0, 10) || today(),
    businessPartner: bpId,
    partnerAddress:  extractId(full.partnerAddress),
    paymentTerms:    extractId(full.paymentTerms),
    paymentMethod:   extractId(full.paymentMethod),
    priceList:       extractId(full.priceList),
    kodePelanggan:   full.kodePelanggan   || '',
    orderReference:  full.orderReference  || '',
    description:     full.description     || '',
    standAwal:       full.standAwal       ?? 0,
    standAkhir:      full.standAkhir      ?? 0,
    totalUsage:      full.totalUsage      ?? 0,
  }

  // Langsung simpan label dari data invoice (sudah ada $identifier-nya)
  storedPaymentTermLabel.value   = full['paymentTerms$_identifier']  || ''
  storedPaymentMethodLabel.value = full['paymentMethod$_identifier'] || ''
  storedPriceListLabel.value     = full['priceList$_identifier']     || ''

  customerSearch.value = full['businessPartner$_identifier'] || r['businessPartner$_identifier'] || ''

  // Fetch customer detail hanya sebagai fallback bila invoice tidak punya data tsb
  if (bpId) {
    try {
      const detail = await fetchCustomerById(bpId)
      if (detail) {
        if (!form.value.kodePelanggan) form.value.kodePelanggan = detail.searchKey || detail.value || ''
        // Hanya overwrite jika invoice sendiri tidak punya nilainya
        const ptId = extractId(detail.paymentTerms)
        const pmId = extractId(detail.paymentMethod)
        const plId = extractId(detail.priceList)
        if (!form.value.paymentTerms  && ptId) { form.value.paymentTerms  = ptId; storedPaymentTermLabel.value   = detail['paymentTerms$_identifier']  || '' }
        if (!form.value.paymentMethod && pmId) { form.value.paymentMethod = pmId; storedPaymentMethodLabel.value = detail['paymentMethod$_identifier'] || '' }
        if (!form.value.priceList     && plId) { form.value.priceList     = plId; storedPriceListLabel.value     = detail['priceList$_identifier']     || '' }
      }
    } catch (e) { console.warn('[openEditModal] fetchCustomerById gagal:', e.message) }
  }

  await loadPartnerLocations(bpId)

  // Buka modal setelah semua data siap
  showFormModal.value = true

  const existingLines = await fetchInvoiceLines(r.id)
  lines.value = existingLines.map(l => {
    const foundUom = uoms.value.find(u => u.id === l.uOM)
    const taxId = typeof l.tax === 'object' ? l.tax?.id : (l.tax || '')
    const foundTax = taxRates.value.find(tx => tx.id === taxId)
    const taxLabel = foundTax
      ? foundTax.name + (foundTax.rate != null ? ` (${foundTax.rate}%)` : '')
      : (l['tax$_identifier'] || '')
    const productId = typeof l.product === 'object' ? l.product?.id : (l.product || '')
    const isAdjustment = productId === ADJUSTMENT_PRODUCT_ID
    return {
      id:               l.id,
      product:          productId,
      productSearch:    l['product$_identifier'] || '',
      invoicedQuantity: isAdjustment ? (l.invoicedQuantity < 0 ? -1 : 1) : (l.invoicedQuantity || 1),
      uOM:              l.uOM || '',
      uomSearch:        foundUom ? (foundUom.uOMSymbol || foundUom.name) : (l['uOM$_identifier'] || ''),
      uomOptions:       foundUom ? [foundUom] : [],
      showUomDrop:      false,
      unitPrice:        isAdjustment ? 0 : (l.unitPrice ?? l.grossUnitPrice ?? l.listPrice ?? 0),
      lineNetAmount:    isAdjustment ? 0 : (l.lineNetAmount ?? 0),
      showDrop:         false,
      dropStyle:        {},
      productOptions:   [],
      tax:              taxId,
      taxSearch:        taxLabel,
      taxOptions:       foundTax ? [foundTax] : [],
      showTaxDrop:      false,
      taxDropStyle:     {},
    }
  })
}

async function openViewModal(r) {
  closeDropdown()
  viewTab.value = 'basic'
  accountingFacts.value = []
  accountingError.value = ''
  paymentSchedules.value = []
  viewLinesLoading.value = true
  paymentSchedulesLoading.value = true

  // Fetch full invoice data agar basic info (paymentTerms, paymentMethod, dll) lengkap
  // Set viewRow dari full fetch agar paymentTerms$_identifier & paymentMethod$_identifier pasti ada
  viewRow.value = r           // tampilkan modal segera dengan data parsial
  showViewModal.value = true

  fetchInvoice(r.id)
    .then(full => { if (full) viewRow.value = full })
    .catch(() => {})

  // Run both fetches independently so each updates as soon as it resolves
  fetchInvoiceLines(r.id)
    .then(lines => { viewLines.value = lines })
    .catch(() => { viewLines.value = [] })
    .finally(() => { viewLinesLoading.value = false })

  fetchPaymentSchedules(r.id)
    .then(schedules => { paymentSchedules.value = schedules })
    .catch(() => { paymentSchedules.value = [] })
    .finally(() => { paymentSchedulesLoading.value = false })
}

function openEditFromView() {
  const r = viewRow.value
  if (!r) return
  showViewModal.value = false
  openEditModal(r)
}

function switchToPaymentPlan() {
  viewTab.value = 'paymentPlan'
}

async function switchToAccounting() {
  viewTab.value = 'accounting'
  if (accountingFacts.value.length > 0 || accountingLoading.value) return
  accountingLoading.value = true
  accountingError.value = ''
  try {
    accountingFacts.value = await fetchAccountingFacts(viewRow.value.id)
  } catch (e) {
    accountingError.value = e?.response?.data?.response?.error?.message || e.message || 'Failed to load accounting data'
  } finally { accountingLoading.value = false }
}

// ── save
async function saveInvoice() {
  if (!form.value.businessPartner) { formError.value = 'Customer wajib dipilih.'; return }
  if (!form.value.paymentTerms)    { formError.value = 'Payment Term tidak ditemukan. Pastikan customer memiliki Payment Term.'; return }
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
      for (let idx = 0; idx < lines.value.length; idx++) {
        const line = lines.value[idx]
        if (!line.product) continue
        const linePayload = {
          lineNo:           (idx + 1) * 10,
          product:          line.product,
          invoicedQuantity: line.invoicedQuantity,
          uOM:              line.uOM,
          unitPrice:        line.unitPrice,
          listPrice:        line.unitPrice,
          lineNetAmount:    line.lineNetAmount,
          grossUnitPrice:   line.unitPrice,
          discount:         0,
          ...(line.tax && { tax: line.tax }),
          businessPartner:  form.value.businessPartner,
          organization:     DEFAULT_ORGANIZATION,
        }
        if (line.id) await updateInvoiceLine(line.id, linePayload)
        else         await createInvoiceLine(invoiceId, linePayload)
      }
    }

    showFormModal.value = false
    showToast(isEdit.value ? 'Invoice updated!' : 'Invoice created!')
    await loadInvoices()
  } catch (e) {
    formError.value = e?.response?.data?.response?.error?.message || e.message
  } finally { saving.value = false }
}

// ── create invoice (Post Invoice = create baru ke API)
async function doPostInvoice() {
  if (!viewRow.value) return
  posting.value = true
  try {
    // 1. Create invoice header
    const created = await postInvoice(viewRow.value)
    const newInvoiceId = created?.id
    if (!newInvoiceId) throw new Error('Gagal mendapatkan ID invoice baru.')

    // 2. Create lines dari viewLines (sudah di-load saat openViewModal)
    const getId = (v) => !v ? null : (typeof v === 'object' ? v.id : String(v))
    const bpId  = getId(viewRow.value.businessPartner)
    const orgId = getId(viewRow.value.organization) || DEFAULT_ORGANIZATION
    const currentLines = viewLines.value.length > 0 ? viewLines.value : await fetchInvoiceLines(viewRow.value.id)
    for (let idx = 0; idx < currentLines.length; idx++) {
      const l = currentLines[idx]
      const prodId = getId(l.product)
      if (!prodId) continue
      await createInvoiceLine(newInvoiceId, {
        lineNo:           (idx + 1) * 10,
        product:          prodId,
        invoicedQuantity: l.invoicedQuantity || 1,
        uOM:              getId(l.uOM),
        unitPrice:        l.unitPrice || l.grossUnitPrice || l.listPrice || 0,
        tax:              getId(l.tax) || DEFAULT_TAX_ID,
        businessPartner:  bpId,
        organization:     orgId,
      })
    }

    showToast('Invoice created successfully!')
    showViewModal.value = false
    await loadInvoices()
  } catch (e) {
    showToast(e?.response?.data?.response?.error?.message || e.message || 'Failed to create invoice', 'error')
  } finally { posting.value = false }
}

// ── complete invoice via RunProcess (DocAction)
// Setelah Complete, otomatis membentuk Payment Plan, lalu user klik Post untuk jurnal accounting.
async function doCompleteInvoice() {
  if (!viewRow.value) return
  const invoiceId = viewRow.value.id
  completing.value = true
  try {
    // Step 1: Complete invoice (ubah status DR → CO)
    await runInvoiceProcess(invoiceId, viewRow.value)

    // Step 2: Ambil data invoice terbaru (grandTotalAmount, paymentMethod, dll sudah final)
    let freshInvoice = null
    try { freshInvoice = await fetchInvoice(invoiceId) } catch (_) {}
    const invoiceForPlan = freshInvoice || viewRow.value

    // Step 3: Buat Payment Plan (FIN_Payment_Schedule) secara otomatis
    try {
      await createPaymentPlan(invoiceId, invoiceForPlan)
      showToast('Invoice completed & payment plan terbentuk! Klik Post untuk membentuk jurnal accounting.')
    } catch (planErr) {
      console.error('[doCompleteInvoice] Payment plan gagal:', planErr.message)
      showToast('Invoice completed, tapi payment plan gagal: ' + planErr.message, 'error')
    }

    // Step 4: Reload list, view & payment schedules
    await loadInvoices()
    if (freshInvoice) viewRow.value = freshInvoice
    else { const updated = rows.value.find(r => r.id === invoiceId); if (updated) viewRow.value = updated; else showViewModal.value = false }

    // Step 5: Reload payment schedules so they appear immediately
    paymentSchedulesLoading.value = true
    fetchPaymentSchedules(invoiceId)
      .then(s => { paymentSchedules.value = s })
      .catch(() => {})
      .finally(() => { paymentSchedulesLoading.value = false })
  } catch (e) {
    showToast(e?.message || 'Failed to complete invoice', 'error')
  } finally { completing.value = false }
}

// ── post accounting — dipanggil saat user klik tombol Post di modal view
async function doPostAccounting() {
  if (!viewRow.value) return
  const invoiceId = viewRow.value.id
  posting.value = true
  let postError = null
  try {
    await postAccountingProcess(invoiceId, viewRow.value)
    showToast('Invoice posted successfully! Jurnal accounting terbentuk.')
  } catch (e) {
    postError = e
    showToast(e?.message || 'Failed to post invoice', 'error')
  }

  // Reload data & accounting tab terlepas dari sukses/gagal
  try {
    await loadInvoices()
    const fresh = await fetchInvoice(invoiceId)
    if (fresh) viewRow.value = fresh
    else { const updated = rows.value.find(r => r.id === invoiceId); if (updated) viewRow.value = updated }
  } catch (_) {}

  // Auto-switch ke tab Accounting dan reload facts
  accountingFacts.value = []
  accountingError.value = ''
  viewTab.value = 'accounting'
  accountingLoading.value = true
  try {
    accountingFacts.value = await fetchAccountingFacts(invoiceId)
  } catch (e2) {
    accountingError.value = e2?.response?.data?.response?.error?.message || e2.message || 'Failed to load accounting data'
  } finally {
    accountingLoading.value = false
    posting.value = false
  }
}

async function doUnpostAccounting() {
  if (!viewRow.value) return
  const invoiceId = viewRow.value.id
  unposting.value = true
  try {
    await unpostAccountingProcess(invoiceId, viewRow.value)
    showToast('Invoice unposted. Jurnal accounting dihapus.')
  } catch (e) {
    showToast(e?.message || 'Failed to unpost invoice', 'error')
  }

  // Reload data & kosongkan accounting tab terlepas dari sukses/gagal
  try {
    await loadInvoices()
    const fresh = await fetchInvoice(invoiceId)
    if (fresh) viewRow.value = fresh
    else { const updated = rows.value.find(r => r.id === invoiceId); if (updated) viewRow.value = updated }
  } catch (_) {}

  // Reset accounting tab ke kosong
  accountingFacts.value = []
  accountingError.value = ''
  viewTab.value = 'accounting'
  accountingLoading.value = true
  try {
    accountingFacts.value = await fetchAccountingFacts(invoiceId)
  } catch (e2) {
    accountingError.value = e2?.response?.data?.response?.error?.message || e2.message || 'Failed to load accounting data'
  } finally {
    accountingLoading.value = false
    unposting.value = false
  }
}

async function doReactivateInvoice() {
  if (!viewRow.value) return
  const invoiceId = viewRow.value.id
  reactivating.value = true
  try {
    const updated = await reactivateInvoice(invoiceId, viewRow.value)
    paymentSchedules.value = []
    showToast('Invoice reactivated. Status kembali ke Draft.')
    await loadInvoices()
    const refreshed = rows.value.find(r => r.id === invoiceId)
    viewRow.value = refreshed || updated
  } catch (e) {
    showToast(e?.message || 'Failed to reactivate invoice', 'error')
  } finally { reactivating.value = false }
}

async function doVoidInvoice() {
  if (!viewRow.value) return
  const invoiceId = viewRow.value.id
  voiding.value = true
  try {
    const updated = await voidInvoice(invoiceId, viewRow.value)
    showToast('Invoice voided.')
    await loadInvoices()
    const refreshed = rows.value.find(r => r.id === invoiceId)
    viewRow.value = refreshed || updated
  } catch (e) {
    showToast(e?.message || 'Failed to void invoice', 'error')
  } finally { voiding.value = false }
}

// ── cancel invoice: validasi → unpost → reactivate → qty=0 → CL
async function doCancelInvoice() {
  if (!viewRow.value) return
  const invoiceId = viewRow.value.id
  cancelling.value = true
  try {
    const { invoice: updated, iotError } = await cancelInvoice(invoiceId, viewRow.value)
    if (iotError) {
      showToast(`Invoice cancelled, namun sinkronisasi IoT gagal: ${iotError}`, 'warning')
    } else {
      showToast('Invoice cancelled. Semua quantity di-nolkan dan status menjadi Closed (CL).')
    }
    paymentSchedules.value = []
    accountingFacts.value  = []
    accountingError.value  = ''
    await loadInvoices()
    const refreshed = rows.value.find(r => r.id === invoiceId)
    viewRow.value = refreshed || updated

    // Reload view lines agar qty = 0 langsung terlihat
    viewLinesLoading.value = true
    fetchInvoiceLines(invoiceId)
      .then(l => { viewLines.value = l })
      .catch(() => { viewLines.value = [] })
      .finally(() => { viewLinesLoading.value = false })
  } catch (e) {
    showToast(e?.message || 'Failed to cancel invoice', 'error')
  } finally { cancelling.value = false }
}

// ── adjustment invoice: unpost jika perlu → reactivate ke Draft → tambah line Adjustment → buka Edit modal
async function doAdjustmentInvoice() {
  if (!viewRow.value) return
  const invoiceId = viewRow.value.id
  adjusting.value = true
  try {
    const { invoice: updated } = await adjustmentInvoice(invoiceId, viewRow.value)
    paymentSchedules.value = []
    accountingFacts.value  = []
    accountingError.value  = ''
    await loadInvoices()
    const refreshed = rows.value.find(r => r.id === invoiceId) || updated

    // Tutup view modal, tunggu Vue flush DOM, lalu buka Edit modal
    showViewModal.value = false
    await nextTick()
    await openEditModal(refreshed)
  } catch (e) {
    showToast(e?.message || 'Adjustment gagal', 'error')
  } finally { adjusting.value = false }
}

// ── delete
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

function closeFormModal() { showFormModal.value = false }

// ── watch paymentTerms → load payment term lines
watch(() => form.value.paymentTerms, async (newVal) => {
  paymentLines.value = []
  if (!newVal) return
  paymentLinesLoading.value = true
  try {
    const fetched = await fetchPaymentTermLines(newVal)
    if (fetched.length > 0) {
      paymentLines.value = fetched
    } else {
      const header = paymentTerms.value.find(pt => pt.id === newVal)
      if (header) {
        paymentLines.value = [{
          id: header.id, line: 10,
          offsetDays: header.overduePaymentDaysRule ?? header.offsetMonthDue ?? 0,
          percentage: null, fixedAmount: null,
        }]
      }
    }
  } finally { paymentLinesLoading.value = false }
})

// ── FUNGSI PRINT PDF ──
async function doPrint() {
  if (!viewRow.value) return
  try {
    // Generate PDF pakai service
    await generateDocumentPDF('Customer Invoice', viewRow.value, viewLines.value)
    showToast('Dokumen PDF berhasil diunduh.')
  } catch (error) {
    console.error('Error printing PDF:', error)
    showToast('Gagal men-generate PDF.', 'error')
  }
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
  --success: #22c55e; --danger: #ef4444; --warning: #f59e0b;
  --radius: 10px; --radius-sm: 6px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,.06);
  --shadow-md: 0 4px 16px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,.04);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
.layout { display: flex; flex-direction: column; min-height: 100vh; background: var(--bg); font-family: var(--font); }
.main { flex: 1; padding: 28px 24px; max-width: 1280px; margin: 0 auto; width: 100%; }
.content-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-sm); overflow: hidden; }

.page-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); }
.page-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }

.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--border); }
.search-wrap { position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 10px; color: var(--text-muted); pointer-events: none; }
.search-input { height: 36px; padding: 0 12px 0 32px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; font-family: var(--font); background: var(--surface2); width: 240px; transition: border-color .15s; }
.search-input:focus { border-color: var(--accent); background: #fff; }

.btn { display: inline-flex; align-items: center; gap: 6px; padding: 0 16px; height: 36px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font); transition: all .15s; }
.btn--primary { background: var(--accent); color: #fff; }
.btn--primary:hover { background: #2563eb; }
.btn--primary:disabled { opacity: .6; cursor: not-allowed; }
.btn--ghost { background: var(--surface2); border: 1px solid var(--border); color: var(--text-secondary); }
.btn--ghost:hover { background: var(--border); }
.btn--danger { background: var(--danger); color: #fff; }
.btn--danger:hover { background: #dc2626; }
.btn--danger:disabled { opacity: .6; cursor: not-allowed; }
.btn--edit { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; border-radius: var(--radius-sm); padding: 0 16px; height: 36px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all .15s; font-family: var(--font); }
.btn--edit:hover { background: #e2e8f0; color: var(--text-primary); }
.btn--complete { background: #16a34a; color: #fff; border: none; border-radius: var(--radius-sm); padding: 0 16px; height: 36px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: var(--font); transition: all .15s; }
.btn--complete:hover:not(:disabled) { background: #15803d; }
.btn--complete:disabled { opacity: .4; cursor: not-allowed; }
.btn--post { background: #7c3aed; color: #fff; border: none; border-radius: var(--radius-sm); padding: 0 16px; height: 36px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: var(--font); transition: all .15s; }
.btn--post:hover:not(:disabled) { background: #6d28d9; }
.btn--post:disabled { opacity: .4; cursor: not-allowed; }
.btn--unpost { background: #ea580c; color: #fff; border: none; border-radius: var(--radius-sm); padding: 0 16px; height: 36px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: var(--font); transition: all .15s; }
.btn--unpost:hover:not(:disabled) { background: #c2410c; }
.btn--unpost:disabled { opacity: .4; cursor: not-allowed; }
.btn--reactivate { background: #0284c7; color: #fff; border: none; border-radius: var(--radius-sm); padding: 0 16px; height: 36px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: var(--font); transition: all .15s; }
.btn--reactivate:hover:not(:disabled) { background: #0369a1; }
.btn--reactivate:disabled { opacity: .4; cursor: not-allowed; }
.btn--void { background: #dc2626; color: #fff; border: none; border-radius: var(--radius-sm); padding: 0 16px; height: 36px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: var(--font); transition: all .15s; }
.btn--void:hover:not(:disabled) { background: #b91c1c; }
.btn--void:disabled { opacity: .4; cursor: not-allowed; }
.btn--cancel { background: #374151; color: #fff; border: none; border-radius: var(--radius-sm); padding: 0 16px; height: 36px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: var(--font); transition: all .15s; }
.btn--cancel:hover:not(:disabled) { background: #1f2937; }
.btn--cancel:disabled { opacity: .4; cursor: not-allowed; }

.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table thead th { background: var(--surface2); color: var(--text-muted); font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; padding: 10px 16px; border-bottom: 1px solid var(--border); white-space: nowrap; text-align: left; }

/* ── Sorting Headers ── */
.sortable {
  cursor: pointer;
  user-select: none;
  position: relative;
  padding-right: 20px !important; /* Ruang untuk panah */
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
  opacity: 0.3; /* Samar jika kolom tidak aktif */
}
.sortable::before {
  /* Panah Atas (Ascending) */
  border-bottom-color: currentColor;
  margin-top: -9px;
}
.sortable::after {
  /* Panah Bawah (Descending) */
  border-top-color: currentColor;
  margin-top: 1px;
}
.sortable.asc::before {
  opacity: 1; /* Terang saat Ascending */
  color: var(--accent);
}
.sortable.desc::after {
  opacity: 1; /* Terang saat Descending */
  color: var(--accent);
}

.table--lines thead th { padding: 8px 12px; }
.table--lines tbody td { padding: 6px 12px; }
.th-action { text-align: right; width: 80px; }
.table tbody tr td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tr-data:hover { background: var(--surface2); }
.tr-data:last-child td { border-bottom: none; }

.code-badge { font-family: var(--font-mono); font-size: 11.5px; font-weight: 500; background: var(--surface2); border: 1px solid var(--border); padding: 3px 8px; border-radius: 4px; color: var(--text-secondary); white-space: nowrap; }
.td-secondary { color: var(--text-secondary); font-size: 13px; }
.td-muted { color: var(--text-muted); }
.td-clip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.td-name { font-weight: 500; }
.td-empty { text-align: center; color: var(--text-muted); padding: 48px 16px; font-size: 13px; }
.td-error { color: var(--danger); }
.td-action-cell { text-align: right; overflow: visible !important; }

.status-pill { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
.status-pill--draft { background: #f1f5f9; color: #64748b; }
.status-pill--completed { background: #eff6ff; color: #1d4ed8; }
.status-pill--closed { background: #fef3c7; color: #92400e; }
.status-pill--open { background: #f0fdf4; color: #16a34a; }

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
.page-ellipsis { color: var(--text-muted); padding: 0 4px; font-size: 13px; }

/* ── Modal ── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(2px); }
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); width: 100%; max-width: 480px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; }
.modal--xxl { max-width: 1060px; }
.modal--sm { max-width: 400px; }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 20px 12px; border-bottom: 1px solid var(--border); gap: 12px; flex-shrink: 0; }
.modal-breadcrumb { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-muted); margin-bottom: 4px; }
.bc-active { color: var(--accent); font-weight: 500; }
.modal-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.modal-close { background: none; border: none; color: var(--text-muted); display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; transition: background .12s; flex-shrink: 0; }
.modal-close:hover { background: var(--surface2); color: var(--text-primary); }
.modal-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); padding: 0 20px; flex-shrink: 0; }
.modal-tab { padding: 10px 14px; font-size: 13px; font-weight: 500; color: var(--text-secondary); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-family: var(--font); transition: all .15s; margin-bottom: -1px; }
.modal-tab--active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
.modal-body { padding: 20px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0; align-items: center; }

/* ── Form ── */
.form-grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group--full { grid-column: 1 / -1; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-input { width: 100%; height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); }
.form-input:focus { border-color: var(--accent); background: #fff; }
.form-input:disabled { opacity: .6; cursor: not-allowed; background: #f1f5f9; }
.form-input--sm { height: 32px; font-size: 12.5px; }
.req { color: var(--danger); }
.form-api-error { margin-top: 14px; padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; }

.section-divider { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin: 20px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.btn-add-line { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--accent); background: var(--accent-light); border: 1px solid #bfdbfe; border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-family: var(--font); transition: background .12s; }
.btn-add-line:hover { background: #dbeafe; }
.btn-rm-line { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: #fee2e2; color: var(--danger); border: none; cursor: pointer; transition: background .12s; }
.btn-rm-line:hover { background: #fecaca; }
.table--lines { table-layout: fixed; min-width: 820px; }
.table--lines th, .table--lines td { padding: 8px 10px; vertical-align: middle; }
.table--lines .form-input--sm, .table--lines .acc-input--sm { width: 100%; min-width: 0; }

/* Combobox */
.acc-wrap { position: relative; width: 100%; }
.acc-input { display: block; width: 100%; height: 36px; padding: 0 32px 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.acc-input:focus { border-color: var(--accent); background: #fff; }
.acc-input--sm { height: 32px; font-size: 12.5px; }
.acc-chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.acc-dropdown { position: absolute; z-index: 300; top: calc(100% + 3px); left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); max-height: 200px; overflow-y: auto; list-style: none; margin: 0; padding: 4px 0; }
.acc-dropdown--teleport { position: fixed; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); max-height: 200px; overflow-y: auto; list-style: none; margin: 0; padding: 4px 0; }
.tax-rate-badge { margin-left: 6px; font-size: 11px; font-weight: 600; color: var(--text-muted); background: var(--surface2); border: 1px solid var(--border); border-radius: 4px; padding: 1px 5px; }
.acc-opt { padding: 8px 12px; font-size: 12.5px; color: var(--text-primary); cursor: pointer; transition: background .1s; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.acc-opt:hover { background: var(--accent-light); }
.acc-empty { padding: 8px 12px; font-size: 12.5px; color: var(--text-muted); font-style: italic; }

/* Detail view */
.detail-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-item--full { grid-column: 1 / -1; }
.detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.detail-value { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }
.detail-value.mono { font-family: var(--font-mono); font-size: 12.5px; }

/* Totals */
.totals-block { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 12px; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.totals-row { display: flex; justify-content: space-between; gap: 48px; font-size: 13px; color: var(--text-secondary); min-width: 260px; }
.totals-row--grand { font-weight: 700; font-size: 14px; color: var(--text-primary); border-top: 1px solid var(--border); padding-top: 6px; margin-top: 2px; }

/* Accounting */
.acc-summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; }
.acc-summary-item { display: flex; flex-direction: column; gap: 4px; }
.acc-summary-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); }
.acc-summary-value { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.acc-summary-value--debit  { color: #2563eb; }
.acc-summary-value--credit { color: #16a34a; }
.acc-code { font-family: var(--font-mono); font-size: 11.5px; font-weight: 600; color: var(--text-primary); }
.acc-debit  { color: #2563eb; font-weight: 600; }
.acc-credit { color: #16a34a; font-weight: 600; }
.acc-type-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.acc-type--actual { background: #eff6ff; color: #1d4ed8; }
.acc-type--other  { background: var(--surface2); color: var(--text-muted); }
.acc-totals-row { background: var(--surface2); border-top: 2px solid var(--border); }
.acc-totals-row td { border-bottom: none !important; }

/* Delete modal */
.delete-text { font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); }
.delete-text strong { color: var(--text-primary); }

/* Toast */
.toast { position: fixed; bottom: 24px; right: 24px; z-index: 2000; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); }
.toast--success { background: #16a34a; color: #fff; }
.toast--error   { background: var(--danger); color: #fff; }
.toast--warning { background: #d97706; color: #fff; }
.fade-enter-active,.fade-leave-active { transition: opacity .15s; }
.fade-enter-from,.fade-leave-to { opacity: 0; }

/* Spinner */
.spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Payment status pill (list table) */
.pay-pill { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; white-space: nowrap; }
.pay-pill--paid    { background: #dcfce7; color: #16a34a; }
.pay-pill--partial { background: #fef9c3; color: #b45309; }
.pay-pill--unpaid  { background: #fee2e2; color: #dc2626; }
.pay-pill--none    { background: transparent; color: var(--text-muted); }

/* Payment Plan */
.pp-badge { display: inline-flex; align-items: center; background: #eff6ff; color: #2563eb; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; text-transform: none; letter-spacing: 0; }
.pp-empty { padding: 16px 0; font-size: 13px; color: var(--text-muted); font-style: italic; }
.pp-paid { color: #16a34a; font-weight: 600; }
.pp-outstanding { color: #dc2626; font-weight: 600; }
.pp-status { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.pp-status--paid    { background: #dcfce7; color: #16a34a; } /* Paid */
.pp-status--partial { background: #fef9c3; color: #b45309; }
.pp-status--unpaid  { background: #fee2e2; color: #dc2626; }

/* Adjustment button */
.btn--adjustment { background: #f59e0b; color: #fff; border: none; display: inline-flex; align-items: center; gap: 6px; padding: 0 14px; height: 34px; border-radius: var(--radius-sm); font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: var(--font); transition: background .12s; }
.btn--adjustment:hover:not(:disabled) { background: #d97706; }
.btn--adjustment:disabled { opacity: .55; cursor: not-allowed; }
</style>