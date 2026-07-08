import { registerReactControllerComponents } from '@symfony/ux-react'
import './stimulus_bootstrap.js'
import './styles/app.css'
import { Alert, FloatingAlert } from './elements/Alert.js'
import { createChart, randomColor } from './lib/dom.js'
import { initTheme } from './modules/theme.js'
import { initDropdowns } from './modules/dropdown.js'
import { initSidebar } from './modules/sidebar.js'
import { initTooltips } from './modules/tooltip.js'
import { initRemoteSelects, initRemoteSelect } from './modules/tom-select-remote.js'
import { initSearch } from './modules/search.js'

// Exposés en global pour les scripts inline (ex. lignes de pièces AJOUTÉES dynamiquement dans
// les formulaires appro/dépannage → il faut initialiser tom-select sur le nouveau select).
window.initRemoteSelects = initRemoteSelects
window.initRemoteSelect = initRemoteSelect

registerReactControllerComponents(require.context('./react/controllers', true, /\.(j|t)sx?$/))

const define = (name, cls) => {
    if(!customElements.get(name)) {
        customElements.define(name, cls)
    } 
} /*
    if(!customElements.get('alert-message')) {
        customElements.define('alert-message', AlertMessage);
    }
*/
define('alert-message', Alert)
define('alert-floating', FloatingAlert)

document.addEventListener('turbo:before-render', (event) => {
    if(!document.startViewTransition) { /*
            - L'api 'ViewTransition'
        */
        return
    }
    event.preventDefault()
    document.startViewTransition(() => event.detail.resume())
})

document.addEventListener('turbo:load', () => {
    initTheme()
    initDropdowns()
    initSidebar()
    initTooltips()
    initRemoteSelects()
    initSearch()
    /*
        (() => {
            const badge     = document.getElementById('notifCount');
            const notifList = document.getElementById('notifList');
            if (!badge || !notifList) return;

            const updateNotifCount = () => {
            const unread        = document.querySelectorAll('.notif-item.unread').length;
            badge.textContent   = unread;
            badge.style.display = unread > 0 ? 'flex' : 'none';
            };

            const markRead = item => {
            item.classList.remove('unread');
            item.querySelector('.notif-dot-item')?.classList.replace('unread', 'read');
            updateNotifCount();
            };

            const markAllRead = () => {
            document.querySelectorAll('.notif-item.unread').forEach(markRead);
            const sub = document.querySelector('#notifDrop .dropdown-subtitle');
            if (sub) sub.textContent = 'No unread messages';
            };

            const onNotifListClick = e => {
            const item = e.target.closest('.notif-item');
            if (item) markRead(item);
            };

            const onMarkAllReadClick = e => {
            e.stopPropagation();
            markAllRead();
            };

            notifList.addEventListener('click', onNotifListClick);
            document.getElementById('markAllReadBtn')?.addEventListener('click', onMarkAllReadClick);
            document.getElementById('viewAllNotifBtn')?.addEventListener('click', closeAllDropdowns);
        })()
    */

    /* Statistiques
     */

    // -- Les voyage par période -- //
    const periodeCtx = document.getElementById('chartVoyagesPeriode')
    if(periodeCtx) {
        const dataPeriode = JSON.parse(periodeCtx.dataset.values)
        createChart({
            element: periodeCtx,
            type: 'bar',
            labels: dataPeriode.map(v => v.label),
            datasets: [
                {
                    label: 'Voyages',
                    data: dataPeriode.map(v => v.total),
                    borderRadius: 4
                }
            ],
            options: {
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                        grid: { color: 'rgba(0,0,0,0.05)' },
                    },
                    x: { grid: { display: false } },
                }
            }
        })
    }
    // -- Les voyages par statut -- //
    const statusVoyages = document.getElementById('chartStatuts')
    if(statusVoyages) {
        const dataVoyage = JSON.parse(statusVoyages.dataset.values)
        const statutLabels = { TERMINE: 'Terminé', EN_COURS: 'En cours', PLANIFIE: 'Planifié' }
        createChart({
            element: statusVoyages,
            type: 'doughnut',
            labels: dataVoyage.map(s => statutLabels[s.statut] ?? s.statut),
            datasets: [
                {
                    data: dataVoyage.map(s => s.total), /*
                        - 'Object.values' pour convertir un objet en tableau
                    */
                    // color: randomColor(3),
                    borderRadius: 4
                }
            ],
            options: {
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: 12, padding: 12 },
                    },
                }
            }
        })
    }
    // -- Le taux de remplissage par voyage -- //
    const tauxCtx = document.getElementById('chartTauxVoyages')
    if(tauxCtx) {
        const dataTaux = JSON.parse(tauxCtx.dataset.values)
        createChart({
            element: tauxCtx,
            type: 'line',
            labels: dataTaux.map(v => v.label),
            datasets: [
                {
                    label: 'Taux (%)',
                    data: dataTaux.map(v => v.taux),
                    color: randomColor(3),
                    borderColor: '#639922',
                    backgroundColor: 'rgba(99,153,34,0.1)',
                    borderWidth: 2,
                    pointRadius: 3,
                    fill: true,
                    tension: 0.3
                }
            ],
            options: {
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { callback: v => v + '%' },
                        grid: { color: 'rgba(0,0,0,0.05)' },
                    },
                    x: {
                        grid: { display: false },
                        ticks: { maxRotation: 45 },
                    },
                }
            }
        })
    }
    // -- Les recettes par jour -- //
    const chartRecettes = document.getElementById('chartRecettes')
    if(chartRecettes) {
        const data = JSON.parse(chartRecettes.dataset.values)
        createChart({
            element: chartRecettes,
            type: 'bar',
            labels: data.map(r => r.label),
            datasets: [
                {
                    label: 'Recettes',
                    data: data.map(r => r.montant),
                    color: ['rgba(99,153,34,0.2)'],
                    borderRadius: 4
                }
            ],
            options: {
                plugins: {
                    legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() } },
                    x: { grid: { display: false } }
                }
            }
        })
    }
    // -- Les coûts par jour -- //
    const chartCouts = document.getElementById('chartCouts')
    if(chartCouts) {
        const data = JSON.parse(chartCouts.dataset.values)
        createChart({
            element: chartCouts,
            type: 'bar',
            labels: data.map(c => c.label),
            datasets: [
                {
                    label: 'Dépannages',
                    data: data.map(c => c.depannage),
                    borderWidth: 1.5,
                    borderRadius: 4,
                },
                {
                    label: 'Approvisionnements',
                    data: data.map(c => c.approvisionnement),
                    borderWidth: 1.5,
                    borderRadius: 4,
                }
            ],
            options: {
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
                },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() } },
                    x: { grid: { display: false } }
                }
            }
        })
    }
    // ----- //
    const chartStockPieces = document.getElementById('chartStockPieces')
    if(chartStockPieces) {
        const data = JSON.parse(chartStockPieces.dataset.values)
        createChart({
            element: chartStockPieces,
            type: 'bar',
            labels: data.map(c => c.libelle),
            datasets: [
                {
                    label: 'Stock actuel',
                    data: data.map(p => p.stockactuel),
                    colors: data.map(p => p.critique ? 'rgba(226,75,74,0.2)' : 'rgba(55,138,221,0.2)'),
                    borderColor: data.map(p => p.critique ? '#E24B4A' : '#378ADD'),
                    borderWidth: 1.5,
                    borderRadius: 4,
                },
                {
                    label: 'Seuil',
                    data: data.map(p => p.seuilstock),
                    colors: ['rgba(186,117,23,0.0)'],
                    borderColor: '#BA7517',
                    borderWidth: 1.5,
                    borderDash: [4, 4],
                    type: 'line',
                    pointRadius: 0,
                }
            ],
            options: {
                indexAxis: 'y',
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
                },
                scales: {
                    x: { beginAtZero: true },
                    y: { grid: { display: false } },
                }
            }
        })
    }

    const chartStockConso = document.getElementById('chartStockConso')
    if (chartStockConso) {
        const data = JSON.parse(chartStockConso.dataset.values)
        createChart({
            element: chartStockConso,
            type: 'bar',
            labels: data.map(p => p.libelle),
            datasets: [{ label: 'Quantité', data: data.map(p => p.quantite), backgroundColor: 'rgba(186,117,23,0.75)', borderRadius: 4 }],
            options: {
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { afterLabel: ctx => `${data[ctx.dataIndex].cout.toLocaleString()} FCFA` } },
                },
                scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { grid: { display: false } } },
            },
        })
    }

    const chartStockAchats = document.getElementById('chartStockAchats')
    if (chartStockAchats) {
        const data = JSON.parse(chartStockAchats.dataset.values)
        createChart({
            element: chartStockAchats,
            type: 'bar',
            labels: data.map(f => f.libelle),
            datasets: [{ label: 'Achats', data: data.map(f => f.montant), backgroundColor: 'rgba(29,158,117,0.75)', borderRadius: 4 }],
            options: {
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => `${ctx.parsed.x.toLocaleString()} FCFA`, afterLabel: ctx => `${data[ctx.dataIndex].nbAppros} appro(s)` } },
                },
                scales: { x: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() } }, y: { grid: { display: false } } },
            },
        })
    }

    const chartStockNiveau = document.getElementById('chartStockNiveau')
    if (chartStockNiveau) {
        const data = JSON.parse(chartStockNiveau.dataset.values)
        createChart({
            element: chartStockNiveau,
            type: 'bar',
            labels: data.map(p => p.libelle),
            datasets: [
                { label: 'Stock', data: data.map(p => p.stockactuel), backgroundColor: data.map(p => p.critique ? 'rgba(226,75,74,0.8)' : 'rgba(55,138,221,0.8)'), borderRadius: 4 },
                { label: 'Seuil', data: data.map(p => p.seuilstock), type: 'line', borderColor: '#BA7517', borderWidth: 1.5, borderDash: [4, 4], pointRadius: 0 },
            ],
            options: {
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } },
            },
        })
    }
    // -- Les véhicules par état -- //
    const chartVehiculesEtat = document.getElementById('chartVehiculesEtat')
    if(chartVehiculesEtat) {
        const data = JSON.parse(chartVehiculesEtat.dataset.values)
        createChart({
            element: chartVehiculesEtat,
            type: 'doughnut',
            labels: data.map(v => v.etat),
            datasets: [
                {
                    data: data.map(v => v.total),
                    borderWidth: 0,
                    hoverOffset: 6,
                }
            ],
            options: {
                cutout: '65%',
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
                }
            }
        })
    }
    // -- Les véhicules les plus en panne -- //
    const chartVehiculesDepannage = document.getElementById('chartVehiculesDepannage')
    if(chartVehiculesDepannage) {
        const data = JSON.parse(chartVehiculesDepannage.dataset.values)
        createChart({
            element: chartVehiculesDepannage,
            type: 'bar',
            labels: data.map(v => v.matricule),
            datasets: [
                {
                    data: data.map(v => v.nbrdepannages),
                    color: ['rgba(226,75,74,0.2)'],
                    borderColor: '#E24B4A',
                    borderWidth: 1.5,
                    borderRadius: 4
                }
            ],
            options: {
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, ticks: { stepSize: 1 } },
                    y: { grid: { display: false } },
                }
            }
        })
    }
    // -- Les coût maintenance par véhicule -- //
    const chartCoutMaintenance = document.getElementById('chartCoutMaintenance')
    if(chartCoutMaintenance) {
        const data = JSON.parse(chartCoutMaintenance.dataset.values)
        createChart({
            element: chartCoutMaintenance,
            type: 'bar',
            labels: data.map(v => v.matricule),
            datasets: [
                {
                    data: data.map(v => v.couttotal),
                    // borderColor: '#BA7517',
                    borderWidth: 1.5,
                    borderRadius: 4
                }
            ],
            options: {
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() + ' FCFA' } }, /*
                        - Pour indiquer l'unité
                    */
                    y: { grid: { display: false } },
                }
            }
        })
    }

    /* Statistiques propriétaire
     */

    // -- Les recettes par jour -- //
    const chartBilleterieParJour = document.getElementById('chartBilleterieParJour')
    if(chartBilleterieParJour) {
        const data = JSON.parse(chartBilleterieParJour.dataset.values)
        createChart({
            element: chartBilleterieParJour,
            type: 'bar',
            labels: data.map(c => c.label),
            datasets: [
                {
                    label: 'Recettes (FCFA)',
                    data: data.map(r => r.montant),
                    colors: ['rgba(99,153,34,0.2)'],
                    borderColor: '#639922',
                    borderWidth: 1.5,
                    borderRadius: 4,
                    yAxisID: 'y'
                },
                {
                    label: 'Tickets',
                    data: data.map(r => r.nbtickets),
                    colors: ['rgba(55,138,221,0.2)'],
                    borderColor: '#378ADD',
                    borderWidth: 1.5,
                    borderRadius: 4,
                    yAxisID: 'y1'
                }
            ],
            options: {
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        ticks: { callback: v => v.toLocaleString() + ' FCFA' },
                        grid: { color: 'rgba(0,0,0,0.05)' },
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        ticks: { stepSize: 1 },
                        grid: { display: false },
                    },
                    x: { grid: { display: false } },
                }
            }
        })
    }
    // -- Les recettes par trajet -- //
    const chartBilleterieParTrajet = document.getElementById('chartBilleterieParTrajet')
    if (chartBilleterieParTrajet) {
        const data = JSON.parse(chartBilleterieParTrajet.dataset.values)
        createChart({
            element: chartBilleterieParTrajet,
            type: 'bar',
            labels: data.map(r => r.trajet),
            datasets: [
                {
                    data: data.map(r => r.montant),
                    color: ['rgba(55,138,221,0.2)'],
                    borderColor: '#378ADD',
                    borderWidth: 1.5,
                    borderRadius: 4
                }
            ],
            options: {
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            afterLabel: ctx => `${data[ctx.dataIndex].nbtickets} ticket(s)`,
                        },
                    },
                },
                scales: {
                    x: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() + ' FCFA' } },
                    y: { grid: { display: false } },
                }
            }
        })
    }
    // -- Les recettes par car -- //
    const chartBilleterieParCar = document.getElementById('chartBilleterieParCar')
    if(chartBilleterieParCar) {
        const data = JSON.parse(chartBilleterieParCar.dataset.values)
        createChart({
            element: chartBilleterieParCar,
            type: 'bar',
            labels: data.map(r => r.matricule),
            datasets: [
                {
                    data: data.map(r => r.montant),
                    color: ['rgba(186,117,23,0.2)'],
                    borderColor: '#BA7517',
                    borderWidth: 1.5,
                    borderRadius: 4
                }
            ],
            options: {
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            afterLabel: ctx => `${data[ctx.dataIndex].nbtickets} ticket(s)`,
                        },
                    },
                },
                scales: {
                    x: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() + ' FCFA' } },
                    y: { grid: { display: false } },
                }
            }
        })
    }
    // -- Agent -- //
    const chartAgentsRecette = document.getElementById('chartAgentsRecette')
    if(chartAgentsRecette) {
        const data = JSON.parse(chartAgentsRecette.dataset.values)
        createChart({
            element: chartAgentsRecette,
            type: 'bar',
            labels: data.map(a => a.label),
            datasets: [
                {
                    data: data.map(a => a.recette),
                    color: data.map(a => a.actif ? 'rgba(99,153,34,0.2)' : 'rgba(136,135,128,0.2)'),
                    borderColor: data.map(a => a.actif ? '#639922' : '#888780'),
                    borderWidth: 1.5,
                    borderRadius: 4
                }
            ],
            options: {
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            afterLabel: ctx => `${data[ctx.dataIndex].nbtickets} ticket(s)`,
                        },
                    },
                },
                scales: {
                    x: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() + ' FCFA' } },
                    y: { grid: { display: false } },
                }
            }
        })
    }
    // -- Personnel -- //
    const chartPersonnelAffectations = document.getElementById('chartPersonnelAffectations')
    if(chartPersonnelAffectations) {
        const data = JSON.parse(chartPersonnelAffectations.dataset.values)
        createChart({
            element: chartPersonnelAffectations,
            type: 'bar',
            labels: data.map(c => c.label),
            datasets: [
                {
                    label: 'Voyages',
                    data: data.map(p => p.nbvoyages),
                    colors: ['rgba(55,138,221,0.2)'],
                    borderColor: '#378ADD',
                    borderWidth: 1.5,
                    borderRadius: 4,
                },
                {
                    label: 'Dépannages',
                    data: data.map(p => p.nbdepannages),
                    colors: ['rgba(226,75,74,0.2)'],
                    borderColor: '#E24B4A',
                    borderWidth: 1.5,
                    borderRadius: 4,
                }
            ],
            options: {
                indexAxis: 'y',
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
                },
                scales: {
                    x: { beginAtZero: true, ticks: { stepSize: 1 } },
                    y: { grid: { display: false } },
                }
            }
        })
    }
    // -- FlotteActivity -- //
    const chartFlotteActivite = document.getElementById('chartFlotteActivite')
    if (chartFlotteActivite) {
        const data = JSON.parse(chartFlotteActivite.dataset.values)
        createChart({
            element: chartFlotteActivite,
            type: 'bar',
            labels: data.map(c => c.matricule),
            datasets: [
                {
                    label: 'Voyages',
                    data: data.map(v => v.nbvoyages),
                    colors: ['rgba(55,138,221,0.2)'],
                    borderColor: '#378ADD',
                    borderWidth: 1.5,
                    borderRadius: 4,
                },
                {
                    label: 'Dépannages',
                    data: data.map(v => v.nbdepannages),
                    colors: ['rgba(226,75,74,0.2)'],
                    borderColor: '#E24B4A',
                    borderWidth: 1.5,
                    borderRadius: 4,
                }
            ],
            options: {
                indexAxis: 'y',
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
                },
                scales: {
                    x: { beginAtZero: true, ticks: { stepSize: 1 } },
                    y: { grid: { display: false } },
                }
            }
        })
    }

    const chartFlotteDispo = document.getElementById('chartFlotteDispo')
    if (chartFlotteDispo) {
        const data = JSON.parse(chartFlotteDispo.dataset.values)
        createChart({
            element: chartFlotteDispo,
            type: 'doughnut',
            labels: data.map(e => e.etat),
            datasets: [{
                data: data.map(e => e.nb),
                backgroundColor: ['#1a6b2f', '#378ADD', '#E24B4A', '#BA7517'],
                borderWidth: 0,
                hoverOffset: 6,
            }],
            options: {
                cutout: '65%',
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } } },
            },
        })
    }

    const chartFlottePannes = document.getElementById('chartFlottePannes')
    if (chartFlottePannes) {
        const data = JSON.parse(chartFlottePannes.dataset.values)
        createChart({
            element: chartFlottePannes,
            type: 'bar',
            labels: data.map(t => t.type),
            datasets: [{
                label: 'Pannes',
                data: data.map(t => t.nb),
                backgroundColor: 'rgba(226,75,74,0.75)',
                borderRadius: 4,
            }],
            options: {
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { afterLabel: ctx => `${data[ctx.dataIndex].cout.toLocaleString()} FCFA` } },
                },
                scales: {
                    x: { beginAtZero: true, ticks: { stepSize: 1 } },
                    y: { grid: { display: false } },
                },
            },
        })
    }
    // -- Trajet performance -- //
    const chartTrajetsRecette = document.getElementById('chartTrajetsRecette')
    if(chartTrajetsRecette) {
        const data = JSON.parse(chartTrajetsRecette.dataset.values)
        createChart({
            element: chartTrajetsRecette,
            type: 'bar',
            labels: data.map(t => t.label),
            datasets: [
                {
                    data: data.map(t => t.recette),
                    color: data.map(t => t.nbvoyages > 0 ? 'rgba(99,153,34,0.2)' : 'rgba(136,135,128,0.2)'),
                    borderColor: data.map(t => t.nbvoyages > 0 ? '#639922' : '#888780'),
                    borderWidth: 1.5,
                    borderRadius: 4
                }
            ],
            options: {
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            afterLabel: ctx => [
                                `${data[ctx.dataIndex].nbvoyages} voyage(s)`,
                                `${data[ctx.dataIndex].nbtickets} ticket(s)`,
                            ],
                        },
                    },
                },
                scales: {
                    x: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() + ' FCFA' } },
                    y: { grid: { display: false } },
                }
            }
        })
    }

    /* Courrier
     */
    const chartCourrierStatuts = document.getElementById('chartCourrierStatuts')
    if(chartCourrierStatuts) {
        const data = JSON.parse(chartCourrierStatuts.dataset.values)
        createChart({
            element: chartCourrierStatuts,
            type: 'doughnut',
            labels: data.map(s => s.statut),
            datasets: [{
                data: data.map(s => s.total),
                backgroundColor: ['#BA7517', '#378ADD', '#639922', '#1a6b2f', '#E24B4A', '#888780'],
                borderWidth: 0,
                hoverOffset: 6,
            }],
            options: {
                cutout: '65%',
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } } },
            },
        })
    }
    // -- Les recettes par jour -- //
    const chartCourrierParJour = document.getElementById('chartCourrierParJour')
    if(chartCourrierParJour) {
        const data = JSON.parse(chartCourrierParJour.dataset.values)
        createChart({
            element: chartCourrierParJour,
            type: 'bar',
            labels: data.map(r => r.label),
            datasets: [{
                data: data.map(r => r.montant),
                backgroundColor: 'rgba(55,138,221,0.2)',
                borderColor: '#378ADD',
                borderWidth: 1.5,
                borderRadius: 4,
            }],
            options: {
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            afterLabel: ctx => `${data[ctx.dataIndex].nbcourriers} courrier(s)`,
                        },
                    },
                },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() + ' FCFA' } },
                    x: { grid: { display: false } },
                },
            },
        })
    }
    // -- Les recettes par trajet -- //
    const chartCourrierParTrajet = document.getElementById('chartCourrierParTrajet')
    if(chartCourrierParTrajet) {
        const data = JSON.parse(chartCourrierParTrajet.dataset.values)
        createChart({
            element: chartCourrierParTrajet,
            type: 'bar',
            labels: data.map(r => r.trajet),
            datasets: [{
                data: data.map(r => r.montant),
                backgroundColor: 'rgba(99,153,34,0.2)',
                borderColor: '#639922',
                borderWidth: 1.5,
                borderRadius: 4,
            }],
            options: {
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            afterLabel: ctx => `${data[ctx.dataIndex].nbcourriers} courrier(s)`,
                        },
                    },
                },
                scales: {
                    x: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() + ' FCFA' } },
                    y: { grid: { display: false } },
                },
            },
        })
    }

    const chartCourrierTranches = document.getElementById('chartCourrierTranches')
    if(chartCourrierTranches) {
        const data = JSON.parse(chartCourrierTranches.dataset.values)
        createChart({
            element: chartCourrierTranches,
            type: 'bar',
            labels: data.map(t => t.libelle),
            datasets: [{
                label: 'Colis',
                data: data.map(t => t.nb),
                backgroundColor: 'rgba(55,138,221,0.75)',
                borderRadius: 4,
            }],
            options: {
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            afterLabel: ctx => `${data[ctx.dataIndex].recette.toLocaleString()} FCFA`,
                        },
                    },
                },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                    x: { grid: { display: false } },
                },
            },
        })
    }

    /* Bagage
     */
    const chartBagageStatuts = document.getElementById('chartBagageStatuts')
    if(chartBagageStatuts) {
        const data = JSON.parse(chartBagageStatuts.dataset.values)
        createChart({
            element: chartBagageStatuts,
            type: 'doughnut',
            labels: data.map(s => s.statut),
            datasets: [{
                data: data.map(s => s.total),
                backgroundColor: ['#BA7517', '#378ADD', '#639922', '#E24B4A', '#888780'],
                borderWidth: 0,
                hoverOffset: 6,
            }],
            options: {
                cutout: '65%',
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } } },
            },
        })
    }
    // -- Les recettes par jour -- //
    const chartBagageParJour = document.getElementById('chartBagageParJour')
    if(chartBagageParJour) {
        const data = JSON.parse(chartBagageParJour.dataset.values)
        createChart({
            element: chartBagageParJour,
            type: 'bar',
            labels: data.map(r => r.label),
            datasets: [{
                data: data.map(r => r.montant),
                backgroundColor: 'rgba(186,117,23,0.2)',
                borderColor: '#BA7517',
                borderWidth: 1.5,
                borderRadius: 4,
            }],
            options: {
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            afterLabel: ctx => [
                                `${data[ctx.dataIndex].nbbagages} bagage(s)`,
                                `${data[ctx.dataIndex].poids} kg`,
                            ],
                        },
                    },
                },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() + ' FCFA' } },
                    x: { grid: { display: false } },
                },
            },
        })
    }

    /* Tableau de bord de gare — répartition de l'activité (billets/courriers/bagages) */
    const chartGareActivite = document.getElementById('chartGareActivite')
    if (chartGareActivite) {
        const data = JSON.parse(chartGareActivite.dataset.values)
        createChart({
            element: chartGareActivite,
            type: 'doughnut',
            labels: data.map(d => d.label),
            datasets: [{
                data: data.map(d => d.value),
                backgroundColor: ['#0ea5e9', '#8b5cf6', '#f59e0b'], // sky / violet / amber
                borderWidth: 0,
                hoverOffset: 6,
            }],
            options: {
                cutout: '64%',
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } } },
            },
        })
    }
})