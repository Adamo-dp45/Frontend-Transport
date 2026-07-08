import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../../components/ui/select"
import { ServerMeta } from '../../hooks/useServerTable' 
import { Button } from '../../../components/ui/button'
import { visit } from "@hotwired/turbo"

interface Props {
    meta: ServerMeta
    buildUrl: (overrides: Record<string, string | null>) => string
}

export function ServerDataTablePagination({
    meta,
    buildUrl
}: Props) {

    const { page, perPage, total, totalPages, from, to } = meta
    const go = (overrides: Record<string, string>) => visit(buildUrl(overrides))

    return (
        <div className="flex items-center justify-between gap-4 px-2 overflow-x-auto">
            <div className="shrink-0 whitespace-nowrap text-sm text-muted-foreground">
                {from}–{to} sur {total} résultat(s)
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8 shrink-0">
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Lignes par page</p>
                    <Select
                        value={`${perPage}`}
                        onValueChange={(v) => go({ perPage: v, page: '1' })}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={perPage} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 20, 50, 100].map((size) => (
                                <SelectItem key={size} value={`${size}`}>{size}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                    Page {page} sur {totalPages}
                </div>

                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="icon" className="hidden size-8 lg:flex" disabled={page <= 1} onClick={() => go({ page: '1' })}>
                        <ChevronsLeft />
                    </Button>
                    <Button variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => go({ page: `${page - 1}` })}>
                        <ChevronLeft />
                    </Button>
                    <Button variant="outline" size="icon" className="size-8" disabled={page >= totalPages} onClick={() => go({ page: `${page + 1}` })}>
                        <ChevronRight />
                    </Button>
                    <Button variant="outline" size="icon" className="hidden size-8 lg:flex" disabled={page >= totalPages} onClick={() => go({ page: `${totalPages}` })}>
                        <ChevronsRight />
                    </Button>
                </div>
            </div>
        </div>
    )
}