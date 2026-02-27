import { createRouter, createWebHashHistory } from 'vue-router'
import CustomerView from '@/views/Customer.vue'
import ProductView from '@/views/Product.vue'
import VendorView from '@/views/Vendor.vue'
import COAView from '@/views/COA.vue'
import SalesOrderView from '@/views/SalesOrder.vue'
import GoodsShipmentView from '@/views/GoodsShipment.vue'
import CustomerInvoiceView from '@/views/CustomerInvoice.vue'
import WarehouseView from '@/views/Warehouse.vue'
import StorageBinView from '@/views/StorageBin.vue'

const routes = [
  { path: '/', redirect: '/customer' },
  { path: '/customer', component: CustomerView },
  { path: '/product', component: ProductView },
  { path: '/vendor', component: VendorView },
  { path: '/coa', component: COAView },
  { path: '/sales-order', component: SalesOrderView },
  { path: '/goods-shipment', component: GoodsShipmentView },
  { path: '/customer-invoice', component: CustomerInvoiceView },
  { path: '/warehouse', component: WarehouseView },
  { path: '/storage-bin', component: StorageBinView },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router