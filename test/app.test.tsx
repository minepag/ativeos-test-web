import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { App } from "../src/App.tsx"
import { createHttpOrdersApi, createMemoryOrdersApi } from "../src/api/orders.ts"

const renderApp = () => {
  const user = userEvent.setup()
  render(<App api={createMemoryOrdersApi()} />)
  return user
}

const rows = () => screen.getAllByRole("row").slice(1)

describe("painel de pedidos", () => {
  it("lista os pedidos, do mais novo ao mais antigo, com o resumo por status", async () => {
    renderApp()
    expect(await screen.findByText("Fábio Nunes")).toBeInTheDocument()
    expect(rows()).toHaveLength(6)
    expect(rows()[0]).toHaveTextContent("Fábio Nunes")
    const summary = screen.getByRole("region", { name: "Resumo por status" })
    expect(within(summary).getAllByText("2")).toHaveLength(1)
  })

  it("filtra por status", async () => {
    const user = renderApp()
    await screen.findByText("Fábio Nunes")
    await user.click(
      within(screen.getByRole("navigation", { name: "Filtrar por status" })).getByRole("button", {
        name: "Pago",
      }),
    )
    expect(await screen.findByText("Bruno Lima")).toBeInTheDocument()
    expect(rows()).toHaveLength(1)
  })

  it("cria um pedido pendente e valida o formulário", async () => {
    const user = renderApp()
    await screen.findByText("Fábio Nunes")
    const form = screen.getByRole("form", { name: "Novo pedido" })
    await user.click(within(form).getByRole("button", { name: "Criar pedido" }))
    expect(within(form).getByRole("alert")).toHaveTextContent("Informe o cliente.")

    await user.type(within(form).getByLabelText("Cliente"), "Gabi Torres")
    await user.type(within(form).getByLabelText("Valor (R$)"), "0")
    await user.click(within(form).getByRole("button", { name: "Criar pedido" }))
    expect(within(form).getByRole("alert")).toHaveTextContent("maior que zero")

    await user.clear(within(form).getByLabelText("Valor (R$)"))
    await user.type(within(form).getByLabelText("Valor (R$)"), "99,90")
    await user.click(within(form).getByRole("button", { name: "Criar pedido" }))
    const panel = await screen.findByRole("complementary", { name: "Pedido de Gabi Torres" })
    expect(within(panel).getByText("Pendente")).toBeInTheDocument()
    expect(within(panel).getByText(/99,90/)).toBeInTheDocument()
    expect(rows()).toHaveLength(7)
  })

  it("avança o status só pelas transições permitidas", async () => {
    const user = renderApp()
    await user.click(await screen.findByText("Bruno Lima"))
    const panel = screen.getByRole("complementary", { name: "Pedido de Bruno Lima" })
    expect(within(panel).queryByRole("button", { name: "Voltar para pendente" })).toBeNull()
    await user.click(within(panel).getByRole("button", { name: "Marcar como enviado" }))
    expect(await within(panel).findByRole("button", { name: "Confirmar entrega" })).toBeVisible()
    await user.click(within(panel).getByRole("button", { name: "Confirmar entrega" }))
    expect(await within(panel).findByText("Este pedido não muda mais de status.")).toBeVisible()
  })
})

describe("API HTTP", () => {
  it("usa as rotas da API de testes e mostra o erro dela", async () => {
    const calls: { url: string; method: string; body?: string }[] = []
    const api = createHttpOrdersApi("http://api.test/", async (input, init) => {
      calls.push({ url: String(input), method: init?.method ?? "GET", body: init?.body as string })
      if (String(input).endsWith("/status"))
        return Response.json({ erro: "Transição inválida: entregue → pago" }, { status: 409 })
      return Response.json([])
    })
    await api.list({ status: "pago" })
    await expect(api.transition("abc", "pago")).rejects.toThrow("Transição inválida")
    expect(calls).toEqual([
      { url: "http://api.test/pedidos?limite=50&status=pago", method: "GET", body: undefined },
      {
        url: "http://api.test/pedidos/abc/status",
        method: "PATCH",
        body: JSON.stringify({ status: "pago" }),
      },
    ])
  })
})
