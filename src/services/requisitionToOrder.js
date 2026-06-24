import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import axios from 'axios'

// ═══════════════════════════════════════════════════════════════════════════════
// ── API SETUP ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const BASE_URL   = window.APP_CONFIG?.API_BASE_URL || '/openbravo/'
const USERNAME   = 'APIService'
const PASSWORD   = 'wrt'
const AUTH_TOKEN = btoa(`${USERNAME}:${PASSWORD}`)

const api = axios.create({
  baseURL: BASE_URL,
  headers: { Authorization: `Basic ${AUTH_TOKEN}`, 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => {
    const s = res.data?.response?.status
    if (s !== undefined && s < 0) {
      const msg = res.data?.response?.error?.message
      if (msg) throw new Error(msg)
    }
    return res
  },
  (err) => {
    console.error('[RTO HTTP error]', err.response?.status, JSON.stringify(err.response?.data))
    return Promise.reject(err)
  }
)

const axiosDatasource = axios.create({
  headers: { Authorization: `Basic ${AUTH_TOKEN}` },
})

// ═══════════════════════════════════════════════════════════════════════════════
// ── CONSTANTS ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const JSON_BASE       = 'org.openbravo.service.json.jsonrest'
const DATASOURCE_BASE = '/openbravo/org.openbravo.service.datasource'

export const PURCHASE_ORDER_CENTRAL_ID = '0D6704719D3A4492A0B5E175F1D70876'
export const PURCHASE_PRICE_LIST_ID    = '71AA812D1C2B450689B9308C612EB173'
export const BESTINDO_JAKARTA_ORG_ID   = '96D7D37973EF450383B8ADCFDB666725'

const LS_KEY_PO_DEFAULTS = 'po_modal_defaults'

// ═══════════════════════════════════════════════════════════════════════════════
// ── REQUISITION API FUNCTIONS ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export async function fetchRequisitions({ project, requester } = {}) {
  const conditions = [
    `(documentStatus = 'CO' or documentStatus = 'CL')`,
    `documentNo like 'PR%'`,
  ]
  if (project)   conditions.push(`project = '${project}'`)
  if (requester) conditions.push(`userContact = '${requester}'`)

  const params = new URLSearchParams({
    _where: conditions.join(' and '),
    _selectedProperties: 'id,documentNo,documentStatus,completedApproval,isApproved,project,project$_identifier,userContact,userContact$_identifier,description',
    _noCount: 'false',
    _startRow: '0',
    _endRow: '500',
  })

  const res = await api.get(`${JSON_BASE}/ProcurementRequisition?${params}`)
  const data = res.data?.response?.data || []
  return data.filter(r => (r.documentNo || '').toUpperCase().startsWith('PR'))
}

export async function fetchRequisitionLines(requisitionId) {
  const params = new URLSearchParams({
    _where: `requisition = '${requisitionId}'`,
    _selectedProperties: 'id,lineNo,product,product$_identifier,uOM,uOM$_identifier,needByDate,quantity,orderQuantity,requisitionLineStatus,unitPrice,lineNetAmount,description,requisition,requisition$_identifier,requisition$documentNo,project,project$_identifier,costCenter,costCenter$_identifier',
    _startRow: '0',
    _endRow: '500',
  })
  const res = await api.get(`${JSON_BASE}/ProcurementRequisitionLine?${params}`)
  return res.data?.response?.data || []
}

export async function fetchRequisitionsByIds(ids = []) {
  if (!ids.length) return []
  const inClause = ids.slice(0, 100).map(id => `'${id}'`).join(',')
  const params = new URLSearchParams({
    _where: `id in (${inClause}) and documentStatus = 'CO'`,
    _selectedProperties: 'id,documentNo,documentStatus,completedApproval,isApproved,project,project$_identifier,userContact,userContact$_identifier,description',
    _startRow: '0',
    _endRow: '100',
  })
  const res = await api.get(`${JSON_BASE}/ProcurementRequisition?${params}`)
  return res.data?.response?.data || []
}

export async function fetchRequisitionsByProduct(search = '') {
  if (!search || search.trim().length < 2) return []

  const raw = search.trim().replace(/'/g, "''")
  const parts = raw.split(/\s+-\s+/)
  const tokens = [...new Set(
    parts.flatMap(p => p.split(/\s+/))
         .map(t => t.trim())
         .filter(t => t.length >= 3)
         .slice(0, 6)
  )]

  const productSearches = tokens.map(token => {
    const params = new URLSearchParams({
      _where: `upper(e.searchKey) like upper('%${token}%') or upper(e.name) like upper('%${token}%')`,
      _selectedProperties: 'id,name,searchKey',
      _startRow: '0',
      _endRow: '50',
    })
    return api.get(`${JSON_BASE}/Product?${params}`)
      .then(r => r.data?.response?.data || [])
      .catch(() => [])
  })

  const results = await Promise.all(productSearches)
  const productMap = new Map()
  results.flat().forEach(p => productMap.set(p.id, p))
  if (productMap.size === 0) return []

  const inClause = [...productMap.keys()].slice(0, 20).map(id => `'${id}'`).join(',')
  const lineParams = new URLSearchParams({
    _where: [
      `e.product.id in (${inClause})`,
      `e.requisition.documentStatus = 'CO'`,
      `e.requisitionLineStatus != 'C'`,
    ].join(' and '),
    _selectedProperties: 'id,requisition,requisition$_identifier,requisition$documentNo,product,product$_identifier,needByDate,quantity,orderQuantity,requisitionLineStatus,unitPrice,uOM,uOM$_identifier,project,project$_identifier,costCenter,costCenter$_identifier,description,lineNo',
    _orderBy: 'requisition$documentNo',
    _startRow: '0',
    _endRow: '500',
  })

  const lineRes = await api.get(`${JSON_BASE}/ProcurementRequisitionLine?${lineParams}`)
  const allLines = lineRes.data?.response?.data || []

  const reqLineMap = new Map()
  allLines.forEach(l => {
    const docNo = (l['requisition$_identifier'] || l['requisition$documentNo'] || '').toUpperCase()
    if (!docNo.startsWith('PR')) return
    const reqId = typeof l.requisition === 'object' ? l.requisition?.id : l.requisition
    if (!reqId) return
    if (!reqLineMap.has(reqId)) {
      reqLineMap.set(reqId, {
        id: reqId,
        documentNo: l['requisition$_identifier'] || l['requisition$documentNo'],
        _identifier: l['requisition$_identifier'] || l['requisition$documentNo'],
        lines: [],
      })
    }
    reqLineMap.get(reqId).lines.push(l)
  })

  return [...reqLineMap.values()]
}

export async function fetchProjects(search = '') {
  const upper = search ? search.toUpperCase() : ''
  const params = new URLSearchParams({
    ...(search ? { _where: `UPPER(name) like '%${upper}%' or UPPER(searchKey) like '%${upper}%'` } : {}),
    _selectedProperties: 'id,name,_identifier,searchKey',
    _orderBy: 'name',
    _startRow: '0',
    _endRow: '100',
  })
  const res = await api.get(`${JSON_BASE}/Project?${params}`)
  return res.data?.response?.data || []
}

export async function fetchRequesters(search = '', projectId = '') {
  const criteria = [
    { fieldName: 'documentNo', operator: 'iContains', value: 'PR', _constructor: 'AdvancedCriteria' },
    { fieldName: 'documentStatus', operator: 'equals', value: 'CO' },
  ]
  if (projectId) criteria.push({ fieldName: 'project', operator: 'equals', value: projectId })
  if (search)    criteria.push({ fieldName: 'userContact$_identifier', operator: 'iContains', value: search })

  const body = new URLSearchParams({
    _noCount: 'true',
    _selectedProperties: 'userContact,userContact$_identifier',
    _distinct: 'userContact',
    operator: 'and',
    _constructor: 'AdvancedCriteria',
    _operationType: 'fetch',
    _startRow: '0',
    _endRow: '100',
    _textMatchStyle: 'substring',
  })
  criteria.forEach(c => body.append('criteria', JSON.stringify(c)))

  const res = await axiosDatasource.post(`${DATASOURCE_BASE}/ProcurementRequisition`, body, {
    headers: { Authorization: `Basic ${AUTH_TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  const data = res.data?.response?.data || []
  return data
    .filter(r => r['$ref'] || r._identifier)
    .map(r => {
      const id = r.id || r['$ref']?.split('/')?.[1] || r.userContact
      const name = r._identifier || r['userContact$_identifier'] || ''
      return { id, name, _identifier: name }
    })
    .filter(r => r.id)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── OPENBRAVO PO API FUNCTIONS ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export async function fetchVendors(query) {
  const s = (query || '').trim().replace(/'/g, "''")
  if (!s) return []
  const res = await api.get(`${JSON_BASE}/BusinessPartner`, {
    params: {
      _startRow: 0, _endRow: 20,
      _where: `e.active=true and e.vendor=true and upper(e.name) like upper('%${s}%')`,
      _selectedProperties: 'id,name,_identifier,paymentTerms,paymentTerms$_identifier,purchasePricelist,purchasePricelist$_identifier,paymentMethod,paymentMethod$_identifier',
    },
  })
  return res.data?.response?.data ?? []
}

export async function fetchPriceLists(query) {
  const s = (query || '').trim().replace(/'/g, "''")
  const where = s
    ? `e.active=true and e.salesPriceList=false and upper(e.name) like upper('%${s}%')`
    : `e.active=true and e.salesPriceList=false`
  const res = await api.get(`${JSON_BASE}/PricingPriceList`, {
    params: { _startRow: 0, _endRow: 30, _where: where, _selectedProperties: 'id,name,_identifier' },
  })
  return res.data?.response?.data ?? []
}

export async function fetchWarehouses(query) {
  const s = (query || '').trim().replace(/'/g, "''")
  const where = s
    ? `e.active=true and upper(e.name) like upper('%${s}%')`
    : `e.active=true`
  const res = await api.get(`${JSON_BASE}/Warehouse`, {
    params: { _startRow: 0, _endRow: 30, _where: where, _selectedProperties: 'id,name,_identifier' },
  })
  return res.data?.response?.data ?? []
}

export async function fetchPartnerLocations(vendorId) {
  const res = await api.get(`${JSON_BASE}/BusinessPartnerLocation`, {
    params: {
      _where: `e.businessPartner.id='${vendorId}' and e.active=true`,
      _startRow: 0, _endRow: 50,
      _selectedProperties: 'id,_identifier,locationAddress,locationAddress$_identifier',
    },
  })
  return res.data?.response?.data ?? []
}

export async function fetchPaymentTerms() {
  const res = await api.get(`${JSON_BASE}/FinancialMgmtPaymentTerm`, {
    params: { _where: 'e.active=true', _startRow: 0, _endRow: 100, _selectedProperties: 'id,name,_identifier' },
  })
  return res.data?.response?.data ?? []
}

export async function fetchPaymentMethods() {
  const res = await api.get(`${JSON_BASE}/FIN_Payment_Method`, {
    params: { _where: 'e.active=true', _startRow: 0, _endRow: 100, _selectedProperties: 'id,name,_identifier' },
  })
  return res.data?.response?.data ?? []
}

export async function fetchTaxes() {
  const res = await api.get(`${JSON_BASE}/FinancialMgmtTaxRate`, {
    params: {
      _where: `e.active=true and e.docTaxAmount='%'`,
      _startRow: 0, _endRow: 50,
      _selectedProperties: 'id,name,_identifier,rate',
    },
  })
  return res.data?.response?.data ?? []
}

export async function fetchReferenceList(refName) {
  const res = await api.get(`${JSON_BASE}/ADRefList`, {
    params: {
      _where: `e.reference.name='${refName}' and e.active=true`,
      _startRow: 0, _endRow: 100,
      _selectedProperties: 'id,name,searchKey,_identifier',
    },
  })
  return res.data?.response?.data ?? []
}

export async function fetchProjectById(projectId) {
  const res = await api.get(`${JSON_BASE}/Project/${projectId}`, {
    params: { _selectedProperties: 'id,name,cOrderId,c_order_id' },
  })
  return res.data?.response?.data ?? null
}

export async function fetchSOLinesByOrderId(orderId) {
  const res = await api.get(`${JSON_BASE}/OrderLine`, {
    params: {
      _where: `e.salesOrder.id='${orderId}'`,
      _startRow: 0, _endRow: 500,
      _selectedProperties: 'id,product,product$_identifier,orderedQuantity',
    },
  })
  return res.data?.response?.data ?? []
}

export async function createPurchaseOrderHeader(data) {
  const res = await api.post(`${JSON_BASE}/Order`, { data })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function createPurchaseOrderLine(data) {
  const res = await api.post(`${JSON_BASE}/OrderLine`, { data })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function createRequisitionPOMatch(data) {
  const res = await api.post(`${JSON_BASE}/ProcurementRequisitionPOMatch`, { data })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updateRequisitionLine(lineId, fields) {
  await api.put(`${JSON_BASE}/ProcurementRequisitionLine/${lineId}`, {
    data: { id: lineId, _entityName: 'ProcurementRequisitionLine', ...fields },
  })
}

export async function fetchAllRequisitionLines(requisitionId) {
  const params = new URLSearchParams({
    _where: `requisition = '${requisitionId}'`,
    _selectedProperties: 'id,requisitionLineStatus',
    _startRow: '0',
    _endRow: '500',
  })
  const res = await api.get(`${JSON_BASE}/ProcurementRequisitionLine?${params}`)
  return res.data?.response?.data || []
}

export async function closeRequisition(requisitionId) {
  await api.put(`${JSON_BASE}/ProcurementRequisition/${requisitionId}`, {
    data: { id: requisitionId, _entityName: 'ProcurementRequisition', documentStatus: 'CL', documentAction: 'CL' },
  })
}


// ═══════════════════════════════════════════════════════════════════════════════
// ── SearchSelect (inline component) ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export const SearchSelectInline = {
  name: 'SearchSelectInline',
  props: {
    modelValue: { type: String, default: null },
    displayValue: { type: String, default: '' },
    placeholder: { type: String, default: 'Pilih...' },
    fetchFn: { type: Function, required: true },
  },
  emits: ['update:modelValue', 'select'],
  setup(props, { emit }) {
    const open          = ref(false)
    const search        = ref('')
    const options       = ref([])
    const loading       = ref(false)
    const wrapper       = ref(null)
    const dropdown      = ref(null)
    const searchInput   = ref(null)
    const dropdownStyle = ref({})
    let debounceTimer   = null

    function calcPosition() {
      if (!wrapper.value) return
      const rect      = wrapper.value.getBoundingClientRect()
      const viewportH = window.innerHeight
      const dropH     = 320
      const spaceBelow = viewportH - rect.bottom
      const openUpward = spaceBelow < dropH && rect.top > dropH
      dropdownStyle.value = {
        position: 'fixed',
        left: `${rect.left}px`,
        width: `${Math.max(rect.width, 320)}px`,
        maxWidth: '500px',
        zIndex: 9999,
        ...(openUpward
          ? { bottom: `${viewportH - rect.top + 4}px`, top: 'auto' }
          : { top: `${rect.bottom + 4}px`, bottom: 'auto' }),
      }
    }

    async function load(q = '') {
      loading.value = true
      try { options.value = await props.fetchFn(q) }
      finally { loading.value = false }
    }

    async function toggle() {
      open.value = !open.value
      if (open.value) {
        calcPosition()
        load('')
        await nextTick()
        setTimeout(() => searchInput.value?.focus(), 50)
      }
    }

    function onSearch() {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => load(search.value), 300)
    }

    function select(opt) {
      emit('update:modelValue', opt.id)
      emit('select', opt)
      open.value = false
      search.value = ''
    }

    function clear() {
      emit('update:modelValue', null)
      emit('select', null)
    }

    function handleOutside(e) {
      if (!open.value) return
      const inWrapper  = wrapper.value?.contains(e.target)
      const inDropdown = dropdown.value?.contains(e.target)
      if (!inWrapper && !inDropdown) open.value = false
    }

    function handleScroll() {
      if (open.value) calcPosition()
    }

    onMounted(() => {
      document.addEventListener('mousedown', handleOutside)
      window.addEventListener('scroll', handleScroll, true)
      window.addEventListener('resize', handleScroll)
    })
    onUnmounted(() => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll)
    })

    return {
      open, search, options, loading, wrapper, dropdown, searchInput,
      dropdownStyle, toggle, onSearch, select, clear,
    }
  },
 template: `
    <div class="combobox-wrap" ref="wrapper">
      <div class="combobox-input-wrap" @click="toggle">
        <div class="combobox-input" style="display:flex; align-items:center; padding-right:8px; cursor:pointer;">
          <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px;"
            :style="{ color: modelValue ? 'var(--text-primary)' : 'var(--text-muted)' }">
            {{ displayValue || placeholder }}
          </span>
          <button v-if="modelValue" @click.stop="clear"
            style="background:none; border:none; color:var(--danger); cursor:pointer; padding:0 6px; font-size:16px; line-height:1;">
            &times;
          </button>
          <svg class="combobox-chevron" :class="{ open: open }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:4px;"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
      <Teleport to="body">
        <Transition name="fade">
          <div v-if="open" ref="dropdown" class="combobox-list" :style="dropdownStyle" style="position:fixed; z-index:9999; display:block; padding:0;">
            <div style="padding:8px; border-bottom:1px solid var(--border); background:var(--surface);">
              <input ref="searchInput" v-model="search" @input="onSearch" type="text" placeholder="Cari..."
                style="width:100%; height:34px; padding:0 12px; border:1px solid var(--border); border-radius:var(--radius-sm); outline:none; font-family:var(--font); font-size:13px; background:var(--surface2);" @click.stop />
            </div>
            <div style="max-height:220px; overflow-y:auto; padding:4px 0; background:var(--surface);">
              <div v-if="loading" class="combobox-empty">Memuat...</div>
              <div v-else-if="!options.length" class="combobox-empty">Tidak ada hasil yang ditemukan</div>
              <div v-for="opt in options" :key="opt.id" @click="select(opt)" class="combobox-item" :class="{ active: modelValue === opt.id }">
                {{ opt._identifier || opt.name }}
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  `,
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MAIN COMPOSABLE ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export function useRequisitionToOrder() {

  // ── Filter state ─────────────────────────────────────────────────────────────
  const filter = reactive({
    project: null,
    projectName: '',
    requester: null,
    requesterName: '',
    product: '',
  })

  function onProjectSelect(opt) {
    filter.projectName  = opt?._identifier || opt?.name || ''
    filter.requester    = null
    filter.requesterName = ''
  }

  const fetchRequestersByProject = (search) => fetchRequesters(search, filter.project ?? '')

  // ── Requisition state ─────────────────────────────────────────────────────────
  const requisitions = ref([])
  const linesByReq   = ref({})
  const loading      = ref(false)
  const searched     = ref(false)
  const expanded     = ref(new Set())
  const loadingLines = ref(new Set())

  const headerSearch = reactive({
    documentNo: '',
    project: '',
    requester: '',
    description: '',
    status: '',
  })

  function filteredRequisitions() {
    return requisitions.value.filter(r => {
      const docNo = (r.documentNo || '').toLowerCase()
      const proj  = (r['project$_identifier'] || '').toLowerCase()
      const req   = (r['userContact$_identifier'] || '').toLowerCase()
      const desc  = (r.description || '').toLowerCase()

      const matchText = (
        docNo.includes(headerSearch.documentNo.toLowerCase()) &&
        proj.includes(headerSearch.project.toLowerCase()) &&
        req.includes(headerSearch.requester.toLowerCase()) &&
        desc.includes(headerSearch.description.toLowerCase())
      )
      if (!matchText) return false

      if (headerSearch.status) {
        const st = getReqStatus(r.id)
        if (st !== headerSearch.status) return false
      }
      return true
    })
  }

  // ── Line column search ────────────────────────────────────────────────────────
  const colSearch = reactive({})

  function ensureColSearch(reqId) {
    if (!colSearch[reqId]) {
      colSearch[reqId] = { product: '', needByDate: '', quantity: '', uOM: '', status: '' }
    }
  }

  function getColSearch(reqId) {
    ensureColSearch(reqId)
    return colSearch[reqId]
  }

  function resetColSearch(reqId) {
    colSearch[reqId] = { product: '', needByDate: '', quantity: '', uOM: '', status: '' }
  }

  function resetAllColSearch() {
    Object.keys(colSearch).forEach(k => {
      colSearch[k] = { product: '', needByDate: '', quantity: '', uOM: '', status: '' }
    })
  }

  function filteredLines(reqId) {
    const lines = linesByReq.value[reqId] || []
    ensureColSearch(reqId)
    const cs = colSearch[reqId]

    return lines.filter(l => {
      const prod = (l['product$_identifier'] || '').toLowerCase()
      const date = (l.needByDate || '').toLowerCase()
      const qty  = String(l.quantity || '')
      const unit = (l['uOM$_identifier'] || '').toLowerCase()

      let statusVal
      if (l.requisitionLineStatus === 'C') {
        statusVal = 'closed'
      } else if ((l.orderQuantity ?? 0) > 0 && (l.orderQuantity ?? 0) < (l.quantity ?? 0)) {
        statusVal = 'partial'
      } else {
        statusVal = 'open'
      }

      const statusMatch = !cs.status ||
        statusVal === cs.status ||
        (cs.status === 'open' && statusVal === 'partial')

      return (
        prod.includes((cs.product || '').toLowerCase()) &&
        date.includes((cs.needByDate || '').toLowerCase()) &&
        qty.includes(cs.quantity || '') &&
        unit.includes((cs.uOM || '').toLowerCase()) &&
        statusMatch
      )
    })
  }

  // ── Grid layout ───────────────────────────────────────────────────────────────
  const gridCols = { gridTemplateColumns: '2.25rem 1fr 100px 70px 80px 70px 100px 130px 80px' }

  // ── Qty / price helpers ───────────────────────────────────────────────────────
  function maxQtyToOrder(line) { return line.quantity - (line.orderQuantity ?? 0) }
  function qtyToOrderExceeds(line) { return (line.qtyToOrder ?? 0) > maxQtyToOrder(line) }
  function clampQtyToOrder(line) {
    const max = maxQtyToOrder(line)
    if ((line.qtyToOrder ?? 0) > max) line.qtyToOrder = max
    if ((line.qtyToOrder ?? 0) < 0)   line.qtyToOrder = 0
  }
  function orderPriceExceeds(line) { return (line.orderUnitPrice ?? 0) > (line.unitPrice ?? 0) }
  function clampOrderPrice(line) {
    const max = line.unitPrice ?? 0
    if ((line.orderUnitPrice ?? 0) > max) line.orderUnitPrice = max
    if ((line.orderUnitPrice ?? 0) < 0)   line.orderUnitPrice = 0
  }

  // ── Selection ─────────────────────────────────────────────────────────────────
  const selectedLineIds = ref(new Set())

  const selectedLines = computed(() => {
    const all = []
    Object.values(linesByReq.value).forEach(lines => {
      lines.forEach(l => {
        if (selectedLineIds.value.has(l.id) && l.requisitionLineStatus !== 'C') all.push(l)
      })
    })
    return all
  })

  function isLineSelected(id) { return selectedLineIds.value.has(id) }

  function toggleLine(line) {
    if (line.requisitionLineStatus === 'C') return
    const s = new Set(selectedLineIds.value)
    if (s.has(line.id)) s.delete(line.id)
    else s.add(line.id)
    selectedLineIds.value = s
  }

  function allLinesSelected(reqId) {
    const lines = filteredLines(reqId).filter(l => l.requisitionLineStatus !== 'C')
    return lines.length > 0 && lines.every(l => selectedLineIds.value.has(l.id))
  }

  function toggleAllLines(reqId) {
    const lines = filteredLines(reqId).filter(l => l.requisitionLineStatus !== 'C')
    const s = new Set(selectedLineIds.value)
    if (allLinesSelected(reqId)) lines.forEach(l => s.delete(l.id))
    else lines.forEach(l => s.add(l.id))
    selectedLineIds.value = s
  }

  function clearSelection() { selectedLineIds.value = new Set() }

  // ── Expand / Load Lines ───────────────────────────────────────────────────────
  async function toggleExpand(reqId) {
    const s = new Set(expanded.value)
    if (s.has(reqId)) {
      s.delete(reqId)
      expanded.value = s
    } else {
      s.add(reqId)
      expanded.value = s
      const existing = linesByReq.value[reqId]
      if (!existing || existing.length === 0) {
        await loadLines(reqId)
      }
    }
  }

  async function loadLines(reqId) {
    const ls = new Set(loadingLines.value)
    ls.add(reqId)
    loadingLines.value = ls
    ensureColSearch(reqId)
    try {
      const lines    = await fetchRequisitionLines(reqId)
      const req      = requisitions.value.find(r => r.id === reqId)
      const projectId   = req?.project ?? null
      const projectName = req?.['project$_identifier'] ?? ''
      linesByReq.value = {
        ...linesByReq.value,
        [reqId]: lines.map(l => {
          const alreadyOrdered = l.orderQuantity ?? 0
          const remaining = Math.max(0, l.quantity - alreadyOrdered)
          return {
            ...l,
            qtyToOrder: remaining,
            orderUnitPrice: l.unitPrice ?? 0,
            project: l.project ?? projectId,
            'project$_identifier': l['project$_identifier'] || projectName,
          }
        }),
      }
    } catch (err) {
      console.error(`[loadLines] ${reqId}: error`, err)
      linesByReq.value = { ...linesByReq.value, [reqId]: [] }
    } finally {
      const ls2 = new Set(loadingLines.value)
      ls2.delete(reqId)
      loadingLines.value = ls2
    }
  }

  // ── Search ────────────────────────────────────────────────────────────────────
  async function search() {
    loading.value = true
    searched.value = true
    expanded.value = new Set()
    selectedLineIds.value = new Set()
    linesByReq.value = {}
    resetAllColSearch()
    try {
      if (filter.product && filter.product.trim().length >= 2) {
        const matchedReqs = await fetchRequisitionsByProduct(filter.product.trim())

        if (matchedReqs.length === 0) {
          requisitions.value = []
          return
        }

        const reqIds = matchedReqs.map(r => r.id)
        let headers = await fetchRequisitionsByIds(reqIds)

        if (filter.project) headers = headers.filter(h => {
          const hProject = typeof h.project === 'object' ? h.project?.id : h.project
          return hProject === filter.project
        })
        if (filter.requester) headers = headers.filter(h => {
          const hUser = typeof h.userContact === 'object' ? h.userContact?.id : h.userContact
          return hUser === filter.requester
        })

        requisitions.value = headers

        const expandSet  = new Set()
        const productLower = filter.product.trim().toLowerCase()
        const newLines   = {}

        headers.forEach(header => {
          const matched = matchedReqs.find(r => r.id === header.id)
          if (!matched) return
          ensureColSearch(header.id)
          newLines[header.id] = matched.lines.map(l => {
            const alreadyOrdered = l.orderQuantity ?? 0
            const remaining = Math.max(0, (l.quantity ?? 0) - alreadyOrdered)
            return {
              ...l,
              requisition: typeof l.requisition === 'object' ? l.requisition?.id : l.requisition,
              qtyToOrder: remaining,
              orderUnitPrice: l.unitPrice ?? 0,
              project: l.project ?? header.project,
              'project$_identifier': l['project$_identifier'] || header['project$_identifier'] || '',
            }
          })
          const hasMatch = newLines[header.id].some(l =>
            (l['product$_identifier'] || '').toLowerCase().includes(productLower)
          )
          if (hasMatch) expandSet.add(header.id)
        })

        linesByReq.value = newLines
        expanded.value   = expandSet

      } else {
        requisitions.value = await fetchRequisitions({
          project:   filter.project,
          requester: filter.requester,
        })
      }
    } catch (err) {
      showToast('Gagal memuat data: ' + (err?.message || 'Unknown error'))
      console.error('[search] error', err)
    } finally {
      loading.value = false
    }
  }

  function resetFilter() {
    filter.project = null; filter.projectName = ''
    filter.requester = null; filter.requesterName = ''
    filter.product = ''
    requisitions.value = []; searched.value = false
    selectedLineIds.value = new Set()
    linesByReq.value = {}
    resetAllColSearch()
    headerSearch.documentNo = ''; headerSearch.project = ''
    headerSearch.requester = ''; headerSearch.description = ''; headerSearch.status = ''
  }

  // ── PR Status helper ──────────────────────────────────────────────────────────
  function getReqStatus(reqId) {
    const lines = linesByReq.value[reqId]
    if (lines && lines.length > 0) {
      const allClosed = lines.every(l => l.requisitionLineStatus === 'C')
      return allClosed ? 'closed' : 'open'
    }
    const req = requisitions.value.find(r => r.id === reqId)
    if (!req) return 'unknown'
    return req.documentStatus === 'CL' ? 'closed' : 'open'
  }

  // ── Auto-collapse rows excluded by status filter ──────────────────────────────
  watch(() => headerSearch.status, () => {
    const visible = new Set(filteredRequisitions().map(r => r.id))
    const s = new Set(expanded.value)
    let changed = false
    s.forEach(id => { if (!visible.has(id)) { s.delete(id); changed = true } })
    if (changed) expanded.value = s
  })

  // ── Selection computed ────────────────────────────────────────────────────────
  const selectedPRCount = computed(() => {
    const reqIds = new Set(selectedLines.value.map(l =>
      typeof l.requisition === 'object' ? l.requisition?.id : l.requisition
    ))
    return reqIds.size
  })

  const selectedPRDocumentNos = computed(() => {
    const nos = new Set()
    selectedLines.value.forEach(l => {
      const reqId = typeof l.requisition === 'object' ? l.requisition?.id : l.requisition
      const req   = requisitions.value.find(r => r.id === reqId)
      if (req?.documentNo) nos.add(req.documentNo)
    })
    return [...nos].join(', ')
  })

  // ── Modal, Toast & Banner ─────────────────────────────────────────────────────
  const showModal     = ref(false)
  const toast         = reactive({ show: false, message: '' })
  const successBanner = reactive({ show: false, documentNo: '' })

  function showToast(message, duration = 8000) {
    toast.message = message
    toast.show    = true
    setTimeout(() => (toast.show = false), duration)
  }

  function copyPONumber() {
    if (successBanner.documentNo) {
      navigator.clipboard.writeText(successBanner.documentNo).catch(() => {})
    }
  }

  // ── Modal state ───────────────────────────────────────────────────────────────
  const modalForm = ref({
    orderDate: new Date().toISOString().split('T')[0],
    scheduledDeliveryDate: new Date().toISOString().split('T')[0],
    vendor: null, vendorName: '',
    partnerAddress: null,
    priceList: PURCHASE_PRICE_LIST_ID, priceListName: 'Harga Beli',
    organization: BESTINDO_JAKARTA_ORG_ID, organizationName: 'Bestindo Jakarta',
    warehouse: null, warehouseName: '',
    paymentTerms: null, paymentTermsName: '',
    paymentMethod: null, paymentMethodName: '',
    documentType: PURCHASE_ORDER_CENTRAL_ID,
    poCategory: '',
    tipePO: '',
  })

  const modalPartnerLocations     = ref([])
  const modalLoadingLocations     = ref(false)
  const modalPaymentTermOptions   = ref([])
  const modalPaymentMethodOptions = ref([])
  const modalTaxOptions           = ref([])
  const modalDefaultTaxId         = ref(null)
  const modalKategoriPOOptions    = ref([])
  const modalSubmitting           = ref(false)
  const modalShowSuccess          = ref(false)
  const modalCreatedPONumber      = ref('')
  const modalCopyDone             = ref(false)

  const modalOrderReference = computed(() =>
    selectedPRDocumentNos.value || [...new Set(
      selectedLines.value.map(l => l['requisition$documentNo'] || l['requisition$_identifier'] || '').filter(Boolean)
    )].join(', ')
  )

  const isModalValid = computed(() =>
    modalForm.value.orderDate &&
    modalForm.value.scheduledDeliveryDate &&
    modalForm.value.vendor &&
    modalForm.value.partnerAddress &&
    modalForm.value.priceList &&
    modalForm.value.warehouse &&
    modalForm.value.documentType &&
    modalForm.value.poCategory &&
    modalForm.value.tipePO
  )

  function saveModalDefaults() {
    localStorage.setItem(LS_KEY_PO_DEFAULTS, JSON.stringify({
      warehouse: modalForm.value.warehouse,
      warehouseName: modalForm.value.warehouseName,
    }))
  }

  function restoreModalDefaults() {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY_PO_DEFAULTS) || '{}')
      if (saved.warehouse) {
        modalForm.value.warehouse     = saved.warehouse
        modalForm.value.warehouseName = saved.warehouseName || ''
      }
    } catch {}
  }

  async function loadModalOptions() {
    const [pts, pms, txs, kategoriPO] = await Promise.allSettled([
      fetchPaymentTerms(),
      fetchPaymentMethods(),
      fetchTaxes(),
      fetchReferenceList('Kategori PO'),
    ])
    modalPaymentTermOptions.value   = pts.status === 'fulfilled' ? pts.value : []
    modalPaymentMethodOptions.value = pms.status === 'fulfilled' ? pms.value : []
    modalTaxOptions.value           = txs.status === 'fulfilled' ? txs.value : []
    modalKategoriPOOptions.value    = kategoriPO.status === 'fulfilled' ? kategoriPO.value : []
    if (modalTaxOptions.value.length > 0 && !modalDefaultTaxId.value) {
      modalDefaultTaxId.value = modalTaxOptions.value[0].id
    }
  }

  watch(showModal, (val) => {
    if (val) {
      restoreModalDefaults()
      modalForm.value.documentType = PURCHASE_ORDER_CENTRAL_ID
      if (!modalPaymentTermOptions.value.length) loadModalOptions()
    }
  })

  async function onModalVendorSelect(opt) {
    modalForm.value.vendorName     = opt?._identifier || opt?.name || ''
    modalForm.value.partnerAddress = null
    modalPartnerLocations.value    = []

    if (opt?.paymentTerms) {
      modalForm.value.paymentTerms     = opt.paymentTerms
      modalForm.value.paymentTermsName = opt['paymentTerms$_identifier'] || ''
    }
    if (opt?.purchasePricelist) {
      modalForm.value.priceList     = opt.purchasePricelist
      modalForm.value.priceListName = opt['purchasePricelist$_identifier'] || ''
    }
    const pmId   = opt?.paymentMethod || opt?.purchasePaymentMethod || opt?.defPaymentMethod
    const pmName = opt?.['paymentMethod$_identifier'] || opt?.['purchasePaymentMethod$_identifier'] || opt?.['defPaymentMethod$_identifier'] || ''
    if (pmId) {
      modalForm.value.paymentMethod     = pmId
      modalForm.value.paymentMethodName = pmName
    }

    if (!opt?.id) return
    modalLoadingLocations.value = true
    try {
      const locs = await fetchPartnerLocations(opt.id)
      modalPartnerLocations.value = locs
      if (locs.length === 1) modalForm.value.partnerAddress = locs[0].id
    } finally {
      modalLoadingLocations.value = false
    }
  }

  function onModalWarehouseSelect(opt) {
    modalForm.value.warehouseName = opt?._identifier || opt?.name || ''
    saveModalDefaults()
  }

  async function submitOrder() {
    if (!isModalValid.value) return
    modalSubmitting.value = true
    try {
      const orderRef = modalOrderReference.value

      const createdOrder = await createPurchaseOrderHeader({
        _entityName: 'Order',
        organization: { id: modalForm.value.organization },
        documentType: { id: '0' },
        transactionDocument: { id: PURCHASE_ORDER_CENTRAL_ID },
        documentStatus: 'DR',
        salesTransaction: false,
        businessPartner: { id: modalForm.value.vendor },
        partnerAddress: { id: modalForm.value.partnerAddress },
        priceList: { id: modalForm.value.priceList },
        warehouse: { id: modalForm.value.warehouse },
        orderDate: modalForm.value.orderDate,
        scheduledDeliveryDate: modalForm.value.scheduledDeliveryDate || modalForm.value.orderDate,
        accountingDate: modalForm.value.orderDate,
        currency: { id: '303' },
        priceIncludesTax: false,
        ...(orderRef && { orderReference: orderRef }),
        description: orderRef ? `${orderRef} (dibuat dari RTO New)` : '(dibuat dari RTO New)',
        ...(modalForm.value.paymentTerms  && { paymentTerms:  { id: modalForm.value.paymentTerms } }),
        ...(modalForm.value.paymentMethod && { paymentMethod: { id: modalForm.value.paymentMethod } }),
        ...(modalForm.value.documentType  && { documentType:  { id: modalForm.value.documentType } }),
        ...(modalForm.value.tipePO        && { em_tipe_po:     modalForm.value.tipePO }),
        ...(modalForm.value.poCategory    && { em_kategori_po: modalForm.value.poCategory }),
      })
      const orderId = createdOrder.id

      const linesByReqId = {}
      for (const line of selectedLines.value) {
        const reqId = typeof line.requisition === 'object' ? line.requisition?.id : line.requisition
        if (!linesByReqId[reqId]) linesByReqId[reqId] = []
        linesByReqId[reqId].push(line)
      }

      const soLinesByProjectId = {}
      const uniqueProjectIds = [...new Set(
        selectedLines.value
          .map(l => typeof l.project === 'object' ? l.project?.id : l.project)
          .filter(Boolean)
      )]
      await Promise.all(uniqueProjectIds.map(async (pid) => {
        try {
          const project  = await fetchProjectById(pid)
          const cOrderId = project?.cOrderId || project?.c_order_id
          if (cOrderId) {
            const lines = await fetchSOLinesByOrderId(cOrderId)
            soLinesByProjectId[pid] = lines
          }
        } catch (e) {
          console.warn(`[submit] could not fetch SO for project ${pid}:`, e)
        }
      }))

      let lineNo = 10
      for (const [requisitionId, reqLines] of Object.entries(linesByReqId)) {
        const matchQueue = []

        for (const line of reqLines) {
          const productId  = typeof line.product    === 'object' ? line.product?.id    : line.product
          const uomId      = typeof line.uOM        === 'object' ? line.uOM?.id        : line.uOM
          const projectId  = typeof line.project    === 'object' ? line.project?.id    : line.project
          const ccId       = typeof line.costCenter === 'object' ? line.costCenter?.id : line.costCenter
          const qtyOrdered = line.qtyToOrder ?? line.quantity

          const projectSOLines = (projectId && soLinesByProjectId[projectId]) || []
          const matchedSOLine  = projectSOLines.find(sl => {
            const slProductId = typeof sl.product === 'object' ? sl.product?.id : sl.product
            return slProductId === productId
          })

          const orderLine = await createPurchaseOrderLine({
            _entityName: 'OrderLine',
            salesOrder: { id: orderId },
            organization: { id: modalForm.value.organization },
            lineNo,
            orderDate: modalForm.value.orderDate,
            scheduledDeliveryDate: modalForm.value.orderDate,
            product: { id: productId },
            uOM: { id: uomId },
            orderedQuantity: qtyOrdered,
            unitPrice: line.orderUnitPrice ?? 0,
            listPrice: line.orderUnitPrice ?? 0,
            lineNetAmount: qtyOrdered * (line.orderUnitPrice ?? 0),
            priceList: { id: modalForm.value.priceList },
            warehouse: { id: modalForm.value.warehouse },
            businessPartner: { id: modalForm.value.vendor },
            currency: { id: '303' },
            tax: { id: modalDefaultTaxId.value || modalTaxOptions.value[0]?.id },
            ...(line.description && { description: line.description }),
            ...(projectId        && { project: { id: projectId } }),
            ...(ccId             && { costcenter: { id: ccId } }),
            ...(matchedSOLine    && { refOrderLine: { id: matchedSOLine.id } }),
          })

          const orderLineId = orderLine?.id
          if (!orderLineId) throw new Error('OrderLine created but returned no ID')

          const prevMatchedQty = Number(line.orderQuantity ?? 0)
          const newMatchedQty  = prevMatchedQty + qtyOrdered
          const reqQty         = Number(line.quantity ?? 0)
          const newStatus      = newMatchedQty >= reqQty ? 'C' : 'O'

          matchQueue.push({ line, orderLineId, newMatchedQty, newStatus, qtyOrdered })
          lineNo += 10
        }

        for (const { line, orderLineId, newMatchedQty, newStatus, qtyOrdered } of matchQueue) {
          await createRequisitionPOMatch({
            _entityName: 'ProcurementRequisitionPOMatch',
            organization: modalForm.value.organization,
            requisitionLine: line.id,
            salesOrderLine: orderLineId,
            quantity: qtyOrdered,
          })

          await updateRequisitionLine(line.id, {
            matchedPOQty: newMatchedQty,
            requisitionLineStatus: newStatus,
          })
        }

        try {
          const allLines  = await fetchAllRequisitionLines(requisitionId)
          const allClosed = allLines.length > 0 && allLines.every(l => l.requisitionLineStatus === 'C')
          if (allClosed) await closeRequisition(requisitionId)
        } catch (e) {
          console.warn('[submit] Could not check/close requisition:', e.message)
        }
      }

      modalCreatedPONumber.value = createdOrder.documentNo || orderId
      modalShowSuccess.value     = true

      clearSelection()
      successBanner.documentNo = createdOrder.documentNo || ''
      successBanner.show       = true
      await search()

    } catch (err) {
      const raw   = err?.response?.data?.error?.message || err.message || ''
      const clean = raw.includes('Internal Memo')
        ? 'PR ini adalah Non-Budget PR — tidak bisa membuat PO. Pastikan Internal Memo sudah diisi di Openbravo.'
        : 'Gagal membuat PO: ' + raw
      showToast(clean)
    } finally {
      modalSubmitting.value = false
    }
  }

  function copyCreatedPONumber() {
    navigator.clipboard.writeText(modalCreatedPONumber.value).then(() => {
      modalCopyDone.value = true
      setTimeout(() => { modalCopyDone.value = false }, 2000)
    })
  }

  function closeModalSuccess() {
    modalShowSuccess.value     = false
    modalCreatedPONumber.value = ''
    showModal.value            = false
  }

  onMounted(() => {
    loadModalOptions()
  })

  return {
    filter, onProjectSelect, fetchRequestersByProject,
    requisitions, linesByReq, loading, searched, expanded, loadingLines,
    headerSearch, filteredRequisitions,
    colSearch, getColSearch, resetColSearch, resetAllColSearch, filteredLines,
    gridCols,
    maxQtyToOrder, qtyToOrderExceeds, clampQtyToOrder, orderPriceExceeds, clampOrderPrice,
    selectedLineIds, selectedLines, isLineSelected, toggleLine,
    allLinesSelected, toggleAllLines, clearSelection,
    toggleExpand, loadLines,
    search, resetFilter,
    getReqStatus,
    selectedPRCount, selectedPRDocumentNos,
    showModal, toast, successBanner, showToast, copyPONumber,
    modalForm, modalPartnerLocations, modalLoadingLocations,
    modalPaymentTermOptions, modalPaymentMethodOptions,
    modalTaxOptions, modalDefaultTaxId, modalKategoriPOOptions,
    modalSubmitting, modalShowSuccess, modalCreatedPONumber, modalCopyDone,
    modalOrderReference, isModalValid,
    onModalVendorSelect, onModalWarehouseSelect,
    submitOrder, copyCreatedPONumber, closeModalSuccess,
  }
}