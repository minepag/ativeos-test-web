import { canTransition, type OrderStatus, orderStatuses } from "../orders/status.ts"

export type Order = {
  id: string
  cliente: string
  valorCentavos: number
  status: OrderStatus
  criadoEm: string
  atualizadoEm: string
}

export type StatusSummary = { status: OrderStatus; pedidos: number; valorCentavos: number }

export type OrdersApi = {
  list(filter: { status?: OrderStatus; limite?: number }): Promise<Order[]>
  summary(): Promise<StatusSummary[]>
  create(input: { cliente: string; valorCentavos: number }): Promise<Order>
  transition(id: string, status: OrderStatus): Promise<Order>
}

export const apiError = (message: string, status: number) =>
  Object.assign(new Error(message), { name: "ApiError" as const, status })

// The test API (minepag/opelo-test-api): errors answer { erro, detalhes? }.
export const createHttpOrdersApi = (
  baseUrl: string,
  fetchImplementation: typeof fetch = fetch,
): OrdersApi => {
  const call = async <Body>(path: string, init: RequestInit = {}) => {
    const response = await fetchImplementation(`${baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...init.headers },
    })
    const body = (await response.json().catch(() => ({}))) as Body & { erro?: string }
    if (!response.ok)
      throw apiError(body.erro ?? `A API respondeu ${response.status}.`, response.status)
    return body as Body
  }
  return {
    list: ({ status, limite = 50 }) => {
      const query = new URLSearchParams({ limite: String(limite) })
      if (status) query.set("status", status)
      return call<Order[]>(`/pedidos?${query}`)
    },
    summary: () => call<StatusSummary[]>("/pedidos/resumo"),
    create: (input) => call<Order>("/pedidos", { method: "POST", body: JSON.stringify(input) }),
    transition: (id, status) =>
      call<Order>(`/pedidos/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
  }
}

const sampleOrders: Pick<Order, "cliente" | "valorCentavos" | "status">[] = [
  { cliente: "Ana Souza", valorCentavos: 12_990, status: "pendente" },
  { cliente: "Bruno Lima", valorCentavos: 45_000, status: "pago" },
  { cliente: "Carla Mendes", valorCentavos: 8_750, status: "enviado" },
  { cliente: "Diego Rocha", valorCentavos: 230_000, status: "entregue" },
  { cliente: "Elisa Prado", valorCentavos: 5_990, status: "cancelado" },
  { cliente: "Fábio Nunes", valorCentavos: 19_900, status: "pendente" },
]

// Runs the app without the API (development, visual QA): the same rules, kept in memory. Dates are fixed so
// screenshots compare.
export const createMemoryOrdersApi = (
  seed = sampleOrders,
  now = () => new Date("2026-11-18T12:00:00.000Z"),
): OrdersApi => {
  let sequence = 0
  const nextId = () => {
    sequence += 1
    return `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`
  }
  const orders: Order[] = seed.map((order, index) => {
    const at = new Date(now().getTime() - (seed.length - index) * 3_600_000).toISOString()
    return { ...order, id: nextId(), criadoEm: at, atualizadoEm: at }
  })
  return {
    list: async ({ status, limite = 50 }) =>
      orders
        .filter((order) => !status || order.status === status)
        .toSorted((a, b) => b.criadoEm.localeCompare(a.criadoEm))
        .slice(0, limite),
    summary: async () =>
      orderStatuses
        .map((status) => {
          const matching = orders.filter((order) => order.status === status)
          return {
            status,
            pedidos: matching.length,
            valorCentavos: matching.reduce((total, order) => total + order.valorCentavos, 0),
          }
        })
        .filter((row) => row.pedidos > 0),
    create: async ({ cliente, valorCentavos }) => {
      const at = now().toISOString()
      const order: Order = {
        id: nextId(),
        cliente: cliente.trim(),
        valorCentavos,
        status: "pendente",
        criadoEm: at,
        atualizadoEm: at,
      }
      orders.push(order)
      return order
    },
    transition: async (id, status) => {
      const order = orders.find((candidate) => candidate.id === id)
      if (!order) throw apiError("Pedido não encontrado", 404)
      if (!canTransition(order.status, status))
        throw apiError(`Transição inválida: ${order.status} → ${status}`, 409)
      order.status = status
      order.atualizadoEm = now().toISOString()
      return { ...order }
    },
  }
}

export const ordersApi: OrdersApi = import.meta.env.VITE_API_URL
  ? createHttpOrdersApi(import.meta.env.VITE_API_URL)
  : createMemoryOrdersApi()
