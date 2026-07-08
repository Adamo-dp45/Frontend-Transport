export const initTooltips = () => {
    const tooltip = document.createElement('div')
    tooltip.className = 'tooltip'
    document.body.appendChild(tooltip)

    const showTooltip = (text, anchor, dir = 'right') => {
        const rect = anchor.getBoundingClientRect()
        tooltip.textContent = text
        tooltip.setAttribute('data-dir', dir)

        if (dir === 'right') {
            tooltip.style.top       = rect.top + rect.height / 2 + 'px'
            tooltip.style.left      = rect.right + 12 + 'px'
            tooltip.style.transform = 'translateY(-50%)'
        } else if (dir === 'bottom') {
            tooltip.style.top       = rect.bottom + 10 + 'px'
            tooltip.style.left      = rect.left + rect.width / 2 + 'px'
            tooltip.style.transform = 'translateX(-50%)'
        }

        tooltip.classList.add('visible')
    }

    const hideTooltip = () => tooltip.classList.remove('visible')

    const sidebar = document.getElementById('sidebar')

    document.addEventListener('mouseover', e => {
        const anchor = e.target.closest('[data-tooltip]')
        if (!anchor) return
        if (anchor.closest('.sidebar') && !sidebar?.classList.contains('collapsed')) return

        const dropId = anchor.getAttribute('aria-controls')
        if (dropId && document.getElementById(dropId)?.classList.contains('open')) return

        showTooltip(
            anchor.getAttribute('data-tooltip'),
            anchor,
            anchor.getAttribute('data-tooltip-dir') || 'right'
        )
    })

    document.addEventListener('mouseout', e => {
        if (e.target.closest('[data-tooltip]')) hideTooltip()
    })

    document.addEventListener('click', e => {
        if (e.target.closest('[data-tooltip]')) hideTooltip()
    })
}
