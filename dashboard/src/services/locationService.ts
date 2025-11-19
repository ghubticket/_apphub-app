// Simple public endpoints for Brazil states and cities using BrasilAPI

export type UF = {
  nome: string
  sigla: string
}

export type City = {
  nome: string
}

const BRASIL_API_BASE = 'https://brasilapi.com.br/api'

export const locationService = {
  async getStates(): Promise<UF[]> {
    const res = await fetch(`${BRASIL_API_BASE}/ibge/uf/v1`, { cache: 'no-store' })

    if (!res.ok) throw new Error('Falha ao carregar estados')
    const data = await res.json()


    // Normalize to { nome, sigla }
    return (data || []).map((uf: any) => ({ nome: uf.nome, sigla: uf.sigla }))
  },

  async getCitiesByUF(uf: string): Promise<City[]> {
    if (!uf) return []
    const res = await fetch(`${BRASIL_API_BASE}/ibge/municipios/v1/${uf}`, { cache: 'no-store' })

    if (!res.ok) throw new Error('Falha ao carregar cidades')
    const data = await res.json()

    
return (data || []).map((c: any) => ({ nome: c.nome }))
  }
}


