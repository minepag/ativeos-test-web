// Lowercase and without accents, so "fabio" finds "Fábio Nunes".
export const normalizeSearch = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()

export const matchesCliente = (cliente: string, query: string) =>
  normalizeSearch(cliente).includes(normalizeSearch(query))
