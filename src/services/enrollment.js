// src/services/enrollment.js
import axios from 'axios'

// ==============================
// Runtime Config
// ==============================
const BASE_URL = window.APP_CONFIG?.API_BASE_URL || '/openbravo/'

// ==============================
// Basic Auth
// ==============================
const USERNAME = 'APIService'
const PASSWORD = 'wrt'
const token = btoa(`${USERNAME}:${PASSWORD}`)

// ==============================
// Axios Instance
// ==============================
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Basic ${token}`,
    'Content-Type': 'application/json',
  },
})

// ==============================
// Constants — JSON REST endpoints
// ==============================
const ENROLLMENT_BASE  = '/org.openbravo.service.json.jsonrest/bhj_enrollment'
const KAT_BANG_BASE    = '/org.openbravo.service.json.jsonrest/bhj_kat_bang'
const KAT_BANGL_BASE   = '/org.openbravo.service.json.jsonrest/bhj_kat_bangl'
const FORMAT_BASE      = '/org.openbravo.service.json.jsonrest/bhj_format'
const FORMAT_L_BASE    = '/org.openbravo.service.json.jsonrest/bhj_formatl'

const ORG_ID = 'B3FE20F490CF49989D7250C0D3341603'

// ==============================
// Error checker
// ==============================
function checkActionAllowed(res, label = '', friendlyLabel = '') {
  const response = res.data?.response
  const err = response?.error
  const status = response?.status
  if (err?.message === 'OBUIAPP_ActionNotAllowed') {
    const who = friendlyLabel ? `Gagal ${friendlyLabel}: ` : ''
    throw new Error(`${who}User APIService tidak memiliki izin untuk operasi ini.`)
  }
  if (status !== undefined && status < 0) {
    console.error(`[Openbravo ${label}] error status=${status}`, JSON.stringify(response))
    const detail = err?.message ?? err?.type ?? JSON.stringify(err) ?? 'Unknown error'
    const who = friendlyLabel ? `Gagal ${friendlyLabel}: ` : 'Server error: '
    throw new Error(`${who}${detail}`)
  }
}

// ==============================
// GET - list enrollments
// ==============================
export async function fetchEnrollments({ startRow = 0, pageSize = 20, searchKey = '', sortCol = 'tglInput', sortDir = 'desc' } = {}) {
  let where = `e.active = true`
  if (searchKey.trim()) {
    const s = searchKey.trim().replace(/'/g, "''")
    where += ` and (upper(e.namaPelanggan) like upper('%${s}%') or upper(e.noHp) like upper('%${s}%'))`
  }
  // Map nama kolom Vue → nama field Openbravo
  const colMap = { tglInput: 'tglInput', namaPelanggan: 'namaPelanggan', kecamatan: 'kecamatan', kelurahan: 'kelurahan' }
  const obCol  = colMap[sortCol] ?? 'tglInput'
  const sortBy = sortDir === 'asc' ? obCol : `-${obCol}`
  const res = await api.get(ENROLLMENT_BASE, {
    params: {
      _startRow: startRow,
      _endRow: startRow + pageSize,
      _noCount: false,
      _sortBy: sortBy,
      _where: where,
    },
  })
  return res.data?.response ?? res.data
}

// ==============================
// GET - single enrollment
// ==============================
export async function fetchEnrollment(id) {
  const res = await api.get(`${ENROLLMENT_BASE}/${id}`)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// ==============================
// POST - create enrollment
// ==============================
export async function createEnrollment(data) {
  const payload = {
    data: {
      _entityName: 'bhj_enrollment',
      organization: { id: ORG_ID },
      active: true,
      tglInput: data.tglInput || new Date().toISOString().split('T')[0],

      // Data Pelanggan
      namaPelanggan: data.namaPelanggan || null,
      hp: data.noHp || null,
      email: data.email || null,

      // Alamat Pelanggan
      jalan: data.jalan || null,
      rumah: data.noRumah || null,
      rt: data.rt || null,
      rw: data.rw || null,
      kelurahan: data.kelurahan || null,
      kecamatan: data.kecamatan || null,
      kota: data.kota || null,
      provinsi: data.provinsi || null,

      // Data Penanggung Jawab
      namaPj: data.namaPj || null,
      hpPj: data.noHpPj || null,
      emailPj: data.emailPj || null,
      jalanPj: data.jalanPj || null,
      rumahPj: data.noRumahPj || null,
      kelurahanPj: data.kelurahanPj || null,
      kecamatanPj: data.kecamatanPj || null,
      kotaPj: data.kotaPj || null,
      provinsiPj: data.provinsiPj || null,

      // Tambahan
      tangki: data.tangki ? 'Y' : 'N',
      checkTg: data.checkTg ? 'Y' : 'N',
      titikLokasi: data.titikLokasi || null,

      // FK — nama field harus sesuai Openbravo: bHJKatBang, bHJKatBangl
      ...(data.bhjKatBangId  && { bHJKatBang:  { id: data.bhjKatBangId } }),
      ...(data.bhjKatBanglId && { bHJKatBangl: { id: data.bhjKatBanglId } }),
    },
  }
  const res = await api.post(ENROLLMENT_BASE, payload)
  checkActionAllowed(res, 'createEnrollment', 'menyimpan enrollment')
  const raw = res.data?.response?.data
  const result = Array.isArray(raw) ? raw[0] : raw
  if (!result?.id) throw new Error('Gagal menyimpan enrollment: server tidak mengembalikan ID.')
  return result
}

// ==============================
// PUT - update enrollment
// ==============================
export async function updateEnrollment(id, data) {
  const payload = {
    data: {
      id,
      _entityName: 'bhj_enrollment',
      organization: { id: ORG_ID },
      tglInput: data.tglInput || null,
      namaPelanggan: data.namaPelanggan || null,
      hp: data.noHp || null,
      email: data.email || null,
      jalan: data.jalan || null,
      rumah: data.noRumah || null,
      rt: data.rt || null,
      rw: data.rw || null,
      kelurahan: data.kelurahan || null,
      kecamatan: data.kecamatan || null,
      kota: data.kota || null,
      provinsi: data.provinsi || null,
      namaPj: data.namaPj || null,
      hpPj: data.noHpPj || null,
      emailPj: data.emailPj || null,
      jalanPj: data.jalanPj || null,
      rumahPj: data.noRumahPj || null,
      kelurahanPj: data.kelurahanPj || null,
      kecamatanPj: data.kecamatanPj || null,
      kotaPj: data.kotaPj || null,
      provinsiPj: data.provinsiPj || null,
      tangki: data.tangki ? 'Y' : 'N',
      checkTg: data.checkTg ? 'Y' : 'N',
      titikLokasi: data.titikLokasi || null,
      ...(data.bhjKatBangId  && { bHJKatBang:  { id: data.bhjKatBangId } }),
      ...(data.bhjKatBanglId && { bHJKatBangl: { id: data.bhjKatBanglId } }),
    },
  }
  const res = await api.put(`${ENROLLMENT_BASE}/${id}`, payload)
  checkActionAllowed(res, 'updateEnrollment', 'memperbarui enrollment')
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// DELETE (soft) enrollment
// ==============================
export async function deleteEnrollment(id) {
  const payload = { data: { id, _entityName: 'bhj_enrollment', active: false } }
  const res = await api.put(`${ENROLLMENT_BASE}/${id}`, payload)
  checkActionAllowed(res, 'deleteEnrollment', 'menghapus enrollment')
  return res.data?.response?.data ?? res.data
}

// ==============================
// Lookup: Kategori Bangunan (bhj_kat_bang)
// ==============================
export async function fetchKatBang() {
  const res = await api.get(KAT_BANG_BASE, {
    params: { _startRow: 0, _endRow: 500, _where: 'e.active = true' },
  })
  return res.data?.response?.data ?? res.data?.data ?? []
}

// ==============================
// Lookup: Kategori Bangunan Level (bhj_kat_bangl)
// ==============================
export async function fetchKatBangl() {
  const res = await api.get(KAT_BANGL_BASE, {
    params: { _startRow: 0, _endRow: 500, _where: 'e.active = true' },
  })
  return res.data?.response?.data ?? res.data?.data ?? []
}

// ==============================
// Lookup: Kecamatan (bhj_format)
// ==============================
export async function fetchKecamatan(search = '') {
  let where = 'e.active = true'
  if (search.trim()) {
    const s = search.trim().replace(/'/g, "''")
    where += ` and upper(e.namaKecamatan) like upper('%${s}%')`
  }
  const res = await api.get(FORMAT_BASE, {
    params: { _startRow: 0, _endRow: 100, _where: where, _sortBy: 'namaKecamatan' },
  })
  return res.data?.response?.data ?? []
}

// ==============================
// Lookup: Kelurahan (bhj_formatl)
// ==============================
export async function fetchKelurahan(kecamatan = '', search = '') {
  let where = 'e.active = true'
  if (kecamatan.trim()) {
    const k = kecamatan.trim().replace(/'/g, "''")
    where += ` and upper(e.namaKecamatan) = upper('${k}')`
  }
  if (search.trim()) {
    const s = search.trim().replace(/'/g, "''")
    where += ` and upper(e.namaKelurahan) like upper('%${s}%')`
  }
  const res = await api.get(FORMAT_L_BASE, {
    params: { _startRow: 0, _endRow: 200, _where: where, _sortBy: 'namaKelurahan' },
  })
  return res.data?.response?.data ?? []
}

// ==============================
// Attachment constants
// ==============================
const ATTACH_TAB_ID     = 'C9B25735446C4537B656B5F6E5E9E5B3'
const ATTACH_CLIENT_ID  = '53AD31E21D624632B2F171194EC6E887'
const ATTACH_METHOD_ID  = 'D7B1319FC2B340799283BBF8E838DF9F'
const ATTACH_WINDOW_ID  = '3116A07AF93346D4AEAF05E8B782851F'
const ATTACH_TABLE_ID   = '60F3A79605784D2BB834AD46F1287B9B'

// ==============================
// Kernel fetch — pakai Basic Auth header langsung
// AttachmentAH di Openbravo mendukung Basic Auth via header Authorization
// sehingga tidak perlu session/cookie sama sekali.
// ==============================

function isKernelError(text) {
  return typeof text === 'string' && (
    text.includes('OB.KernelUtilities.handleSystemException') ||
    text.includes('window.location.href')
  )
}

async function kernelFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...options.headers,
      'Authorization': `Basic ${token}`,
    },
  })
  const text = await res.text()
  return { ok: res.ok, status: res.status, text }
}

// ==============================
// Attachment: Upload file ke Openbravo
// Openbravo butuh 2 step:
//   1. POST DefaultsAttachmentActionHandler — inisialisasi context (JSON)
//   2. POST /businessUtility/TabAttachments_FS.html — upload file (multipart)
// ==============================
export async function uploadAttachment(enrollmentId, file, description = '', recordData = {}) {

  // ── Step 1: DefaultsAttachmentActionHandler ──────────────────────────────
  const step1Params = new URLSearchParams({
    tabId:            ATTACH_TAB_ID,
    clientId:         ATTACH_CLIENT_ID,
    attachmentMethod: ATTACH_METHOD_ID,
    attachmentId:     'null',
    keyId:            enrollmentId,
    action:           'upload',
    windowId:         'null',
    _action:          'org.openbravo.client.application.attachment.DefaultsAttachmentActionHandler',
  })

  const defaultsBody = {
    inpadClientId:      ATTACH_CLIENT_ID,
    inpadOrgId:         ORG_ID,
    inpbhjEnrollmentId: enrollmentId,
    BHJ_Enrollment_ID:  enrollmentId,
    inpisactive:        'Y',
    inpTabId:           ATTACH_TAB_ID,
    inpwindowId:        ATTACH_WINDOW_ID,
    inpTableId:         ATTACH_TABLE_ID,
    inpkeyColumnId:     'BHJ_Enrollment_ID',
    keyProperty:        'id',
    inpKeyName:         'inpbhjEnrollmentId',
    keyColumnName:      'BHJ_Enrollment_ID',
    keyPropertyType:    '_id_13',
    ...(recordData.namaPelanggan && { inpnamaPelanggan: recordData.namaPelanggan }),
    ...(recordData.noHp          && { inpnoHp:          recordData.noHp }),
    ...(recordData.tglInput      && { inptglInput:      recordData.tglInput }),
    ...(recordData.provinsi      && { inpprovinsi:      recordData.provinsi }),
    ...(recordData.kota          && { inpkota:          recordData.kota }),
  }

  const { text: step1Text } = await kernelFetch(
    `${BASE_URL}org.openbravo.client.kernel?${step1Params.toString()}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body:    JSON.stringify(defaultsBody),
    }
  )
  console.info('[Attachment] Step1 defaults:', step1Text.slice(0, 100))

  // ── Step 2: TabAttachments_FS.html — upload file ─────────────────────────
  // Endpoint berbeda dari kernel — ini yang benar-benar menyimpan file.
  // Parameter dikirim sebagai multipart fields + file.
  const paramValues = JSON.stringify({
    inpname:       file.name,
    Command:       'SAVE_NEW_OB3',
    buttonId:      'isc_OBAttachmentCanvasItem_0_canvas',
    viewId:        'isc_OBStandardView_0',
    inpKey:        enrollmentId,
    inpTabId:      ATTACH_TAB_ID,
    inpDocumentOrg: ORG_ID,
    inpwindowId:   null,
    description:   description || null,
  })

  const formData = new FormData()
  formData.append('inpname',       file, file.name)   // file field
  formData.append('_transaction',  '')
  formData.append('paramValues',   paramValues)
  formData.append('Command',       'SAVE_NEW_OB3')
  formData.append('buttonId',      'isc_OBAttachmentCanvasItem_0_canvas')
  formData.append('viewId',        'isc_OBStandardView_0')
  formData.append('inpKey',        enrollmentId)
  formData.append('inpTabId',      ATTACH_TAB_ID)
  formData.append('inpDocumentOrg', ORG_ID)
  formData.append('inpwindowId',   '')

  const { text } = await kernelFetch(
    `${BASE_URL}businessUtility/TabAttachments_FS.html`,
    { method: 'POST', body: formData }
  )

  if (isKernelError(text)) {
    throw new Error('Upload gagal: ' + text.slice(0, 300))
  }

  // Response berupa HTML dengan script — extract JSON dari uploadFinished(...)
  const match = text.match(/uploadFinished\([^,]+,\s*(\{[\s\S]*?\})\s*\)/)
  if (match) {
    try {
      const json = JSON.parse(match[1])
      return json
    } catch { /* ignore parse error */ }
  }
  return { ok: true }
}

// ==============================
// Attachment: Fetch daftar file via AD_Attachment REST (Basic Auth) — lebih reliable
// Fallback ke AttachmentAH jika REST tidak tersedia
// ==============================
export async function fetchAttachments(enrollmentId) {
  try {
    // Opsi 1: Query tabel AD_Attachment via JSON REST — support Basic Auth
    // Field: record = enrollmentId, table = ATTACH_TABLE_ID
    const restRes = await api.get('/org.openbravo.service.json.jsonrest/ADAttachment', {
      params: {
        _startRow: 0,
        _endRow: 100,
        _where: `e.record = '${enrollmentId}'`,
        _sortBy: '-creationDate',
      },
    })
    const rows = restRes.data?.response?.data
    if (Array.isArray(rows)) {
      return rows.map(r => ({
        id:          r.id,
        name:        r.name || r.dataType || r.id,
        description: r.text || r.description || '',
        updatedby:   r.updatedBy?._identifier || r.createdBy?._identifier || '',
        attmethod:   ATTACH_METHOD_ID,
      }))
    }
  } catch (e) {
    console.warn('[Attachment] ADAttachment REST gagal, fallback ke AttachmentAH:', e.message)
  }

  // Opsi 2: Fallback ke AttachmentAH via session cookie
  try {
    const params = new URLSearchParams({
      Command:   'LOAD',
      tabId:     ATTACH_TAB_ID,
      buttonId:  'isc_OBAttachmentCanvasItem_0_canvas',
      viewId:    'isc_OBStandardView_0',
      recordIds: enrollmentId,
      _action:   'org.openbravo.client.application.attachment.AttachmentAH',
    })
    const { text } = await kernelFetch(
      `${BASE_URL}org.openbravo.client.kernel?${params.toString()}`,
      { method: 'POST' }
    )
    if (isKernelError(text)) {
      console.warn('[Attachment] AttachmentAH: session tidak valid setelah retry')
      return []
    }
    const json = JSON.parse(text)
    return json.attachments ?? []
  } catch (e) {
    console.warn('[Attachment] fetchAttachments gagal:', e.message)
    return []
  }
}

// ==============================
// Attachment: Download
// AttachmentAH tidak support Basic Auth untuk GET/download langsung.
// Solusi: fetch via kernelFetch (dengan Auth header), buat blob URL, trigger download.
// ==============================
export function buildAttachmentDownloadUrl(attachmentId) {
  // Legacy — tidak dipakai lagi, tapi dipertahankan untuk kompatibilitas
  const params = new URLSearchParams({
    Command:  'DOWNLOAD',
    tabId:    ATTACH_TAB_ID,
    buttonId: 'isc_OBAttachmentCanvasItem_0_canvas',
    viewId:   'isc_OBStandardView_0',
    attachId: attachmentId,
    _action:  'org.openbravo.client.application.attachment.AttachmentAH',
  })
  return `${BASE_URL}org.openbravo.client.kernel?${params.toString()}`
}

export async function downloadAttachment(attachmentId, filename = 'download') {
  const params = new URLSearchParams({
    Command:  'DOWNLOAD',
    tabId:    ATTACH_TAB_ID,
    buttonId: 'isc_OBAttachmentCanvasItem_0_canvas',
    viewId:   'isc_OBStandardView_0',
    attachId: attachmentId,
    _action:  'org.openbravo.client.application.attachment.AttachmentAH',
  })

  const url = `${BASE_URL}org.openbravo.client.kernel?${params.toString()}`

  // Fetch dengan Authorization header — tidak bisa pakai link biasa
  const res = await fetch(url, {
    method:      'GET',
    credentials: 'include',
    headers:     { Authorization: `Basic ${token}` },
  })

  if (!res.ok) throw new Error(`Download gagal: HTTP ${res.status}`)

  const blob = await res.blob()

  // Cek apakah response adalah redirect HTML (session expired)
  if (blob.type === 'text/html' || blob.size < 500) {
    const text = await blob.text()
    if (text.includes('window.location.href') || text.includes('LoginHandler')) {
      throw new Error('Session tidak valid, refresh halaman dan coba lagi.')
    }
  }

  // Trigger download via blob URL
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}

// ==============================
// Attachment: Delete
// Sesuai pattern Openbravo UI — Command=DELETE via AttachmentAH
// ==============================
export async function deleteAttachment(enrollmentId, attachmentId) {
  const params = new URLSearchParams({
    Command:    'DELETE',
    tabId:      ATTACH_TAB_ID,
    buttonId:   'isc_OBAttachmentCanvasItem_0_canvas',
    recordIds:  enrollmentId,
    attachId:   attachmentId,
    viewId:     'isc_OBStandardView_0',
    _action:    'org.openbravo.client.application.attachment.AttachmentAH',
  })

  const { text } = await kernelFetch(
    `${BASE_URL}org.openbravo.client.kernel?${params.toString()}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body:    '{}',
    }
  )

  if (isKernelError(text)) {
    throw new Error('Hapus attachment gagal: ' + text.slice(0, 200))
  }
  try {
    return JSON.parse(text)
  } catch {
    return { ok: true }
  }
}

// ==============================
// Interceptors
// ==============================
api.interceptors.response.use(
  (res) => {
    const s = res.data?.response?.status
    if (s !== undefined && s < 0) {
      console.error('[Openbravo API error body]', JSON.stringify(res.data?.response))
    }
    return res
  },
  (err) => {
    console.error('[Openbravo HTTP error]', err.response?.status, JSON.stringify(err.response?.data))
    return Promise.reject(err)
  }
)