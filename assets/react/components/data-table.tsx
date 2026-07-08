"use client"

import * as React from "react"
import {
    ColumnDef,
    SortingState,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
    ColumnFiltersState,
    getFilteredRowModel,
    getPaginationRowModel,
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
} from "../../components/ui/table"
import { Input } from "../../components/ui/input"
import { DataTablePagination } from "./data-table-pagination"
import { DataTableViewOptions } from "./data-table-column-toggle"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { LayoutGrid, TableIcon } from "lucide-react"

type SelectFilter = {
    column: string
    title: string
    options: {
        label: string
        value: string
    }[]
}
/*
    interface FilterableColumn { -- Pour un filtre input par colonne
        columnId: string
        placeholder: string
    }
*/
interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[],
    filterColumn ?: string // La recherche --
    filterPlaceholder ?: string // ..
    selectFilters?: SelectFilter[] // Pour Le filtre générique
    showPagination?: boolean,
    viewOptions?: boolean,
    /*
        renderView?: (rows: TData[]) => React.ReactNode - Ou - renderView?: (rows: TData[], sorting: SortingState, setSorting: (sorting: SortingState) => void) => React.ReactNode -- Pour le viewMode
        filterableColumns?: FilterableColumn[]
        onTableReady?: (table: Table<TData>) => void -- Pour l'export de toutes les données même celles qui ne sont pas affichées à cause de la pagination ou des filtres

        rowSelection?: RowSelectionState -- Pour la sélection de ligne
        onRowSelectionChange?: OnChangeFn<RowSelectionState> -- !!
    */
}

export function DataTable<TData, TValue>({
    columns,
    data,
    filterColumn, // La recherche --
    filterPlaceholder = "Filtrer..", // ..
    selectFilters = [], // Pour Le filtre générique
    showPagination = true,
    viewOptions = true,
    /*
        renderView -- Pour le viewMode
        onTableReady
        rowSelection, -- Pour la sélection de ligne
        onRowSelectionChange -- !!
    */
}: DataTableProps<TData, TValue>) {

    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({}) /*
        const [globalFilter, setGlobalFilter] = React.useState("") -- Pour le filtre globale
    */
    /*
        const [viewMode, setViewMode] = React.useState("table") -- Pour le viewMode

        const [view, setView] = useState<"table" | "grid">(() => { -- Pour sauvegarder l'état
            return (localStorage.getItem("view") as any) || "table"
        })
        useEffect(() => {
            localStorage.setItem("view", view)
        }, [view])
    */

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getSortedRowModel: getSortedRowModel(),
        onColumnVisibilityChange: setColumnVisibility, /*
            globalFilterFn: "includesString", -- Pour le filtre globale, 'includesString' l'algorithme de recherche
            onGlobalFilterChange: setGlobalFilter
        */
        state: {
            sorting,
            columnFilters,
            columnVisibility
            /*
                globalFilter -- Pour le filtre globale
                rowSelection: rowSelection ?? {} -- Pour la selection de ligne, ensuite dans 'TicketTale'
            */
        }, /*
            onRowSelectionChange, -- La sélection de ligne
            enableRowSelection: true -- !!
        */
    }) /*
        const currentRows = table.getRowModel().rows.map(row => row.original) -- Pour le viewMode, les données filtrées et paginées extraites pour 'renderView'

        React.useEffect(() => { -- Pour l'export de toutes les données, on expose l'instance table au parent ensuite dans 'MarqueTable'
            onTableReady?.(table)
        }, [table])
    */
    return (
        <div>
            <div className="overflow-hidden rounded-md border px-3.5">
                <div className="flex items-center py-4 gap-2 overflow-x-auto">
                    {/* 
                        <Input
                            placeholder="Rechercher..."
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            className="max-w-sm"
                        /> -- Pour le filtre globale

                        {filterableColumns?.map(({ columnId, placeholder }) => (
                            <Input
                                key={columnId}
                                placeholder={placeholder}
                                value={(table.getColumn(columnId)?.getFilterValue() as string) ?? ""}
                                onChange={(e) => table.getColumn(columnId)?.setFilterValue(e.target.value)}
                                className="max-w-sm"
                            />
                        ))} -- Pour un filtre input par colonne on l'a utilisé dans 'TypepieceTable' ou 'filterColumn'
                    */}
                    {filterColumn && (
                        <Input
                            placeholder={filterPlaceholder}
                            value={(table.getColumn(filterColumn)?.getFilterValue() as string) ?? ""}
                            onChange={(e) =>
                                table.getColumn(filterColumn)?.setFilterValue(e.target.value)
                            }
                            className="w-75 shrink-0"
                        />
                    )}
                    {selectFilters.map((filter) => {
                        const column = table.getColumn(filter.column)
                        if(!column) {
                            return null
                        }

                        return (
                            <Select
                                key={filter.column}
                                value={(column.getFilterValue() as string) ?? "all"}
                                onValueChange={(value) =>
                                    column.setFilterValue(value === "all" ? undefined : value)
                                }
                            >
                                <SelectTrigger className="w-[180px] shrink-0">
                                    <SelectValue placeholder={filter.title} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{filter.title}</SelectItem>
                                    {filter.options.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )
                    })}
                    {/*
                        {renderView && (
                            <div className="ml-auto flex items-center gap-1 border rounded-md p-1">
                                <Button
                                    variant={viewMode === "table" ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setViewMode("table")}
                                >
                                    <TableIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === "custom" ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setViewMode("custom")}
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    */}
                    {viewOptions && <DataTableViewOptions table={table} />}
                </div>
                {/*
                    {viewMode === "table" || !renderView ? (
                        <Table></Table>
                    ) : (
                        renderView(currentRows, sorting, setSorting) -- 'sorting' et 'setSorting' pour le tri 
                    )}
                */}
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                <TableHead key={header.id} className="font-bold">
                                    {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                        )}
                                </TableHead>
                                )
                            })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                        <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && "selected"}
                        >
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
            {showPagination && 
                <div className="flex items-center justify-end space-x-2 py-4">
                    <DataTablePagination table={table} />
                </div>
            }
        </div>
    )
}