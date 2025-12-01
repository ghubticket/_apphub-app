'use client'

import { useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import { useRouter, useParams } from 'next/navigation'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'

import Box from '@mui/material/Box'
import classnames from 'classnames'

import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import type { RankingInfo } from '@tanstack/match-sorter-utils'

import TablePagination from '@mui/material/TablePagination'

import Pagination from '@mui/material/Pagination'

import Switch from '@mui/material/Switch'

import CustomTextField from '@core/components/mui/TextField'
import CustomAvatar from '@core/components/mui/Avatar'

import OptionMenu from '@core/components/option-menu'


import tableStyles from '@core/styles/table.module.css'

import { useEvents } from '@/hooks/useEvents'
import { getProxiedImageUrl } from '@/utils/imageProxy'

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
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    const router = useRouter()
    const { lang } = useParams()

    const { events, loading, error, pagination, updateEventStatus } = useEvents({
        page: currentPage,
        limit: pageSize,
        search: globalFilter || undefined
    })

    useEffect(() => {
        setData(events)
    }, [events])

    // Resetar página quando busca mudar
    useEffect(() => {
        setCurrentPage(1)
    }, [globalFilter])

    const columns = useMemo<ColumnDef<any, any>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Evento',
                cell: ({ row }) => {
                    const imageUrl = row.original.squareImage || row.original.coverImage;
                    return (
                        <div className='flex items-center gap-4'>
                            <CustomAvatar src={getProxiedImageUrl(imageUrl)} alt={row.original.name} />
                            <div className='flex flex-col'>
                                <Typography color='text.primary' className='font-medium'>
                                    {row.original.name}
                                </Typography>
                            </div>
                        </div>
                    );
                }
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
                accessorKey: 'platformFeePercentage',
                header: 'Taxa (%)',
                cell: ({ row }) => (
                    <Typography color='text.primary' className='font-medium'>
                        {row.original.platformFeePercentage !== undefined && row.original.platformFeePercentage !== null
                            ? `${row.original.platformFeePercentage}%`
                            : '0%'}
                    </Typography>
                )
            },
            {
                accessorKey: 'createdAt',
                header: 'Created',
                cell: ({ row }) => (
                    <Typography variant='body2' color='text.secondary'>
                        {new Date(row.original.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        })}
                    </Typography>
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
        state: {
            globalFilter,
            pagination: {
                pageIndex: currentPage - 1,
                pageSize: pageSize
            }
        },
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        manualPagination: true, // Paginação controlada pelo backend
        pageCount: pagination ? pagination.totalPages : 0,
        globalFilterFn: fuzzyFilter,
        filterFns: { fuzzy: fuzzyFilter }
    })

    // Verificar se há filtros aplicados
    const hasActiveFilters = globalFilter !== ''

    if (error) {
        return (
            <Card>
                <CardHeader
                    title='Erro'
                    subheader='Não foi possível carregar os eventos'
                />
                <CardContent>
                    <Typography color='error' className='mb-2'>{error}</Typography>
                    <Button
                        variant='outlined'
                        onClick={() => window.location.reload()}
                        startIcon={<i className='tabler-refresh' />}
                    >
                        Tentar Novamente
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader
                title='Eventos'
                subheader='Lista de todos os eventos cadastrados'
            />
            <CardContent>
                {/* Sempre mostrar os filtros */}
                <div className='flex items-center gap-4 mb-6 flex-wrap'>
                    <CustomTextField
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        placeholder='Buscar eventos...'
                        className='flex-1 min-w-[200px]'
                        InputProps={{
                            startAdornment: <i className='tabler-search text-xl text-textSecondary' />
                        }}
                    />
                    <Button
                        component={Link}
                        href={`/${lang}/apps/events/create`}
                        variant='contained'
                        startIcon={<i className='tabler-plus' />}
                    >
                        Novo Evento
                    </Button>
                </div>

                {loading ? (
                    <Box className='flex flex-col items-center justify-center py-12'>
                        <i className='tabler-loader-2 animate-spin text-6xl text-textSecondary mb-4' />
                        <Typography variant='h6' color='text.secondary'>
                            Carregando eventos...
                        </Typography>
                    </Box>
                ) : data.length === 0 ? (
                    <Box className='flex flex-col items-center justify-center py-12'>
                        <i className='tabler-calendar-event text-6xl text-textSecondary mb-4' />
                        <Typography variant='h6' color='text.secondary' className='mb-2'>
                            {hasActiveFilters 
                                ? 'Não foram encontrados resultados para esse filtro'
                                : 'Nenhum evento encontrado'
                            }
                        </Typography>
                        <Typography variant='body2' color='text.secondary' className='mb-4'>
                            {hasActiveFilters
                                ? 'Tente ajustar os filtros acima para ver outros resultados'
                                : 'Os eventos aparecerão aqui quando forem criados'
                            }
                        </Typography>
                        {!hasActiveFilters && (
                            <Button
                                component={Link}
                                href={`/${lang}/apps/events/create`}
                                variant='contained'
                                startIcon={<i className='tabler-plus' />}
                            >
                                Cadastrar Evento
                            </Button>
                        )}
                    </Box>
                ) : (
                    <>

                        <div className='overflow-x-auto'>
                            <table className={tableStyles.table}>
                                <thead>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <tr key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <th key={header.id}>
                                                    {header.isPlaceholder ? null : (
                                                        <div
                                                            className={classnames({
                                                                'flex items-center gap-2': header.column.getIsSorted(),
                                                                'cursor-pointer select-none': header.column.getCanSort(),
                                                            })}
                                                            onClick={header.column.getToggleSortingHandler()}
                                                        >
                                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                                            {{
                                                                asc: <i className='tabler-chevron-up text-xl' />,
                                                                desc: <i className='tabler-chevron-down text-xl' />,
                                                            }[header.column.getIsSorted() as string] ?? null}
                                                        </div>
                                                    )}
                                                </th>
                                            ))}
                                        </tr>
                                    ))}
                                </thead>
                                <tbody>
                                    {table.getRowModel().rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={table.getAllColumns().length} className='text-center'>
                                                <Typography variant='body2' color='text.secondary' className='py-8'>
                                                    Nenhum evento encontrado
                                                </Typography>
                                            </td>
                                        </tr>
                                    ) : (
                                        table.getRowModel().rows.map((row) => (
                                            <tr key={row.id} className={classnames({ selected: row.getIsSelected() })}>
                                                {row.getVisibleCells().map((cell) => (
                                                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                                                ))}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <TablePagination
                            component={() => (
                                <div className='flex justify-between items-center flex-wrap border-bs bs-auto pt-5 gap-2'>
                                    <Typography color='text.disabled'>
                                        {pagination ? (
                                            `Mostrando ${pagination.total === 0
                                                ? 0
                                                : (currentPage - 1) * pageSize + 1
                                            } a ${Math.min(currentPage * pageSize, pagination.total)} de ${pagination.total} registros`
                                        ) : (
                                            `Mostrando ${data.length} registros`
                                        )}
                                    </Typography>
                                    <div className='flex items-center gap-2'>
                                        <CustomTextField
                                            select
                                            size='small'
                                            value={pageSize}
                                            onChange={(e) => {
                                                const newPageSize = Number(e.target.value)

                                                setPageSize(newPageSize)
                                                setCurrentPage(1)
                                            }}
                                            sx={{ minWidth: 80 }}
                                        >
                                            <MenuItem value={10}>10</MenuItem>
                                            <MenuItem value={25}>25</MenuItem>
                                            <MenuItem value={50}>50</MenuItem>
                                            <MenuItem value={100}>100</MenuItem>
                                        </CustomTextField>
                                        {pagination && (
                                            <Pagination
                                                shape='rounded'
                                                color='primary'
                                                variant='tonal'
                                                count={pagination.totalPages}
                                                page={currentPage}
                                                onChange={(_: any, page: number) => setCurrentPage(page)}
                                                showFirstButton
                                                showLastButton
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                            count={pagination?.total || data.length}
                            rowsPerPage={pageSize}
                            page={currentPage - 1}
                            onPageChange={(_: any, page: number) => setCurrentPage(page + 1)}
                            onRowsPerPageChange={(e: any) => {
                                const newPageSize = Number(e.target.value)

                                setPageSize(newPageSize)
                                setCurrentPage(1)
                            }}
                        />
                    </>
                )}
            </CardContent>
        </Card>
    )
}

export default EventListTable


