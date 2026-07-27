// Centre de notifications (cloche du header) — JavaScript vanilla, pattern maison initNotifications().
// Consomme les endpoints FT (mêmes-origines, cookie de session) :
//   GET  /alertes/resume    → badge (total + ventilations)
//   GET  /alertes/recentes  → contenu du dropdown (alertes ACTIVE récentes, ordre décidé par le serveur)
//   POST /alertes/{id}/lire → acquitter une alerte
//   POST /alertes/lire-tout → tout acquitter
// L'ordonnancement et le ciblage (audience) sont côté backend ; ici on ne fait qu'afficher.

const POLL_MS = 60000

// Timer au niveau module : 'turbo:load' rejoue initNotifications à chaque navigation (le <body> est
// recréé) — on doit donc purger l'intervalle précédent pour ne pas les empiler.
let pollTimer = null

const SEVERITE_META = {
    CRITIQUE: { label: 'Critique', cls: 'crit' },
    AVERTISSEMENT: { label: 'Avertissement', cls: 'warn' },
    INFO: { label: 'Info', cls: 'info' },
}

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
))

const timeAgo = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const s = Math.floor((Date.now() - d.getTime()) / 1000)
    if (s < 60) return "à l'instant"
    const m = Math.floor(s / 60)
    if (m < 60) return `il y a ${m} min`
    const h = Math.floor(m / 60)
    if (h < 24) return `il y a ${h} h`
    return `il y a ${Math.floor(h / 24)} j`
}

export const initNotifications = () => {
    const anchor = document.getElementById('notifAnchor')
    if (!anchor) return

    const btn = document.getElementById('notifBtn')
    const drop = document.getElementById('notifDrop')
    const countEl = document.getElementById('notifCount')
    const subtitleEl = document.getElementById('notifSubtitle')
    const listEl = document.getElementById('notifList')
    const markAllBtn = document.getElementById('markAllReadBtn')

    const urls = {
        resume: anchor.dataset.resumeUrl,
        recentes: anchor.dataset.recentesUrl,
        lireTout: anchor.dataset.lireToutUrl,
        base: anchor.dataset.lireUrlBase, // ex. /alertes → /alertes/{id}/lire
    }

    const refreshBadge = async () => {
        try {
            const res = await fetch(urls.resume, { headers: { Accept: 'application/json' } })
            if (!res.ok) return
            const data = await res.json()
            const total = data.total || 0
            if (total > 0) {
                countEl.textContent = total > 99 ? '99+' : String(total)
                countEl.hidden = false
            } else {
                countEl.hidden = true
            }
        } catch (_) { /* silencieux : la cloche ne doit jamais casser la page */ }
    }

    const renderList = (items) => {
        if (!items || items.length === 0) {
            listEl.innerHTML = '<div class="notif-empty">Aucune alerte active 🎉</div>'
            subtitleEl.textContent = 'Aucune alerte active'
            return
        }
        subtitleEl.textContent = `${items.length} alerte(s) active(s)`
        listEl.innerHTML = items.map((a) => {
            const meta = SEVERITE_META[a.severite] || SEVERITE_META.INFO
            const href = a.sourceUrl ? ` data-href="${escapeHtml(a.sourceUrl)}"` : ''
            return `
                <div class="notif-item unread" data-id="${a.id}"${href} role="button" tabindex="0">
                    <div class="notif-dot-item unread notif-sev-${meta.cls}"></div>
                    <div class="notif-body">
                        <div class="notif-text"><strong>${escapeHtml(a.titre)}</strong> — ${escapeHtml(a.message)}</div>
                        <div class="notif-time-label">${escapeHtml(meta.label)} · ${escapeHtml(timeAgo(a.createdAt))}</div>
                    </div>
                </div>`
        }).join('')
    }

    const loadList = async () => {
        try {
            const res = await fetch(urls.recentes, { headers: { Accept: 'application/json' } })
            if (!res.ok) return
            const data = await res.json()
            renderList(data.items || [])
        } catch (_) {
            listEl.innerHTML = '<div class="notif-empty">Impossible de charger les alertes.</div>'
        }
    }

    const markRead = async (id) => {
        try {
            await fetch(`${urls.base}/${id}/lire`, { method: 'POST', headers: { Accept: 'application/json' } })
        } catch (_) { /* silencieux */ }
    }

    btn?.addEventListener('click', (e) => {
        e.stopPropagation()
        const wasOpen = drop.classList.contains('open')
        document.querySelectorAll('.dropdown.open').forEach((d) => d.classList.remove('open'))
        if (!wasOpen) {
            drop.classList.add('open')
            loadList()
        }
    })

    // Clic sur une alerte : on l'acquitte, puis on ouvre la fiche source si elle existe.
    listEl?.addEventListener('click', async (e) => {
        const item = e.target.closest('.notif-item')
        if (!item) return
        await markRead(item.dataset.id)
        item.classList.remove('unread')
        refreshBadge()
        if (item.dataset.href) window.location.href = item.dataset.href
    })

    markAllBtn?.addEventListener('click', async (e) => {
        e.stopPropagation()
        try {
            await fetch(urls.lireTout, { method: 'POST', headers: { Accept: 'application/json' } })
        } catch (_) { /* silencieux */ }
        listEl.querySelectorAll('.notif-item.unread').forEach((el) => el.classList.remove('unread'))
        refreshBadge()
        loadList()
    })

    // Chargement initial + polling léger (badge seulement ; la liste se charge à l'ouverture).
    refreshBadge()
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = setInterval(refreshBadge, POLL_MS)
}
