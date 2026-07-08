"use client"

import * as React from "react"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    VisibilityState,
    RowSelectionState,
    OnChangeFn,
} from "@tanstack/react-table"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../../components/ui/table"
import { Input } from "../../../components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { RemoteCombobox } from "../RemoteCombobox"
import { ServerMeta, ServerTableFilter, useServerTable } from '../../hooks/useServerTable'
import { ServerDataTablePagination } from './server-data-table-pagination'
import { DataTableViewOptions } from "../data-table-column-toggle"

interface Props<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    meta: ServerMeta
    queryParams: Record<string, string>
    filters?: ServerTableFilter[]
    urlPrefix?: string
    rowSelection?: RowSelectionState
    onRowSelectionChange?: OnChangeFn<RowSelectionState>
}

export function ServerDataTable<TData, TValue>({
    columns,
    data,
    meta,
    queryParams,
    filters = [],
    urlPrefix,
    rowSelection, // Pour la sélection de ligne
    onRowSelectionChange // --
}: Props<TData, TValue>) {

    const { navigate, buildUrl } = useServerTable(queryParams, urlPrefix) // 'urlPrefix' pour le préfixe
    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualSorting: true,
        manualPagination: true,
        manualFiltering: true,
        pageCount: meta.totalPages,
        onColumnVisibilityChange: setColumnVisibility,
        state: {
            columnVisibility,
            rowSelection: rowSelection ?? {} /*
                - Pour la selection de ligne, ensuite dans 'TicketTale'
            */
        },
        onRowSelectionChange, // --
        enableRowSelection: true // --
    })

    return (
        <div>
            <div className="overflow-hidden rounded-md border px-3.5">
                {filters.length > 0 && (
                    <div className="flex items-center py-4 gap-2 overflow-x-auto">
                        {filters.map((filter) => {
                            if(filter.type === 'text') {
                                return (
                                    <Input
                                        key={filter.name}
                                        placeholder={filter.placeholder ?? filter.label}
                                        defaultValue={queryParams[filter.name] ?? ''}
                                        className="w-75 shrink-0"
                                        onChange={(e) => {
                                            if(debounceRef.current) clearTimeout(debounceRef.current)
                                            debounceRef.current = setTimeout(() => {
                                                navigate({ [filter.name]: e.target.value || null, page: '1' })
                                            }, 400)
                                        }}
                                    />
                                )
                            }
                            if(filter.type === 'select') {
                                return (
                                    <Select
                                        key={filter.name}
                                        defaultValue={queryParams[filter.name] ?? 'all'}
                                        onValueChange={(v) => {
                                            navigate({ [filter.name]: v === 'all' ? null : v, page: '1' })
                                        }}
                                    >
                                        <SelectTrigger className="w-45 shrink-0"> {/* 180px */}
                                            <SelectValue placeholder={filter.label} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{filter.label}</SelectItem>
                                            {filter.options?.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )
                            }
                            if(filter.type === 'remote') {
                                return (
                                    <div key={filter.name} className="w-56 shrink-0">
                                        <RemoteCombobox
                                            resource={filter.resource ?? ''}
                                            value={queryParams[filter.name] ?? null}
                                            initialLabel={filter.selectedLabel ?? null}
                                            placeholder={filter.label}
                                            searchPlaceholder={filter.placeholder ?? 'Rechercher…'}
                                            clearable
                                            onChange={(v) => navigate({ [filter.name]: v, page: '1' })}
                                        />
                                    </div>
                                )
                            }
                            if(filter.type === 'date_range') {
                                return (
                                    <div key={filter.name} className="flex items-center gap-1.5 shrink-0">
                                        <Input
                                            type="date"
                                            defaultValue={queryParams[`${filter.name}_from`] ?? ''}
                                            className="w-37.5"
                                            onChange={(e) => {
                                                if (debounceRef.current) clearTimeout(debounceRef.current)
                                                debounceRef.current = setTimeout(() => {
                                                    navigate({ [`${filter.name}_from`]: e.target.value || null, page: '1' })
                                                }, 0) /*
                                                    - Pas besoin de délai sur un date picker
                                                */
                                            }}
                                        /> {/* 150px */}
                                        <span className="text-muted-foreground text-sm">→</span>
                                        <Input
                                            type="date"
                                            defaultValue={queryParams[`${filter.name}_to`] ?? ''}
                                            className="w-37.5"
                                            onChange={(e) => {
                                                if(debounceRef.current) clearTimeout(debounceRef.current)
                                                debounceRef.current = setTimeout(() => {
                                                    navigate({ [`${filter.name}_to`]: e.target.value || null, page: '1' })
                                                }, 0)
                                            }}
                                        />
                                    </div>
                                )
                            }
                            return null
                        })}
                        <DataTableViewOptions table={table} />
                    </div>
                )}

                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="font-bold">
                                        {header.isPlaceholder ? null : flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    Aucun résultat
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <ServerDataTablePagination meta={meta} buildUrl={buildUrl} />
            </div>
        </div>
    )
}