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
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import classnames from 'classnames'

import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import type { RankingInfo } from '@tanstack/match-sorter-utils'

import CustomTextField from '@core/components/mui/TextField'
import Select from '@mui/material/Select'
import TablePagination from '@mui/material/TablePagination'
import Pagination from '@mui/material/Pagination'
import OptionMenu from '@core/components/option-menu'
import Switch from '@mui/material/Switch'

import tableStyles from '@core/styles/table.module.css'

import { usePromoterCodes } from '@/hooks/usePromoterCodes'
import { promoterCodeService } from '@/services/promoterCodeService'

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

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value)
}

const PromoterCodeListTable = () => {
    const [data, setData] = useState<any[]>([])
    const [globalFilter, setGlobalFilter] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [statusFilter, setStatusFilter] = useState<'all' | boolean>('all')

    const router = useRouter()
    const { lang } = useParams()
    const { codes, loading, error, pagination, refetch } = usePromoterCodes({
        page: currentPage,
        limit: pageSize,
        search: globalFilter || undefined,
        isActive: statusFilter === 'all' ? undefined : statusFilter
    })

    useEffect(() => {
        setData(codes)
    }, [codes])

    // Resetar página quando busca mudar
    useEffect(() => {
        setCurrentPage(1)
    }, [globalFilter, statusFilter])

    const handleToggle = async (id: string, currentStatus: boolean) => {
        try {
            await promoterCodeService.toggle(id)
            refetch()
        } catch (error) {
            console.error('Erro ao alterar status:', error)
            alert('Erro ao alterar status do código')
        }
    }


    const columns = useMemo<ColumnDef<any, any>[]>(
        () => [
            {
                accessorKey: 'code',
                header: 'Código',
                cell: ({ row }) => (
                    <Typography color='text.primary' className='font-medium'>
                        {row.original.code}
                    </Typography>
                )
            },
            {
                accessorKey: 'whatsapp',
                header: 'WhatsApp',
                cell: ({ row }) => {
                    const whatsapp = row.original.whatsapp || ''
                    const code = row.original.code || ''
                    
                    // Formatar número: remover caracteres especiais e adicionar 55 (Brasil) se não tiver
                    const phoneNumber = whatsapp.replace(/\D/g, '')
                    const formattedPhone = phoneNumber.startsWith('55') ? phoneNumber : `55${phoneNumber}`
                    
                    // Mensagem com o código
                    const message = encodeURIComponent(`Olá! Seu código de promotor é: ${code}`)
                    
                    // Link do WhatsApp
                    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`
                    
                    return (
                        <a
                            href={whatsappUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='flex items-center gap-2'
                            style={{ textDecoration: 'none' }}
                        >
                            <i className='tabler-brand-whatsapp text-xl text-success' />
                            <Typography color='text.primary' className='font-medium'>
                                {whatsapp}
                            </Typography>
                        </a>
                    )
                }
            },
            {
                accessorKey: 'discount',
                header: 'Desconto',
                cell: ({ row }) => {
                    const { discountType, discountValue } = row.original
                    const display = discountType === 'percentage' 
                        ? `${discountValue}%`
                        : formatCurrency(discountValue)
                    return (
                        <Typography color='text.primary' className='font-medium'>
                            {display}
                        </Typography>
                    )
                }
            },
            {
                accessorKey: 'events',
                header: 'Eventos',
                cell: ({ row }) => {
                    const events = row.original.events || []
                    return (
                        <Typography color='text.primary'>
                            {events.length} evento(s)
                        </Typography>
                    )
                }
            },
            {
                accessorKey: 'currentUses',
                header: 'Usos',
                cell: ({ row }) => (
                    <Typography color='text.primary' className='font-medium'>
                        {row.original.currentUses || 0}
                    </Typography>
                )
            },
            {
                accessorKey: 'isActive',
                header: 'Status',
                cell: ({ row }) => (
                    <div className='flex items-center gap-2'>
                        <Switch
                            checked={row.original.isActive}
                            onChange={() => handleToggle(row.original._id, row.original.isActive)}
                            size='small'
                        />
                        <Chip
                            label={row.original.isActive ? 'Ativo' : 'Inativo'}
                            color={row.original.isActive ? 'success' : 'default'}
                            size='small'
                            variant='tonal'
                        />
                    </div>
                )
            },
            {
                id: 'actions',
                header: 'Ações',
                cell: ({ row }) => (
                    <div className='flex items-center gap-2'>
                        <OptionMenu
                            iconButtonProps={{ size: 'small' }}
                            options={[
                                {
                                    text: 'Editar',
                                    icon: <i className='tabler-edit text-xl' />,
                                    menuItemProps: {
                                        onClick: () => {
                                            router.push(`/${lang}/apps/promoters/edit/${row.original._id}`)
                                        }
                                    }
                                }
                            ]}
                        />
                    </div>
                )
            }
        ],
        [router, lang]
    )

    const table = useReactTable({
        data,
        columns,
        filterFns: {
            fuzzy: fuzzyFilter,
        },
        state: {
            globalFilter,
            pagination: {
                pageIndex: currentPage - 1,
                pageSize: pageSize,
            },
        },
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        globalFilterFn: fuzzyFilter,
        manualPagination: true, // Paginação controlada pelo backend
        pageCount: pagination ? pagination.totalPages : 0,
    })

    // Verificar se há filtros aplicados
    const hasActiveFilters = 
        globalFilter !== '' ||
        statusFilter !== 'all'

    if (error) {
        return (
            <Card>
                <CardHeader
                    title='Erro'
                    subheader='Não foi possível carregar os códigos'
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
                title='Códigos de Promotor'
                subheader='Lista de todos os códigos de promotores'
            />
            <CardContent>
                {/* Sempre mostrar os filtros */}
                <div className='flex items-center gap-4 mb-6 flex-wrap'>
                    <CustomTextField
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        placeholder='Buscar códigos...'
                        className='flex-1 min-w-[200px]'
                        InputProps={{
                            startAdornment: <i className='tabler-search text-xl text-textSecondary' />
                        }}
                    />
                    <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value === 'all' ? 'all' : e.target.value === 'true')}
                        size='small'
                    >
                        <MenuItem value='all'>Todos</MenuItem>
                        <MenuItem value='true'>Ativos</MenuItem>
                        <MenuItem value='false'>Inativos</MenuItem>
                    </Select>
                    <Button
                        variant='contained'
                        component={Link}
                        href={`/${lang}/apps/promoters/create`}
                    >
                        Novo Código
                    </Button>
                </div>

                {loading ? (
                    <Box className='flex flex-col items-center justify-center py-12'>
                        <i className='tabler-loader-2 animate-spin text-6xl text-textSecondary mb-4' />
                        <Typography variant='h6' color='text.secondary'>
                            Carregando códigos...
                        </Typography>
                    </Box>
                ) : data.length === 0 ? (
                    <Box className='flex flex-col items-center justify-center py-12'>
                        <i className='tabler-ticket text-6xl text-textSecondary mb-4' />
                        <Typography variant='h6' color='text.secondary' className='mb-2'>
                            {hasActiveFilters 
                                ? 'Não foram encontrados resultados para esse filtro'
                                : 'Nenhum código encontrado'
                            }
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                            {hasActiveFilters
                                ? 'Tente ajustar os filtros acima para ver outros resultados'
                                : 'Os códigos aparecerão aqui quando forem criados'
                            }
                        </Typography>
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
                                                    Nenhum código encontrado
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
                            onPageChange={(_, page) => setCurrentPage(page + 1)}
                            onRowsPerPageChange={(e) => {
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

export default PromoterCodeListTable

