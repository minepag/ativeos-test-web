import { describe, expect, it } from "vitest"
import { matchesCliente } from "./search.ts"

describe("busca por cliente", () => {
  it("ignora maiúsculas, minúsculas e acentos", () => {
    expect(matchesCliente("Fábio Nunes", "fabio")).toBe(true)
    expect(matchesCliente("Fabio Nunes", "FÁBIO")).toBe(true)
    expect(matchesCliente("João Conceição", "conceicao")).toBe(true)
  })

  it("procura em qualquer parte do nome e aceita busca vazia", () => {
    expect(matchesCliente("Ana Souza", "souz")).toBe(true)
    expect(matchesCliente("Ana Souza", "  ")).toBe(true)
    expect(matchesCliente("Ana Souza", "bruno")).toBe(false)
  })
})
