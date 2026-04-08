import { createRouter, createWebHashHistory } from 'vue-router'
import CustomerView from '@/views/Customer.vue'
import ProductView from '@/views/Product.vue'
import VendorView from '@/views/Vendor.vue'
import COAView from '@/views/COA.vue'
import SalesOrderView from '@/views/SalesOrder.vue'
import GoodsShipmentView from '@/views/GoodsShipment.vue'
import CustomerInvoiceView from '@/views/CustomerInvoice.vue'
import VendorInvoiceView from '@/views/VendorInvoice.vue'
import WarehouseView from '@/views/Warehouse.vue'
import StorageBinView from '@/views/StorageBin.vue'
import PurchaseOrderView from '@/views/PurchaseOrder.vue'
import ARAgingView from '@/views/ARAgingView.vue'
import PaymentInView from '@/views/PaymentIn.vue'
import GLJournalView from '@/views/GLJournal.vue'
import TrialBalanceView from '@/views/TrialBalance.vue'
import APAgingView from '@/views/APAgingView.vue'
import GeneralLedgerView from '@/views/GeneralLedger.vue'
import BalanceSheetView from '@/views/BalanceSheet.vue'
import ProfitAndLossView from '@/views/ProfitAndLoss.vue'
import FinancialAccountView from '@/views/FinancialAccount.vue'
import TaxRateView from '@/views/TaxRate.vue'
import PaymentTermView from '@/views/PaymentTerm.vue'
import BusinessPartnerCategoryView from '@/views/BusinessPartnerCategory.vue'

const routes = [
  { path: '/', redirect: '/customer' },
  { path: '/customer', component: CustomerView },
  { path: '/product', component: ProductView },
  { path: '/vendor', component: VendorView },
  { path: '/coa', component: COAView },
  { path: '/sales-order', component: SalesOrderView },
  { path: '/goods-shipment', component: GoodsShipmentView },
  { path: '/customer-invoice', component: CustomerInvoiceView },
  { path: '/vendor-invoice', component: VendorInvoiceView },
  { path: '/warehouse', component: WarehouseView },
  { path: '/storage-bin', component: StorageBinView },
  { path: '/purchase-order', component: PurchaseOrderView },
  { path: '/ar-aging', component: ARAgingView },
  { path: '/payment-in', component: PaymentInView },
  { path: '/financial-account', component: FinancialAccountView },
  { path: '/gl-journal', component: GLJournalView },
  { path: '/trial-balance', component: TrialBalanceView },
  { path: '/ap-aging', component: APAgingView },
  { path: '/general-ledger', component: GeneralLedgerView },
  { path: '/balance-sheet', component: BalanceSheetView },
  { path: '/profit-and-loss', component: ProfitAndLossView },
  { path: '/tax-rate', component: TaxRateView },
  { path: '/payment-term', component: PaymentTermView },
  { path: '/bp-category', component: BusinessPartnerCategoryView },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router