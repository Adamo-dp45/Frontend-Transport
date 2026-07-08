export function formatDate(d: string | null): string {
    if(d == null) {
        return ''
    }
    return new Date(d).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    })
}
