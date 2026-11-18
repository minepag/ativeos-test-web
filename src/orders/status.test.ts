import { describe, expect, it } from "vitest"
import { canTransition, formatCents, parseCents } from "./status.ts"

describe("status do pedido", () => {
  it("segue o ciclo da API", () => {
    expect(canTransition("pendente", "pago")).toBe(true)
    expect(canTransition("pago", "pendente")).toBe(false)
    expect(canTransition("entregue", "cancelado")).toBe(false)
  })
})

describe("valores", () => {
  it("lê os formatos brasileiro e com ponto", () => {
    expect(parseCents("12,50")).toBe(1250)
    expect(parseCents("12.50")).toBe(1250)
    expect(parseCents("1.234,56")).toBe(123456)
    expect(parseCents("7")).toBe(700)
  })

  it("recusa o que não é um valor positivo", () => {
    expect(parseCents("")).toBeNull()
    expect(parseCents("0")).toBeNull()
    expect(parseCents("-3")).toBeNull()
    expect(parseCents("1,234")).toBeNull()
    expect(parseCents("abc")).toBeNull()
  })

  it("formata em reais", () => {
    expect(formatCents(123456).replace(/\s/g, " ")).toBe("R$ 1.234,56")
  })
})
