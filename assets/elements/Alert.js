import { slideUp } from "../lib/dom"

const ICONS = {
    warning: `<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
        <path d="M14.93 13.38L8.43 2.12A.5.5 0 008 1.88a.5.5 0 00-.43.25l-6.5 11.25a.5.5 0 00.43.76h13a.5.5 0 00.43-.76zM7.5 6.5c0-.07.06-.13.13-.13h.75c.06 0 .12.06.12.13v2.88c0 .06-.06.12-.12.12h-.75a.13.13 0 01-.13-.13V6.5zM8 12a.75.75 0 010-1.5.75.75 0 010 1.5z" fill="currentColor"/>
    </svg>`,
    check: `<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 2a10.01 10.01 0 000 20 10.01 10.01 0 000-20zm-2 14.41l-3.71-3.7 1.41-1.42 2.3 2.3 5.3-5.3 1.4 1.42-6.7 6.7z" fill="currentColor"/>
    </svg>`,
    cross: `<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15">
        <path d="M2.64 1.27L7.5 6.13l4.84-4.84A.92.92 0 0113 1a1 1 0 01.93 1.36.9.9 0 01-.2.3L8.84 7.5l4.89 4.89A.9.9 0 0114 13a1 1 0 01-1 1 .92.92 0 01-.69-.27L7.5 8.87l-4.85 4.85A.92.92 0 012 14a1 1 0 01-.93-1.36.9.9 0 01.2-.3L6.16 7.5 1.27 2.61A.9.9 0 011 2a1 1 0 011-1c.24 0 .47.1.64.27z" fill="currentColor"/>
    </svg>`
}

export class Alert extends HTMLElement {

    constructor ({ type, message } = {}) {
        super()
        if (type !== undefined) {
            this.type = type
        }
        if (this.type === 'error' || this.type === null) {
            this.type = 'danger'
        }
        this.message = message
        this.close = this.close.bind(this)
    }

    connectedCallback () {
        this.type = this.type || this.getAttribute('type')
        if (this.type === 'error' || !this.type) {
            this.type = 'danger'
        }
        const text = this.innerHTML
        const duration = this.getAttribute('duration')
        let progressBar = ''
        if (duration !== null) {
            progressBar = `<div class="alert-progress" style="animation-duration: ${duration}s">`
            window.setTimeout(this.close, duration * 1000)
        }
        this.classList.add('alert')
        this.classList.add(`alert-${this.type}`)
        this.innerHTML = `${ICONS[this.icon]}
            <div>
                ${this.message || text}
            </div>
            <button class="alert-close">
                ${ICONS.cross}
            </button>
            ${progressBar}`
        this.querySelector('.alert-close').addEventListener('click', e => {
            e.preventDefault()
            this.close()
        })
    }

    close () {
        this.classList.add('out')
        window.setTimeout(async () => {
            await slideUp(this)
            this.parentElement.removeChild(this)
            this.dispatchEvent(new CustomEvent('close'))
        }, 500)
    }

    get icon () {
        if (this.type === 'danger') {
            return 'warning'
        } else if (this.type === 'success') {
            return 'check'
        }
        return this.type
    }
}

export class FloatingAlert extends Alert {
    constructor (options = {}) {
        super(options)
    }

    connectedCallback () {
        super.connectedCallback()
        this.classList.add('is-floating')
    }

}

/**
 * Affiche un message flash flottant sur la page
 *
 * @param {string} message
 * @param {string} type
 * @param {number|null} duration
 */
export function flash (message, type = 'success', duration = 3) {
    const alert = document.createElement('alert-floating')
    if (duration) {
        alert.setAttribute('duration', duration)
    }
    alert.setAttribute('type', type)
    alert.innerText = message
    document.body.appendChild(alert)
}