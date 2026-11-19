// The same lifecycle as the API (minepag/ativeos-test-api, src/orders/status.ts).
export const orderStatuses = ["pendente", "pago", "enviado", "entregue", "cancelado"] as const

export type OrderStatus = (typeof orderStatuses)[number]

export const allowedTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  pendente: ["pago", "cancelado"],
  pago: ["enviado", "cancelado"],
  enviado: ["entregue"],
  entregue: [],
  cancelado: [],
}

export const canTransition = (from: OrderStatus, to: OrderStatus) =>
  allowedTransitions[from].includes(to)

export const statusLabels: Record<OrderStatus, string> = {
  pendente: "Pendente",
  pago: "Pago",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
}

export const transitionLabels: Record<OrderStatus, string> = {
  pendente: "Voltar para pendente",
  pago: "Marcar como pago",
  enviado: "Marcar como enviado",
  entregue: "Confirmar entrega",
  cancelado: "Cancelar pedido",
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

export const formatCents = (cents: number) => currency.format(cents / 100)

// "12,50", "12.50" and "1.234,56" → 1250, 1250 and 123456; null when it is not a positive amount. With a comma, dots
// group thousands; without one, a dot is the decimal separator.
export const parseCents = (text: string) => {
  const trimmed = text.trim()
  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  const cents = Math.round(Number(normalized) * 100)
  return cents > 0 ? cents : null
}
