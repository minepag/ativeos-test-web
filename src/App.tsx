import { type FormEvent, useCallback, useEffect, useState } from "react"
import { type Order, type OrdersApi, ordersApi, type StatusSummary } from "./api/orders.ts"
import { matchesCliente } from "./orders/search.ts"
import {
  allowedTransitions,
  formatCents,
  type OrderStatus,
  orderStatuses,
  parseCents,
  statusLabels,
  transitionLabels,
} from "./orders/status.ts"

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" })

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : "Algo deu errado. Tente de novo."

function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge badge-${status}`}>{statusLabels[status]}</span>
}

function NewOrderForm({
  onCreate,
}: {
  onCreate: (cliente: string, cents: number) => Promise<void>
}) {
  const [cliente, setCliente] = useState("")
  const [valor, setValor] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const name = cliente.trim()
    const cents = parseCents(valor)
    if (!name) return setError("Informe o cliente.")
    if (name.length > 120) return setError("O nome do cliente tem no máximo 120 caracteres.")
    if (cents === null) return setError("Informe um valor maior que zero, como 129,90.")
    setError(null)
    setSaving(true)
    try {
      await onCreate(name, cents)
      setCliente("")
      setValor("")
    } catch (failure) {
      setError(messageOf(failure))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="new-order" onSubmit={submit} aria-label="Novo pedido">
      <label>
        Cliente
        <input value={cliente} onChange={(event) => setCliente(event.target.value)} />
      </label>
      <label>
        Valor (R$)
        <input
          value={valor}
          inputMode="decimal"
          placeholder="0,00"
          onChange={(event) => setValor(event.target.value)}
        />
      </label>
      <button type="submit" disabled={saving}>
        {saving ? "Criando…" : "Criar pedido"}
      </button>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </form>
  )
}

function OrderPanel({
  order,
  onTransition,
  onClose,
}: {
  order: Order
  onTransition: (status: OrderStatus) => Promise<void>
  onClose: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<OrderStatus | null>(null)
  const next = allowedTransitions[order.status]

  const change = async (status: OrderStatus) => {
    setError(null)
    setPending(status)
    try {
      await onTransition(status)
    } catch (failure) {
      setError(messageOf(failure))
    } finally {
      setPending(null)
    }
  }

  return (
    <aside className="panel" aria-label={`Pedido de ${order.cliente}`}>
      <header>
        <h2>{order.cliente}</h2>
        <button type="button" className="ghost" onClick={onClose} aria-label="Fechar">
          ×
        </button>
      </header>
      <dl>
        <dt>Valor</dt>
        <dd>{formatCents(order.valorCentavos)}</dd>
        <dt>Status</dt>
        <dd>
          <StatusBadge status={order.status} />
        </dd>
        <dt>Criado em</dt>
        <dd>{dateTime.format(new Date(order.criadoEm))}</dd>
        <dt>Atualizado em</dt>
        <dd>{dateTime.format(new Date(order.atualizadoEm))}</dd>
      </dl>
      {next.length ? (
        <div className="actions">
          {next.map((status) => (
            <button
              key={status}
              type="button"
              className={status === "cancelado" ? "danger" : undefined}
              disabled={pending !== null}
              onClick={() => change(status)}
            >
              {pending === status ? "Salvando…" : transitionLabels[status]}
            </button>
          ))}
        </div>
      ) : (
        <p className="muted">Este pedido não muda mais de status.</p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </aside>
  )
}

export function App({ api = ordersApi }: { api?: OrdersApi }) {
  const [filter, setFilter] = useState<OrderStatus | null>(null)
  const [search, setSearch] = useState("")
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [summary, setSummary] = useState<StatusSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [list, totals] = await Promise.all([
        api.list(filter ? { status: filter } : {}),
        api.summary(),
      ])
      setOrders(list)
      setSummary(totals)
      setError(null)
    } catch (failure) {
      setError(messageOf(failure))
    }
  }, [api, filter])

  useEffect(() => {
    void load()
  }, [load])

  const selected = orders?.find((order) => order.id === selectedId) ?? null
  const query = search.trim()
  const visibleOrders =
    orders && query ? orders.filter((order) => matchesCliente(order.cliente, query)) : orders

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>Pedidos</h1>
          <p className="muted">Acompanhe os pedidos e avance cada um até a entrega.</p>
        </div>
      </header>

      <section className="summary" aria-label="Resumo por status">
        {orderStatuses.map((status) => {
          const row = summary.find((candidate) => candidate.status === status)
          return (
            <div key={status} className="card">
              <StatusBadge status={status} />
              <strong>{row?.pedidos ?? 0}</strong>
              <span className="muted">{formatCents(row?.valorCentavos ?? 0)}</span>
            </div>
          )
        })}
      </section>

      <NewOrderForm
        onCreate={async (cliente, valorCentavos) => {
          const order = await api.create({ cliente, valorCentavos })
          setSelectedId(order.id)
          await load()
        }}
      />

      <div className="toolbar">
        <nav className="filters" aria-label="Filtrar por status">
          {[null, ...orderStatuses].map((status) => (
            <button
              key={status ?? "todos"}
              type="button"
              aria-pressed={filter === status}
              onClick={() => setFilter(status)}
            >
              {status ? statusLabels[status] : "Todos"}
            </button>
          ))}
        </nav>
        <label className="search">
          Buscar cliente
          <input
            type="search"
            value={search}
            placeholder="Nome do cliente"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="banner">
          {error}
        </p>
      )}

      <main className="content">
        {visibleOrders === null ? (
          <p className="muted">Carregando pedidos…</p>
        ) : visibleOrders.length === 0 && query ? (
          <div className="empty">
            <p className="muted">Nenhum pedido encontrado para “{query}”.</p>
            <button type="button" onClick={() => setSearch("")}>
              Limpar busca
            </button>
          </div>
        ) : visibleOrders.length === 0 ? (
          <p className="muted">Nenhum pedido aqui.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th className="number">Valor</th>
                <th>Status</th>
                <th>Criado em</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((order) => (
                <tr
                  key={order.id}
                  aria-selected={order.id === selectedId}
                  tabIndex={0}
                  onClick={() => setSelectedId(order.id)}
                  onKeyDown={(event) => event.key === "Enter" && setSelectedId(order.id)}
                >
                  <td>{order.cliente}</td>
                  <td className="number">{formatCents(order.valorCentavos)}</td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                  <td>{dateTime.format(new Date(order.criadoEm))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {selected && (
          <OrderPanel
            key={selected.id}
            order={selected}
            onClose={() => setSelectedId(null)}
            onTransition={async (status) => {
              await api.transition(selected.id, status)
              await load()
            }}
          />
        )}
      </main>
    </div>
  )
}
