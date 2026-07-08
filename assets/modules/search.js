export const initSearch = () => {
    const searchInput = document.getElementById('searchInput')
    if(!searchInput) return
    const onSearchKeydown = e => {
        if((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault()
            searchInput.focus()
        }
    }
    const onSearchFocus = e => e.target.select()
    document.addEventListener('keydown', onSearchKeydown)
    searchInput.addEventListener('focus', onSearchFocus)
}