import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

interface ExportColumn {
    header: string
    accessor: string
}

export function exportToPDF<T extends object>(
    data: T[],
    columns: ExportColumn[],
    filename = 'export'
) {
    const doc = new jsPDF()
    autoTable(doc, {
        head: [columns.map(col => col.header)],
        body: data.map(row =>
            columns.map(col => String(row[col.accessor as keyof T] ?? ''))
        )
    })
    doc.save(`${filename}.pdf`)
}

export function exportToExcel<T extends object>(
    data: T[],
    columns: ExportColumn[],
    filename = 'export'
) {
    const rows = data.map(row =>
        Object.fromEntries(
            columns.map(col => [col.header, row[col.accessor as keyof T] ?? ''])
        )
    )
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    XLSX.writeFile(workbook, `${filename}.xlsx`)
}

export function printTable<T extends object>(
    data: T[],
    columns: ExportColumn[],
    title = 'Impression'
) {
    const headers = columns
        .map(col => `<th>${col.header}</th>`)
        .join('')

    const rows = data
        .map(item => {
            const cells = columns
                .map(col => `<td>${item[col.accessor as keyof T] ?? ''}</td>`)
                .join('')
            return `<tr>${cells}</tr>`
        })
        .join('')

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
                h1 { font-size: 16px; margin-bottom: 16px; color: #1e293b; }
                table { width: 100%; border-collapse: collapse; }
                thead th {
                    background-color: #1e293b;
                    color: white;
                    padding: 8px 12px;
                    text-align: left;
                    font-weight: 600;
                }
                tbody td {
                    padding: 6px 12px;
                    border-bottom: 1px solid #e2e8f0;
                    color: #334155;
                }
                tbody tr:nth-child(even) { background-color: #f8fafc; }
                .footer {
                    margin-top: 16px;
                    font-size: 10px;
                    color: #94a3b8;
                    text-align: right;
                }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            <table>
                <thead><tr>${headers}</tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="footer">
                Imprimé le ${new Date().toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                })}
            </div>
        </body>
        </html>
    `

    const win = window.open('', '_blank', 'width=900,height=600')
    if (!win) return  // popup bloquée

    win.document.write(html)
    win.document.close()

    // Attendre que les styles soient chargés avant d'imprimer
    win.onload = () => {
        win.focus()
        win.print()
        win.close()
    }
}