'use client'

import { useEffect, useMemo, useState } from 'react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import TablePagination from '@mui/material/TablePagination'

import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import type { RankingInfo } from '@tanstack/match-sorter-utils'

import CustomTextField from '@core/components/mui/TextField'
import CustomAvatar from '@core/components/mui/Avatar'
import TablePaginationComponent from '@components/TablePaginationComponent'
import OptionMenu from '@core/components/option-menu'
import Switch from '@mui/material/Switch'

import tableStyles from '@core/styles/table.module.css'

import { useEvents } from '@/hooks/useEvents'

const columnHelper = createColumnHelper<any>()

declare module '@tanstack/table-core' {
    interface FilterFns {
        fuzzy: FilterFn<unknown>
    }
    interface FilterMeta {
        itemRank: RankingInfo
    }
}

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
    const itemRank = rankItem(row.getValue(columnId), value)
    addMeta({ itemRank })
    return itemRank.passed
}

const EventListTable = () => {
    const [data, setData] = useState<any[]>([])
    const [globalFilter, setGlobalFilter] = useState('')
    const [pageSize, setPageSize] = useState(10)

    const router = useRouter()
    const { lang } = useParams()
    const { events, loading, error, updateEventStatus } = useEvents({ limit: 50 })

    useEffect(() => {
        setData(events)
    }, [events])

    const columns = useMemo<ColumnDef<any, any>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Evento',
                cell: ({ row }) => (
                    <div className='flex items-center gap-4'>
                        <CustomAvatar src={row.original.squareImage || row.original.coverImage} alt={row.original.name} />
                        <div className='flex flex-col'>
                            <Typography color='text.primary' className='font-medium'>
                                {row.original.name}
                            </Typography>
                        </div>
                    </div>
                )
            },
            {
                accessorKey: 'isActive',
                header: 'Status',
                cell: ({ row }) => (
                    <div className='flex items-center gap-2'>
                        <Switch
                            checked={row.original.isActive}
                            onChange={async () => {
                                try {
                                    await updateEventStatus(row.original._id, !row.original.isActive)
                                } catch (error) {
                                    console.error('Erro ao atualizar status:', error)
                                }
                            }}
                            size='small'
                        />
                        <Chip
                            label={row.original.isActive ? 'Active' : 'Inactive'}
                            color={row.original.isActive ? 'success' : 'secondary'}
                            size='small'
                            variant='tonal'
                        />
                    </div>
                )
            },
            {
                accessorKey: 'createdAt',
                header: 'Created',
                cell: ({ row }) => (
                    <Typography variant='body2'>{new Date(row.original.createdAt).toLocaleDateString()}</Typography>
                )
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <OptionMenu
                        iconButtonProps={{ size: 'small' }}
                        options={[
                            {
                                text: 'View',
                                icon: 'tabler-eye',
                                menuItemProps: { 
                                    onClick: () => router.push(`/${lang}/apps/events/view/${row.original._id}`)
                                }
                            }
                        ]}
                    />
                )
            }
        ],
        [lang, router, updateEventStatus]
    )

    const table = useReactTable({
        data,
        columns,
        state: { globalFilter },
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        globalFilterFn: fuzzyFilter,
        filterFns: { fuzzy: fuzzyFilter }
    })

    if (loading) {
        return (
            <Card>
                <CardContent>
                    <Typography>Carregando eventos...</Typography>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardContent>
                    <Typography color='error'>Erro ao carregar eventos: {error}</Typography>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader title='Eventos' className='pbe-4' />

            <div className='p-6 border-bs'>
                <div className='flex flex-col lg:flex-row gap-4 w-full'>
                    <CustomTextField
                        placeholder='Buscar evento'
                        value={globalFilter}
                        onChange={e => setGlobalFilter(e.target.value)}
                        className='flex-1'
                        sx={{
                            '& .MuiOutlinedInput-root': { height: '60px', fontSize: '14px' }
                        }}
                    />
                    <CustomTextField
                        select
                        value={pageSize}
                        onChange={e => setPageSize(Number(e.target.value))}
                        className='max-sm:is-full sm:is-[70px]'
                    >
                        <MenuItem value='10'>10</MenuItem>
                        <MenuItem value='25'>25</MenuItem>
                        <MenuItem value='50'>50</MenuItem>
                    </CustomTextField>
                    <Button component={Link} href={`/${lang}/apps/events/create`} variant='contained' startIcon={<i className='tabler-plus' />}>Novo Evento</Button>
                </div>
            </div>

            <div className='overflow-x-auto'>
                <table className={tableStyles.table}>
                    <thead>
                        {table.getHeaderGroups().map(hg => (
                            <tr key={hg.id}>
                                {hg.headers.map(header => (
                                    <th key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    {table.getRowModel().rows.length === 0 ? (
                        <tbody>
                            <tr>
                                <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                                    Sem eventos disponíveis
                                </td>
                            </tr>
                        </tbody>
                    ) : (
                        <tbody>
                            {table
                                .getRowModel()
                                .rows.slice(0, pageSize)
                                .map(row => (
                                    <tr key={row.id}>
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                                        ))}
                                    </tr>
                                ))}
                        </tbody>
                    )}
                </table>
            </div>
            <TablePagination
                component={() => <TablePaginationComponent table={table} />}
                count={table.getFilteredRowModel().rows.length}
                rowsPerPage={pageSize}
                page={table.getState().pagination.pageIndex}
                onPageChange={(_, page) => table.setPageIndex(page)}
            />
        </Card>
    )
}

export default EventListTable


