import { productsSchema } from '@/contract/schemas/products.js'
import { logAudit } from '@/modules/audit-logs/helpers/log-audit.js'
import * as productService from '@/modules/products/services/product.service.js'
import { createFastifyRpcPlugin } from '@/plugins/rpc.js'

export default createFastifyRpcPlugin(productsSchema, {
  list: async ({ query, request }) => {
    const { page, limit } = query
    const { data, total } = await productService.findAllProducts(request.server.db, page, limit)
    return { status: 200 as const, body: { success: true as const, data, pagination: { page, limit, total } } }
  },

  get: async ({ params, request }) => {
    const product = await productService.findProductById(request.server.db, params.id)
    return { status: 200 as const, body: { success: true as const, data: product } }
  },

  create: async ({ body, request }) => {
    const product = await productService.createProduct(request.server.db, body)
    logAudit(request.server.db, { userId: request.requestContext.get('userId'), action: 'product.created', resourceType: 'product', resourceId: product.id, metadata: { name: product.name, price: product.price } })
    return { status: 201 as const, body: { success: true as const, data: product } }
  },

  update: async ({ params, body, request }) => {
    const product = await productService.updateProduct(request.server.db, params.id, body)
    logAudit(request.server.db, { userId: request.requestContext.get('userId'), action: 'product.updated', resourceType: 'product', resourceId: params.id, metadata: { changes: body } })
    return { status: 200 as const, body: { success: true as const, data: product } }
  },

  delete: async ({ params, request }) => {
    const product = await productService.deleteProduct(request.server.db, params.id)
    logAudit(request.server.db, { userId: request.requestContext.get('userId'), action: 'product.deleted', resourceType: 'product', resourceId: params.id, metadata: { name: product.name, price: product.price } })
    return { status: 204 as const, body: null }
  },
})
