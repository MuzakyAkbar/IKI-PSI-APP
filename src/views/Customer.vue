<template>
  <div class="app">

    <!-- ══════════════════════════════════════════════════════════
         LIST VIEW
    ══════════════════════════════════════════════════════════ -->
    <div v-if="!page.show" class="page-wrap">
      <div class="content-card">

        <!-- Header -->
        <div class="card-header">
          <h2 class="page-title">Customer</h2>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button :class="['tab', activeTab==='list'?'tab--active':'']" @click="activeTab='list'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            List Customers
          </button>
          <button :class="['tab', activeTab==='linkgl'?'tab--active':'']" @click="activeTab='linkgl'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            Link GL
          </button>
        </div>

        <!-- LIST TAB -->
        <div v-if="activeTab==='list'">
          <div class="toolbar">
            <div class="search-wrap">
              <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input v-model="searchQuery" class="search-input" placeholder="Search..." @input="onSearch" />
            </div>
            <button class="btn btn--primary" @click="openCreatePage">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Create Customer
            </button>
          </div>

          <div class="table-wrap">
            <table class="table">
              <colgroup>
                <col style="width:150px">
                <col>
                <col style="width:160px">
                <col style="width:160px">
                <col style="width:140px">
              </colgroup>
              <thead><tr>
                <th>Code</th>
                <th>Customer Name</th>
                <th>City</th>
                <th>Phone</th>
                <th class="th-action">Action</th>
              </tr></thead>
              <tbody>
                <tr v-if="loading"><td colspan="5" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
                <tr v-else-if="error"><td colspan="5" class="td-empty td-error">{{ error }}</td></tr>
                <tr v-else-if="customers.length===0"><td colspan="5" class="td-empty">No customers found.</td></tr>
                <template v-else>
                  <tr v-for="c in customers" :key="c.id" class="tr-data">
                    <td><span class="code-badge">{{ c.searchKey || '—' }}</span></td>
                    <td class="td-name">
                      {{ c.name }}
                      <span v-if="!c.active" class="inactive-pill">Inactive</span>
                    </td>
                    <td class="td-secondary">{{ c.cityName || '—' }}</td>
                    <td class="td-secondary td-mono">{{ c.phone || '—' }}</td>
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
                            <button v-if="c.active" class="dropdown-item dropdown-item--danger" @click="confirmToggle(c)">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Delete
                            </button>
                            <button v-else class="dropdown-item dropdown-item--success" @click="confirmToggle(c)">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>Set As Active
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

        <!-- LINK GL TAB -->
        <div v-if="activeTab==='linkgl'" class="linkgl-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <p>Link GL feature coming soon.</p>
        </div>

      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════
         CREATE / EDIT FULL PAGE
    ══════════════════════════════════════════════════════════ -->
    <Transition name="slide">
      <div v-if="page.show" class="page-wrap">

        <!-- Breadcrumb -->
        <div class="breadcrumb-row">
          <button class="breadcrumb-back" @click="closePage">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            List Customer
          </button>
          <span class="breadcrumb-sep">/</span>
          <span class="breadcrumb-cur">{{ page.mode==='create' ? 'Create Customer' : 'Edit Customer' }}</span>
        </div>

        <div class="form-page-title">{{ page.mode==='create' ? 'Create Customer' : 'Edit Customer' }}</div>

        <!-- Customer Info Card -->
        <div class="form-card">
          <div class="form-card-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Customer Info
          </div>
          <div class="form-grid-3">
            <div class="form-group">
              <label>Customer Code/SKU <span class="req">*</span></label>
              <input v-model="form.searchKey" placeholder="00000" :class="{'input-error':formErrors.searchKey}" :disabled="page.mode==='edit'" />
              <span class="field-error" v-if="formErrors.searchKey">{{ formErrors.searchKey }}</span>
            </div>
            <div class="form-group">
              <label>Province</label>
              <input v-model="form.province" placeholder="Province" />
            </div>
            <div class="form-group">
              <label>Street Address</label>
              <input v-model="form.streetAddress" placeholder="Street Address" />
            </div>
            <div class="form-group">
              <label>Customer Name <span class="req">*</span></label>
              <input v-model="form.name" placeholder="Customer Name" :class="{'input-error':formErrors.name}" />
              <span class="field-error" v-if="formErrors.name">{{ formErrors.name }}</span>
            </div>
            <div class="form-group">
              <label>City</label>
              <input v-model="form.city" placeholder="City" />
            </div>
            <div class="form-group">
              <label>Other details</label>
              <input v-model="form.otherDetails" placeholder="e.g. Room / Unit / Landmark" />
            </div>
          </div>
          <!-- Link GL row -->
          <div class="form-grid-2" style="margin-top:14px">
            <div class="form-group">
              <label>Link GL</label>
              <select v-model="form.linkGL">
                <option value="">Select</option>
              </select>
            </div>
            <div class="form-group">
              <label>Postal Code</label>
              <input v-model="form.postalCode" placeholder="Postal Code" />
            </div>
          </div>
          <div class="form-checks" style="margin-top:14px">
            <label class="check-label"><input type="checkbox" v-model="form.active" /> Active</label>
          </div>
        </div>

        <!-- Contact Info Card -->
        <div class="form-card">
          <div class="form-card-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.4 2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            Contact Info
          </div>
          <div class="form-grid-3">
            <div class="form-group">
              <label>Name</label>
              <input v-model="form.contactName" placeholder="Name PIC" />
            </div>
            <div class="form-group">
              <label>Email</label>
              <input v-model="form.contactEmail" placeholder="Email PIC" type="email" />
            </div>
            <div class="form-group">
              <label>Phone</label>
              <input v-model="form.contactPhone" placeholder="Phone PIC" />
            </div>
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
            {{ formLoading ? 'Saving...' : 'Save' }}
          </button>
        </div>

      </div>
    </Transition>

    <!-- ══════════════════════════════════════════════════════════
         VIEW DETAIL MODAL
    ══════════════════════════════════════════════════════════ -->
    <Transition name="fade">
      <div v-if="viewModal.show" class="modal-overlay" @click.self="viewModal.show=false">
        <div class="modal modal--detail">
          <div class="modal-header">
            <h3 class="modal-title">Customer Detail</h3>
            <button class="modal-close" @click="viewModal.show=false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Detail Tabs -->
          <div class="detail-tabs">
            <button :class="['dtab', detailTab==='basic'?'dtab--active':'']" @click="detailTab='basic'">Basic Info</button>
            <button :class="['dtab', detailTab==='contact'?'dtab--active':'']" @click="detailTab='contact'">Contact</button>
          </div>

          <div class="modal-body">
            <!-- Basic Info -->
            <div v-if="detailTab==='basic'" class="detail-panel">
              <div class="detail-cols">
                <!-- Left column -->
                <div class="detail-col">
                  <div class="detail-item">
                    <span class="detail-label">Customer Code/SKU</span>
                    <span class="detail-value mono">{{ viewModal.data?.searchKey || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Customer Name</span>
                    <span class="detail-value">{{ viewModal.data?.name }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Province</span>
                    <span class="detail-value">{{ viewModal.data?.['province$_identifier'] || viewModal.cityName || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">City</span>
                    <span class="detail-value">{{ viewModal.data?.cityName || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Postal Code</span>
                    <span class="detail-value">{{ viewModal.data?.postalCode || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Status</span>
                    <span :class="['status-pill', viewModal.data?.active?'status-pill--active':'status-pill--inactive']">
                      {{ viewModal.data?.active ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                </div>
                <!-- Right column -->
                <div class="detail-col">
                  <div class="detail-item">
                    <span class="detail-label">Street Address</span>
                    <span class="detail-value">{{ primaryAddress || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Other details</span>
                    <span class="detail-value">{{ viewModal.data?.description || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">City</span>
                    <span class="detail-value">{{ viewModal.data?.cityName || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Payment Terms</span>
                    <span class="detail-value">{{ viewModal.data?.['paymentTerms$_identifier'] || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Price List</span>
                    <span class="detail-value">{{ viewModal.data?.['priceList$_identifier'] || '—' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Contact Tab -->
            <div v-if="detailTab==='contact'" class="detail-panel">
              <div class="sub-toolbar">
                <span class="sub-count">{{ contacts.length }} contact(s)</span>
                <button class="btn btn--sm btn--primary" @click="openContactModal()">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  Add Contact
                </button>
              </div>
              <div v-if="contactsLoading" class="sub-loading"><div class="loading-dots"><span></span><span></span><span></span></div></div>
              <div v-else-if="contacts.length===0" class="sub-empty">No contacts yet.</div>
              <div v-else class="contact-cards">
                <div v-for="ct in contacts" :key="ct.id" class="contact-card">
                  <div class="contact-avatar">{{ initials(ct.firstName, ct.lastName) }}</div>
                  <div class="contact-info">
                    <div class="contact-name">{{ ct.firstName }} {{ ct.lastName }}</div>
                    <div class="contact-meta">
                      <span v-if="ct.email"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> {{ ct.email }}</span>
                      <span v-if="ct.phone"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.4 2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> {{ ct.phone }}</span>
                    </div>
                  </div>
                  <div class="contact-actions">
                    <button class="icon-btn icon-btn--edit" @click="openContactModal(ct)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="icon-btn icon-btn--delete" @click="confirmDeleteContact(ct)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn--ghost" @click="editFromView">Edit</button>
            <button class="btn btn--primary" @click="viewModal.show=false">Close</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ══ TOGGLE ACTIVE MODAL ══ -->
    <Transition name="fade">
      <div v-if="toggleModal.show" class="modal-overlay" @click.self="toggleModal.show=false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <h3 class="modal-title">{{ toggleModal.customer?.active ? 'Deactivate Customer' : 'Activate Customer' }}</h3>
            <button class="modal-close" @click="toggleModal.show=false"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="modal-body">
            <p class="delete-text" v-if="toggleModal.customer?.active">Yakin ingin menonaktifkan <strong>{{ toggleModal.customer?.name }}</strong>?</p>
            <p class="delete-text" v-else>Aktifkan kembali <strong>{{ toggleModal.customer?.name }}</strong>?</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="toggleModal.show=false" :disabled="toggleLoading">Cancel</button>
            <button :class="['btn', toggleModal.customer?.active ? 'btn--danger' : 'btn--primary']" @click="doToggle" :disabled="toggleLoading">
              <span v-if="toggleLoading" class="btn-spinner"></span>
              {{ toggleModal.customer?.active ? 'Deactivate' : 'Activate' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ══ CONTACT MODAL ══ -->
    <Transition name="fade">
      <div v-if="contactModal.show" class="modal-overlay" @click.self="contactModal.show=false">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">{{ contactModal.mode==='create' ? 'Add Contact' : 'Edit Contact' }}</h3>
            <button class="modal-close" @click="contactModal.show=false"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="modal-body">
            <div class="form-grid-2">
              <div class="form-group">
                <label>First Name <span class="req">*</span></label>
                <input v-model="contactForm.firstName" placeholder="First name" :class="{'input-error':contactErrors.firstName}" />
                <span class="field-error" v-if="contactErrors.firstName">{{ contactErrors.firstName }}</span>
              </div>
              <div class="form-group">
                <label>Last Name</label>
                <input v-model="contactForm.lastName" placeholder="Last name" />
              </div>
              <div class="form-group">
                <label>Email</label>
                <input v-model="contactForm.email" placeholder="Email" type="email" />
              </div>
              <div class="form-group">
                <label>Phone</label>
                <input v-model="contactForm.phone" placeholder="Phone" />
              </div>
              <div class="form-group">
                <label>Position</label>
                <input v-model="contactForm.position" placeholder="Position" />
              </div>
            </div>
            <div v-if="contactError" class="form-api-error" style="margin-top:12px">{{ contactError }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="contactModal.show=false" :disabled="contactLoading">Cancel</button>
            <button class="btn btn--primary" @click="submitContact" :disabled="contactLoading">
              <span v-if="contactLoading" class="btn-spinner"></span>
              {{ contactLoading ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ══ CONTACT DELETE ══ -->
    <Transition name="fade">
      <div v-if="contactDeleteModal.show" class="modal-overlay" @click.self="contactDeleteModal.show=false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <h3 class="modal-title">Delete Contact</h3>
            <button class="modal-close" @click="contactDeleteModal.show=false"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="modal-body">
            <p class="delete-text">Yakin ingin menghapus kontak <strong>{{ contactDeleteModal.contact?.firstName }} {{ contactDeleteModal.contact?.lastName }}</strong>?</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="contactDeleteModal.show=false" :disabled="contactDeleteLoading">Cancel</button>
            <button class="btn btn--danger" @click="doDeleteContact" :disabled="contactDeleteLoading">
              <span v-if="contactDeleteLoading" class="btn-spinner"></span>
              Delete
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ══ TOAST ══ -->
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
  fetchCustomers, createCustomer, updateCustomer,
  fetchPaymentTerms, fetchPriceLists, fetchPaymentMethods,
  fetchContacts, createContact, updateContact, deleteContact,
  fetchBPLocations, fetchBPLocationsForIds,
  createLocation, updateLocation,
  createBPLocation, updateBPLocation, deleteBPLocation,
} from '@/services/customer'

// ── click-outside directive ──────────────────────────────────
const vClickOutside = {
  mounted(el, binding) { el._co = e => { if (!el.contains(e.target)) binding.value(e) }; document.addEventListener('click', el._co) },
  unmounted(el) { document.removeEventListener('click', el._co) },
}

// ── State ────────────────────────────────────────────────────
const activeTab    = ref('list')
const customers    = ref([])
const loading      = ref(false)
const error        = ref(null)
const searchQuery  = ref('')
const currentPage  = ref(1)
const pageSize     = 20
const totalRows    = ref(0)
let   searchTimeout = null

const openDropdown = ref(null)
const dropdownPos  = ref({ top: 0, right: 0 })

const provinceOptions = ['DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'Banten', 'Bali', 'Sumatera Utara']

// ── Lookups ──────────────────────────────────────────────────
const lookups = reactive({ paymentTerms: [], priceLists: [], paymentMethods: [] })
async function loadLookups() {
  try {
    const [pt, pl, pm] = await Promise.all([fetchPaymentTerms(), fetchPriceLists(), fetchPaymentMethods()])
    lookups.paymentTerms = pt; lookups.priceLists = pl; lookups.paymentMethods = pm
  } catch (e) { console.warn('Lookup failed', e) }
}

// ── Pagination ───────────────────────────────────────────────
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize)))
const paginationPages = computed(() => {
  const p = []; const t = totalPages.value; const c = currentPage.value
  if (t <= 7) { for (let i = 1; i <= t; i++) p.push(i); return p }
  p.push(1); if (c > 3) p.push('…')
  for (let i = Math.max(2, c-1); i <= Math.min(t-1, c+1); i++) p.push(i)
  if (c < t-2) p.push('…'); p.push(t); return p
})

// ── Load ─────────────────────────────────────────────────────
async function load() {
  loading.value = true; error.value = null
  try {
    const res = await fetchCustomers({ startRow: (currentPage.value-1)*pageSize, pageSize, searchKey: searchQuery.value })
    const list = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : [])
    totalRows.value = res.totalRows ?? list.length
    customers.value = await enrichWithLocation(list)
  } catch (e) { error.value = 'Gagal memuat data customer.' }
  finally { loading.value = false }
}

async function enrichWithLocation(list) {
  if (!list.length) return list
  try {
    const ids = list.map(c => `'${c.id}'`).join(',')
    const locs = await fetchBPLocationsForIds(ids)
    const locMap = {}
    for (const loc of locs) {
      const bpId = typeof loc.businessPartner === 'object' ? loc.businessPartner.id : loc.businessPartner
      if (bpId && !locMap[bpId]) locMap[bpId] = loc
    }
    return list.map(c => {
      const loc = locMap[c.id]
      const ident = loc?.['locationAddress$_identifier'] || ''
      const parts = ident.split(' - ')
      return { ...c, cityName: parts[3]?.trim() || parts[0]?.trim() || '—', phone: loc?.phone || '—' }
    })
  } catch (e) { return list }
}

function onSearch() { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { currentPage.value=1; load() }, 400) }
function goPage(p) { if (p<1||p>totalPages.value) return; currentPage.value=p; load() }

// ── Dropdown ─────────────────────────────────────────────────
function toggleDropdown(id, event) {
  if (openDropdown.value===id) { openDropdown.value=null; return }
  const rect = event.currentTarget.getBoundingClientRect()
  dropdownPos.value = { top: rect.bottom+4, right: window.innerWidth-rect.right }
  openDropdown.value = id
}
function closeDropdown() { openDropdown.value = null }

// ── Toast ────────────────────────────────────────────────────
const toast = reactive({ show: false, message: '', type: 'success' })
let toastTimer = null
function showToast(message, type='success') {
  clearTimeout(toastTimer); Object.assign(toast, { show:true, message, type })
  toastTimer = setTimeout(() => { toast.show=false }, 3000)
}

// ── View Modal ───────────────────────────────────────────────
const viewModal   = reactive({ show: false, data: null })
const detailTab   = ref('basic')
const primaryAddress = ref('')

async function openViewModal(c) {
  closeDropdown()
  viewModal.data = c; viewModal.show = true; detailTab.value = 'basic'
  primaryAddress.value = ''
  loadContacts(c.id)
  try {
    const locs = await fetchBPLocations(c.id)
    if (locs.length) primaryAddress.value = locs[0]['locationAddress$_identifier'] || ''
  } catch (e) {}
}

function editFromView() {
  viewModal.show = false
  openEditPage(viewModal.data)
}

// ── Create / Edit Page ───────────────────────────────────────
const page       = reactive({ show: false, mode: 'create', data: null })
const formLoading = ref(false)
const formError   = ref(null)
const formErrors  = reactive({})

const defaultForm = () => ({
  searchKey: '', name: '', description: '', province: '', city: '',
  streetAddress: '', otherDetails: '', postalCode: '', linkGL: '',
  contactName: '', contactEmail: '', contactPhone: '',
  paymentTerms: '', priceList: '', paymentMethod: '',
  creditLimit: 0, active: true,
})
const form = reactive(defaultForm())

function openCreatePage() {
  Object.assign(form, defaultForm()); Object.keys(formErrors).forEach(k => delete formErrors[k])
  formError.value = null; page.mode='create'; page.data=null; page.show=true
}
function openEditPage(c) {
  closeDropdown()
  Object.assign(form, {
    searchKey: c.searchKey ?? '', name: c.name ?? '', description: c.description ?? '',
    province: '', city: c.cityName ?? '', streetAddress: '', otherDetails: c.description ?? '',
    postalCode: '', linkGL: '', contactName: '', contactEmail: '', contactPhone: '',
    paymentTerms: c.paymentTerms ?? '', priceList: c.priceList ?? '',
    paymentMethod: c.paymentMethod ?? '', creditLimit: c.creditLimit ?? 0, active: c.active ?? true,
  })
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  formError.value = null; page.mode='edit'; page.data=c; page.show=true
}
function closePage() { if (formLoading.value) return; page.show=false }

function validateForm() {
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  if (!form.searchKey.trim()) formErrors.searchKey = 'Code wajib diisi'
  if (!form.name.trim()) formErrors.name = 'Nama customer wajib diisi'
  return Object.keys(formErrors).length === 0
}

async function submitForm() {
  if (!validateForm()) return
  formLoading.value = true; formError.value = null
  try {
    const payload = {
      searchKey: form.searchKey.trim(), name: form.name.trim(),
      description: form.description.trim() || null,
      creditLimit: Number(form.creditLimit) || 0, active: form.active,
      ...(form.paymentTerms  && { paymentTerms: form.paymentTerms }),
      ...(form.priceList     && { priceList: form.priceList }),
      ...(form.paymentMethod && { paymentMethod: form.paymentMethod }),
    }
    if (page.mode==='create') {
      const created = await createCustomer(payload)
      showToast('Customer berhasil dibuat')
      currentPage.value=1; load()
      page.show=false
    } else {
      await updateCustomer(page.data.id, payload)
      showToast('Customer berhasil diupdate')
      page.show=false; load()
    }
  } catch (e) {
    formError.value = e.response?.data?.response?.error?.message ?? e.message ?? 'Terjadi kesalahan.'
  } finally { formLoading.value=false }
}

// ── Toggle Active ────────────────────────────────────────────
const toggleModal   = reactive({ show: false, customer: null })
const toggleLoading = ref(false)
function confirmToggle(c) { closeDropdown(); toggleModal.customer=c; toggleModal.show=true }
async function doToggle() {
  toggleLoading.value=true
  try {
    const newActive = !toggleModal.customer.active
    await updateCustomer(toggleModal.customer.id, { searchKey: toggleModal.customer.searchKey, name: toggleModal.customer.name, active: newActive })
    showToast(newActive ? 'Customer diaktifkan' : 'Customer dinonaktifkan')
    toggleModal.show=false; load()
  } catch (e) { showToast(e.response?.data?.response?.error?.message ?? 'Gagal mengubah status', 'error'); toggleModal.show=false }
  finally { toggleLoading.value=false }
}

// ── Contacts ─────────────────────────────────────────────────
const contacts        = ref([])
const contactsLoading = ref(false)
async function loadContacts(bpId) {
  contactsLoading.value=true
  try { contacts.value = await fetchContacts(bpId) }
  catch (e) { contacts.value=[] }
  finally { contactsLoading.value=false }
}

const contactModal  = reactive({ show: false, mode: 'create', id: null })
const contactLoading = ref(false)
const contactError   = ref(null)
const contactErrors  = reactive({})
const contactForm    = reactive({ firstName:'', lastName:'', email:'', phone:'', position:'' })
const contactDeleteModal = reactive({ show: false, contact: null })
const contactDeleteLoading = ref(false)

function openContactModal(ct=null) {
  contactError.value=null; Object.keys(contactErrors).forEach(k => delete contactErrors[k])
  if (ct) {
    Object.assign(contactForm, { firstName:ct.firstName??'', lastName:ct.lastName??'', email:ct.email??'', phone:ct.phone??'', position:ct.position??'' })
    contactModal.mode='edit'; contactModal.id=ct.id
  } else {
    Object.assign(contactForm, { firstName:'', lastName:'', email:'', phone:'', position:'' })
    contactModal.mode='create'; contactModal.id=null
  }
  contactModal.show=true
}
async function submitContact() {
  Object.keys(contactErrors).forEach(k => delete contactErrors[k])
  if (!contactForm.firstName.trim()) { contactErrors.firstName='First name wajib diisi'; return }
  contactLoading.value=true; contactError.value=null
  try {
    const payload = { firstName:contactForm.firstName.trim(), lastName:contactForm.lastName.trim()||null, name:`${contactForm.firstName.trim()} ${contactForm.lastName.trim()}`.trim(), email:contactForm.email.trim()||null, phone:contactForm.phone.trim()||null, position:contactForm.position.trim()||null, businessPartner:viewModal.data?.id }
    if (contactModal.mode==='create') { await createContact(payload); showToast('Contact berhasil ditambahkan') }
    else { await updateContact(contactModal.id, payload); showToast('Contact berhasil diupdate') }
    contactModal.show=false; await loadContacts(viewModal.data?.id)
  } catch (e) { contactError.value = e.message ?? 'Terjadi kesalahan.' }
  finally { contactLoading.value=false }
}
function confirmDeleteContact(ct) { contactDeleteModal.contact=ct; contactDeleteModal.show=true }
async function doDeleteContact() {
  contactDeleteLoading.value=true
  try { await deleteContact(contactDeleteModal.contact.id); showToast('Contact dihapus'); contactDeleteModal.show=false; await loadContacts(viewModal.data?.id) }
  catch (e) { showToast(e.message??'Gagal menghapus', 'error'); contactDeleteModal.show=false }
  finally { contactDeleteLoading.value=false }
}

function initials(first, last) { return `${(first?.[0]||'').toUpperCase()}${(last?.[0]||'').toUpperCase()}` || '?' }

onMounted(() => { load(); loadLookups() })
</script>

<style scoped>
*, *::before, *::after { box-sizing: border-box; }
:root {
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --bg: #f1f5f9;
  --surface: #ffffff;
  --surface2: #f8fafc;
  --border: #e2e8f0;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --accent: #3b82f6;
  --accent-hover: #2563eb;
  --accent-light: #eff6ff;
  --success: #22c55e;
  --danger: #ef4444;
  --radius: 12px;
  --radius-sm: 8px;
  --shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
  --shadow-md: 0 4px 16px rgba(0,0,0,.1);
}

/* ── Layout ───────────────────────────────────────────── */
.app { min-height: 100vh; background: var(--bg); font-family: var(--font); }
.page-wrap { padding: 28px 32px; max-width: 1280px; margin: 0 auto; }
.content-card { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }

/* ── Card Header ──────────────────────────────────────── */
.card-header { padding: 22px 24px 0; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }

/* ── Tabs ─────────────────────────────────────────────── */
.tabs { display: flex; border-bottom: 1px solid var(--border); padding: 0 20px; gap: 4px; margin-top: 12px; }
.tab { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px 9px; font-size: 13px; font-weight: 500; background: none; border: none; border-bottom: 2px solid transparent; color: var(--text-secondary); cursor: pointer; transition: color .15s, border-color .15s; margin-bottom: -1px; font-family: var(--font); }
.tab:hover { color: var(--text-primary); }
.tab--active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }

/* ── Toolbar ──────────────────────────────────────────── */
.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; gap: 12px; }
.search-wrap { position: relative; flex: 1; max-width: 280px; }
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.search-input { width: 100%; height: 36px; padding: 0 12px 0 32px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; background: var(--surface2); outline: none; font-family: var(--font); color: var(--text-primary); transition: border-color .15s; }
.search-input:focus { border-color: var(--accent); background: #fff; }

/* ── Buttons ──────────────────────────────────────────── */
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; border: none; cursor: pointer; transition: all .15s; font-family: var(--font); }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.btn--primary { background: var(--accent); color: #fff; } .btn--primary:hover:not(:disabled) { background: var(--accent-hover); }
.btn--ghost { background: transparent; color: var(--text-secondary); border: 1px solid var(--border); } .btn--ghost:hover:not(:disabled) { background: var(--surface2); }
.btn--danger { background: var(--danger); color: #fff; } .btn--danger:hover:not(:disabled) { background: #dc2626; }
.btn--sm { padding: 6px 12px; font-size: 12px; }
.btn-spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Table ────────────────────────────────────────────── */
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table thead th { padding: 10px 16px; text-align: left; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); background: var(--surface2); border-bottom: 1px solid var(--border); white-space: nowrap; }
.table tbody td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.table tbody tr:last-child td { border-bottom: none; }
.tr-data:hover { background: #fafbfc; }
.th-action { text-align: right; }
.td-name { font-weight: 500; color: var(--text-primary); }
.td-secondary { color: var(--text-secondary); font-size: 13px; }
.td-mono { font-family: var(--font-mono); font-size: 12.5px; }
.td-empty { text-align: center; color: var(--text-muted); padding: 48px; font-size: 13px; }
.td-error { color: var(--danger); }
.td-action-cell { text-align: right; overflow: visible !important; }

.code-badge { font-family: var(--font-mono); font-size: 11.5px; font-weight: 500; background: var(--surface2); border: 1px solid var(--border); padding: 3px 8px; border-radius: 4px; color: var(--text-secondary); white-space: nowrap; }
.inactive-pill { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; background: #fff1f2; color: var(--danger); margin-left: 6px; vertical-align: middle; }

/* ── Dropdown ─────────────────────────────────────────── */
.action-group { display: flex; justify-content: flex-end; }
.action-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 6px; background: var(--surface2); border: 1px solid var(--border); cursor: pointer; color: var(--text-secondary); transition: background .12s; }
.action-btn:hover { background: var(--border); }
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

/* ── Link GL placeholder ──────────────────────────────── */
.linkgl-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 64px; color: var(--text-muted); }
.linkgl-empty p { font-size: 13px; margin: 0; }

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
.form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-group input, .form-group select { height: 38px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; width: 100%; }
.form-group input:focus, .form-group select:focus { border-color: var(--accent); background: #fff; }
.form-group input:disabled { background: #f1f5f9; color: var(--text-muted); cursor: not-allowed; }
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
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); width: 100%; max-width: 480px; overflow: hidden; }
.modal--detail { max-width: 700px; }
.modal--sm { max-width: 400px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); }
.modal-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
.modal-close { background: none; border: none; color: var(--text-muted); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .12s; }
.modal-close:hover { background: var(--surface2); color: var(--text-primary); }
.modal-body { padding: 20px; max-height: 60vh; overflow-y: auto; }
.modal-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; }

/* ── Detail Tabs ──────────────────────────────────────── */
.detail-tabs { display: flex; border-bottom: 1px solid var(--border); padding: 0 20px; }
.dtab { padding: 12px 16px 10px; font-size: 13px; font-weight: 500; background: none; border: none; border-bottom: 2px solid transparent; color: var(--text-secondary); cursor: pointer; margin-bottom: -1px; transition: all .15s; font-family: var(--font); }
.dtab:hover { color: var(--text-primary); }
.dtab--active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }

/* ── Detail View ──────────────────────────────────────── */
.detail-panel { }
.detail-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.detail-col { display: flex; flex-direction: column; gap: 14px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.detail-value { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }
.detail-value.mono { font-family: var(--font-mono); font-size: 12.5px; }
.status-pill { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600; }
.status-pill--active { background: #f0fdf4; color: #16a34a; }
.status-pill--inactive { background: #fff1f2; color: var(--danger); }

/* ── Contact cards ────────────────────────────────────── */
.sub-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.sub-count { font-size: 12px; color: var(--text-muted); font-weight: 500; }
.sub-loading { display: flex; justify-content: center; padding: 32px; }
.sub-empty { text-align: center; color: var(--text-muted); padding: 40px; font-size: 13px; }
.contact-cards { display: flex; flex-direction: column; gap: 8px; }
.contact-card { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface2); }
.contact-avatar { width: 36px; height: 36px; background: var(--accent-light); color: var(--accent); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.contact-info { flex: 1; min-width: 0; }
.contact-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.contact-meta { display: flex; gap: 12px; margin-top: 2px; }
.contact-meta span { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-secondary); }
.contact-actions { display: flex; gap: 6px; }
.icon-btn { width: 28px; height: 28px; border-radius: 6px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .12s; }
.icon-btn--edit { background: #f0fdf4; color: #16a34a; } .icon-btn--edit:hover { background: #dcfce7; }
.icon-btn--delete { background: #fff1f2; color: var(--danger); } .icon-btn--delete:hover { background: #ffe4e6; }

/* ── Delete confirm ───────────────────────────────────── */
.delete-text { font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); margin: 0; }
.delete-text strong { color: var(--text-primary); }

/* ── Transitions ──────────────────────────────────────── */
.fade-enter-active,.fade-leave-active { transition: opacity .15s; }
.fade-enter-from,.fade-leave-to { opacity: 0; }
.slide-enter-active,.slide-leave-active { transition: transform .2s ease, opacity .2s ease; }
.slide-enter-from,.slide-leave-to { transform: translateX(24px); opacity: 0; }
</style>