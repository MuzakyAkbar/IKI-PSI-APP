<template>
  <div class="layout">
    <main class="main">
      <div class="content-card">

        <div class="page-header">
          <h2 class="page-title">Product</h2>
        </div>

        <div class="tabs">
          <button :class="['tab', activeTab==='product'?'tab--active':'']" @click="switchTab('product')">Product</button>
          <button :class="['tab', activeTab==='category'?'tab--active':'']" @click="switchTab('category')">Product Category</button>
          <button :class="['tab', activeTab==='uom'?'tab--active':'']" @click="switchTab('uom')">UOM</button>
        </div>

        <!-- ══ PRODUCT TAB ══ -->
        <div v-if="activeTab==='product'">
          <div class="toolbar">
            <div class="search-wrap">
              <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input v-model="searchQuery" class="search-input" placeholder="Search product..." @input="onSearch" />
            </div>
            <button class="btn btn--primary" @click="openCreateModal('product')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Create Product
            </button>
          </div>
          <div class="table-wrap">
            <table class="table">
              <colgroup>
                <col style="width:160px">
                <col style="width:22%">
                <col style="width:18%">
                <col style="width:14%">
                <col style="width:100px">
                <col>
                <col style="width:140px">
              </colgroup>
              <thead><tr>
                <th>Code</th><th>Product Name</th><th>Category</th>
                <th>Unit of Measure</th><th>Type</th><th>Description</th>
                <th class="th-action">Action</th>
              </tr></thead>
              <tbody>
                <tr v-if="loading"><td colspan="7" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
                <tr v-else-if="error"><td colspan="7" class="td-empty td-error">{{ error }}</td></tr>
                <tr v-else-if="rows.length===0"><td colspan="7" class="td-empty">No products found.</td></tr>
                <template v-else>
                  <tr v-for="r in rows" :key="r.id" class="tr-data">
                    <td><span class="code-badge">{{ r.searchKey }}</span></td>
                    <td class="td-name">
                      <span class="td-name-text">{{ r.name }}</span>
                      <span :class="['status-dot', r.active?'status-dot--active':'status-dot--inactive']"></span>
                    </td>
                    <td class="td-secondary td-clip">{{ r['productCategory$_identifier'] || '—' }}</td>
                    <td class="td-secondary td-clip">{{ r['uOM$_identifier'] || '—' }}</td>
                    <td><span class="type-badge">{{ productTypeLabel(r.productType) }}</span></td>
                    <td class="td-secondary td-clip">{{ r.description || '—' }}</td>
                    <td class="td-action-cell">
                      <div class="action-group">
                        <div class="dropdown-wrap" v-click-outside="closeDropdown">
                          <button class="action-btn action-btn--more" @click.stop="toggleDropdown(r.id, $event)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                          </button>
                          <div v-if="openDropdown===r.id" class="dropdown-menu" :style="{top: dropdownPos.top+'px', right: dropdownPos.right+'px'}">
                            <button class="dropdown-item" @click="openViewModal(r)">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>View
                            </button>
                            <button class="dropdown-item" @click="openEditModal('product', r); closeDropdown()">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit
                            </button>
                            <button v-if="r.active" class="dropdown-item dropdown-item--danger" @click="confirmDelete(r,'product')">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Delete
                            </button>
                            <button v-else class="dropdown-item dropdown-item--success" @click="confirmDelete(r,'product')">
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
            <button class="page-btn" :disabled="currentPage === 1" @click="goPage(currentPage - 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button v-for="p in paginationPages" :key="p" :class="['page-btn', p === currentPage ? 'page-btn--active' : '']" @click="goPage(p)">{{ p }}</button>
            <button class="page-btn" :disabled="currentPage === totalPages" @click="goPage(currentPage + 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>

        <!-- ══ CATEGORY TAB ══ -->
        <div v-if="activeTab==='category'">
          <div class="toolbar">
            <div class="search-wrap">
              <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input v-model="searchQuery" class="search-input" placeholder="Search category..." @input="onSearch" />
            </div>
            <button class="btn btn--primary" @click="openCreateModal('category')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Create Category
            </button>
          </div>
          <div class="table-wrap">
            <table class="table">
              <colgroup>
                <col style="width:120px">
                <col style="width:15%">
                <col style="width:18%">
                <col style="width:18%">
                <col style="width:15%">
                <col style="width:15%">
                <col style="width:90px">
                <col style="width:140px">
              </colgroup>
              <thead><tr>
                <th>Code</th><th>Category Name</th><th>Product Revenue</th>
                <th>Product Expense</th><th>Product COGS</th><th>Product Asset</th>
                <th>Status</th><th class="th-action">Action</th>
              </tr></thead>
              <tbody>
                <tr v-if="loading"><td colspan="8" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
                <tr v-else-if="rows.length===0"><td colspan="8" class="td-empty">No categories found.</td></tr>
                <template v-else>
                  <tr v-for="r in rows" :key="r.id" class="tr-data">
                    <td><span class="code-badge">{{ r.searchKey || '—' }}</span></td>
                    <td class="td-name"><span class="td-name-text">{{ r.name }}</span></td>
                    <td class="td-secondary td-clip">{{ r['productRevenue$_identifier'] || '—' }}</td>
                    <td class="td-secondary td-clip">{{ r['productExpense$_identifier'] || '—' }}</td>
                    <td class="td-secondary td-clip">{{ r['productCOGS$_identifier'] || '—' }}</td>
                    <td class="td-secondary td-clip">{{ r['fixedAsset$_identifier'] || '—' }}</td>
                    <td><span :class="['status-pill', r.active?'status-pill--active':'status-pill--inactive']">{{ r.active?'Active':'Inactive' }}</span></td>
                    <td class="td-action-cell">
                      <div class="action-group">
                        <div class="dropdown-wrap" v-click-outside="closeDropdown">
                          <button class="action-btn action-btn--more" @click.stop="toggleDropdown(r.id, $event)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                          </button>
                          <div v-if="openDropdown===r.id" class="dropdown-menu" :style="{top: dropdownPos.top+'px', right: dropdownPos.right+'px'}">
                            <button class="dropdown-item" @click="openViewCatModal(r)">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>View
                            </button>
                            <button class="dropdown-item" @click="openEditModal('category', r); closeDropdown()">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit
                            </button>
                            <button v-if="r.active" class="dropdown-item dropdown-item--danger" @click="confirmDelete(r,'category')">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Delete
                            </button>
                            <button v-else class="dropdown-item dropdown-item--success" @click="confirmDelete(r,'category')">
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
            <button class="page-btn" :disabled="currentPage === 1" @click="goPage(currentPage - 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button v-for="p in paginationPages" :key="p" :class="['page-btn', p === currentPage ? 'page-btn--active' : '']" @click="goPage(p)">{{ p }}</button>
            <button class="page-btn" :disabled="currentPage === totalPages" @click="goPage(currentPage + 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>

        <!-- ══ UOM TAB ══ -->
        <div v-if="activeTab==='uom'">
          <div class="toolbar">
            <div class="search-wrap">
              <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input v-model="searchQuery" class="search-input" placeholder="Search UOM..." @input="onSearch" />
            </div>
            <button class="btn btn--primary" @click="openCreateModal('uom')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Create UOM
            </button>
          </div>
          <div class="table-wrap">
            <table class="table">
              <colgroup>
                <col style="width:160px">
                <col>
                <col style="width:110px">
                <col style="width:140px">
              </colgroup>
              <thead><tr><th>Code</th><th>UOM Name</th><th>Status</th><th class="th-action">Action</th></tr></thead>
              <tbody>
                <tr v-if="loading"><td colspan="4" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
                <tr v-else-if="rows.length===0"><td colspan="4" class="td-empty">No UOM found.</td></tr>
                <template v-else>
                  <tr v-for="r in rows" :key="r.id" class="tr-data">
                    <td><span class="code-badge">{{ r.eDICode || '—' }}</span></td>
                    <td class="td-name"><span class="td-name-text">{{ r.name }}</span></td>
                    <td><span :class="['status-pill', r.active?'status-pill--active':'status-pill--inactive']">{{ r.active?'Active':'Inactive' }}</span></td>
                    <td class="td-action-cell">
                      <div class="action-group">
                        <div class="dropdown-wrap" v-click-outside="closeDropdown">
                          <button class="action-btn action-btn--more" @click.stop="toggleDropdown(r.id, $event)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                          </button>
                          <div v-if="openDropdown===r.id" class="dropdown-menu" :style="{top: dropdownPos.top+'px', right: dropdownPos.right+'px'}">
                            <button class="dropdown-item" @click="openEditModal('uom', r); closeDropdown()">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit
                            </button>
                            <button v-if="r.active" class="dropdown-item dropdown-item--danger" @click="confirmDelete(r,'uom')">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Delete
                            </button>
                            <button v-else class="dropdown-item dropdown-item--success" @click="confirmDelete(r,'uom')">
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
            <button class="page-btn" :disabled="currentPage === 1" @click="goPage(currentPage - 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button v-for="p in paginationPages" :key="p" :class="['page-btn', p === currentPage ? 'page-btn--active' : '']" @click="goPage(p)">{{ p }}</button>
            <button class="page-btn" :disabled="currentPage === totalPages" @click="goPage(currentPage + 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>

      </div>
    </main>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast.show" :class="['toast',`toast--${toast.type}`]">
        <svg v-if="toast.type==='success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ toast.message }}
      </div>
    </Transition>

    <!-- VIEW MODAL -->
    <Transition name="fade">
      <div v-if="viewModal" class="modal-overlay" @click.self="viewModal=null">
        <div class="modal">
          <div class="modal-header">
            <h3>Product Detail</h3>
            <button class="modal-close" @click="viewModal=null"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="modal-body">
            <div class="detail-grid">
              <div class="detail-item"><span class="detail-label">Product Code/SKU</span><span class="detail-value mono">{{ viewModal.searchKey }}</span></div>
              <div class="detail-item"><span class="detail-label">Product Type</span><span class="detail-value">{{ productTypeLabel(viewModal.productType) }}</span></div>
              <div class="detail-item"><span class="detail-label">Product Name</span><span class="detail-value">{{ viewModal.name }}</span></div>
              <div class="detail-item"><span class="detail-label">Description</span><span class="detail-value">{{ viewModal.description || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">Product Category</span><span class="detail-value">{{ viewModal['productCategory$_identifier'] || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">Unit of Measure</span><span class="detail-value">{{ viewModal['uOM$_identifier'] || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">Tax Category</span><span class="detail-value">{{ viewModal['taxCategory$_identifier'] || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">Status</span><span :class="['status-pill', viewModal.active?'status-pill--active':'status-pill--inactive']">{{ viewModal.active?'Active':'Inactive' }}</span></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="viewModal=null">Close</button>
            <button class="btn btn--primary" @click="()=>{openEditModal('product',viewModal);viewModal=null}">Edit</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- CATEGORY VIEW MODAL -->
    <Transition name="fade">
      <div v-if="viewCatModal" class="modal-overlay" @click.self="viewCatModal=null">
        <div class="modal modal--wide">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Dashboard</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span>Product</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">Detail Category</span>
              </div>
              <h3 class="modal-title">Category Detail</h3>
            </div>
            <button class="modal-close" @click="viewCatModal=null"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="modal-body">
            <div class="detail-grid">
              <div class="detail-item"><span class="detail-label">Code/SKU</span><span class="detail-value mono">{{ viewCatModal.searchKey || '-' }}</span></div>
              <div class="detail-item"><span class="detail-label">Category Name</span><span class="detail-value">{{ viewCatModal.name }}</span></div>
              <div class="detail-item"><span class="detail-label">Product Revenue</span><span class="detail-value">{{ viewCatModal['productRevenue$_identifier'] || '—' }}</span></div>
              <div class="detail-item"><span class="detail-label">Product Asset</span><span class="detail-value">{{ viewCatModal['fixedAsset$_identifier'] || '—' }}</span></div>
              <div class="detail-item"><span class="detail-label">Product Expense</span><span class="detail-value">{{ viewCatModal['productExpense$_identifier'] || '—' }}</span></div>
              <div class="detail-item"><span class="detail-label">Product COGS</span><span class="detail-value">{{ viewCatModal['productCOGS$_identifier'] || '—' }}</span></div>
              <div class="detail-item"><span class="detail-label">Status</span><span :class="['status-pill', viewCatModal.active?'status-pill--active':'status-pill--inactive']">{{ viewCatModal.active?'Active':'Inactive' }}</span></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="viewCatModal=null">Close</button>
            <button class="btn btn--primary" @click="()=>{openEditModal('category',viewCatModal);viewCatModal=null}">Edit</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- CREATE / EDIT MODAL -->
    <Transition name="fade">
      <div v-if="formModal.show" class="modal-overlay" @click.self="closeFormModal">
        <div class="modal modal--wide">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Dashboard</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span>Product</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">{{ formModal.mode==='create'?'Create':'Edit' }} {{ formModalTitle }}</span>
              </div>
              <h3 class="modal-title">{{ formModal.mode==='create'?'Create':'Edit' }} {{ formModalTitle }}</h3>
            </div>
            <button class="modal-close" @click="closeFormModal"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="modal-body">

            <!-- PRODUCT FORM -->
            <template v-if="formModal.type==='product'">
              <div class="form-grid-2">
                <div class="form-group">
                  <label>Product Name <span class="req">*</span></label>
                  <input v-model="form.name" placeholder="Product Name" :class="{'input-error':formErrors.name}" />
                  <span class="field-error" v-if="formErrors.name">{{ formErrors.name }}</span>
                </div>
                <div class="form-group">
                  <label>Unit of Measure <span class="req">*</span></label>
                  <select v-model="form.uOM" :class="{'input-error':formErrors.uOM}">
                    <option value="">Select</option>
                    <option v-for="u in lookups.uoms" :key="u.id" :value="u.id">{{ u.name }}</option>
                  </select>
                  <span class="field-error" v-if="formErrors.uOM">{{ formErrors.uOM }}</span>
                </div>
                <div class="form-group">
                  <label>Product Type <span class="req">*</span></label>
                  <select v-model="form.productType" :class="{'input-error':formErrors.productType}">
                    <option value="">Select</option>
                    <option value="I">Item</option>
                    <option value="S">Service</option>
                    <option value="E">Expense</option>
                  </select>
                  <span class="field-error" v-if="formErrors.productType">{{ formErrors.productType }}</span>
                </div>
                <div class="form-group">
                  <label>Product Category <span class="req">*</span></label>
                  <select v-model="form.productCategory" :class="{'input-error':formErrors.productCategory}">
                    <option value="">Select</option>
                    <option v-for="c in lookups.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                  <span class="field-error" v-if="formErrors.productCategory">{{ formErrors.productCategory }}</span>
                </div>
                <div class="form-group" style="grid-column:1/-1">
                  <label>Description</label>
                  <input v-model="form.description" placeholder="Description (optional)" />
                </div>
              </div>
              <div class="form-checks">
                <label class="check-label"><input type="checkbox" v-model="form.purchase" />Purchase</label>
                <label class="check-label"><input type="checkbox" v-model="form.sale" />Sale</label>
                <label class="check-label"><input type="checkbox" v-model="form.stocked" />Stocked</label>
                <label class="check-label"><input type="checkbox" v-model="form.active" />Active</label>
              </div>
            </template>

            <!-- CATEGORY FORM -->
            <template v-else-if="formModal.type==='category'">
              <div class="form-grid-2">
                <div class="form-group">
                  <label>Code/SKU <span class="req">*</span></label>
                  <input v-model="form.searchKey" placeholder="e.g. CAT-001" :class="{'input-error':formErrors.searchKey}" />
                  <span class="field-error" v-if="formErrors.searchKey">{{ formErrors.searchKey }}</span>
                </div>
                <div class="form-group">
                  <label>Category Name <span class="req">*</span></label>
                  <input v-model="form.name" placeholder="Category Name" :class="{'input-error':formErrors.name}" />
                  <span class="field-error" v-if="formErrors.name">{{ formErrors.name }}</span>
                </div>
                <div class="form-group">
                  <label>Product Revenue <span class="req">*</span></label>
                  <div class="acc-wrap" v-click-outside="()=>accOpen.productRevenue=false">
                    <input class="acc-input" :class="{'input-error':formErrors.productRevenue}"
                      :value="accOpen.productRevenue ? accQuery.productRevenue : accLabel('productRevenue')"
                      placeholder="Ketik untuk mencari..."
                      @focus="accFocus('productRevenue')"
                      @input="e=>accInput('productRevenue',e)"
                      @blur="accBlur('productRevenue')" />
                    <svg class="acc-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                    <ul v-if="accOpen.productRevenue" class="acc-dropdown">
                      <li v-if="accFiltered('productRevenue').length===0" class="acc-empty">Tidak ada hasil</li>
                      <li v-for="a in accFiltered('productRevenue')" :key="a.id"
                        :class="['acc-opt', a.id===form.productRevenue?'acc-opt--active':'']"
                        @mousedown.prevent="accSelect('productRevenue',a)">{{ a._identifier||a.combination }}</li>
                    </ul>
                  </div>
                  <span class="field-error" v-if="formErrors.productRevenue">{{ formErrors.productRevenue }}</span>
                </div>
                <div class="form-group">
                  <label>Product Asset <span class="req">*</span></label>
                  <div class="acc-wrap" v-click-outside="()=>accOpen.fixedAsset=false">
                    <input class="acc-input" :class="{'input-error':formErrors.fixedAsset}"
                      :value="accOpen.fixedAsset ? accQuery.fixedAsset : accLabel('fixedAsset')"
                      placeholder="Ketik untuk mencari..."
                      @focus="accFocus('fixedAsset')"
                      @input="e=>accInput('fixedAsset',e)"
                      @blur="accBlur('fixedAsset')" />
                    <svg class="acc-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                    <ul v-if="accOpen.fixedAsset" class="acc-dropdown">
                      <li v-if="accFiltered('fixedAsset').length===0" class="acc-empty">Tidak ada hasil</li>
                      <li v-for="a in accFiltered('fixedAsset')" :key="a.id"
                        :class="['acc-opt', a.id===form.fixedAsset?'acc-opt--active':'']"
                        @mousedown.prevent="accSelect('fixedAsset',a)">{{ a._identifier||a.combination }}</li>
                    </ul>
                  </div>
                  <span class="field-error" v-if="formErrors.fixedAsset">{{ formErrors.fixedAsset }}</span>
                </div>
                <div class="form-group">
                  <label>Product Expense <span class="req">*</span></label>
                  <div class="acc-wrap" v-click-outside="()=>accOpen.productExpense=false">
                    <input class="acc-input" :class="{'input-error':formErrors.productExpense}"
                      :value="accOpen.productExpense ? accQuery.productExpense : accLabel('productExpense')"
                      placeholder="Ketik untuk mencari..."
                      @focus="accFocus('productExpense')"
                      @input="e=>accInput('productExpense',e)"
                      @blur="accBlur('productExpense')" />
                    <svg class="acc-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                    <ul v-if="accOpen.productExpense" class="acc-dropdown">
                      <li v-if="accFiltered('productExpense').length===0" class="acc-empty">Tidak ada hasil</li>
                      <li v-for="a in accFiltered('productExpense')" :key="a.id"
                        :class="['acc-opt', a.id===form.productExpense?'acc-opt--active':'']"
                        @mousedown.prevent="accSelect('productExpense',a)">{{ a._identifier||a.combination }}</li>
                    </ul>
                  </div>
                  <span class="field-error" v-if="formErrors.productExpense">{{ formErrors.productExpense }}</span>
                </div>
                <div class="form-group">
                  <label>Product COGS <span class="req">*</span></label>
                  <div class="acc-wrap" v-click-outside="()=>accOpen.productCOGS=false">
                    <input class="acc-input" :class="{'input-error':formErrors.productCOGS}"
                      :value="accOpen.productCOGS ? accQuery.productCOGS : accLabel('productCOGS')"
                      placeholder="Ketik untuk mencari..."
                      @focus="accFocus('productCOGS')"
                      @input="e=>accInput('productCOGS',e)"
                      @blur="accBlur('productCOGS')" />
                    <svg class="acc-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                    <ul v-if="accOpen.productCOGS" class="acc-dropdown">
                      <li v-if="accFiltered('productCOGS').length===0" class="acc-empty">Tidak ada hasil</li>
                      <li v-for="a in accFiltered('productCOGS')" :key="a.id"
                        :class="['acc-opt', a.id===form.productCOGS?'acc-opt--active':'']"
                        @mousedown.prevent="accSelect('productCOGS',a)">{{ a._identifier||a.combination }}</li>
                    </ul>
                  </div>
                  <span class="field-error" v-if="formErrors.productCOGS">{{ formErrors.productCOGS }}</span>
                </div>
              </div>
              <div class="form-checks">
                <label class="check-label"><input type="checkbox" v-model="form.active" />Active</label>
              </div>
            </template>

            <!-- UOM FORM -->
            <template v-else-if="formModal.type==='uom'">
              <div class="form-grid-2">
                <div class="form-group">
                  <label>EDI Code <span class="req">*</span></label>
                  <input v-model="form.uOMSymbol" placeholder="e.g. kg" maxlength="2" :class="{'input-error':formErrors.uOMSymbol}" />
                  <span class="field-error" v-if="formErrors.uOMSymbol">{{ formErrors.uOMSymbol }}</span>
                </div>
                <div class="form-group">
                  <label>Unit of Measure Name <span class="req">*</span></label>
                  <input v-model="form.name" placeholder="UOM Name" :class="{'input-error':formErrors.name}" />
                  <span class="field-error" v-if="formErrors.name">{{ formErrors.name }}</span>
                </div>
              </div>
              <div class="form-checks">
                <label class="check-label"><input type="checkbox" v-model="form.active" />Active</label>
              </div>
            </template>

            <div v-if="formError" class="form-api-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ formError }}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="closeFormModal" :disabled="formLoading">Cancel</button>
            <button class="btn btn--primary" @click="submitForm" :disabled="formLoading">
              <span v-if="formLoading" class="btn-spinner"></span>
              {{ formLoading ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- DEACTIVATE CONFIRM -->
    <Transition name="fade">
      <div v-if="deleteModal.show" class="modal-overlay" @click.self="deleteModal.show=false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <h3>Delete</h3>
            <button class="modal-close" @click="deleteModal.show=false"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="modal-body">
            <p class="delete-text">Yakin ingin menonaktifkan <strong>{{ deleteModal.record?.name }}</strong>?</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="deleteModal.show=false" :disabled="deleteLoading">Cancel</button>
            <button class="btn btn--danger" @click="doDelete" :disabled="deleteLoading">
              <span v-if="deleteLoading" class="btn-spinner"></span>
              {{ deleteLoading ? 'Processing...' : 'Deactivate' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, onBeforeUnmount } from 'vue'
import {
  fetchAllProducts, fetchCategoriesPage, fetchUOMsPage,
  createProduct, updateProduct, deleteProduct,
  createCategory, updateCategory, deleteCategory,
  createUOM, updateUOM, deleteUOM,
  fetchProductCategories, fetchUOMs, fetchTaxCategories,
  fetchAccountingCombinations, fetchCategoryAccounts,
} from '@/services/product'

// ── Click outside directive
const vClickOutside = {
  mounted(el, binding) {
    el._co = (e) => { if (!el.contains(e.target)) binding.value(e) }
    document.addEventListener('click', el._co)
  },
  unmounted(el) { document.removeEventListener('click', el._co) },
}

// ── Pagination component
const paginationPages = computed(() => {
  const out = [], s = Math.max(1, currentPage.value - 2), e = Math.min(totalPages.value, currentPage.value + 2)
  for (let i = s; i <= e; i++) out.push(i)
  return out
})

function productTypeLabel(t) { return { I: 'Item', S: 'Service', E: 'Expense' }[t] || (t || '-') }

// ── State
const activeTab = ref('product')
const rows = ref([])
const loading = ref(false)
const error = ref(null)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = 10
const totalRows = ref(0)
const openDropdown = ref(null)
const dropdownPos = ref({ top: 0, right: 0 })
let searchTimeout = null

const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize)))
const lookups = reactive({ categories: [], uoms: [], taxCategories: [], accounts: [] })

// ── Account combobox state
const ACC_FIELDS = ['productRevenue', 'fixedAsset', 'productExpense', 'productCOGS']
const accOpen  = reactive(Object.fromEntries(ACC_FIELDS.map(f => [f, false])))
const accQuery = reactive(Object.fromEntries(ACC_FIELDS.map(f => [f, ''])))

function accLabel(field) {
  const found = lookups.accounts.find(o => o.id === form[field])
  return found ? (found._identifier || found.combination) : ''
}
function accFiltered(field) {
  const q = accQuery[field].trim().toLowerCase()
  if (!q) return lookups.accounts.slice(0, 50)
  return lookups.accounts.filter(o =>
    (o._identifier || o.combination || '').toLowerCase().includes(q)
  ).slice(0, 50)
}
function accFocus(field) { accQuery[field] = ''; accOpen[field] = true }
function accInput(field, e) { accQuery[field] = e.target.value; accOpen[field] = true; if (!e.target.value) form[field] = '' }
function accSelect(field, opt) { form[field] = opt.id; accQuery[field] = ''; accOpen[field] = false }
function accBlur(field) { setTimeout(() => { accOpen[field] = false }, 150) }

const defaultTaxCategoryId = ref('')

async function loadLookups() {
  try {
    const [cats, uoms, taxes] = await Promise.all([fetchProductCategories(), fetchUOMs(), fetchTaxCategories()])
    lookups.categories = cats
    lookups.uoms = uoms
    lookups.taxCategories = taxes
    // Ambil tax category pertama sebagai default
    if (taxes.length > 0) {
      defaultTaxCategoryId.value = taxes[0].id
      console.log('[Tax Categories]', taxes.map(t => `${t.name}: ${t.id}`))
    }
  } catch (e) { console.warn('Lookup failed', e) }
}

async function loadAccountsLookup() {
  if (lookups.accounts.length > 0) return
  try {
    lookups.accounts = await fetchAccountingCombinations()
  } catch (e) { console.warn('Accounts lookup failed', e) }
}

// ── Load
async function load() {
  loading.value = true
  error.value = null
  const startRow = (currentPage.value - 1) * pageSize
  try {
    let res
    if (activeTab.value === 'product') res = await fetchAllProducts({ startRow, pageSize, searchKey: searchQuery.value })
    else if (activeTab.value === 'category') res = await fetchCategoriesPage({ startRow, pageSize, searchKey: searchQuery.value })
    else res = await fetchUOMsPage({ startRow, pageSize, searchKey: searchQuery.value })
    rows.value = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : [])
    totalRows.value = res.totalRows ?? rows.value.length

    // Enrich category rows with account data from ProductCategoryAccounts
    if (activeTab.value === 'category' && rows.value.length > 0) {
      const enriched = await Promise.all(rows.value.map(async (row) => {
        try {
          const acc = await fetchCategoryAccounts(row.id)
          if (acc) {
            return {
              ...row,
              'productRevenue$_identifier': acc.productRevenue$_identifier || acc['productRevenue$_identifier'] || acc.productRevenue?._identifier || '',
              'productExpense$_identifier': acc.productExpense$_identifier || acc['productExpense$_identifier'] || acc.productExpense?._identifier || '',
              'productCOGS$_identifier':    acc.productCOGS$_identifier    || acc['productCOGS$_identifier']    || acc.productCOGS?._identifier    || '',
              'fixedAsset$_identifier':     acc.fixedAsset$_identifier     || acc['fixedAsset$_identifier']     || acc.fixedAsset?._identifier     || '',
            }
          }
        } catch { /* no accounts for this category */ }
        return row
      }))
      rows.value = enriched
    }
  } catch (e) {
    error.value = 'Gagal memuat data.'
    console.error(e)
  } finally {
    loading.value = false
  }
}

function switchTab(tab) { activeTab.value = tab; currentPage.value = 1; searchQuery.value = ''; load() }
function onSearch() { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { currentPage.value = 1; load() }, 400) }
function goPage(p) { if (p < 1 || p > totalPages.value) return; currentPage.value = p; load() }
function toggleDropdown(id, event) {
  if (openDropdown.value === id) { openDropdown.value = null; return }
  const btn = event.currentTarget
  const rect = btn.getBoundingClientRect()
  dropdownPos.value = { top: rect.bottom + 4, right: window.innerWidth - rect.right }
  openDropdown.value = id
}
function closeDropdown() { openDropdown.value = null }

// ── Toast
const toast = reactive({ show: false, message: '', type: 'success' })
let toastTimer = null
function showToast(message, type = 'success') {
  clearTimeout(toastTimer)
  Object.assign(toast, { show: true, message, type })
  toastTimer = setTimeout(() => { toast.show = false }, 3000)
}

// ── View Modal
const viewModal = ref(null)
function openViewModal(r) { openDropdown.value = null; viewModal.value = r }

const viewCatModal = ref(null)
function openViewCatModal(r) { openDropdown.value = null; viewCatModal.value = r }

// ── Form Modal
const formModal = reactive({ show: false, mode: 'create', type: 'product', id: null })
const formLoading = ref(false)
const formError = ref(null)
const formErrors = reactive({})

const formModalTitle = computed(() => ({ product: 'Product', category: 'Category Product', uom: 'Category Product' })[formModal.type] || 'Product')

const defaultForm = () => ({
  searchKey: '', name: '', description: '', active: true,
  productType: 'I', productCategory: '', uOM: '', taxCategory: '',
  purchase: true, sale: true, stocked: true,
  value: '', uOMSymbol: '',
  // category accounts
  productRevenue: '', productExpense: '', productCOGS: '', fixedAsset: '',
})

const form = reactive(defaultForm())

function openCreateModal(type) {
  Object.assign(form, defaultForm())
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  formError.value = null
  formModal.type = type
  formModal.mode = 'create'
  formModal.id = null
  formModal.show = true
  if (type === 'category') loadAccountsLookup()
}

async function openEditModal(type, r) {
  openDropdown.value = null
  Object.assign(form, {
    searchKey: r.searchKey ?? '', name: r.name ?? '', description: r.description ?? '',
    active: r.active ?? true, productType: r.productType ?? 'I',
    productCategory: r.productCategory ?? '', uOM: r.uOM ?? '',
    taxCategory: r.taxCategory ?? '', purchase: r.purchase ?? true,
    sale: r.sale ?? true, stocked: r.stocked ?? true,
    value: r.value ?? r.searchKey ?? '', uOMSymbol: r.eDICode ?? r.uOMSymbol ?? '',
    productRevenue: '', productExpense: '', productCOGS: '', fixedAsset: '',
  })
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  formError.value = null
  formModal.type = type
  formModal.mode = 'edit'
  formModal.id = r.id
  formModal.show = true

  // Load accounts if category
  if (type === 'category') {
    await loadAccountsLookup()
    try {
      const acc = await fetchCategoryAccounts(r.id)
      if (acc) {
        form.productRevenue = acc.productRevenue?.id ?? acc.productRevenue ?? ''
        form.productExpense = acc.productExpense?.id ?? acc.productExpense ?? ''
        form.productCOGS    = acc.productCOGS?.id    ?? acc.productCOGS    ?? ''
        form.fixedAsset     = acc.fixedAsset?.id     ?? acc.fixedAsset     ?? ''
      }
    } catch (e) { console.warn('fetchCategoryAccounts failed', e) }
  }
}

function closeFormModal() { if (formLoading.value) return; formModal.show = false }

function validateForm() {
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  if (formModal.type === 'product') {
    if (!form.name.trim()) formErrors.name = 'Nama wajib diisi'
    if (!form.uOM) formErrors.uOM = 'UOM wajib dipilih'
    if (!form.productCategory) formErrors.productCategory = 'Category wajib dipilih'
    if (!form.productType) formErrors.productType = 'Product Type wajib dipilih'
  } else if (formModal.type === 'category') {
    if (!form.searchKey.trim()) formErrors.searchKey = 'Code wajib diisi'
    if (!form.name.trim()) formErrors.name = 'Nama wajib diisi'
    if (!form.productRevenue) formErrors.productRevenue = 'Product Revenue wajib dipilih'
    if (!form.fixedAsset)     formErrors.fixedAsset     = 'Product Asset wajib dipilih'
    if (!form.productExpense) formErrors.productExpense = 'Product Expense wajib dipilih'
    if (!form.productCOGS)    formErrors.productCOGS    = 'Product COGS wajib dipilih'
  } else if (formModal.type === 'uom') {
    if (!form.uOMSymbol.trim()) formErrors.uOMSymbol = 'EDI Code wajib diisi'
    else if (form.uOMSymbol.trim().length > 2) formErrors.uOMSymbol = 'EDI Code maksimal 2 karakter'
    if (!form.name.trim()) formErrors.name = 'Nama wajib diisi'
  }
  return Object.keys(formErrors).length === 0
}

async function submitForm() {
  if (!validateForm()) return
  formLoading.value = true
  formError.value = null
  try {
    if (formModal.type === 'product') {
      // Auto-generate searchKey from name if creating new
      const autoKey = form.name.trim().toUpperCase().replace(/\s+/g, '-').substring(0, 40) + '-' + Date.now().toString().slice(-4)
      const payload = {
        searchKey: formModal.mode === 'create' ? autoKey : form.searchKey,
        name: form.name.trim(),
        description: form.description.trim() || null, active: form.active,
        productType: form.productType, productCategory: form.productCategory,
        uOM: form.uOM,
        taxCategory: defaultTaxCategoryId.value,
        purchase: form.purchase, sale: form.sale, stocked: form.stocked,
      }
      if (formModal.mode === 'create') await createProduct(payload)
      else await updateProduct(formModal.id, payload)
    } else if (formModal.type === 'category') {
      const payload = {
        value: form.searchKey.trim(),
        name: form.name.trim(),
        active: form.active,
        ...(form.description.trim() && { description: form.description.trim() }),
        productRevenue: form.productRevenue,
        productExpense: form.productExpense,
        productCOGS:    form.productCOGS,
        fixedAsset:     form.fixedAsset,
      }
      if (formModal.mode === 'create') await createCategory(payload)
      else await updateCategory(formModal.id, payload)
    } else {
      const payload = { uOMSymbol: form.uOMSymbol.trim(), name: form.name.trim(), active: form.active }
      if (formModal.mode === 'create') await createUOM(payload)
      else await updateUOM(formModal.id, payload)
    }
    showToast(`${formModalTitle.value} berhasil ${formModal.mode === 'create' ? 'dibuat' : 'diupdate'}`)
    formModal.show = false
    currentPage.value = 1
    load()
  } catch (e) {
    formError.value = e.response?.data?.response?.error?.message ?? e.message ?? 'Terjadi kesalahan.'
    console.error('[submitForm]', e.response?.data ?? e)
  } finally {
    formLoading.value = false
  }
}

// ── Delete
const deleteModal = reactive({ show: false, record: null, type: '' })
const deleteLoading = ref(false)

function confirmDelete(r, type) { openDropdown.value = null; deleteModal.record = r; deleteModal.type = type; deleteModal.show = true }

async function doDelete() {
  deleteLoading.value = true
  try {
    if (deleteModal.type === 'product') await deleteProduct(deleteModal.record.id)
    else if (deleteModal.type === 'category') await deleteCategory(deleteModal.record.id)
    else await deleteUOM(deleteModal.record.id)
    showToast('Berhasil dinonaktifkan')
    deleteModal.show = false
    load()
  } catch (e) {
    const msg = e.response?.data?.response?.error?.message ?? e.message ?? 'Gagal menonaktifkan'
    showToast(msg, 'error')
    deleteModal.show = false
    console.error('[doDelete]', e.response?.data ?? e)
  } finally {
    deleteLoading.value = false
  }
}

onMounted(() => { load(); loadLookups() })
onBeforeUnmount(() => { clearTimeout(searchTimeout); clearTimeout(toastTimer) })
</script>

<style scoped>
button { box-sizing: border-box; }
.layout { display: flex; flex-direction: column; min-height: 100vh; background: var(--bg); }
.main { flex: 1; padding: 28px 24px; margin: 0 auto; width: 100%; }
.content-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }
.page-header { padding: 20px 20px 0; }
.page-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.tabs { display: flex; border-bottom: 1px solid var(--border); padding: 0 20px; gap: 4px; margin-top: 8px; }
.tab { padding: 12px 16px 10px; font-size: 13px; font-weight: 500; background: none; border: none; border-bottom: 2px solid transparent; color: var(--text-secondary); cursor: pointer; transition: color .15s, border-color .15s; margin-bottom: -1px; font-family: var(--font); }
.tab:hover { color: var(--text-primary); }
.tab--active { color: var(--accent); border-bottom-color: var(--accent); }
.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; gap: 12px; }
.search-wrap { position: relative; flex: 1; max-width: 320px; }
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.search-input { width: 100%; padding: 8px 12px 8px 34px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; color: var(--text-primary); background: var(--surface2); outline: none; transition: border-color .15s; font-family: var(--font); }
.search-input:focus { border-color: var(--accent); background: #fff; box-shadow: 0 0 0 3px rgba(37,99,235,.08); }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; border: none; cursor: pointer; transition: background .15s, opacity .15s; flex-shrink: 0; font-family: var(--font); }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.btn--primary { background: var(--accent); color: #fff; }
.btn--primary:hover:not(:disabled) { background: var(--accent-hover); }
.btn--ghost { background: transparent; color: var(--text-secondary); border: 1px solid var(--border); }
.btn--ghost:hover:not(:disabled) { background: var(--surface2); }
.btn--danger { background: var(--danger); color: #fff; }
.btn--danger:hover:not(:disabled) { background: #dc2626; }
.btn-spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; }
.table th { padding: 10px 20px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; color: var(--text-muted); background: var(--surface2); border-bottom: 1px solid var(--border); white-space: nowrap; overflow: hidden; }
.th-action { text-align: right; }
.table td { padding: 12px 20px; border-bottom: 1px solid var(--border); vertical-align: middle; overflow: hidden; }
.tr-data:last-child td { border-bottom: none; }
.tr-data:hover td { background: var(--accent-light); }
.code-badge { font-family: var(--font-mono); font-size: 11.5px; font-weight: 500; background: var(--surface2); border: 1px solid var(--border); padding: 3px 8px; border-radius: 4px; color: var(--text-secondary); white-space: nowrap; display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; vertical-align: middle; }
.td-name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.td-name-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; }
.td-secondary { color: var(--text-secondary); font-size: 13px; }
.td-clip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.td-desc { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.td-empty { text-align: center; color: var(--text-muted); padding: 48px 16px; font-size: 13px; }
.td-error { color: var(--danger); }
.td-action-cell { text-align: right; white-space: nowrap; overflow: visible !important; }
.type-badge { font-size: 11.5px; font-weight: 500; padding: 3px 10px; border-radius: 99px; background: #f1f5f9; color: #475569; display: inline-block; white-space: nowrap; }
.status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-left: 5px; vertical-align: middle; flex-shrink: 0; }
.status-dot--active { background: var(--success); }
.status-dot--inactive { background: var(--text-muted); }
.status-pill { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
.status-pill--active { background: #f0fdf4; color: #16a34a; }
.status-pill--inactive { background: #fff1f2; color: var(--danger); }
.action-group { display: flex; gap: 4px; justify-content: flex-end; align-items: center; }
.action-btn { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 5px; font-size: 12px; font-weight: 500; border: none; cursor: pointer; transition: background .12s; font-family: var(--font); }
.action-btn--edit { background: #f0fdf4; color: #16a34a; }
.action-btn--edit:hover { background: #dcfce7; }
.action-btn--more { background: var(--surface2); color: var(--text-secondary); padding: 5px 8px; }
.action-btn--more:hover { background: var(--border); }
.dropdown-wrap { position: relative; }
.dropdown-menu { position: fixed; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); z-index: 9999; min-width: 160px; overflow: hidden; }
.dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 14px; font-size: 12.5px; font-weight: 500; background: none; border: none; cursor: pointer; color: var(--text-secondary); font-family: var(--font); transition: background .1s; white-space: nowrap; }
.dropdown-item:hover { background: var(--surface2); color: var(--text-primary); }
.dropdown-item--danger { color: var(--danger); }
.dropdown-item--danger:hover { background: #fff1f2; }
.dropdown-item--success { color: var(--success); }
.dropdown-item--success:hover { background: #f0fdf4; }
.loading-dots { display: flex; gap: 6px; justify-content: center; align-items: center; }
.loading-dots span { width: 7px; height: 7px; background: var(--accent); border-radius: 50%; animation: bounce 1.2s infinite ease-in-out; }
.loading-dots span:nth-child(2) { animation-delay: .2s; }
.loading-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes bounce { 0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1} }
.pagination { display: flex; align-items: center; justify-content: flex-end; gap: 2px; padding: 14px 20px; background: var(--bg); }
.page-btn { min-width: 36px; height: 36px; padding: 0 10px; border-radius: 10px; border: none; background: transparent; color: #94a3b8; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; font-family: var(--font); outline: none; appearance: none; -webkit-appearance: none; box-shadow: none; }
.page-btn:hover:not(:disabled):not(.page-btn--active) { color: var(--text-primary); background: rgba(0,0,0,.05); }
.page-btn--active { background: #fff !important; color: #1e293b !important; font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.07); }
.page-btn:disabled { opacity: .3; cursor: not-allowed; }
.toast { position: fixed; bottom: 24px; right: 24px; z-index: 2000; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); }
.toast--success { background: #16a34a; color: #fff; }
.toast--error { background: var(--danger); color: #fff; }
.toast-enter-active,.toast-leave-active { transition: all .25s ease; }
.toast-enter-from,.toast-leave-to { opacity: 0; transform: translateY(8px); }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(2px); }
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); width: 100%; max-width: 480px; overflow: hidden; }
.modal--wide { max-width: 620px; }
.modal--sm { max-width: 400px; }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 20px 12px; border-bottom: 1px solid var(--border); gap: 12px; }
.modal-breadcrumb { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-muted); margin-bottom: 4px; }
.bc-active { color: var(--accent); font-weight: 500; }
.modal-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.modal-close { background: none; border: none; color: var(--text-muted); display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; transition: background .12s; flex-shrink: 0; }
.modal-close:hover { background: var(--surface2); color: var(--text-primary); }
.modal-body { padding: 20px; max-height: 65vh; overflow-y: auto; }
.modal-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; }
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-group input:not(.acc-input), .form-group select { width: 100%; height: 38px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.form-group input:not(.acc-input):focus, .form-group select:focus { border-color: var(--accent); background: #fff; }
.input-error { border-color: var(--danger) !important; }
.field-error { font-size: 11.5px; color: var(--danger); }
.req { color: var(--danger); }
.form-checks { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border); }
.check-label { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 500; color: var(--text-secondary); cursor: pointer; }
.check-label input[type=checkbox] { width: 15px; height: 15px; cursor: pointer; accent-color: var(--accent); }
.form-api-error { margin-top: 14px; padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.detail-value { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }
.detail-value.mono { font-family: var(--font-mono); font-size: 12.5px; }
.delete-text { font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); }
.delete-text strong { color: var(--text-primary); }
.fade-enter-active,.fade-leave-active { transition: opacity .15s; }
.fade-enter-from,.fade-leave-to { opacity: 0; }
/* ── Account combobox */
.acc-wrap { position: relative; width: 100%; display: block; }
.acc-input { display: block; width: 100%; height: 38px; padding: 0 32px 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.acc-input:focus { border-color: var(--accent); background: #fff; }
.acc-chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.acc-dropdown { position: absolute; z-index: 300; top: calc(100% + 3px); left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); max-height: 200px; overflow-y: auto; list-style: none; margin: 0; padding: 4px 0; }
.acc-opt { padding: 8px 12px; font-size: 12.5px; color: var(--text-primary); cursor: pointer; transition: background .1s; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.acc-opt:hover { background: var(--accent-light); }
.acc-opt--active { background: var(--accent-light); font-weight: 600; color: var(--accent); }
.acc-empty { padding: 8px 12px; font-size: 12.5px; color: var(--text-muted); font-style: italic; }
</style>