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

import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import type { RankingInfo } from '@tanstack/match-sorter-utils'

import CustomTextField from '@core/components/mui/TextField'
import CustomAvatar from '@core/components/mui/Avatar'
import TablePagination from '@mui/material/TablePagination'
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

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover este código?')) return
        try {
            await promoterCodeService.delete(id)
            refetch()
        } catch (error) {
            console.error('Erro ao remover código:', error)
            alert('Erro ao remover código')
        }
    }

    const columns = useMemo<ColumnDef<any, any>[]>(
        () => [
            {
                accessorKey: 'code',
                header: 'Código',
                cell: ({ row }) => (
                    <Typography variant='body2' className='font-medium'>
                        {row.original.code}
                    </Typography>
                )
            },
            {
                accessorKey: 'name',
                header: 'Nome',
                cell: ({ row }) => (
                    <Typography variant='body2'>
                        {row.original.name}
                    </Typography>
                )
            },
            {
                accessorKey: 'cpf',
                header: 'CPF',
                cell: ({ row }) => (
                    <Typography variant='body2'>
                        {row.original.cpf}
                    </Typography>
                )
            },
            {
                accessorKey: 'email',
                header: 'Email',
                cell: ({ row }) => (
                    <Typography variant='body2'>
                        {row.original.email}
                    </Typography>
                )
            },
            {
                accessorKey: 'whatsapp',
                header: 'WhatsApp',
                cell: ({ row }) => (
                    <Typography variant='body2'>
                        {row.original.whatsapp}
                    </Typography>
                )
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
                        <Typography variant='body2'>
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
                        <Typography variant='body2'>
                            {events.length} evento(s)
                        </Typography>
                    )
                }
            },
            {
                accessorKey: 'currentUses',
                header: 'Usos',
                cell: ({ row }) => (
                    <Typography variant='body2'>
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
                                },
                                {
                                    text: 'Remover',
                                    icon: <i className='tabler-trash text-xl' />,
                                    menuItemProps: {
                                        onClick: () => handleDelete(row.original._id),
                                        className: 'text-error'
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
        },
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        globalFilterFn: fuzzyFilter,
    })

    if (loading && data.length === 0) {
        return (
            <Card>
                <CardContent>
                    <Box display='flex' justifyContent='center' alignItems='center' minHeight='200px'>
                        <CircularProgress />
                    </Box>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader
                title='Códigos de Promotor'
                action={
                    <div className='flex items-center gap-4'>
                        <CustomTextField
                            select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value === 'all' ? 'all' : e.target.value === 'true')}
                            className='is-[160px]'
                        >
                            <MenuItem value='all'>Todos</MenuItem>
                            <MenuItem value='true'>Ativos</MenuItem>
                            <MenuItem value='false'>Inativos</MenuItem>
                        </CustomTextField>
                        <CustomTextField
                            placeholder='Buscar código ou nome...'
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            className='is-[250px]'
                            InputProps={{
                                startAdornment: <i className='tabler-search text-xl' />
                            }}
                        />
                        <Button
                            variant='contained'
                            component={Link}
                            href={`/${lang}/apps/promoters/create`}
                        >
                            Novo Código
                        </Button>
                    </div>
                }
            />
            <CardContent>
                {error && (
                    <Typography color='error' className='mb-4'>
                        {error}
                    </Typography>
                )}
                {data.length === 0 ? (
                    <Typography className='text-center py-8'>
                        Nenhum código encontrado
                    </Typography>
                ) : (
                    <>
                        <div className={tableStyles.tableContainer}>
                            <table className={tableStyles.table}>
                                <thead>
                                    {table.getHeaderGroups().map(headerGroup => (
                                        <tr key={headerGroup.id}>
                                            {headerGroup.headers.map(header => (
                                                <th key={header.id}>
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(header.column.columnDef.header, header.getContext())}
                                                </th>
                                            ))}
                                        </tr>
                                    ))}
                                </thead>
                                <tbody>
                                    {table.getRowModel().rows.map(row => (
                                        <tr key={row.id}>
                                            {row.getVisibleCells().map(cell => (
                                                <td key={cell.id}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {pagination && (
                            <TablePagination
                                component='div'
                                count={pagination.total}
                                page={pagination.page - 1}
                                rowsPerPage={pagination.limit}
                                onPageChange={(_, page) => setCurrentPage(page + 1)}
                                onRowsPerPageChange={(e) => {
                                    setPageSize(Number(e.target.value))
                                    setCurrentPage(1)
                                }}
                                rowsPerPageOptions={[10, 25, 50, 100]}
                            />
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}

export default PromoterCodeListTable

