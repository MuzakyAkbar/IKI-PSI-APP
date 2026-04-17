<template>
  <div class="layout">
    <main class="main">
      <div class="content-card">

        <div class="page-header">
          <h2 class="page-title">Purchase Order</h2>
        </div>

        <div class="toolbar">
          <div class="search-wrap">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input v-model="searchQuery" class="search-input" placeholder="Search order no or vendor..." @input="onSearch" />
          </div>
          <button class="btn btn--primary" @click="openCreateModal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Create Purchase Order
          </button>
        </div>

        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th class="sortable" :class="{ asc: sortCol === 'documentNo', desc: sortCol === 'documentNo' && sortDir === 'desc' }" @click="toggleSort('documentNo')">PO No.</th>
              <th class="sortable" :class="{ asc: sortCol === 'orderDate', desc: sortCol === 'orderDate' && sortDir === 'desc' }" @click="toggleSort('orderDate')">Order Date</th>
              <th class="sortable" :class="{ asc: sortCol === 'businessPartner.name', desc: sortCol === 'businessPartner.name' && sortDir === 'desc' }" @click="toggleSort('businessPartner.name')">Vendor</th>
              <th class="sortable" :class="{ asc: sortCol === 'documentStatus', desc: sortCol === 'documentStatus' && sortDir === 'desc' }" @click="toggleSort('documentStatus')">Status</th>
              <th class="sortable" :class="{ asc: sortCol === 'grandTotalAmount', desc: sortCol === 'grandTotalAmount' && sortDir === 'desc' }" @click="toggleSort('grandTotalAmount')">Grand Total</th>
              <th class="sortable" :class="{ asc: sortCol === 'scheduledDeliveryDate', desc: sortCol === 'scheduledDeliveryDate' && sortDir === 'desc' }" @click="toggleSort('scheduledDeliveryDate')">Est. Arrival</th>
              <th class="th-action">Action</th>
            </tr></thead>
            <tbody>
              <tr v-if="loading"><td colspan="7" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
              <tr v-else-if="error"><td colspan="7" class="td-empty td-error">{{ error }}</td></tr>
              <tr v-else-if="rows.length===0"><td colspan="7" class="td-empty">No purchase orders found.</td></tr>
              <template v-else>
                <tr v-for="r in rows" :key="r.id" class="tr-data">
                  <td><span class="code-badge">{{ r.documentNo || '—' }}</span></td>
                  <td class="td-secondary">{{ formatDate(r.orderDate) }}</td>
                  <td class="td-clip td-name">{{ r['businessPartner$_identifier'] || '—' }}</td>
                  <td><span :class="['status-pill', statusClass(r.documentStatus)]">{{ statusLabel(r.documentStatus) }}</span></td>
                  <td class="td-secondary">{{ formatCurrency(r.grandTotalAmount) }}</td>
                  <td class="td-secondary">{{ formatDate(r.scheduledDeliveryDate) }}</td>
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
        <div class="modal modal--xxl">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Dashboard</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span>List Purchase Order</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">{{ isEdit ? 'Edit' : 'Create' }} Purchase Order</span>
              </div>
              <div class="modal-title">{{ isEdit ? 'Edit' : 'Create' }} Purchase Order</div>
            </div>
            <button class="modal-close" @click="closeFormModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="modal-tabs">
            <button :class="['modal-tab', activeFormTab==='transaction'?'modal-tab--active':'']" @click="activeFormTab='transaction'">Transaction</button>
            <button v-if="isEdit" :class="['modal-tab', activeFormTab==='payment'?'modal-tab--active':'']" @click="activeFormTab='payment'">Payment Term</button>
          </div>

          <div class="modal-body">
            <div v-if="activeFormTab==='transaction'">
              <div class="form-grid-4">
                <div class="form-group">
                  <label>Organization</label>
                  <input :value="orgDisplayLabel" class="form-input" disabled style="background: var(--surface2); color: var(--text-secondary)" />
                </div>
                <div class="form-group">
                  <label>Transaction Document <span class="req">*</span></label>
                  <input value="Purchase Order" class="form-input" disabled style="background: var(--surface2); color: var(--text-secondary)" />
                </div>
                <div class="form-group">
                  <label>Document No.</label>
                  <input v-model="form.documentNo" class="form-input" placeholder="Auto-generated" disabled />
                </div>
                <div class="form-group">
                  <label>Order Date</label>
                  <input v-model="form.orderDate" type="date" class="form-input" />
                </div>

                <div class="form-group form-group--full">
                  <label>Vendor <span class="req">*</span></label>
                  <div class="acc-wrap">
                    <input v-model="vendorSearch" class="acc-input" placeholder="Search vendor..." @input="onVendorSearch" @focus="showVendorDrop=true" @blur="onVendorBlur" />
                    <svg class="acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                    <ul v-if="showVendorDrop && filteredVendors.length" class="acc-dropdown">
                      <li v-for="v in filteredVendors" :key="v.id" class="acc-opt" @mousedown.prevent="selectVendor(v)">{{ v.name }}</li>
                    </ul>
                    <ul v-else-if="showVendorDrop && vendorSearch.length > 1" class="acc-dropdown">
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
                  <label>Price List <span class="req">*</span></label>
                  <input :value="priceListLabel" class="form-input" disabled placeholder="Auto dari vendor" />
                </div>
                <div class="form-group">
                  <label>Warehouse <span class="req">*</span></label>
                  <select v-model="form.warehouse" class="form-input">
                    <option value="">Select</option>
                    <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Scheduled Delivery Date</label>
                  <input v-model="form.scheduledDeliveryDate" type="date" class="form-input" />
                </div>

                <div class="form-group">
                  <label>Payment Method</label>
                  <input :value="paymentMethodLabel" class="form-input" disabled placeholder="Auto dari vendor" />
                </div>
                <div class="form-group">
                  <label>Payment Terms <span class="req">*</span></label>
                  <input :value="paymentTermLabel" class="form-input" disabled placeholder="Auto dari vendor" />
                </div>
                <div class="form-group">
                  <label>Invoice Terms</label>
                  <select v-model="form.invoiceTerm" class="form-input">
                    <option value="">Select</option>
                    <option value="I">Immediate</option>
                    <option value="D">After Delivery</option>
                    <option value="O">After Order Delivered</option>
                    <option value="N">Do Not Invoice</option>
                  </select>
                </div>
              </div>

              <div class="section-divider">More Information</div>
              <div class="form-grid-3">
                <div class="form-group">
                  <label>Order Reference</label>
                  <input v-model="form.orderReference" class="form-input" placeholder="Order Reference" />
                </div>
                <div class="form-group">
                  <label>Description</label>
                  <input v-model="form.description" class="form-input" placeholder="Description" />
                </div>
                <div class="form-group">
                  <label>Invoice Address</label>
                  <select v-model="form.invoiceAddress" class="form-input" :disabled="!form.businessPartner">
                    <option value="">Select</option>
                    <option v-for="l in partnerLocations" :key="l.id" :value="l.id">{{ l['locationAddress$_identifier'] || l.id }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Delivery Location</label>
                  <input v-model="form.deliveryLocation" class="form-input" placeholder="Delivery Location" />
                </div>
              </div>

              <div class="section-divider">
                Order Lines
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
                    <th style="width:80px;text-align:center">Qty</th>
                    <th style="width:110px;text-align:center">UOM</th>
                    <th style="width:160px">Tax</th>
                    <th style="width:150px;text-align:right">Unit Price</th>
                    <th style="width:150px;text-align:right">Net Amount</th>
                    <th style="width:36px"></th>
                  </tr></thead>
                  <tbody>
                    <tr v-if="lines.length===0"><td colspan="8" class="td-empty" style="padding:20px">No lines yet. Click "Add Line".</td></tr>
                    <tr v-for="(line, idx) in lines" :key="idx">
                      <td class="td-secondary" style="text-align:center">{{ idx + 1 }}</td>
                      <td>
                        <input v-model="line.productSearch" class="acc-input acc-input--sm" placeholder="Search product..." @input="onProductSearch(line)" @focus="openProductDrop(line, $event)" @blur="onProductBlur(line)" />
                        <teleport to="body">
                          <ul v-if="line.showDrop && line.productOptions.length" class="acc-dropdown acc-dropdown--teleport" :style="line.dropStyle">
                            <li v-for="p in line.productOptions" :key="p.id" class="acc-opt" @mousedown.prevent="selectProduct(line, p)">{{ p.name }}</li>
                          </ul>
                        </teleport>
                      </td>
                      <td style="text-align:center">
                        <input v-model.number="line.orderedQuantity" type="number" min="0" class="form-input form-input--sm" style="text-align:center" @input="calcLine(line)" />
                      </td>
                      <td style="text-align:center">
                        <div class="acc-wrap">
                          <input v-model="line.uomSearch" class="acc-input acc-input--sm" placeholder="UOM..." style="text-align:center;padding-right:24px" @input="onUomSearch(line)" @focus="line.showUomDrop=true" @blur="() => onUomBlur(line)" />
                          <ul v-if="line.showUomDrop && line.uomOptions.length" class="acc-dropdown">
                            <li v-for="u in line.uomOptions" :key="u.id" class="acc-opt" @mousedown.prevent="selectUom(line, u)">{{ u.uOMSymbol || u.name }}</li>
                          </ul>
                          <ul v-else-if="line.showUomDrop && line.uomSearch.length > 0 && !line.uomOptions.length" class="acc-dropdown">
                            <li class="acc-empty">No UOM found</li>
                          </ul>
                        </div>
                      </td>
                      <td>
                        <input v-model="line.taxSearch" class="acc-input acc-input--sm" placeholder="Select tax..." @input="onTaxSearch(line)" @focus="openTaxDrop(line, $event)" @blur="onTaxBlur(line)" />
                        <teleport to="body">
                          <ul v-if="line.showTaxDrop && line.taxOptions.length" class="acc-dropdown acc-dropdown--teleport" :style="line.taxDropStyle">
                            <li v-for="tx in line.taxOptions" :key="tx.id" class="acc-opt" @mousedown.prevent="selectTax(line, tx)">
                              {{ tx.name }}<span v-if="tx.rate != null" class="tax-rate-badge">{{ tx.rate }}%</span>
                            </li>
                          </ul>
                          <ul v-else-if="line.showTaxDrop && line.taxSearch?.length > 0 && !line.taxOptions.length" class="acc-dropdown acc-dropdown--teleport" :style="line.taxDropStyle">
                            <li class="acc-empty">No tax found</li>
                          </ul>
                        </teleport>
                      </td>
                      <td style="text-align:right">
                        <input v-model.number="line.unitPrice" type="number" min="0" class="form-input form-input--sm" style="text-align:right" @input="calcLine(line)" />
                      </td>
                      <td class="td-secondary" style="text-align:right;font-weight:600;white-space:nowrap">{{ formatCurrency(line.lineNetAmount) }}</td>
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

            <div v-if="activeFormTab==='payment'">
              <div v-if="!form.paymentTerms" class="td-empty" style="padding:32px">
                Please select a Vendor with a Payment Term in the Transaction tab first.
              </div>
              <div v-else>
                <div class="detail-grid" style="margin-bottom:16px">
                  <div class="detail-item"><span class="detail-label">Payment Terms</span><span class="detail-value">{{ paymentTermLabel }}</span></div>
                  <div class="detail-item"><span class="detail-label">Payment Method</span><span class="detail-value">{{ paymentMethodLabel }}</span></div>
                </div>
                <div v-if="paymentLinesLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>
                <div v-else class="table-wrap" style="margin-bottom:0">
                  <table class="table">
                    <thead><tr>
                      <th>Line</th>
                      <th>Due Date Offset (days)</th>
                      <th>Percentage</th>
                      <th>Fixed Amount</th>
                    </tr></thead>
                    <tbody>
                      <tr v-if="paymentLines.length===0"><td colspan="4" class="td-empty" style="padding:20px">No lines found for this Payment Term.</td></tr>
                      <tr v-for="pl in paymentLines" :key="pl.id">
                        <td class="td-secondary">{{ pl.line ?? pl.lineNo ?? '—' }}</td>
                        <td class="td-secondary">{{ pl.offsetDays ?? pl.netDays ?? pl.dueDateOffset ?? pl.dayOffset ?? '—' }}</td>
                        <td class="td-secondary">{{ pl.percentage != null ? pl.percentage + '%' : (pl.fixedPercentage != null ? pl.fixedPercentage + '%' : '—') }}</td>
                        <td class="td-secondary">{{ pl.fixedAmount != null ? formatCurrency(pl.fixedAmount) : (pl.fixedMonthOffset != null ? formatCurrency(pl.fixedMonthOffset) : (pl.amount != null ? formatCurrency(pl.amount) : '—')) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div v-if="formError" class="form-api-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ formError }}
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn--ghost" @click="closeFormModal">Cancel</button>
            <button class="btn btn--primary" :disabled="saving" @click="saveOrder">
              <span v-if="saving" class="spinner"></span>
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showViewModal" class="modal-overlay" @mousedown.self="showViewModal=false">
        <div class="modal modal--xxl">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Dashboard</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span>List Purchase Order</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">View Purchase Order</span>
              </div>
              <div class="modal-title" style="display:flex; align-items:center; gap:10px">
                Purchase Order — {{ viewRow?.documentNo }}
              </div>
            </div>
            <button class="modal-close" @click="showViewModal=false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="modal-tabs">
            <button :class="['modal-tab', viewTab==='detail'?'modal-tab--active':'']" @click="viewTab='detail'">Detail</button>
            <button :class="['modal-tab', viewTab==='payment'?'modal-tab--active':'']" @click="openViewPaymentTab">Payment Plan</button>
          </div>

          <div class="modal-body" v-if="viewRow">
            <div v-if="actionError" class="form-api-error" style="margin-bottom:12px">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ actionError }}
            </div>

            <div v-if="viewTab==='detail'">
              <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">SO No.</span><span class="detail-value mono">{{ viewRow.documentNo }}</span></div>
                <div class="detail-item"><span class="detail-label">Order Date</span><span class="detail-value">{{ formatDate(viewRow.orderDate) }}</span></div>
                <div class="detail-item"><span class="detail-label">Status</span><span :class="['status-pill', statusClass(viewRow.documentStatus)]">{{ statusLabel(viewRow.documentStatus) }}</span></div>
                <div class="detail-item"><span class="detail-label">Scheduled Delivery</span><span class="detail-value">{{ formatDate(viewRow.scheduledDeliveryDate) }}</span></div>
                <div class="detail-item"><span class="detail-label">Vendor</span><span class="detail-value">{{ viewRow['businessPartner$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Partner Address</span><span class="detail-value">{{ viewRow['partnerAddress$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Warehouse</span><span class="detail-value">{{ viewRow['warehouse$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Price List</span><span class="detail-value">{{ viewRow['priceList$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Payment Terms</span><span class="detail-value">{{ viewRow['paymentTerms$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Payment Method</span><span class="detail-value">{{ viewRow['paymentMethod$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Organization</span><span class="detail-value">{{ viewRow['organization$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Grand Total</span><span class="detail-value" style="font-weight:700; color:var(--text-primary)">{{ formatCurrency(viewRow.grandTotalAmount) }}</span></div>
                <div class="detail-item detail-item--full"><span class="detail-label">Description</span><span class="detail-value">{{ viewRow.description || '—' }}</span></div>
              </div>

              <div class="section-divider" style="margin-top:20px">Item Detail</div>
              <div v-if="viewLinesLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>
              <div v-else class="table-wrap" style="margin-bottom:0">
                <table class="table table--lines">
                  <thead><tr>
                    <th>#</th><th>Product</th><th>Qty</th><th>UOM</th><th>Unit Price</th><th>Net Amount</th><th>Tax</th>
                  </tr></thead>
                  <tbody>
                    <tr v-if="viewLines.length===0"><td colspan="7" class="td-empty">No lines.</td></tr>
                    <tr v-for="(l, i) in viewLines" :key="l.id">
                      <td class="td-secondary">{{ l.lineNo || (i+1) }}</td>
                      <td>{{ l['product$_identifier'] || '—' }}</td>
                      <td class="td-secondary">{{ l.orderedQuantity }}</td>
                      <td class="td-secondary">{{ l['uOM$_identifier'] || '—' }}</td>
                      <td class="td-secondary">{{ formatCurrency(l.unitPrice) }}</td>
                      <td class="td-secondary">{{ formatCurrency(l.lineNetAmount) }}</td>
                      <td class="td-secondary">{{ l['tax$_identifier'] || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="totals-block">
                <div class="totals-row totals-row--grand">
                  <span>Grand Total</span>
                  <span>{{ formatCurrency(viewRow.grandTotalAmount) }}</span>
                </div>
              </div>
            </div>

            <div v-if="viewTab==='payment'">
              <div v-if="viewPaymentLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>
              <div v-else>
                <div v-if="viewPaymentSchedule.length===0" class="td-empty" style="padding:32px">
                  No payment plan found. Payment plan is generated after the order is Booked.
                </div>
                <div v-else class="table-wrap" style="margin-bottom:0">
                  <table class="table">
                    <thead><tr>
                      <th>Due Date</th>
                      <th>Expected Amount</th>
                      <th>Outstanding Amount</th>
                      <th>Paid Amount</th>
                    </tr></thead>
                    <tbody>
                      <tr v-for="ps in viewPaymentSchedule" :key="ps.id">
                        <td class="td-secondary">{{ formatDate(ps.dueDate) }}</td>
                        <td class="td-secondary">{{ formatCurrency(ps.amount ?? ps.expectedAmount) }}</td>
                        <td class="td-secondary">{{ formatCurrency(ps.outstandingAmount ?? ps.pendingToReceive) }}</td>
                        <td class="td-secondary">{{ formatCurrency(ps.paidAmount ?? ps.receivedAmount) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn--ghost" @click="showViewModal=false">Close</button>

            <button class="btn btn--ghost" @click="doPrint">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print
            </button>

            <template v-if="viewRow?.documentStatus === 'DR'">
              <button class="btn btn--edit" @click="openEditFromView">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </button>

              <button class="btn btn--process" :disabled="!!actionLoading" @click="doProcessOrder">
                <span v-if="actionLoading==='process'" class="spinner"></span>
                <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Process
              </button>

              <button class="btn btn--book" :disabled="!!actionLoading" @click="doBookOrder">
                <span v-if="actionLoading==='book'" class="spinner"></span>
                <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                Book
              </button>

              <button class="btn btn--void" :disabled="!!actionLoading" @click="doVoidOrder">
                <span v-if="actionLoading==='void'" class="spinner"></span>
                Void
              </button>
            </template>

            <template v-else-if="viewRow?.documentStatus === 'IP'">
              <button class="btn btn--book" :disabled="!!actionLoading" @click="doBookOrder">
                <span v-if="actionLoading==='book'" class="spinner"></span>
                Book
              </button>
              <button class="btn btn--void" :disabled="!!actionLoading" @click="doVoidOrder">
                <span v-if="actionLoading==='void'" class="spinner"></span>
                Void
              </button>
            </template>

            <template v-else-if="viewRow?.documentStatus === 'CO'">
              <button class="btn btn--cancel" :disabled="!!actionLoading" @click="doCloseOrder">
                <span v-if="actionLoading==='close'" class="spinner"></span>
                Close Order
              </button>
              <button class="btn btn--reactivate" :disabled="!!actionLoading" @click="doReactivateOrder">
                <span v-if="actionLoading==='reactivate'" class="spinner"></span>
                Reactivate
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
            <div class="modal-title">Delete Purchase Order</div>
            <button class="modal-close" @click="showDeleteModal=false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-text">Are you sure you want to delete purchase order <strong>{{ deleteRow?.documentNo }}</strong>? This action cannot be undone.</p>
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
import { ref, computed, onMounted, watch } from 'vue'
import {
  fetchAllOrders, fetchOrder, createOrder, updateOrder, deleteOrder,
  fetchOrderLines, createOrderLine, updateOrderLine, deleteOrderLine,
  fetchVendors, fetchVendorById, fetchPartnerLocations, fetchWarehouses,
  fetchTaxRates, fetchCurrentUserProfile,
  fetchPaymentTerms, fetchPaymentMethods, fetchProducts, fetchUOMs,
  fetchOrganizations, fetchPriceLists, fetchPaymentTermLines,
  fetchOrderPaymentSchedule,
  bookOrder, processOrder, voidOrder, reactivateOrder, closeOrder, createOrderPaymentPlan,
} from '@/services/purchaseOrder.js'

import { generateDocumentPDF } from '@/services/pdfGenerator.js' // IMPORT PDF GENERATOR

// ── directive
const vClickOutside = {
  mounted(el, binding) {
    el._handler = (e) => { if (!el.contains(e.target)) binding.value(e) }
    document.addEventListener('click', el._handler, true)
  },
  unmounted(el) { document.removeEventListener('click', el._handler, true) },
}

const PURCHASE_ORDER_DOCTYPE_ID = '53F55A814CA045AE9561B7E247FF9569'

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
  loadOrders()
}

// ── dropdown
const openDropdown = ref(null)
const dropdownPos = ref({ top: 0, right: 0 })

// ── lookup data
const currentUserOrg = ref({ id: '', name: '' })
const customers = ref([])
const partnerLocations = ref([])
const warehouses = ref([])
const paymentTerms = ref([])
const paymentMethods = ref([])
const uoms = ref([])
const organizations = ref([])
const priceLists = ref([])
const taxRates = ref([])

// ── form state
const showFormModal = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const activeFormTab = ref('transaction')
const saving = ref(false)
const formError = ref('')
const editOrgName = ref('')

const emptyForm = () => ({
  documentNo: '', transactionDocument: PURCHASE_ORDER_DOCTYPE_ID, warehouse: '', organization: currentUserOrg.value.id || '',
  partnerAddress: '', orderDate: today(), businessPartner: '', paymentTerms: '', scheduledDeliveryDate: today(),
  paymentMethod: '', invoiceTerm: 'D', orderReference: '', description: '', invoiceAddress: '', deliveryLocation: '', priceList: '',
})
const form = ref(emptyForm())
const vendorSearch = ref('')
const filteredVendors = ref([])
const showVendorDrop = ref(false)

const lines = ref([])
const paymentLines = ref([])
const paymentLinesLoading = ref(false)

// ── view modal
const showViewModal = ref(false)
const viewRow = ref(null)
const viewTab = ref('detail')
const viewLines = ref([])
const viewLinesLoading = ref(false)
const viewPaymentSchedule = ref([])
const viewPaymentLoading = ref(false)

// ── action state
const actionLoading = ref('')
const actionError = ref('')
const showDeleteModal = ref(false)
const deleteRow = ref(null)
const deleting = ref(false)
const deleteError = ref('')

const toast = ref({ show: false, type: 'success', message: '' })
function showToast(msg, type = 'success') {
  toast.value = { show: true, type, message: msg }
  setTimeout(() => { toast.value.show = false }, 3500)
}

function parseApiError(msg) {
  if (!msg) return 'Terjadi kesalahan.'
  const nullMatch = msg.match(/null value in column "([^"]+)" violates not-null constraint/i)
  if (nullMatch) {
    const fieldMap = {
      m_warehouse_id: 'Warehouse wajib diisi.', c_bpartner_id: 'Customer wajib diisi.',
      c_bpartner_location_id: 'Partner Address wajib diisi.', m_pricelist_id: 'Price List wajib diisi.',
      c_paymentterm_id: 'Payment Terms wajib diisi.', fin_paymentmethod_id: 'Payment Method wajib diisi.',
      c_currency_id: 'Currency wajib diisi.', ad_org_id: 'Organization wajib diisi.', c_doctype_id: 'Document Type wajib diisi.',
    }
    return fieldMap[nullMatch[1].toLowerCase()] || `Kolom "${nullMatch[1]}" tidak boleh kosong.`
  }
  if (/unique constraint|duplicate key/i.test(msg)) return 'Data duplikat: dokumen dengan nomor ini sudah ada.'
  if (/foreign key constraint/i.test(msg)) return 'Referensi data tidak valid.'
  if (msg.length <= 200) return msg
  const firstLine = msg.split(/\n|Detail:/i)[0].trim()
  return firstLine.length > 0 ? firstLine : msg.slice(0, 200) + '…'
}

function today() { return new Date().toISOString().slice(0, 10) }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }
function formatCurrency(v) { return v != null ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v) : '—' }
function statusLabel(s) { const map = { DR: 'Draft', IP: 'In Progress', CO: 'Booked', TE: 'Booked', CL: 'Closed', VO: 'Voided' }; return map[s] || s || 'Unknown' }
function statusClass(s) {
  if (s === 'DR') return 'status-pill--draft'
  if (s === 'IP') return 'status-pill--portal'
  if (s === 'CO') return 'status-pill--open'
  if (s === 'CL') return 'status-pill--completed'
  if (s === 'VO') return 'status-pill--voided'
  return 'status-pill--draft'
}

const pageNumbers = computed(() => {
  const tp = totalPages.value, cp = currentPage.value, pages = []
  if (tp <= 7) { for (let i = 1; i <= tp; i++) pages.push(i); return pages }
  pages.push(1); if (cp > 3) pages.push('...')
  for (let i = Math.max(2, cp - 1); i <= Math.min(tp - 1, cp + 1); i++) pages.push(i)
  if (cp < tp - 2) pages.push('...'); pages.push(tp); return pages
})

const orgDisplayLabel = computed(() => {
  if (isEdit.value) { const found = organizations.value.find(o => o.id === form.value.organization); return found ? found.name : (editOrgName.value || form.value.organization || 'Loading...') }
  return currentUserOrg.value.name || 'Loading...'
})
const paymentTermLabel = computed(() => { if (!form.value.paymentTerms) return ''; const found = paymentTerms.value.find(pt => pt.id === form.value.paymentTerms); return found?.name || form.value.paymentTerms })
const paymentMethodLabel = computed(() => { if (!form.value.paymentMethod) return ''; const found = paymentMethods.value.find(pm => pm.id === form.value.paymentMethod); return found?.['_identifier'] || found?.name || form.value.paymentMethod })
const priceListLabel = computed(() => { if (!form.value.priceList) return ''; const found = priceLists.value.find(pl => pl.id === form.value.priceList); return found?.name || form.value.priceList })

async function loadOrders() {
  loading.value = true; error.value = ''
  try {
    const data = await fetchAllOrders({ 
      startRow: (currentPage.value - 1) * pageSize, 
      pageSize, 
      searchKey: searchQuery.value,
      sortCol: sortCol.value, // <--- Kirim parameter sortCol
      sortDir: sortDir.value  // <--- Kirim parameter sortDir
    })
    rows.value = data.data ?? []
    totalCount.value = data.totalRows ?? rows.value.length
  } catch (e) { 
    error.value = e?.response?.data?.response?.error?.message || e.message 
  } finally { 
    loading.value = false 
  }
}

function goPage(p) { if (p >= 1 && p <= totalPages.value) { currentPage.value = p; loadOrders() } }
function onSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(() => { currentPage.value = 1; loadOrders() }, 400) }

function toggleDropdown(id, e) {
  if (openDropdown.value === id) { openDropdown.value = null; return }
  openDropdown.value = id; const btn = e.currentTarget.getBoundingClientRect()
  dropdownPos.value = { top: btn.bottom + 4, right: window.innerWidth - btn.right }
}
function closeDropdown() { openDropdown.value = null }

async function loadLookups() {
  const [w, pt, pm, u, org, pl, tx, userProfile] = await Promise.allSettled([
    fetchWarehouses(), fetchPaymentTerms(), fetchPaymentMethods(),
    fetchUOMs(), fetchOrganizations(), fetchPriceLists(), fetchTaxRates(), fetchCurrentUserProfile()
  ])
  warehouses.value = w.status === 'fulfilled' ? (w.value ?? []) : []
  paymentTerms.value = pt.status === 'fulfilled' ? (pt.value ?? []) : []
  paymentMethods.value = pm.status === 'fulfilled' ? (pm.value ?? []) : []
  uoms.value = u.status === 'fulfilled' ? (u.value ?? []) : []
  organizations.value = org.status === 'fulfilled' ? (org.value ?? []) : []
  priceLists.value = pl.status === 'fulfilled' ? (pl.value ?? []) : []
  taxRates.value = tx.status === 'fulfilled' ? (tx.value ?? []) : []
  if (userProfile.status === 'fulfilled' && userProfile.value) currentUserOrg.value = { id: userProfile.value.organization, name: userProfile.value['organization$_identifier'] }
}

let vendorTimer = null
async function onVendorSearch() {
  showVendorDrop.value = true; clearTimeout(vendorTimer)
  vendorTimer = setTimeout(async () => {
    if (vendorSearch.value.length < 1) { filteredVendors.value = []; return }
    filteredVendors.value = await fetchVendors(vendorSearch.value)
  }, 300)
}
async function selectVendor(v) {
  form.value.businessPartner = v.id; vendorSearch.value = v.name; showVendorDrop.value = false
  form.value.paymentTerms = ''; form.value.paymentMethod = ''; form.value.priceList = ''
  const extractId = (val) => { if (!val) return ''; if (typeof val === 'object') return val.id || ''; return String(val) }
  const ptId = extractId(v.pOPaymentTerms) || extractId(v.paymentTerms); const pmId = extractId(v.pOPaymentMethod) || extractId(v.paymentMethod); const plId = extractId(v.purchasePricelist) || extractId(v.priceList)
  if (ptId) form.value.paymentTerms = ptId; if (pmId) form.value.paymentMethod = pmId; if (plId) form.value.priceList = plId
  if (!form.value.paymentTerms || !form.value.paymentMethod || !form.value.priceList) {
    fetchVendorById(v.id).then(detail => {
      if (!detail) return
      if (!form.value.paymentTerms) form.value.paymentTerms = extractId(detail.pOPaymentTerms) || extractId(detail.paymentTerms)
      if (!form.value.paymentMethod) form.value.paymentMethod = extractId(detail.pOPaymentMethod) || extractId(detail.paymentMethod)
      if (!form.value.priceList) form.value.priceList = extractId(detail.purchasePricelist) || extractId(detail.priceList)
    }).catch(() => {})
  }
  loadPartnerLocations(v.id)
}
async function loadPartnerLocations(bpId) {
  form.value.partnerAddress = ''; form.value.invoiceAddress = ''
  partnerLocations.value = await fetchPartnerLocations(bpId)
  if (partnerLocations.value.length === 1) { form.value.partnerAddress = partnerLocations.value[0].id; form.value.invoiceAddress = partnerLocations.value[0].id }
}
function onVendorBlur() { setTimeout(() => { showVendorDrop.value = false }, 150) }

let productTimers = new WeakMap()
async function onProductSearch(line) {
  line.showDrop = true; const t = productTimers.get(line); if (t) clearTimeout(t)
  productTimers.set(line, setTimeout(async () => { line.productOptions = await fetchProducts(line.productSearch) }, 300))
}
function openProductDrop(line, event) {
  if (!line.productOptions.length && line.productSearch) onProductSearch(line)
  const rect = event.currentTarget.getBoundingClientRect()
  line.dropStyle = { position: 'fixed', top: rect.bottom + 2 + 'px', left: rect.left + 'px', width: rect.width + 'px', zIndex: 9999 }
  line.showDrop = true
}
function selectProduct(line, p) {
  line.product = p.id; line.productSearch = p.name; line.showDrop = false; line.dropStyle = {}
  const uomId = p.uOM ? (typeof p.uOM === 'object' ? p.uOM.id : p.uOM) : ''
  if (uomId) { line.uOM = uomId; const found = uoms.value.find(u => u.id === uomId); line.uomSearch = found ? (found.uOMSymbol || found.name) : (p['uOM$_identifier'] || uomId); line.uomOptions = found ? [found] : [] }
  const taxId = p.tax ? (typeof p.tax === 'object' ? p.tax.id : p.tax) : ''
  if (taxId) { line.tax = taxId; const foundTax = taxRates.value.find(tx => tx.id === taxId); line.taxSearch = foundTax ? foundTax.name + (foundTax.rate != null ? ` (${foundTax.rate}%)` : '') : (p['tax$_identifier'] || taxId); line.taxOptions = foundTax ? [foundTax] : [] }
  line.unitPrice = p.purchasePrice ?? p.listPrice ?? p.standardPrice ?? 0; calcLine(line)
}
function onProductBlur(line) { setTimeout(() => { line.showDrop = false; line.dropStyle = {} }, 150) }

let taxTimers = new WeakMap()
function onTaxSearch(line) {
  line.showTaxDrop = true; const t = taxTimers.get(line); if (t) clearTimeout(t)
  taxTimers.set(line, setTimeout(() => {
    const q = (line.taxSearch || '').toLowerCase()
    line.taxOptions = !q ? taxRates.value.slice(0, 30) : taxRates.value.filter(tx => (tx.name || '').toLowerCase().includes(q) || (tx.rate != null && String(tx.rate).includes(q))).slice(0, 30)
  }, 150))
}
function openTaxDrop(line, event) {
  if (!line.taxOptions.length) line.taxOptions = taxRates.value.slice(0, 30)
  const rect = event.currentTarget.getBoundingClientRect()
  line.taxDropStyle = { position: 'fixed', top: rect.bottom + 2 + 'px', left: rect.left + 'px', width: Math.max(rect.width, 200) + 'px', zIndex: 9999 }
  line.showTaxDrop = true
}
function selectTax(line, tx) { line.tax = tx.id; line.taxSearch = tx.name + (tx.rate != null ? ` (${tx.rate}%)` : ''); line.showTaxDrop = false; line.taxDropStyle = {} }
function onTaxBlur(line) { setTimeout(() => { line.showTaxDrop = false }, 150) }

let uomTimers = new WeakMap()
async function onUomSearch(line) {
  line.showUomDrop = true; const t = uomTimers.get(line); if (t) clearTimeout(t)
  uomTimers.set(line, setTimeout(async () => {
    const q = (line.uomSearch || '').toLowerCase()
    line.uomOptions = !q ? uoms.value.slice(0, 20) : uoms.value.filter(u => (u.uOMSymbol || '').toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q)).slice(0, 20)
  }, 200))
}
function selectUom(line, u) { line.uOM = u.id; line.uomSearch = u.uOMSymbol || u.name; line.showUomDrop = false }
function onUomBlur(line) { setTimeout(() => { line.showUomDrop = false }, 150) }

function newLine() { return { product: '', productSearch: '', productOptions: [], showDrop: false, dropStyle: {}, orderedQuantity: 1, uOM: '', uomSearch: '', uomOptions: [], showUomDrop: false, tax: '', taxSearch: '', taxOptions: [], showTaxDrop: false, taxDropStyle: {}, unitPrice: 0, lineNetAmount: 0 } }
function addLine() { lines.value.push(newLine()) }
function removeLine(i) { lines.value.splice(i, 1) }
function calcLine(line) { line.lineNetAmount = parseFloat(line.orderedQuantity || 0) * parseFloat(line.unitPrice || 0) }

watch(() => form.value.paymentTerms, async (newVal) => {
  paymentLines.value = []; if (!newVal) return
  paymentLinesLoading.value = true
  try {
    const fetchedLines = await fetchPaymentTermLines(newVal)
    if (fetchedLines.length > 0) paymentLines.value = fetchedLines
    else { const header = paymentTerms.value.find(pt => pt.id === newVal); if (header) paymentLines.value = [{ id: header.id, line: 10, offsetDays: header.overduePaymentDaysRule ?? header.offsetMonthDue ?? 0, percentage: null, fixedAmount: null }] }
  } finally { paymentLinesLoading.value = false }
})

function openCreateModal() {
  isEdit.value = false; editId.value = null; form.value = emptyForm(); lines.value = []; paymentLines.value = []
  vendorSearch.value = ''; partnerLocations.value = []; formError.value = ''; activeFormTab.value = 'transaction'
  if (currentUserOrg.value.id) form.value.organization = currentUserOrg.value.id
  showFormModal.value = true
}

async function openEditModal(r) {
  closeDropdown(); isEdit.value = true; editId.value = r.id; activeFormTab.value = 'transaction'; formError.value = ''; showFormModal.value = true
  const extractId = (v) => { if (!v) return ''; if (typeof v === 'object') return v.id ?? ''; return String(v) }
  editOrgName.value = r['organization$_identifier'] || ''
  form.value = {
    documentNo: r.documentNo || '', transactionDocument: extractId(r.transactionDocument), warehouse: extractId(r.warehouse), organization: extractId(r.organization),
    partnerAddress: extractId(r.partnerAddress), orderDate: r.orderDate?.slice(0,10) || today(), businessPartner: extractId(r.businessPartner), paymentTerms: extractId(r.paymentTerms),
    scheduledDeliveryDate: r.scheduledDeliveryDate?.slice(0,10) || '', paymentMethod: extractId(r.paymentMethod), invoiceTerm: r.invoiceTerms || '', orderReference: r.orderReference || '',
    description: r.description || '', invoiceAddress: extractId(r.invoiceAddress), priceList: extractId(r.priceList), deliveryLocation: r.deliveryLocation || '',
  }
  vendorSearch.value = r['businessPartner$_identifier'] || ''
  if (extractId(r.businessPartner)) await loadPartnerLocations(extractId(r.businessPartner))
  const existingLines = await fetchOrderLines(r.id)
  lines.value = existingLines.map(l => {
    const foundUom = uoms.value.find(u => u.id === (typeof l.uOM === 'object' ? l.uOM?.id : l.uOM))
    const taxId = typeof l.tax === 'object' ? l.tax?.id : (l.tax || ''); const foundTax = taxRates.value.find(tx => tx.id === taxId)
    return {
      id: l.id, product: typeof l.product === 'object' ? l.product?.id : (l.product || ''), productSearch: l['product$_identifier'] || '', productOptions: [], showDrop: false, dropStyle: {},
      orderedQuantity: l.orderedQuantity || 1, uOM: typeof l.uOM === 'object' ? l.uOM?.id : (l.uOM || ''), uomSearch: foundUom ? (foundUom.uOMSymbol || foundUom.name) : (l['uOM$_identifier'] || ''), uomOptions: foundUom ? [foundUom] : [], showUomDrop: false,
      tax: taxId, taxSearch: foundTax ? foundTax.name + (foundTax.rate != null ? ` (${foundTax.rate}%)` : '') : (l['tax$_identifier'] || ''), taxOptions: foundTax ? [foundTax] : [], showTaxDrop: false, taxDropStyle: {}, unitPrice: l.unitPrice || 0, lineNetAmount: l.lineNetAmount || 0,
    }
  })
}

function openEditFromView() { const r = viewRow.value; if (!r) return; showViewModal.value = false; openEditModal(r) }

async function openViewModal(r) {
  closeDropdown(); viewRow.value = r; viewTab.value = 'detail'; actionError.value = ''; showViewModal.value = true
  fetchOrder(r.id).then(full => { if (full) viewRow.value = full }).catch(() => {})
  viewLinesLoading.value = true; viewLines.value = await fetchOrderLines(r.id); viewLinesLoading.value = false; viewPaymentSchedule.value = []
}

async function openViewPaymentTab() {
  viewTab.value = 'payment'
  if (viewPaymentSchedule.value.length === 0 && viewRow.value) {
    viewPaymentLoading.value = true; viewPaymentSchedule.value = await fetchOrderPaymentSchedule(viewRow.value.id).catch(() => []); viewPaymentLoading.value = false
  }
}

// ── FUNGSI PRINT PDF ──
async function doPrint() {
  if (!viewRow.value) return
  try {
    // Generate PDF pakai service
    await generateDocumentPDF('Purchase Order', viewRow.value, viewLines.value)
    showToast('Dokumen PDF berhasil diunduh.')
  } catch (error) {
    console.error('Error printing PDF:', error)
    showToast('Gagal men-generate PDF.', 'error')
  }
}

async function saveOrder() {
  if (!form.value.businessPartner) { formError.value = 'Vendor wajib dipilih.'; return }
  if (!form.value.paymentTerms) { formError.value = 'Payment Term tidak ditemukan.'; return }
  if (!form.value.priceList) { formError.value = 'Price List tidak ditemukan.'; return }
  saving.value = true; formError.value = ''
  try {
    let orderId
    if (isEdit.value) { await updateOrder(editId.value, form.value); orderId = editId.value }
    else { const created = await createOrder(form.value); orderId = created?.id }

    if (orderId) {
      let existingLineIds = []; if (isEdit.value) { const existing = await fetchOrderLines(orderId); existingLineIds = existing.map(l => l.id) }
      const savedLineIds = []
      for (let idx = 0; idx < lines.value.length; idx++) {
        const line = lines.value[idx]; if (!line.product) continue
        const linePayload = {
          lineNo: (idx + 1) * 10, orderDate: form.value.orderDate, scheduledDeliveryDate: form.value.scheduledDeliveryDate || form.value.orderDate,
          product: line.product, orderedQuantity: line.orderedQuantity, uOM: line.uOM, unitPrice: line.unitPrice, listPrice: line.unitPrice, standardPrice: line.unitPrice, priceLimit: 0, lineNetAmount: line.lineNetAmount, discount: 0,
          warehouse: form.value.warehouse, currency: '303', businessPartner: form.value.businessPartner, partnerAddress: form.value.partnerAddress, tax: line.tax || 'F3F273F648784C858549A45FF0A69AFA',
        }
        if (line.id) { await updateOrderLine(line.id, linePayload); savedLineIds.push(line.id) }
        else { const created = await createOrderLine(orderId, linePayload); if (created?.id) savedLineIds.push(created.id) }
      }
      for (const existId of existingLineIds) { if (!savedLineIds.includes(existId)) await deleteOrderLine(existId).catch(() => {}) }
    }
    showFormModal.value = false; showToast(isEdit.value ? 'Purchase Order updated!' : 'Purchase Order created!'); await loadOrders()
  } catch (e) { const rawMsg = e?.response?.data?.response?.error?.message || e.message || ''; formError.value = parseApiError(rawMsg) } finally { saving.value = false }
}

async function doProcessOrder() {
  if (!viewRow.value) return; actionLoading.value = 'process'
  try { const updated = await processOrder(viewRow.value.id, viewRow.value); showToast('Purchase Order berhasil di Process.'); await updateViewState(updated) }
  catch (e) { actionError.value = e?.response?.data?.response?.error?.message || e.message } finally { actionLoading.value = '' }
}

async function doBookOrder() {
  if (!viewRow.value) return; actionLoading.value = 'book'
  try {
    const updated = await bookOrder(viewRow.value.id, viewRow.value)
    try { await createOrderPaymentPlan(updated.id, updated); showToast('Purchase Order berhasil di Book dan Payment Plan terbentuk.') } catch (planErr) { showToast('Purchase Order di Book, tapi Payment Plan gagal: ' + planErr.message, 'warning') }
    await updateViewState(updated)
    viewTab.value = 'payment'; viewPaymentLoading.value = true; viewPaymentSchedule.value = await fetchOrderPaymentSchedule(updated.id).catch(() => []); viewPaymentLoading.value = false
  } catch (e) { actionError.value = e?.response?.data?.response?.error?.message || e.message } finally { actionLoading.value = '' }
}

async function doVoidOrder() {
  if (!viewRow.value) return; actionLoading.value = 'void'
  try { const updated = await voidOrder(viewRow.value.id, viewRow.value); showToast('Purchase Order di Void.'); await updateViewState(updated) }
  catch (e) { actionError.value = e?.response?.data?.response?.error?.message || e.message } finally { actionLoading.value = '' }
}

async function doReactivateOrder() {
  if (!viewRow.value) return; actionLoading.value = 'reactivate'
  try { const updated = await reactivateOrder(viewRow.value.id, viewRow.value); showToast('Purchase Order di Reactivate kembali ke Draft.'); await updateViewState(updated); viewPaymentSchedule.value = [] }
  catch (e) { actionError.value = e?.response?.data?.response?.error?.message || e.message } finally { actionLoading.value = '' }
}

async function doCloseOrder() {
  if (!viewRow.value) return; actionLoading.value = 'close'; actionError.value = ''
  try { const updated = await closeOrder(viewRow.value.id, viewRow.value); showToast('Purchase Order berhasil di-Close.'); await updateViewState(updated) }
  catch (e) { actionError.value = e.message } finally { actionLoading.value = '' }
}

async function updateViewState(updatedObj) {
  await loadOrders()
  try { const full = await fetchOrder(updatedObj.id); viewRow.value = full || updatedObj } catch { viewRow.value = updatedObj }
}

function confirmDelete(r) { closeDropdown(); deleteRow.value = r; deleteError.value = ''; showDeleteModal.value = true }
async function doDelete() {
  deleting.value = true; deleteError.value = ''
  try { await deleteOrder(deleteRow.value.id); showDeleteModal.value = false; showToast('Purchase Order deleted.'); await loadOrders() }
  catch (e) { deleteError.value = e?.response?.data?.response?.error?.message || e.message } finally { deleting.value = false }
}

function closeFormModal() { showFormModal.value = false }

onMounted(() => { loadOrders(); loadLookups() })
</script>

<style scoped>
/* (Style dibiarkan sama seperti aslinya karena sudah rapi, saya minimalkan ruang agar tidak terpotong) */
:root { --font: 'Inter', sans-serif; --font-mono: 'JetBrains Mono', monospace; --bg: #f1f5f9; --surface: #ffffff; --surface2: #f8fafc; --border: #e2e8f0; --accent: #3b82f6; --accent-light: #eff6ff; --text-primary: #0f172a; --text-secondary: #475569; --text-muted: #94a3b8; --success: #22c55e; --danger: #ef4444; --warning: #f59e0b; --process-color: #0891b2; --book-color: #7c3aed; --radius: 10px; --radius-sm: 6px; --shadow-sm: 0 1px 2px rgba(0,0,0,.06); --shadow-md: 0 4px 16px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,.04); }
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
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 0 16px; height: 36px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font); transition: all .15s; opacity: 1 !important; visibility: visible !important; }
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
.btn--process { background: #0e7490; color: #fff; }
.btn--book { background: #6d28d9; color: #fff; }
.btn--reactivate { background: #0284c7; color: #fff; }
.btn--void { background: #dc2626; color: #fff; }
.btn--cancel { background: #374151; color: #fff; }
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table thead th { background: var(--surface2); color: var(--text-muted); font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; padding: 10px 16px; border-bottom: 1px solid var(--border); white-space: nowrap; text-align: left; }
.table--lines thead th { padding: 8px 12px; }
.table--lines tbody td { padding: 6px 12px; }
.th-action { text-align: right; width: 80px; }
.table tbody tr td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tr-data:hover { background: var(--surface2); }
.tr-data:last-child td { border-bottom: none; }
.code-badge { font-family: var(--font-mono); font-size: 11.5px; font-weight: 500; background: var(--surface2); border: 1px solid var(--border); padding: 3px 8px; border-radius: 4px; color: var(--text-secondary); white-space: nowrap; }
.td-secondary { color: var(--text-secondary); font-size: 13px; }
.td-clip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px; }
.td-name { font-weight: 500; }
.td-empty { text-align: center; color: var(--text-muted); padding: 48px 16px; font-size: 13px; }
.td-error { color: var(--danger); }
.td-action-cell { text-align: right; overflow: visible !important; }
.status-pill { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
.status-pill--portal { background: #ecfeff; color: #0891b2; }
.status-pill--open { background: #f0fdf4; color: #16a34a; }
.status-pill--completed { background: #fef3c7; color: #92400e; }
.status-pill--draft { background: #f1f5f9; color: #64748b; }
.status-pill--voided { background: #fff1f2; color: #be123c; }
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
.modal--xxl { max-width: 1060px; }
.modal--sm { max-width: 400px; }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 24px 12px; border-bottom: 1px solid var(--border); gap: 12px; flex-shrink: 0; }
.modal-breadcrumb { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-muted); margin-bottom: 4px; }
.bc-active { color: var(--accent); font-weight: 500; }
.modal-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.modal-close { background: none; border: none; color: var(--text-muted); display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; transition: background .12s; flex-shrink: 0; }
.modal-close:hover { background: var(--surface2); color: var(--text-primary); }
.modal-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); padding: 0 24px; flex-shrink: 0; }
.modal-tab { padding: 10px 14px; font-size: 13px; font-weight: 500; color: var(--text-secondary); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-family: var(--font); transition: all .15s; margin-bottom: -1px; }
.modal-tab--active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
.modal-body { padding: 24px; overflow-y: auto; flex: 1; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0; padding: 14px 24px; border-top: 1px solid var(--border); }
.form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
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
.acc-wrap { position: relative; width: 100%; }
.acc-input { display: block; width: 100%; height: 36px; padding: 0 32px 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.acc-input:focus { border-color: var(--accent); background: #fff; }
.acc-input--sm { height: 32px; font-size: 12.5px; }
.acc-chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.acc-dropdown { position: absolute; z-index: 300; top: calc(100% + 3px); left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); max-height: 200px; overflow-y: auto; list-style: none; margin: 0; padding: 4px 0; }
.acc-dropdown--teleport { position: fixed; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); max-height: 220px; overflow-y: auto; list-style: none; margin: 0; padding: 4px 0; }
.tax-rate-badge { margin-left: 6px; font-size: 10.5px; font-weight: 600; color: var(--text-muted); background: var(--surface2); border: 1px solid var(--border); border-radius: 4px; padding: 1px 5px; }
.acc-opt { padding: 8px 12px; font-size: 12.5px; color: var(--text-primary); cursor: pointer; transition: background .1s; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.acc-opt:hover { background: var(--accent-light); }
.acc-empty { padding: 8px 12px; font-size: 12.5px; color: var(--text-muted); font-style: italic; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-item--full { grid-column: 1 / -1; }
.detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.detail-value { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }
.detail-value.mono { font-family: var(--font-mono); font-size: 12.5px; }

/* Totals ditambahkan untuk Purchase / Sales Order */
.totals-block { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 12px; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.totals-row { display: flex; justify-content: space-between; gap: 48px; font-size: 13px; color: var(--text-secondary); min-width: 260px; }
.totals-row--grand { font-weight: 700; font-size: 14px; color: var(--text-primary); border-top: 1px solid var(--border); padding-top: 6px; margin-top: 2px; }

.delete-text { font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); }
.delete-text strong { color: var(--text-primary); }
.toast { position: fixed; bottom: 24px; right: 24px; z-index: 2000; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); }
.toast--success { background: #16a34a; color: #fff; }
.toast--error { background: var(--danger); color: #fff; }
.fade-enter-active,.fade-leave-active { transition: opacity .15s; }
.fade-enter-from,.fade-leave-to { opacity: 0; }
.spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; display: inline-block; }
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