import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from 'lucide-react'
import { Column } from '@tanstack/react-table'
import { cn } from '../../../lib/utils'
import { Button } from '../../../components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"

export interface SortUrls {
    toggle: string
    asc: string
    desc: string
}

interface Props<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
    column: Column<TData, TValue>
    title: string
    sortUrls?: SortUrls
    sortState?: 'asc' | 'desc' | false
}

export function ServerDataTableColumnHeader<TData, TValue>({
    column,
    title,
    className,
    sortUrls,
    sortState
}: Props<TData, TValue>) {

    if(!sortUrls) {
        return <div className={cn(className)}>{title}</div>
    }

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <a href={sortUrls.toggle}>
                        <Button variant="ghost" size="sm" className="-ml-3 h-8 data-[state=open]:bg-accent">
                            <span className="font-bold">{title}</span>
                            {sortState === 'desc' ? (
                                <ArrowDown />
                            ) : sortState === 'asc' ? (
                                <ArrowUp />
                            ) : (
                                <ChevronsUpDown />
                            )}
                        </Button>
                    </a>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuItem asChild>
                        <a href={sortUrls.asc}>
                            <ArrowUp className="mr-2 h-3.5 w-3.5" />
                            Asc
                        </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <a href={sortUrls.desc}>
                            <ArrowDown className="mr-2 h-3.5 w-3.5" />
                            Desc
                        </a>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                        <EyeOff className="mr-2 h-3.5 w-3.5" />
                        Masquer
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}