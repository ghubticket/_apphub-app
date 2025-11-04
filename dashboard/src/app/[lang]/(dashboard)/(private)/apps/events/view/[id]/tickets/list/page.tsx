'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'

import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import type { RankingInfo } from '@tanstack/match-sorter-utils'
import classnames from 'classnames'

import CustomTextField from '@core/components/mui/TextField'
import OptionMenu from '@core/components/option-menu'
import Switch from '@mui/material/Switch'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'

import tableStyles from '@core/styles/table.module.css'
import TablePaginationComponent from '@components/TablePaginationComponent'

import { AdminOnly } from '@/components/RoleGuard'
import { useTicketTypes } from '@/hooks/useTicketTypes'
import type { TicketTypeItem } from '@/services/ticketTypeService'

const columnHelper = createColumnHelper<TicketTypeItem>()

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

const TicketTypesListPage = () => {
    const router = useRouter()
    const { lang, id } = useParams()
    const { ticketTypes, loading, error, updateStatus, deleteTicketType, fetchTicketTypes } = useTicketTypes(id as string)
    const [globalFilter, setGlobalFilter] = useState('')
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [ticketTypeToDelete, setTicketTypeToDelete] = useState<TicketTypeItem | null>(null)

    const columns = useMemo<ColumnDef<TicketTypeItem, any>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Nome do Tipo',
                cell: ({ row }) => (
                    <div className='flex flex-col'>
                        <Typography color='text.primary' className='font-medium'>
                            {row.original.name}
                        </Typography>
                        {row.original.description && (
                            <Typography variant='caption' color='text.secondary'>
                                {row.original.description}
                            </Typography>
                        )}
                    </div>
                )
            },
            {
                accessorKey: 'lotNumber',
                header: 'Lote',
                cell: ({ row }) => (
                    <Chip
                        label={`Lote ${row.original.lotNumber}`}
                        size='small'
                        variant='tonal'
                        color='primary'
                    />
                )
            },
            {
                accessorKey: 'price',
                header: 'Preço',
                cell: ({ row }) => (
                    <Typography color='text.primary'>
                        {row.original.isVIP ? 'VIP (Grátis)' : formatCurrency(row.original.price || 0)}
                    </Typography>
                )
            },
            {
                accessorKey: 'maxQuantity',
                header: 'Quantidade',
                cell: ({ row }) => (
                    <div className='flex flex-col'>
                        <Typography color='text.primary' className='font-medium'>
                            {row.original.soldQuantity || 0} / {row.original.maxQuantity}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                            Disponível: {(row.original.maxQuantity || 0) - (row.original.soldQuantity || 0)}
                        </Typography>
                    </div>
                )
            },
            {
                accessorKey: 'maxPerPurchase',
                header: 'Limite/Compra',
                cell: ({ row }) => (
                    <Typography color='text.primary'>
                        {row.original.maxPerPurchase}
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
                            onChange={async () => {
                                try {
                                    await updateStatus(row.original._id, !row.original.isActive)
                                } catch (error) {
                                    console.error('Erro ao atualizar status:', error)
                                }
                            }}
                            size='small'
                        />
                        <Chip
                            label={row.original.isActive ? 'Ativo' : 'Inativo'}
                            color={row.original.isActive ? 'success' : 'secondary'}
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
                                            router.push(`/${lang}/apps/events/view/${id}/tickets/edit/${row.original._id}`)
                                        }
                                    }
                                },
                                {
                                    text: 'Deletar',
                                    icon: <i className='tabler-trash text-xl' />,
                                    menuItemProps: {
                                        onClick: () => {
                                            setTicketTypeToDelete(row.original)
                                            setDeleteDialogOpen(true)
                                        },
                                        sx: { color: 'error.main' }
                                    }
                                }
                            ]}
                        />
                    </div>
                )
            }
        ],
        [router, lang, id, updateStatus]
    )

    const table = useReactTable({
        data: ticketTypes,
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

    const handleDelete = async () => {
        if (!ticketTypeToDelete) return

        try {
            await deleteTicketType(ticketTypeToDelete._id)
            setDeleteDialogOpen(false)
            setTicketTypeToDelete(null)
        } catch (error) {
            console.error('Erro ao deletar tipo de ingresso:', error)
        }
    }

    return (
        <AdminOnly>
            <Card>
                <CardHeader
                    title='Tipos de Ingressos'
                    subheader='Gerencie os tipos de ingressos deste evento'
                    action={
                        <Box className='flex gap-3'>
                            <Button
                                variant='contained'
                                startIcon={<i className='tabler-plus' />}
                                onClick={() => router.push(`/${lang}/apps/events/view/${id}/tickets/create`)}
                            >
                                Criar Tipo de Ingresso
                            </Button>
                            <Button
                                variant='tonal'
                                color='secondary'
                                startIcon={<i className='tabler-arrow-left' />}
                                onClick={() => router.push(`/${lang}/apps/events/view/${id}`)}
                            >
                                Voltar
                            </Button>
                        </Box>
                    }
                />
                <CardContent>
                    {error && (
                        <Alert severity='error' sx={{ mb: 4 }}>
                            {error}
                        </Alert>
                    )}

                    {ticketTypes.length === 0 && !loading ? (
                        <Box className='flex flex-col items-center justify-center py-12'>
                            <i className='tabler-ticket text-6xl text-textSecondary mb-4' />
                            <Typography variant='h6' color='text.secondary' className='mb-2'>
                                Nenhum tipo de ingresso cadastrado
                            </Typography>
                            <Typography variant='body2' color='text.secondary' className='mb-4'>
                                Crie o primeiro tipo de ingresso para este evento
                            </Typography>
                            <Button
                                variant='contained'
                                startIcon={<i className='tabler-plus' />}
                                onClick={() => router.push(`/${lang}/apps/events/view/${id}/tickets/create`)}
                            >
                                Criar Primeiro Tipo de Ingresso
                            </Button>
                        </Box>
                    ) : (
                        <>
                            <div className='flex items-center gap-4 mb-6'>
                                <CustomTextField
                                    value={globalFilter}
                                    onChange={(e) => setGlobalFilter(e.target.value)}
                                    placeholder='Buscar tipos de ingressos...'
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
                                                        Nenhum tipo de ingresso encontrado
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

                            <TablePaginationComponent
                                table={table}
                            />
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Dialog de confirmação de exclusão */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Confirmar exclusão</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Tem certeza que deseja excluir o tipo de ingresso <strong>{ticketTypeToDelete?.name}</strong>?
                        Esta ação não pode ser desfeita.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleDelete} color='error' variant='contained'>
                        Excluir
                    </Button>
                </DialogActions>
            </Dialog>
        </AdminOnly>
    )
}

export default TicketTypesListPage

