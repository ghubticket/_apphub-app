'use client'

import { useEffect, useMemo, useState } from 'react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import { useParams } from 'next/navigation'
import classnames from 'classnames'

import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import type { RankingInfo } from '@tanstack/match-sorter-utils'

import CustomTextField from '@core/components/mui/TextField'
import TablePaginationComponent from '@components/TablePaginationComponent'
import OptionMenu from '@core/components/option-menu'
import { useOrders } from '@/hooks/useOrders'
import type { OrderItem } from '@/services/orderService'

import tableStyles from '@core/styles/table.module.css'

const columnHelper = createColumnHelper<OrderItem>()

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

// Função para formatar moeda brasileira
const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value)
}

// Função para formatar data
const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

const OrderListTable = () => {
    const [data, setData] = useState<OrderItem[]>([])
    const [globalFilter, setGlobalFilter] = useState('')
    const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null)
    const [qrDialogOpen, setQrDialogOpen] = useState(false)

    const { lang } = useParams()
    const { orders, loading, error } = useOrders()

    useEffect(() => {
        if (orders) {
            setData(orders)
        }
    }, [orders])

    const columns = useMemo<ColumnDef<OrderItem, any>[]>(
        () => [
            {
                accessorKey: 'orderNumber',
                header: 'Número do Pedido',
                cell: ({ row }) => (
                    <Typography color='text.primary' className='font-medium'>
                        {row.original.orderNumber}
                    </Typography>
                )
            },
            {
                accessorKey: 'customer',
                header: 'Cliente',
                cell: ({ row }) => {
                    const customer = typeof row.original.customer === 'object' 
                        ? row.original.customer 
                        : null
                    return (
                        <div className='flex flex-col'>
                            <Typography color='text.primary' className='font-medium'>
                                {customer?.name || 'N/A'}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                                {customer?.email || ''}
                            </Typography>
                        </div>
                    )
                }
            },
            {
                accessorKey: 'event',
                header: 'Evento',
                cell: ({ row }) => {
                    const event = typeof row.original.event === 'object' 
                        ? row.original.event 
                        : null
                    return (
                        <Typography color='text.primary'>
                            {event?.name || 'N/A'}
                        </Typography>
                    )
                }
            },
            {
                accessorKey: 'totalTickets',
                header: 'Ingressos',
                cell: ({ row }) => (
                    <Typography color='text.primary'>
                        {row.original.totalTickets} ingresso(s)
                    </Typography>
                )
            },
            {
                accessorKey: 'totalAmount',
                header: 'Valor Total',
                cell: ({ row }) => (
                    <Typography color='text.primary' className='font-medium'>
                        {formatCurrency(row.original.totalAmount)}
                    </Typography>
                )
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => {
                    const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
                        paid: 'success',
                        pending: 'warning',
                        cancelled: 'error',
                        refunded: 'info'
                    }
                    const statusLabels: Record<string, string> = {
                        paid: 'Pago',
                        pending: 'Pendente',
                        cancelled: 'Cancelado',
                        refunded: 'Reembolsado'
                    }
                    return (
                        <Chip
                            label={statusLabels[row.original.status] || row.original.status}
                            color={statusColors[row.original.status] || 'default'}
                            size='small'
                            variant='tonal'
                        />
                    )
                }
            },
            {
                accessorKey: 'createdAt',
                header: 'Data',
                cell: ({ row }) => (
                    <Typography variant='body2' color='text.secondary'>
                        {formatDate(row.original.createdAt)}
                    </Typography>
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
                                    text: 'Ver QR Codes',
                                    icon: <i className='tabler-qrcode text-xl' />,
                                    menuItemProps: {
                                        onClick: () => {
                                            setSelectedOrder(row.original)
                                            setQrDialogOpen(true)
                                        }
                                    }
                                }
                            ]}
                        />
                    </div>
                )
            }
        ],
        []
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
                pageIndex: 0,
                pageSize: 10,
            },
        },
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: fuzzyFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    })

    if (loading) {
        return (
            <Card>
                <CardContent>
                    <Typography>Carregando pedidos...</Typography>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardHeader
                    title='Erro'
                    subheader='Não foi possível carregar os pedidos'
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
        <>
            <Card>
                <CardHeader
                    title='Pedidos'
                    subheader='Lista de todos os pedidos de ingressos'
                />
                <CardContent>
                    {data.length === 0 ? (
                        <Box className='flex flex-col items-center justify-center py-12'>
                            <i className='tabler-shopping-cart text-6xl text-textSecondary mb-4' />
                            <Typography variant='h6' color='text.secondary' className='mb-2'>
                                Nenhum pedido encontrado
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                                Os pedidos aparecerão aqui quando forem criados
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            <div className='flex items-center gap-4 mb-6'>
                                <CustomTextField
                                    value={globalFilter}
                                    onChange={(e) => setGlobalFilter(e.target.value)}
                                    placeholder='Buscar pedidos...'
                                    className='flex-1'
                                    InputProps={{
                                        startAdornment: <i className='tabler-search text-xl text-textSecondary' />
                                    }}
                                />
                            </div>

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
                                                <td colSpan={columns.length} className='text-center'>
                                                    <Typography variant='body2' color='text.secondary' className='py-8'>
                                                        Nenhum pedido encontrado
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

                            <TablePaginationComponent table={table} />
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Dialog para exibir QR Codes */}
            <Dialog 
                open={qrDialogOpen} 
                onClose={() => setQrDialogOpen(false)}
                maxWidth='md'
                fullWidth
            >
                <DialogTitle>
                    QR Codes do Pedido #{selectedOrder?.orderNumber}
                </DialogTitle>
                <DialogContent>
                    {selectedOrder && (
                        <Box>
                            <Box className='mb-4'>
                                <Typography variant='body2' color='text.secondary' className='mb-2'>
                                    <strong>Cliente:</strong> {typeof selectedOrder.customer === 'object' ? selectedOrder.customer.name : 'N/A'}
                                </Typography>
                                <Typography variant='body2' color='text.secondary' className='mb-2'>
                                    <strong>Evento:</strong> {typeof selectedOrder.event === 'object' ? selectedOrder.event.name : 'N/A'}
                                </Typography>
                                <Typography variant='body2' color='text.secondary'>
                                    <strong>Total de Ingressos:</strong> {selectedOrder.totalTickets}
                                </Typography>
                            </Box>
                            <Box className='grid grid-cols-2 gap-4'>
                                {selectedOrder.tickets.map((ticket, index) => (
                                    <Box key={ticket._id} className='border rounded-lg p-4'>
                                        <Typography variant='subtitle2' className='mb-2'>
                                            Ingresso {index + 1}
                                        </Typography>
                                        <Typography variant='caption' color='text.secondary' className='block mb-2'>
                                            Código: {ticket.code}
                                        </Typography>
                                        <Typography variant='caption' color='text.secondary' className='block mb-2'>
                                            Status: {ticket.status === 'confirmed' ? 'Confirmado' : ticket.status === 'used' ? 'Usado' : 'Pendente'}
                                        </Typography>
                                        {ticket.qrCode && (
                                            <Box className='flex justify-center mt-2'>
                                                <img 
                                                    src={ticket.qrCode} 
                                                    alt={`QR Code ${ticket.code}`}
                                                    className='w-32 h-32'
                                                />
                                            </Box>
                                        )}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setQrDialogOpen(false)}>Fechar</Button>
                </DialogActions>
            </Dialog>
        </>
    )
}

export default OrderListTable

