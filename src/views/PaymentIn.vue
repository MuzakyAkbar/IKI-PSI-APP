<template>
  <div class="layout">
    <main class="main">
      <div class="content-card">

        <div class="page-header">
          <h2 class="page-title">Payment In</h2>
        </div>

        <!-- ══ TOOLBAR ══ -->
        <div class="toolbar">
          <div class="search-wrap">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input v-model="searchQuery" class="search-input" placeholder="Search document no or customer..." @input="onSearch" />
          </div>
          <button class="btn btn--primary" @click="openCreateModal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Create Payment In
          </button>
        </div>

        <!-- ══ TABLE ══ -->
        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th>Document No.</th>
              <th>Payment Date</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Deposit To</th>
              <th>Status</th>
              <th class="th-action">Action</th>
            </tr></thead>
            <tbody>
              <tr v-if="loading"><td colspan="7" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
              <tr v-else-if="error"><td colspan="7" class="td-empty td-error">{{ error }}</td></tr>
              <tr v-else-if="rows.length === 0"><td colspan="7" class="td-empty">No payment records found.</td></tr>
              <template v-else>
                <tr v-for="r in rows" :key="r.id" class="tr-data">
                  <td><span class="code-badge">{{ r.documentNo || '—' }}</span></td>
                  <td class="td-secondary">{{ formatDate(r.paymentDate) }}</td>
                  <td class="td-clip td-name">{{ bpName(r) }}</td>
                  <td class="td-secondary">{{ formatCurrency(r.amount) }}</td>
                  <td class="td-secondary">{{ r['account$_identifier'] || '—' }}</td>
                  <td><span :class="['status-pill', payStatusClass(r.status)]">{{ payStatusLabel(r.status) }}</span></td>
                  <td class="td-action-cell">
                    <div class="action-group">
                      <div class="dropdown-wrap" v-click-outside="closeDropdown">
                        <button class="action-btn action-btn--more" @click.stop="toggleDropdown(r.id, $event)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                        <div v-if="openDropdown === r.id" class="dropdown-menu" :style="{ top: dropdownPos.top + 'px', right: dropdownPos.right + 'px' }" @click.stop>
                          <button class="dropdown-item" @click="openViewModal(r); closeDropdown()">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>View
                          </button>
                          <button v-if="r.status === 'RPAP'" class="dropdown-item" @click="openEditModal(r); closeDropdown()">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit
                          </button>
                          <button v-if="r.status === 'RPAP'" class="dropdown-item dropdown-item--danger" @click="confirmDelete(r); closeDropdown()">
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
        <div class="modal modal--xl">

          <!-- Header -->
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Dashboard</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span>Payment In</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">{{ isEdit ? 'Edit' : 'Create' }} Payment In</span>
              </div>
              <div class="modal-title">{{ isEdit ? 'Edit' : 'Create' }} Payment In</div>
            </div>
            <button class="modal-close" @click="closeFormModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Status bar -->
          <div class="pay-statusbar">
            <span class="pay-statusbar-item">
              <span class="pay-statusbar-label">Status:</span>
              <span class="pay-statusbar-val pay-statusbar-val--status">{{ isEdit ? payStatusLabel(form.status) : 'Awaiting Payment' }}</span>
            </span>
            <span class="pay-statusbar-sep">|</span>
            <span class="pay-statusbar-item"><span class="pay-statusbar-label">Generated Credit:</span><span class="pay-statusbar-val">0.00</span></span>
            <span class="pay-statusbar-sep">|</span>
            <span class="pay-statusbar-item"><span class="pay-statusbar-label">Used Credit:</span><span class="pay-statusbar-val">0.00</span></span>
            <span class="pay-statusbar-sep">|</span>
            <span class="pay-statusbar-item"><span class="pay-statusbar-label">Write-off Amount:</span><span class="pay-statusbar-val">0.00</span></span>
          </div>

          <!-- Tabs -->
          <div class="modal-tabs">
            <button :class="['modal-tab', activeFormTab === 'header' ? 'modal-tab--active' : '']" @click="activeFormTab = 'header'">Header</button>
            <button :class="['modal-tab', activeFormTab === 'detail' ? 'modal-tab--active' : '']" @click="switchToDetailTab" :disabled="!savedPaymentId && !isEdit">Detail / Add Invoice</button>
          </div>

          <!-- Body -->
          <div class="modal-body">

            <!-- ── Header Tab ── -->
            <div v-if="activeFormTab === 'header'">
              <div class="form-grid-3">

                <div class="form-group">
                  <label>Organization</label>
                  <input value="XYZ" class="form-input" disabled />
                </div>
                <div class="form-group">
                  <label>Document Type</label>
                  <input value="AR Receipt" class="form-input" disabled />
                </div>
                <div class="form-group">
                  <label>Document No.</label>
                  <input v-model="form.documentNo" class="form-input" placeholder="Auto-generated" disabled />
                </div>

                <div class="form-group">
                  <label>Payment Date <span class="req">*</span></label>
                  <input v-model="form.paymentDate" type="date" class="form-input" />
                </div>
                <div class="form-group form-group--full">
                  <label>Received From <span class="req">*</span></label>
                  <div class="acc-wrap">
                    <input
                      v-model="customerSearch"
                      class="acc-input"
                      placeholder="Search customer..."
                      :disabled="isEdit"
                      @input="onCustomerSearch"
                      @focus="showCustomerDrop = true"
                      @blur="onCustomerBlur"
                    />
                    <svg class="acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                    <ul v-if="showCustomerDrop && filteredCustomers.length" class="acc-dropdown">
                      <li v-for="c in filteredCustomers" :key="c.id" class="acc-opt" @mousedown.prevent="selectCustomer(c)">{{ c.name }}</li>
                    </ul>
                    <ul v-else-if="showCustomerDrop && customerSearch.length > 1 && !customerLoading" class="acc-dropdown">
                      <li class="acc-empty">No customers found</li>
                    </ul>
                  </div>
                </div>

                <div class="form-group">
                  <label>Payment Method <span class="req">*</span></label>
                  <select v-model="form.paymentMethod" class="form-input">
                    <option value="">Select</option>
                    <option v-for="m in paymentMethods" :key="m.id" :value="m.id">{{ m.name }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Deposit To <span class="req">*</span></label>
                  <select v-model="form.financialAccount" class="form-input">
                    <option value="">Select</option>
                    <option v-for="a in financialAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Currency</label>
                  <input value="IDR" class="form-input" disabled />
                </div>

                <div class="form-group">
                  <label>Reference No.</label>
                  <input v-model="form.referenceNo" class="form-input" placeholder="Reference No." />
                </div>
                <div class="form-group form-group--full">
                  <label>Description</label>
                  <input v-model="form.description" class="form-input" placeholder="Description" />
                </div>

              </div>

              <div v-if="!isEdit && !savedPaymentId" class="info-box info-box--blue" style="margin-top:16px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Simpan header terlebih dahulu, lalu buka tab <strong>Detail / Add Invoice</strong> untuk menambahkan invoice.
              </div>
              <div v-if="savedPaymentId && !isEdit" class="info-box info-box--green" style="margin-top:16px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Header tersimpan. Buka tab <strong>Detail / Add Invoice</strong> untuk melanjutkan pembayaran invoice.
              </div>
            </div>

            <!-- ── Detail Tab ── -->
            <div v-if="activeFormTab === 'detail'">

              <div class="pay-detail-summary">
                <div class="pay-ds-item">
                  <span class="pay-ds-label">Payment Document No.</span>
                  <span class="pay-ds-val mono">{{ form.documentNo || '—' }}</span>
                </div>
                <div class="pay-ds-item">
                  <span class="pay-ds-label">Reference No.</span>
                  <span class="pay-ds-val">{{ form.referenceNo || '—' }}</span>
                </div>
                <div class="pay-ds-item">
                  <span class="pay-ds-label">Currency</span>
                  <span class="pay-ds-val">IDR</span>
                </div>
                <div class="pay-ds-item">
                  <span class="pay-ds-label">Received From</span>
                  <span class="pay-ds-val">{{ customerSearch || '—' }}</span>
                </div>
                <div class="pay-ds-item">
                  <span class="pay-ds-label">Payment Method</span>
                  <span class="pay-ds-val">{{ selectedPaymentMethodName }}</span>
                </div>
                <div class="pay-ds-item">
                  <span class="pay-ds-label">Payment Date</span>
                  <span class="pay-ds-val">{{ form.paymentDate || '—' }}</span>
                </div>
                <div class="pay-ds-item">
                  <span class="pay-ds-label">Deposit To</span>
                  <span class="pay-ds-val">{{ selectedFinAccName }}</span>
                </div>
                <div class="pay-ds-item pay-ds-item--amount">
                  <span class="pay-ds-label">Actual Payment</span>
                  <span class="pay-ds-val pay-ds-val--amount">{{ formatCurrency(totalSelectedAmount) }}</span>
                </div>
                <div class="pay-ds-item">
                  <span class="pay-ds-label">Expected Payment</span>
                  <span class="pay-ds-val">{{ formatCurrency(totalOutstandingAmount) }}</span>
                </div>
              </div>

              <div class="section-divider" style="margin-top:16px">
                <div style="display:flex;align-items:center;gap:8px">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                  <span>Order / Invoice</span>
                </div>
              </div>

              <div class="pay-detail-filter">
                <button class="btn-add-line" @click="loadOutstandingInvoices" :disabled="invoiceLoading || !form.businessPartner" style="margin-left:8px">
                  <span v-if="invoiceLoading" class="spinner spinner--dark"></span>
                  <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.22-8.56"/><polyline points="21 3 21 9 15 9"/></svg>
                  {{ invoiceLoading ? 'Loading...' : (invoicesLoaded ? 'Refresh' : 'Load') }}
                </button>
              </div>

              <div v-if="invoiceCheckMsg" :class="['info-box', invoiceCheckMsg.type === 'error' ? 'info-box--red' : invoiceCheckMsg.type === 'warn' ? 'info-box--yellow' : 'info-box--green']" style="margin-bottom:12px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ invoiceCheckMsg.text }}
              </div>

              <div class="table-wrap" style="margin-bottom:0">
                <table class="table">
                  <thead><tr>
                    <th style="width:40px;text-align:center">
                      <input type="checkbox" v-model="selectAllInvoices" @change="toggleAllInvoices" :disabled="outstandingInvoices.length === 0" />
                    </th>
                    <th>Order No.</th>
                    <th>Invoice No.</th>
                    <th>Type</th>
                    <th>Business Partner</th>
                    <th>Date</th>
                    <th style="text-align:right">Amount</th>
                    <th style="text-align:right">Outstanding</th>
                  </tr></thead>
                  <tbody>
                    <tr v-if="invoiceLoading">
                      <td colspan="8" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td>
                    </tr>
                    <tr v-else-if="!invoicesLoaded">
                      <td colspan="8" class="td-empty" style="color:var(--text-muted);font-style:italic">Klik "Load" untuk melihat tagihan outstanding.</td>
                    </tr>
                    <tr v-else-if="outstandingInvoices.length === 0">
                      <td colspan="8" class="td-empty">No items to show.</td>
                    </tr>
                    <tr v-else v-for="inv in outstandingInvoices" :key="inv.id + (inv._type||'')" class="tr-data" :class="{ 'tr-selected': inv.selected }">
                      <td style="text-align:center"><input type="checkbox" v-model="inv.selected" @change="onInvoiceSelect" /></td>
                      <td class="td-secondary">{{ inv.orderReference || '—' }}</td>
                      <td><span class="code-badge">{{ inv.documentNo || '—' }}</span></td>
                      <td class="td-secondary"><span :class="['type-badge', inv._type === 'order' ? 'type-badge--order' : 'type-badge--invoice']">{{ inv._type === 'order' ? 'Order' : 'Invoice' }}</span></td>
                      <td class="td-secondary">{{ customerSearch }}</td>
                      <td class="td-secondary">{{ formatDate(inv.invoiceDate) }}</td>
                      <td class="td-secondary" style="text-align:right">{{ formatCurrency(inv.grandTotalAmount) }}</td>
                      <td class="td-secondary" style="text-align:right;font-weight:600;color:var(--danger)">{{ formatCurrency(inv.outstandingAmount) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="pay-detail-footer">
                <div class="totals-block" style="margin-top:0">
                  <div class="totals-row"><span>Selected</span><span>{{ selectedInvoices.length }} invoice(s)</span></div>
                  <div class="totals-row totals-row--grand"><span>Total Payment</span><span>{{ formatCurrency(totalSelectedAmount) }}</span></div>
                </div>
                <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">
                  <button class="btn btn--ghost" @click="closeFormModal">Cancel</button>
                  <button class="btn btn--primary" :disabled="paying || selectedInvoices.length === 0" @click="processPayment">
                    <span v-if="paying" class="spinner"></span>
                    {{ paying ? 'Processing...' : 'Done' }}
                  </button>
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
            <button class="btn btn--ghost" @click="closeFormModal">{{ activeFormTab === 'detail' ? 'Close' : 'Cancel' }}</button>
            <button v-if="activeFormTab === 'header'" class="btn btn--primary" :disabled="saving" @click="saveHeader">
              <span v-if="saving" class="spinner"></span>
              {{ saving ? 'Saving...' : (isEdit ? 'Update' : 'Save Header') }}
            </button>
            <button v-if="activeFormTab === 'header' && (savedPaymentId || isEdit)" class="btn btn--secondary" @click="switchToDetailTab">
              Next: Add Invoice →
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
        <div class="modal modal--xl">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Dashboard</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span>Payment In</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">View Payment</span>
              </div>
              <div class="modal-title">Payment — {{ viewRow?.documentNo }}</div>
            </div>
            <button class="modal-close" @click="showViewModal = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Status bar -->
          <div class="pay-statusbar">
            <span class="pay-statusbar-item">
              <span class="pay-statusbar-label">Status:</span>
              <span :class="['pay-statusbar-val pay-statusbar-val--status', payStatusClass(viewRow?.status)]">{{ payStatusLabel(viewRow?.status) }}</span>
            </span>
            <span class="pay-statusbar-sep">|</span>
            <span class="pay-statusbar-item"><span class="pay-statusbar-label">Generated Credit:</span><span class="pay-statusbar-val">{{ formatCurrency(viewRow?.generatedCredit ?? 0) }}</span></span>
            <span class="pay-statusbar-sep">|</span>
            <span class="pay-statusbar-item"><span class="pay-statusbar-label">Used Credit:</span><span class="pay-statusbar-val">{{ formatCurrency(viewRow?.usedCredit ?? 0) }}</span></span>
            <span class="pay-statusbar-sep">|</span>
            <span class="pay-statusbar-item"><span class="pay-statusbar-label">Write-off:</span><span class="pay-statusbar-val">{{ formatCurrency(viewRow?.writeOffAmt ?? 0) }}</span></span>
          </div>

          <!-- Tabs -->
          <div class="modal-tabs">
            <button :class="['modal-tab', viewTab === 'lines' ? 'modal-tab--active' : '']" @click="viewTab = 'lines'">Lines</button>
            <button :class="['modal-tab', viewTab === 'header' ? 'modal-tab--active' : '']" @click="viewTab = 'header'">Header</button>
          </div>

          <div class="modal-body" v-if="viewRow">

            <!-- ── Lines Tab ── -->
            <div v-if="viewTab === 'lines'">

              <!-- Add Detail panel -->
              <div v-if="showAddDetail && viewRow.status === 'RPAP'" class="add-detail-panel">
                <div class="add-detail-header">
                  <span class="add-detail-title">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                    Add Detail — Link Invoice
                  </span>
                  <button class="modal-close" @click="showAddDetail = false">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>

                <div class="add-detail-summary">
                  <div class="pay-ds-item"><span class="pay-ds-label">Payment Doc No.</span><span class="pay-ds-val mono">{{ viewRow.documentNo }}</span></div>
                  <div class="pay-ds-item"><span class="pay-ds-label">Received From</span><span class="pay-ds-val">{{ bpName(viewRow) }}</span></div>
                  <div class="pay-ds-item"><span class="pay-ds-label">Payment Method</span><span class="pay-ds-val">{{ viewRow['paymentMethod$_identifier'] || '—' }}</span></div>
                  <div class="pay-ds-item"><span class="pay-ds-label">Payment Date</span><span class="pay-ds-val">{{ formatDate(viewRow.paymentDate) }}</span></div>
                  <div class="pay-ds-item"><span class="pay-ds-label">Deposit To</span><span class="pay-ds-val">{{ viewRow['account$_identifier'] || '—' }}</span></div>
                  <div class="pay-ds-item pay-ds-item--amount">
                    <span class="pay-ds-label">Actual Payment</span>
                    <span class="pay-ds-val pay-ds-val--amount">{{ formatCurrency(addDetailSelected.reduce((s,i) => s+(Number(i.outstandingAmount)||0),0)) }}</span>
                  </div>
                </div>

                <div class="pay-detail-filter" style="margin-top:12px">
                  <label class="pay-ds-label" style="white-space:nowrap">Transaction Type</label>
                  <select class="form-input" style="max-width:180px;height:32px;font-size:12.5px" v-model="addDetailTransactionType" @change="addDetailInvoices = []">
                    <option value="invoices">Invoices</option>
                    <option value="orders">Orders</option>
                    <option value="orders_and_invoices">Orders and Invoices</option>
                  </select>
                  <button class="btn-add-line" @click="loadAddDetailInvoices" :disabled="addDetailLoading" style="margin-left:8px">
                    <span v-if="addDetailLoading" class="spinner spinner--dark"></span>
                    <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.22-8.56"/><polyline points="21 3 21 9 15 9"/></svg>
                    {{ addDetailLoading ? 'Loading...' : (addDetailInvoices.length ? 'Refresh' : 'Load') }}
                  </button>
                </div>

                <div class="table-wrap" style="margin:8px 0 0">
                  <table class="table">
                    <thead><tr>
                      <th style="width:36px;text-align:center"><input type="checkbox" v-model="addDetailSelectAll" @change="toggleAddDetailAll" :disabled="addDetailInvoices.length===0" /></th>
                      <th>Order No.</th>
                      <th>Invoice No.</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Due Date</th>
                      <th style="text-align:right">Amount</th>
                      <th style="text-align:right">Outstanding</th>
                      <th>Business Partner</th>
                    </tr></thead>
                    <tbody>
                      <tr v-if="addDetailLoading"><td colspan="9" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
                      <tr v-else-if="addDetailInvoices.length === 0"><td colspan="9" class="td-empty" style="font-style:italic;color:var(--text-muted)">Klik Load untuk menampilkan tagihan outstanding.</td></tr>
                      <tr v-else v-for="inv in addDetailInvoices" :key="inv.id + (inv._type||'')" class="tr-data" :class="{ 'tr-selected': inv.selected }">
                        <td style="text-align:center"><input type="checkbox" v-model="inv.selected" @change="onAddDetailSelect" /></td>
                        <td class="td-secondary">{{ inv.orderReference || '—' }}</td>
                        <td><span class="code-badge">{{ inv.documentNo || '—' }}</span></td>
                        <td><span :class="['type-badge', inv._type === 'order' ? 'type-badge--order' : 'type-badge--invoice']">{{ inv._type === 'order' ? 'Order' : 'Invoice' }}</span></td>
                        <td class="td-secondary">{{ formatDate(inv.invoiceDate) }}</td>
                        <td class="td-secondary">{{ formatDate(inv.dueDate) }}</td>
                        <td class="td-secondary" style="text-align:right">{{ formatCurrency(inv.grandTotalAmount) }}</td>
                        <td style="text-align:right;font-weight:600;color:var(--danger)">{{ formatCurrency(inv.outstandingAmount) }}</td>
                        <td class="td-secondary">{{ bpName(viewRow) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
                  <button class="btn btn--ghost" @click="showAddDetail = false">Cancel</button>
                  <button class="btn btn--primary" :disabled="addDetailSaving || addDetailSelected.length === 0" @click="saveAddDetail">
                    <span v-if="addDetailSaving" class="spinner"></span>
                    {{ addDetailSaving ? 'Saving...' : `Done (${addDetailSelected.length} selected)` }}
                  </button>
                </div>
                <div v-if="viewError" class="form-api-error" style="margin-top:10px">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {{ viewError }}
                </div>
              </div>

              <!-- Lines table -->
              <div class="section-divider" style="margin-top:0">
                <span>Payment Lines</span>
                <button v-if="viewRow.status === 'RPAP'" class="btn-add-line" @click="openAddDetail">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  Add Detail
                </button>
              </div>

              <div v-if="viewLinesLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>
              <div v-else class="table-wrap" style="margin-bottom:0">
                <table class="table">
                  <thead><tr>
                    <th>Order No.</th>
                    <th>Invoice No.</th>
                    <th>Invoice Date</th>
                    <th>Due Date</th>
                    <th style="text-align:right">Invoice Amount</th>
                    <th style="text-align:right">Expected Amount</th>
                    <th style="text-align:right">Received Amount</th>
                    <th>Business Partner</th>
                  </tr></thead>
                  <tbody>
                    <tr v-if="viewLines.length === 0"><td colspan="8" class="td-empty">No data in grid.</td></tr>
                    <tr v-else v-for="line in viewLines" :key="line.id" class="tr-data">
                      <td class="td-secondary">{{ line.orderReference || '—' }}</td>
                      <td><span class="code-badge">{{ line.documentNo || '—' }}</span></td>
                      <td class="td-secondary">{{ formatDate(line.invoiceDate) }}</td>
                      <td class="td-secondary">{{ formatDate(line.dueDate) }}</td>
                      <td class="td-secondary" style="text-align:right">{{ formatCurrency(line.grandTotalAmount) }}</td>
                      <td class="td-secondary" style="text-align:right">{{ formatCurrency(line.expectedAmount ?? line.grandTotalAmount) }}</td>
                      <td style="text-align:right;font-weight:600;color:#16a34a">{{ formatCurrency(line.amount) }}</td>
                      <td class="td-secondary">{{ line.businessPartnerName || bpName(viewRow) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-if="viewLines.length > 0" class="totals-block">
                <div class="totals-row totals-row--grand">
                  <span>Total Received</span>
                  <span>{{ formatCurrency(viewLines.reduce((s,l) => s+(Number(l.amount)||0), 0)) }}</span>
                </div>
              </div>
            </div>

            <!-- ── Header Tab ── -->
            <div v-if="viewTab === 'header'">
              <div class="detail-grid" style="margin-top:8px">
                <div class="detail-item"><span class="detail-label">Document No.</span><span class="detail-value mono">{{ viewRow.documentNo }}</span></div>
                <div class="detail-item"><span class="detail-label">Payment Date</span><span class="detail-value">{{ formatDate(viewRow.paymentDate) }}</span></div>
                <div class="detail-item"><span class="detail-label">Status</span><span :class="['status-pill', payStatusClass(viewRow.status)]">{{ payStatusLabel(viewRow.status) }}</span></div>
                <div class="detail-item"><span class="detail-label">Received From</span><span class="detail-value">{{ bpName(viewRow) }}</span></div>
                <div class="detail-item"><span class="detail-label">Payment Method</span><span class="detail-value">{{ viewRow['paymentMethod$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Deposit To</span><span class="detail-value">{{ viewRow['account$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Currency</span><span class="detail-value">IDR</span></div>
                <div class="detail-item"><span class="detail-label">Amount</span><span class="detail-value" style="font-weight:700">{{ formatCurrency(viewRow.amount) }}</span></div>
                <div class="detail-item"><span class="detail-label">Reference No.</span><span class="detail-value">{{ viewRow.referenceNo || '—' }}</span></div>
                <div class="detail-item detail-item--full"><span class="detail-label">Description</span><span class="detail-value">{{ viewRow.description || '—' }}</span></div>
              </div>
            </div>

          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="showViewModal = false">Close</button>
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
            <div class="modal-title">Delete Payment</div>
            <button class="modal-close" @click="showDeleteModal = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-text">Are you sure you want to delete payment <strong>{{ deleteTarget?.documentNo }}</strong>? This action cannot be undone.</p>
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
  fetchAllPayments,
  createPaymentHeader,
  updatePaymentHeader,
  deletePaymentHeader,
  searchBusinessPartners,
  fetchOutstandingInvoices,
  fetchOutstandingOrders,
  fetchPaymentLines,
  fetchPaymentDetail,
  addPaymentScheduleDetail,
  finalizePaymentAmount,
  fetchFinancialAccounts,
  fetchPaymentMethods,
  DEFAULT_ORGANIZATION,
  DEFAULT_FIN_ACCOUNT_ID,
  DEFAULT_PAYMETHOD_ID,
} from '@/services/paymentIn.js'

// ── directive
const vClickOutside = {
  mounted(el, binding) {
    el._handler = (e) => { if (!el.contains(e.target)) binding.value(e) }
    document.addEventListener('click', el._handler, true)
  },
  unmounted(el) { document.removeEventListener('click', el._handler, true) },
}

const PAGE_SIZE = 20

// ── table state
const rows        = ref([])
const loading     = ref(false)
const error       = ref('')
const currentPage = ref(1)
const totalRows   = ref(0)
const searchQuery = ref('')
let   searchTimer = null

// ── dropdown
const openDropdown = ref(null)
const dropdownPos  = ref({ top: 0, right: 0 })

// ── lookups
const paymentMethods    = ref([])
const financialAccounts = ref([])

// ── form state
const showFormModal  = ref(false)
const isEdit         = ref(false)
const editId         = ref(null)
const savedPaymentId = ref(null)
const activeFormTab  = ref('header')
const saving         = ref(false)
const formError      = ref('')

const emptyForm = () => ({
  documentNo: '',
  paymentDate: today(),
  businessPartner: '',
  paymentMethod: DEFAULT_PAYMETHOD_ID,
  financialAccount: DEFAULT_FIN_ACCOUNT_ID,
  referenceNo: '',
  description: '',
  status: 'RPAP',
  amount: 0,
})
const form = ref(emptyForm())

// ── customer search
const customerSearch    = ref('')
const filteredCustomers = ref([])
const showCustomerDrop  = ref(false)
const customerLoading   = ref(false)
let   customerTimer     = null

// ── detail tab
const transactionType    = ref('invoices')
const outstandingInvoices = ref([])
const invoiceLoading     = ref(false)
const invoicesLoaded     = ref(false)
const invoiceCheckMsg    = ref(null)
const selectAllInvoices  = ref(false)
const paying             = ref(false)

// ── view modal
const showViewModal    = ref(false)
const viewRow          = ref(null)
const viewTab          = ref('lines')
const viewLines        = ref([])
const viewLinesLoading = ref(false)
const viewError        = ref('')

// ── add detail (from view modal)
const showAddDetail             = ref(false)
const addDetailInvoices         = ref([])
const addDetailLoading          = ref(false)
const addDetailSaving           = ref(false)
const addDetailSelectAll        = ref(false)
const addDetailTransactionType  = ref('invoices')

// ── delete modal
const showDeleteModal = ref(false)
const deleteTarget    = ref(null)
const deleting        = ref(false)
const deleteError     = ref('')

// ── toast
const toast = ref({ show: false, type: 'success', message: '' })

// ── computed
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / PAGE_SIZE)))
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
const selectedInvoices    = computed(() => outstandingInvoices.value.filter(i => i.selected))
const totalSelectedAmount = computed(() => selectedInvoices.value.reduce((s, i) => s + (Number(i.outstandingAmount) || 0), 0))
const totalOutstandingAmount = computed(() => outstandingInvoices.value.reduce((s, i) => s + (Number(i.outstandingAmount) || 0), 0))
const addDetailSelected   = computed(() => addDetailInvoices.value.filter(i => i.selected))
const selectedPaymentMethodName = computed(() => {
  const m = paymentMethods.value.find(m => m.id === form.value.paymentMethod)
  return m?.name || 'Transfer'
})
const selectedFinAccName = computed(() => {
  const a = financialAccounts.value.find(a => a.id === form.value.financialAccount)
  return a?.name || 'Receive Bank - IDR'
})

// ── helpers
function today() { return new Date().toISOString().slice(0, 10) }

function formatDate(v) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatCurrency(v) {
  if (v == null || v === '') return '—'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)
}
function bpName(r) {
  // Openbravo returns "SEARCH_KEY - Name" in _identifier fields
  const id = r?.['businessPartner$_identifier'] || ''
  if (!id) return '—'
  // Format: "CODE - Name" → ambil bagian setelah " - " pertama
  const sepIdx = id.indexOf(' - ')
  return sepIdx >= 0 ? id.slice(sepIdx + 3) : id
}
function payStatusClass(s) {
  const map = { RPAP: 'status-awaiting', RDNC: 'status-complete', RPVD: 'status-void', RPAE: 'status-error' }
  return map[s] || 'status-draft'
}
function payStatusLabel(s) {
  const map = { RPAP: 'Awaiting Payment', RDNC: 'Deposited Not Cleared', RPVD: 'Payment Voided', RPAE: 'Awaiting Execution' }
  return map[s] || s || '—'
}
function showToast(msg, type = 'success') {
  toast.value = { show: true, type, message: msg }
  setTimeout(() => { toast.value.show = false }, 3000)
}

// ── load rows
async function loadRows() {
  loading.value = true; error.value = ''
  try {
    const startRow = (currentPage.value - 1) * PAGE_SIZE
    const res = await fetchAllPayments({ startRow, pageSize: PAGE_SIZE, searchKey: searchQuery.value })
    rows.value = res.data ?? []
    totalRows.value = res.totalRows ?? rows.value.length
  } catch (e) { error.value = e.message }
  finally { loading.value = false }
}

async function loadLookups() {
  try {
    const [methods, accounts] = await Promise.all([fetchPaymentMethods(), fetchFinancialAccounts()])
    paymentMethods.value    = methods
    financialAccounts.value = accounts
  } catch (e) { console.warn('Lookup load failed', e.message) }
}

// ── pagination / search
function goPage(p) { if (p >= 1 && p <= totalPages.value) { currentPage.value = p; loadRows() } }
function onSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(() => { currentPage.value = 1; loadRows() }, 400) }

// ── dropdown
function toggleDropdown(id, e) {
  if (openDropdown.value === id) { openDropdown.value = null; return }
  openDropdown.value = id
  const btn = e.currentTarget.getBoundingClientRect()
  dropdownPos.value = { top: btn.bottom + 4, right: window.innerWidth - btn.right }
}
function closeDropdown() { openDropdown.value = null }

// ── customer search
function onCustomerSearch() {
  showCustomerDrop.value = true
  clearTimeout(customerTimer)
  if (customerSearch.value.length < 2) { filteredCustomers.value = []; return }
  customerLoading.value = true
  customerTimer = setTimeout(async () => {
    try { filteredCustomers.value = await searchBusinessPartners(customerSearch.value) }
    catch { filteredCustomers.value = [] }
    finally { customerLoading.value = false }
  }, 300)
}
function onCustomerBlur() { setTimeout(() => { showCustomerDrop.value = false }, 200) }
function selectCustomer(c) {
  form.value.businessPartner = c.id
  customerSearch.value = c.name
  showCustomerDrop.value = false
  filteredCustomers.value = []
  outstandingInvoices.value = []
  invoiceCheckMsg.value = null
  invoicesLoaded.value = false
}

// ── open modals
function openCreateModal() {
  isEdit.value = false; editId.value = null; savedPaymentId.value = null
  activeFormTab.value = 'header'; formError.value = ''
  form.value = emptyForm()
  customerSearch.value = ''; filteredCustomers.value = []
  outstandingInvoices.value = []; invoicesLoaded.value = false; invoiceCheckMsg.value = null
  showFormModal.value = true
}

function openEditModal(r) {
  isEdit.value = true; editId.value = r.id; savedPaymentId.value = r.id
  activeFormTab.value = 'header'; formError.value = ''
  form.value = {
    documentNo:      r.documentNo || '',
    paymentDate:     r.paymentDate?.slice(0, 10) || today(),
    businessPartner: typeof r.businessPartner === 'object' ? r.businessPartner?.id : r.businessPartner,
    paymentMethod:   typeof r.paymentMethod === 'object' ? r.paymentMethod?.id : (r.paymentMethod || DEFAULT_PAYMETHOD_ID),
    financialAccount: typeof r.financialAccount === 'object' ? r.financialAccount?.id : (r.financialAccount || DEFAULT_FIN_ACCOUNT_ID),
    referenceNo:     r.referenceNo || '',
    description:     r.description || '',
    status:          r.status || 'RPAP',
    amount:          r.amount || 0,
  }
  customerSearch.value = r['businessPartner$_identifier'] || ''
  outstandingInvoices.value = []; invoiceCheckMsg.value = null; invoicesLoaded.value = false
  showFormModal.value = true
}

function openViewModal(r) {
  viewRow.value = { ...r }
  viewTab.value = 'lines'
  viewLines.value = []; viewLinesLoading.value = false
  showAddDetail.value = false
  addDetailInvoices.value = []; addDetailSelectAll.value = false
  viewError.value = ''
  showViewModal.value = true
  loadViewLines(r.id)
}

async function loadViewLines(paymentId) {
  viewLinesLoading.value = true
  try { viewLines.value = await fetchPaymentLines(paymentId) }
  catch (e) { console.error('Load lines failed', e.message); viewLines.value = [] }
  finally { viewLinesLoading.value = false }
}

// ── add detail (from view modal)
function openAddDetail() {
  showAddDetail.value = true
  addDetailTransactionType.value = 'invoices'
  addDetailInvoices.value = []; addDetailSelectAll.value = false; viewError.value = ''
  loadAddDetailInvoices()
}

async function loadAddDetailInvoices() {
  if (!viewRow.value?.businessPartner) return
  addDetailLoading.value = true
  const bpId = typeof viewRow.value.businessPartner === 'object' ? viewRow.value.businessPartner?.id : viewRow.value.businessPartner
  try {
    const tt = addDetailTransactionType.value
    let combined = []
    if (tt === 'invoices' || tt === 'orders_and_invoices') {
      const invRows = await fetchOutstandingInvoices(bpId).catch(() => [])
      combined = [...combined, ...invRows]
    }
    if (tt === 'orders' || tt === 'orders_and_invoices') {
      const ordRows = await fetchOutstandingOrders(bpId).catch(() => [])
      combined = [...combined, ...ordRows]
    }
    combined.sort((a, b) => (a.invoiceDate || '') < (b.invoiceDate || '') ? -1 : 1)
    addDetailInvoices.value = combined.map(r => ({ ...r, selected: false }))
  } catch (e) { console.error('Load add detail invoices failed', e.message) }
  finally { addDetailLoading.value = false }
}

function toggleAddDetailAll() { addDetailInvoices.value.forEach(i => { i.selected = addDetailSelectAll.value }) }
function onAddDetailSelect() {
  addDetailSelectAll.value = addDetailInvoices.value.length > 0 && addDetailInvoices.value.every(i => i.selected)
}

async function saveAddDetail() {
  if (addDetailSelected.value.length === 0) return
  addDetailSaving.value = true; viewError.value = ''
  const paymentId = viewRow.value.id
  const bpId    = typeof viewRow.value.businessPartner === 'object' ? viewRow.value.businessPartner?.id : viewRow.value.businessPartner
  const orgId   = typeof viewRow.value.organization === 'object' ? viewRow.value.organization?.id : (viewRow.value.organization || DEFAULT_ORGANIZATION)
  const finAccId  = typeof viewRow.value.account === 'object' ? viewRow.value.account?.id : (viewRow.value.account || DEFAULT_FIN_ACCOUNT_ID)
  const payMethId = typeof viewRow.value.paymentMethod === 'object' ? viewRow.value.paymentMethod?.id : (viewRow.value.paymentMethod || DEFAULT_PAYMETHOD_ID)

  try {
    const payDetail = await fetchPaymentDetail(paymentId)

    for (const inv of addDetailSelected.value) {
      await addPaymentScheduleDetail(
        payDetail.id, inv.scheduleId || null, inv.id,
        Number(inv.outstandingAmount) || 0,
        bpId, orgId, finAccId, payMethId, paymentId,
        inv._type || 'invoice',
      )
    }

    const total = addDetailSelected.value.reduce((s, i) => s + (Number(i.outstandingAmount) || 0), 0)
    await finalizePaymentAmount(paymentId, total)

    showToast('Payment detail berhasil disimpan!')
    showAddDetail.value = false
    await loadViewLines(paymentId)
    await loadRows()
  } catch (e) {
    viewError.value = e.message
  } finally { addDetailSaving.value = false }
}

// ── save header
async function saveHeader() {
  formError.value = ''
  if (!form.value.businessPartner) { formError.value = 'Received From wajib diisi.'; return }
  if (!form.value.paymentDate)     { formError.value = 'Payment Date wajib diisi.'; return }
  if (!form.value.paymentMethod)   { formError.value = 'Payment Method wajib diisi.'; return }
  if (!form.value.financialAccount){ formError.value = 'Deposit To wajib diisi.'; return }

  saving.value = true
  try {
    if (isEdit.value) {
      await updatePaymentHeader(editId.value, form.value)
      showToast('Payment header berhasil diupdate.')
    } else {
      const result = await createPaymentHeader(form.value)
      savedPaymentId.value = result.id
      form.value.documentNo = result.documentNo || ''
      showToast('Header tersimpan. Lanjutkan ke tab Detail.')
    }
  } catch (e) {
    formError.value = e.message || 'Gagal menyimpan header.'
  } finally { saving.value = false }
}

// ── switch to detail tab
function switchToDetailTab() {
  if (!savedPaymentId.value && !isEdit.value) { formError.value = 'Simpan header terlebih dahulu.'; return }
  formError.value = ''; activeFormTab.value = 'detail'
  if (form.value.businessPartner && !invoicesLoaded.value) loadOutstandingInvoices()
}

// ── load outstanding invoices
async function loadOutstandingInvoices() {
  if (!form.value.businessPartner) { invoiceCheckMsg.value = { type: 'error', text: 'Pilih customer terlebih dahulu.' }; return }
  invoiceLoading.value = true; invoiceCheckMsg.value = null
  outstandingInvoices.value = []; invoicesLoaded.value = false; selectAllInvoices.value = false
  try {
    let data = []
    const tt = transactionType.value
    if (tt === 'invoices' || tt === 'orders_and_invoices') {
      const invData = await fetchOutstandingInvoices(form.value.businessPartner)
      data = [...data, ...invData]
    }
    if (tt === 'orders' || tt === 'orders_and_invoices') {
      const ordData = await fetchOutstandingOrders(form.value.businessPartner)
      data = [...data, ...ordData]
    }
    // sort by date ascending
    data.sort((a, b) => (a.invoiceDate || '') < (b.invoiceDate || '') ? -1 : 1)
    outstandingInvoices.value = data.map(r => ({ ...r, selected: false }))
    invoicesLoaded.value = true
    if (data.length === 0) invoiceCheckMsg.value = { type: 'warn', text: 'Tidak ada tagihan outstanding untuk customer ini.' }
  } catch (e) {
    invoiceCheckMsg.value = { type: 'error', text: e.message || 'Gagal memuat data.' }
  } finally { invoiceLoading.value = false }
}

function toggleAllInvoices() { outstandingInvoices.value.forEach(i => { i.selected = selectAllInvoices.value }) }
function onInvoiceSelect() {
  selectAllInvoices.value = outstandingInvoices.value.length > 0 && outstandingInvoices.value.every(i => i.selected)
}

// ── process payment (dari form modal tab detail)
async function processPayment() {
  if (selectedInvoices.value.length === 0) return
  formError.value = ''; paying.value = true

  const paymentId = savedPaymentId.value || editId.value
  const bpId      = typeof form.value.businessPartner === 'object' ? form.value.businessPartner?.id : form.value.businessPartner
  const orgId     = DEFAULT_ORGANIZATION
  const finAccId  = form.value.financialAccount || DEFAULT_FIN_ACCOUNT_ID
  const payMethId = form.value.paymentMethod    || DEFAULT_PAYMETHOD_ID

  try {
    const payDetail = await fetchPaymentDetail(paymentId)

    for (const inv of selectedInvoices.value) {
      await addPaymentScheduleDetail(
        payDetail.id, inv.scheduleId || null, inv.id,
        Number(inv.outstandingAmount) || 0,
        bpId, orgId, finAccId, payMethId, paymentId,
        inv._type || 'invoice',
      )
    }

    await finalizePaymentAmount(paymentId, totalSelectedAmount.value)
    showFormModal.value = false
    savedPaymentId.value = null
    showToast('Payment berhasil diproses!')
    await loadRows()
  } catch (e) {
    formError.value = e.message
  } finally { paying.value = false }
}

// ── close form modal
function closeFormModal() {
  if (saving.value || paying.value) return
  showFormModal.value = false
  savedPaymentId.value = null
  loadRows()
}

// ── delete
function confirmDelete(r) {
  deleteTarget.value = { ...r }; deleteError.value = ''
  showDeleteModal.value = true
}
async function doDelete() {
  deleting.value = true; deleteError.value = ''
  try {
    await deletePaymentHeader(deleteTarget.value.id)
    showDeleteModal.value = false
    showToast('Payment berhasil dihapus.')
    await loadRows()
  } catch (e) {
    deleteError.value = e.message || 'Gagal menghapus.'
  } finally { deleting.value = false }
}

onMounted(() => { loadRows(); loadLookups() })
</script>

<style scoped>
:root {
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --bg: #f1f5f9; --surface: #ffffff; --surface2: #f8fafc;
  --border: #e2e8f0; --accent: #3b82f6; --accent-light: #eff6ff;
  --text-primary: #0f172a; --text-secondary: #475569; --text-muted: #94a3b8;
  --danger: #ef4444;
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
.search-input { height: 36px; padding: 0 12px 0 32px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; font-family: var(--font); background: var(--surface2); width: 260px; transition: border-color .15s; }
.search-input:focus { border-color: var(--accent); background: #fff; }

.btn { display: inline-flex; align-items: center; gap: 6px; padding: 0 16px; height: 36px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font); transition: all .15s; }
.btn--primary { background: var(--accent); color: #fff; }
.btn--primary:hover:not(:disabled) { background: #2563eb; }
.btn--secondary { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
.btn--secondary:hover:not(:disabled) { background: #bae6fd; }
.btn--ghost { background: var(--surface2); border: 1px solid var(--border); color: var(--text-secondary); }
.btn--ghost:hover:not(:disabled) { background: var(--border); }
.btn--danger { background: var(--danger); color: #fff; }
.btn--danger:hover:not(:disabled) { background: #dc2626; }
.btn:disabled { opacity: .5; cursor: not-allowed; }

.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table thead th { background: var(--surface2); color: var(--text-muted); font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; padding: 10px 16px; border-bottom: 1px solid var(--border); white-space: nowrap; text-align: left; }
.th-action { text-align: right; width: 80px; }
.table tbody tr td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tr-data:hover { background: var(--surface2); }
.tr-data:last-child td { border-bottom: none; }
.tr-selected td { background: #eff6ff !important; }
.tr-selected:hover td { background: #dbeafe !important; }

.code-badge { font-family: var(--font-mono); font-size: 11.5px; font-weight: 500; background: var(--surface2); border: 1px solid var(--border); padding: 3px 8px; border-radius: 4px; color: var(--text-secondary); white-space: nowrap; }
.td-secondary { color: var(--text-secondary); font-size: 13px; }
.td-clip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.td-name { font-weight: 500; }
.td-empty { text-align: center; color: var(--text-muted); padding: 48px 16px; font-size: 13px; }
.td-error { color: var(--danger); }
.td-action-cell { text-align: right; overflow: visible !important; }

.status-pill { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
.status-awaiting { background: #fef9c3; color: #854d0e; }
.status-complete  { background: #dcfce7; color: #15803d; }
.status-void      { background: #f1f5f9; color: #64748b; }
.status-error     { background: #fee2e2; color: var(--danger); }
.status-draft     { background: #f1f5f9; color: #64748b; }

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

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(2px); }
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); width: 100%; max-width: 480px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; }
.modal--xl { max-width: 900px; }
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
.modal-tab:disabled { opacity: .4; cursor: not-allowed; }
.modal-body { padding: 20px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0; align-items: center; }

.pay-statusbar { display: flex; align-items: center; gap: 10px; padding: 8px 20px; background: #f8fafc; border-bottom: 1px solid var(--border); font-size: 12px; flex-wrap: wrap; flex-shrink: 0; }
.pay-statusbar-item { display: flex; align-items: center; gap: 4px; }
.pay-statusbar-label { color: var(--text-muted); font-weight: 500; }
.pay-statusbar-val { color: var(--text-primary); font-weight: 600; }
.pay-statusbar-val--status { color: #854d0e; background: #fef9c3; padding: 1px 8px; border-radius: 12px; font-size: 11px; }
.pay-statusbar-sep { color: var(--border); font-size: 16px; }

.pay-detail-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 20px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 16px 20px; }
.pay-ds-item { display: flex; flex-direction: column; gap: 3px; }
.pay-ds-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); }
.pay-ds-val { font-size: 13px; font-weight: 500; color: var(--text-primary); }
.pay-ds-val.mono { font-family: var(--font-mono); font-size: 12px; }
.pay-ds-val--amount { font-weight: 700; font-size: 15px; color: var(--accent); }

.pay-detail-filter { display: flex; align-items: center; gap: 10px; margin: 12px 0 8px; }
.pay-detail-footer { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border); }

.form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group--full { grid-column: 1 / -1; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-input { width: 100%; height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); }
.form-input:focus { border-color: var(--accent); background: #fff; }
.form-input:disabled { opacity: .6; cursor: not-allowed; background: #f1f5f9; }
.req { color: var(--danger); }
.form-api-error { margin-top: 14px; padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; }

.acc-wrap { position: relative; width: 100%; }
.acc-input { display: block; width: 100%; height: 36px; padding: 0 32px 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.acc-input:focus { border-color: var(--accent); background: #fff; }
.acc-input:disabled { opacity: .6; background: #f1f5f9; }
.acc-chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.acc-dropdown { position: absolute; z-index: 300; top: calc(100% + 3px); left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); max-height: 200px; overflow-y: auto; list-style: none; margin: 0; padding: 4px 0; }
.acc-opt { padding: 8px 12px; font-size: 12.5px; color: var(--text-primary); cursor: pointer; transition: background .1s; }
.acc-opt:hover { background: var(--accent-light); }
.acc-empty { padding: 8px 12px; font-size: 12.5px; color: var(--text-muted); font-style: italic; }

.section-divider { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin: 20px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.btn-add-line { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--accent); background: var(--accent-light); border: 1px solid #bfdbfe; border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-family: var(--font); transition: background .12s; }
.btn-add-line:hover:not(:disabled) { background: #dbeafe; }
.btn-add-line:disabled { opacity: .4; cursor: not-allowed; }

.info-box { display: flex; align-items: flex-start; gap: 8px; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 12.5px; }
.info-box--blue   { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; }
.info-box--green  { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; }
.info-box--yellow { background: #fefce8; border: 1px solid #fef08a; color: #854d0e; }
.info-box--red    { background: #fff1f2; border: 1px solid #fecaca; color: var(--danger); }

.totals-block { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 12px; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.totals-row { display: flex; justify-content: space-between; gap: 48px; font-size: 13px; color: var(--text-secondary); min-width: 260px; }
.totals-row--grand { font-weight: 700; font-size: 14px; color: var(--text-primary); border-top: 1px solid var(--border); padding-top: 6px; margin-top: 2px; }

.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-item--full { grid-column: 1 / -1; }
.detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.detail-value { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }
.detail-value.mono { font-family: var(--font-mono); font-size: 12.5px; }

.delete-text { font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); }
.delete-text strong { color: var(--text-primary); }

.add-detail-panel { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.add-detail-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.add-detail-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text-primary); }
.add-detail-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 20px; background: #fff; border: 1px solid var(--border); border-radius: 6px; padding: 12px 16px; }

.toast { position: fixed; bottom: 24px; right: 24px; z-index: 2000; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); }
.toast--success { background: #16a34a; color: #fff; }
.toast--error   { background: var(--danger); color: #fff; }

.type-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; white-space: nowrap; }
.type-badge--invoice { background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; }
.type-badge--order   { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }

.spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
.spinner--dark { border-color: rgba(37,99,235,.3); border-top-color: var(--accent); }
@keyframes spin { to { transform: rotate(360deg); } }

.fade-enter-active,.fade-leave-active { transition: opacity .15s; }
.fade-enter-from,.fade-leave-to { opacity: 0; }
</style>