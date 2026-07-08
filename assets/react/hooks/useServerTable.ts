import { visit } from "@hotwired/turbo"

export interface ServerMeta {
    total: number
    page: number
    perPage: number
    totalPages: number
    from: number
    to: number
}

export interface ServerTableFilter {
    type: 'text' | 'select' | 'date_range' | 'remote' /*
        - 'date_range' permet de générer 2 params url 'date_from' et 'date_to' pour les filtres de type date
        - 'remote' = autocomplete distant (RemoteCombobox → /search?resource=) au lieu d'une liste figée
    */
    name: string
    label: string
    placeholder?: string
    options?: { label: string; value: string }[]
    /** Pour type 'remote' : ressource du SearchController (ex. 'fournisseurs', 'cars', 'lignes', 'pieces'). */
    resource?: string
    /** Pour type 'remote' : libellé de la valeur déjà sélectionnée (filtre actif), pour l'afficher sans requête. */
    selectedLabel?: string | null
}

export function useServerTable(
    queryParams: Record<string, string>,
    urlPrefix?: string   // ex: 'v' ou 'd'
) {
    const buildUrl = (overrides: Record<string, string | null>) => {
        const url = new URL(window.location.href)
        if(urlPrefix) {
            // Partir des params existants de TOUTE l'URL
            // puis écraser/supprimer uniquement ceux du préfixe
            const merged = { ...queryParams, ...overrides }

            // Supprimer d'abord tous les params du préfixe de l'URL courante
            const keysToDelete: string[] = []
            url.searchParams.forEach((_, key) => {
                if (key.startsWith(`${urlPrefix}[`)) keysToDelete.push(key)
            })
            keysToDelete.forEach(k => url.searchParams.delete(k))

            // Reconstruire manuellement sans encoding des crochets
            const parts: string[] = []
            url.searchParams.forEach((v, k) => {
                parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            })

            Object.entries(merged).forEach(([k, v]) => {
                if (v !== null && v !== '') {
                    parts.push(`${urlPrefix}[${k}]=${encodeURIComponent(v)}`)
                    // ↑ crochets non encodés volontairement
                }
            })

            return `${url.origin}${url.pathname}${parts.length ? '?' + parts.join('&') : ''}`
        }
        const merged = { ...queryParams, ...overrides }
        Object.entries(merged).forEach(([k, v]) => {
            if (v !== null && v !== '') url.searchParams.set(k, v)
            else url.searchParams.delete(k)
        })
        return url.toString()
    }

    const navigate = (overrides: Record<string, string | null>) => {
        // window.location.href = buildUrl(overrides)
        visit(buildUrl(overrides))
    }

    const getSortState = (field: string): 'asc' | 'desc' | false => {
        if (queryParams.sort !== field) return false
        return (queryParams.dir ?? 'asc') as 'asc' | 'desc'
    }

    /** URL de toggle (asc→desc ou desc→asc) pour le bouton principal */
    const getSortToggleUrl = (field: string): string => {
        const current = getSortState(field)
        const newDir = current === 'asc' ? 'desc' : 'asc'
        return buildUrl({ sort: field, dir: newDir, page: '1' })
    }

    /** URL avec direction explicite pour les items Asc / Desc du dropdown */
    const getSortExplicitUrl = (field: string, dir: 'asc' | 'desc'): string => {
        return buildUrl({ sort: field, dir, page: '1' })
    }

    return { navigate, buildUrl, getSortState, getSortToggleUrl, getSortExplicitUrl }
}