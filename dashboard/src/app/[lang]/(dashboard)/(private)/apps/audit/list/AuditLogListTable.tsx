'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Divider from '@mui/material/Divider'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Pagination from '@mui/material/Pagination'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'

import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import type { RankingInfo } from '@tanstack/match-sorter-utils'

import CustomTextField from '@core/components/mui/TextField'
import { auditService, type AuditLog } from '@/services/auditService'

import tableStyles from '@core/styles/table.module.css'

const columnHelper = createColumnHelper<AuditLog>()

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

// Função para formatar data
const formatDate = (dateString: string): string => {
    const date = new Date(dateString)

    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })
}

// Função para obter cor do chip de ação
const getActionColor = (action: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    const colors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
        create: 'success',
        update: 'info',
        delete: 'error',
        cancel: 'warning',
        refund: 'warning',
        status_change: 'info',
        payment_update: 'info'
    }

    return colors[action] || 'default'
}

// Função para obter label de ação
const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
        create: 'Criar',
        update: 'Atualizar',
        delete: 'Deletar',
        cancel: 'Cancelar',
        refund: 'Reembolsar',
        status_change: 'Mudar Status',
        payment_update: 'Atualizar Pagamento'
    }

    return labels[action] || action
}

// Função para obter label de tipo de entidade
const getEntityTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
        Order: 'Pedido',
        Ticket: 'Ingresso',
        Event: 'Evento',
        User: 'Usuário',
        TicketType: 'Tipo de Ingresso'
    }

    return labels[type] || type
}

// Componente para exibir detalhes do log
const LogDetailsDialog = ({ log, open, onClose }: { log: AuditLog | null; open: boolean; onClose: () => void }) => {
    if (!log) return null

    return (
        <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
            <DialogTitle>Detalhes do Log de Auditoria</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    <Box>
                        <Typography variant='subtitle2' color='text.secondary'>
                            Tipo de Entidade
                        </Typography>
                        <Typography>{getEntityTypeLabel(log.entityType)}</Typography>
                    </Box>
                    <Box>
                        <Typography variant='subtitle2' color='text.secondary'>
                            ID da Entidade
                        </Typography>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{log.entityId}</Typography>
                    </Box>
                    <Box>
                        <Typography variant='subtitle2' color='text.secondary'>
                            Ação
                        </Typography>
                        <Chip
                            label={getActionLabel(log.action)}
                            color={getActionColor(log.action) as any}
                            size='small'
                            variant='tonal'
                        />
                    </Box>
                    {log.performedBy && (
                        <Box>
                            <Typography variant='subtitle2' color='text.secondary'>
                                Executado Por
                            </Typography>
                            <Typography>{log.performedBy.name} ({log.performedBy.email})</Typography>
                            {log.performedByRole && (
                                <Chip label={log.performedByRole} size='small' variant='outlined' sx={{ mt: 1 }} />
                            )}
                        </Box>
                    )}
                    {log.performedByRole && !log.performedBy && (
                        <Box>
                            <Typography variant='subtitle2' color='text.secondary'>
                                Executado Por
                            </Typography>
                            <Chip label={log.performedByRole} size='small' variant='outlined' />
                        </Box>
                    )}
                    {log.metadata?.ipAddress && (
                        <Box>
                            <Typography variant='subtitle2' color='text.secondary'>
                                IP Address
                            </Typography>
                            <Typography sx={{ fontFamily: 'monospace' }}>{log.metadata.ipAddress}</Typography>
                        </Box>
                    )}
                    {log.metadata?.userAgent && (
                        <Box>
                            <Typography variant='subtitle2' color='text.secondary'>
                                User Agent
                            </Typography>
                            <Typography sx={{ fontSize: '0.875rem' }}>{log.metadata.userAgent}</Typography>
                        </Box>
                    )}
                    {log.changes && log.changes.length > 0 && (
                        <Box>
                            <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 1 }}>
                                Mudanças
                            </Typography>
                            <TableContainer>
                                <Table size='small'>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Campo</TableCell>
                                            <TableCell>Valor Anterior</TableCell>
                                            <TableCell>Novo Valor</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {log.changes.map((change, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                                                        {change.field}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography sx={{ fontSize: '0.875rem' }}>
                                                        {change.oldValue === null || change.oldValue === undefined
                                                            ? '—'
                                                            : String(change.oldValue)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography sx={{ fontSize: '0.875rem' }}>
                                                        {change.newValue === null || change.newValue === undefined
                                                            ? '—'
                                                            : String(change.newValue)}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <Box>
                            <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 1 }}>
                                Metadados
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {Object.entries(log.metadata)
                                    .filter(([key]) => key !== 'ipAddress' && key !== 'userAgent')
                                    .map(([key, value]) => (
                                        <Box key={key}>
                                            <Typography variant='caption' color='text.secondary'>
                                                {key}:
                                            </Typography>
                                            <Typography sx={{ fontSize: '0.875rem' }}>{String(value)}</Typography>
                                        </Box>
                                    ))}
                            </Box>
                        </Box>
                    )}
                    <Box>
                        <Typography variant='subtitle2' color='text.secondary'>
                            Data/Hora
                        </Typography>
                        <Typography>{formatDate(log.createdAt)}</Typography>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Fechar</Button>
            </DialogActions>
        </Dialog>
    )
}

const AuditLogListTable = () => {
    const [globalFilter, setGlobalFilter] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all')
    const [actionFilter, setActionFilter] = useState<string>('all')
    const [roleFilter, setRoleFilter] = useState<string>('all')
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [pagination, setPagination] = useState<{
        page: number
        limit: number
        total: number
        totalPages: number
    } | null>(null)
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
    const [detailsOpen, setDetailsOpen] = useState(false)

    const { lang } = useParams()

    // Carregar logs
    useEffect(() => {
        const loadLogs = async () => {
            setLoading(true)
            setError(null)

            try {
                const filters: any = {
                    page: currentPage,
                    limit: pageSize
                }

                if (entityTypeFilter !== 'all') {
                    filters.entityType = entityTypeFilter
                }

                if (actionFilter !== 'all') {
                    filters.action = actionFilter
                }

                if (roleFilter !== 'all') {
                    filters.performedByRole = roleFilter
                }

                const response = await auditService.list(filters)

                if (response.success) {
                    setLogs(response.data.logs)
                    setPagination(response.data.pagination)
                } else {
                    setError('Erro ao carregar logs de auditoria')
                }
            } catch (err: any) {
                setError(err.message || 'Erro ao carregar logs de auditoria')
            } finally {
                setLoading(false)
            }
        }

        loadLogs()
    }, [currentPage, pageSize, entityTypeFilter, actionFilter, roleFilter])

    // Resetar página quando filtros mudarem
    useEffect(() => {
        setCurrentPage(1)
    }, [entityTypeFilter, actionFilter, roleFilter])

    const columns = useMemo<ColumnDef<AuditLog, any>[]>(
        () => [
            {
                accessorKey: 'createdAt',
                header: 'Data/Hora',
                cell: ({ row }) => (
                    <Typography color='text.primary' sx={{ fontSize: '0.875rem' }}>
                        {formatDate(row.original.createdAt)}
                    </Typography>
                )
            },
            {
                accessorKey: 'entityType',
                header: 'Tipo',
                cell: ({ row }) => (
                    <Chip label={getEntityTypeLabel(row.original.entityType)} size='small' variant='outlined' />
                )
            },
            {
                accessorKey: 'action',
                header: 'Ação',
                cell: ({ row }) => (
                    <Chip
                        label={getActionLabel(row.original.action)}
                        color={getActionColor(row.original.action) as any}
                        size='small'
                        variant='tonal'
                    />
                )
            },
            {
                accessorKey: 'performedBy',
                header: 'Executado Por',
                cell: ({ row }) => {
                    if (row.original.performedBy) {
                        return (
                            <Box>
                                <Typography color='text.primary' sx={{ fontSize: '0.875rem' }}>
                                    {row.original.performedBy.name}
                                </Typography>
                                <Typography variant='caption' color='text.secondary'>
                                    {row.original.performedBy.email}
                                </Typography>
                            </Box>
                        )
                    }

                    return (
                        <Chip
                            label={row.original.performedByRole || 'SYSTEM'}
                            size='small'
                            variant='outlined'
                        />
                    )
                }
            },
            {
                accessorKey: 'entityId',
                header: 'ID da Entidade',
                cell: ({ row }) => (
                    <Typography
                        color='text.primary'
                        sx={{ fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                        {row.original.entityId}
                    </Typography>
                )
            },
            {
                id: 'actions',
                header: 'Ações',
                cell: ({ row }) => (
                    <IconButton
                        size='small'
                        onClick={() => {
                            setSelectedLog(row.original)
                            setDetailsOpen(true)
                        }}
                    >
                        <i className='tabler-eye' />
                    </IconButton>
                ),
                enableSorting: false
            }
        ],
        []
    )

    const table = useReactTable({
        data: logs,
        columns,
        filterFns: {
            fuzzy: fuzzyFilter
        },
        state: {
            globalFilter,
            pagination: {
                pageIndex: currentPage - 1,
                pageSize: pageSize
            }
        },
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: fuzzyFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        manualPagination: true,
        pageCount: pagination ? pagination.totalPages : 0
    })

    if (error) {
        return (
            <Card>
                <CardHeader title='Erro' subheader='Não foi possível carregar os logs de auditoria' />
                <CardContent>
                    <Typography color='error' className='mb-2'>
                        {error}
                    </Typography>
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
                <CardHeader title='Logs de Auditoria' subheader='Histórico de todas as ações importantes no sistema' />
                <CardContent>
                    <div className='flex flex-col md:flex-row md:items-center gap-4 mb-6'>
                        <CustomTextField
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            placeholder='Buscar logs...'
                            className='w-full md:flex-1 md:min-w-[200px]'
                            InputProps={{
                                startAdornment: <i className='tabler-search text-xl text-textSecondary' />
                            }}
                        />
                        <FormControl size='small' sx={{ minWidth: 150 }}>
                            <InputLabel>Tipo de Entidade</InputLabel>
                            <Select
                                value={entityTypeFilter}
                                label='Tipo de Entidade'
                                onChange={(e) => setEntityTypeFilter(e.target.value)}
                            >
                                <MenuItem value='all'>Todos</MenuItem>
                                <MenuItem value='Order'>Pedido</MenuItem>
                                <MenuItem value='Ticket'>Ingresso</MenuItem>
                                <MenuItem value='Event'>Evento</MenuItem>
                                <MenuItem value='User'>Usuário</MenuItem>
                                <MenuItem value='TicketType'>Tipo de Ingresso</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size='small' sx={{ minWidth: 150 }}>
                            <InputLabel>Ação</InputLabel>
                            <Select value={actionFilter} label='Ação' onChange={(e) => setActionFilter(e.target.value)}>
                                <MenuItem value='all'>Todas</MenuItem>
                                <MenuItem value='create'>Criar</MenuItem>
                                <MenuItem value='update'>Atualizar</MenuItem>
                                <MenuItem value='delete'>Deletar</MenuItem>
                                <MenuItem value='cancel'>Cancelar</MenuItem>
                                <MenuItem value='refund'>Reembolsar</MenuItem>
                                <MenuItem value='status_change'>Mudar Status</MenuItem>
                                <MenuItem value='payment_update'>Atualizar Pagamento</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size='small' sx={{ minWidth: 150 }}>
                            <InputLabel>Role</InputLabel>
                            <Select value={roleFilter} label='Role' onChange={(e) => setRoleFilter(e.target.value)}>
                                <MenuItem value='all'>Todas</MenuItem>
                                <MenuItem value='ADMIN'>Admin</MenuItem>
                                <MenuItem value='CLIENTE'>Cliente</MenuItem>
                                <MenuItem value='QRCODE'>QR Code</MenuItem>
                                <MenuItem value='SYSTEM'>Sistema</MenuItem>
                            </Select>
                        </FormControl>
                    </div>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <Typography>Carregando...</Typography>
                        </Box>
                    ) : logs.length === 0 ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <Typography color='text.secondary'>Nenhum log encontrado</Typography>
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
                                                        {header.isPlaceholder
                                                            ? null
                                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                                    </th>
                                                ))}
                                            </tr>
                                        ))}
                                    </thead>
                                    <tbody>
                                        {table.getRowModel().rows.map((row) => (
                                            <tr key={row.id}>
                                                {row.getVisibleCells().map((cell) => (
                                                    <td key={cell.id}>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {pagination && pagination.totalPages > 1 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4 }}>
                                    <Typography variant='body2' color='text.secondary'>
                                        Mostrando {((currentPage - 1) * pageSize) + 1} a{' '}
                                        {Math.min(currentPage * pageSize, pagination.total)} de {pagination.total} logs
                                    </Typography>
                                    <Pagination
                                        count={pagination.totalPages}
                                        page={currentPage}
                                        onChange={(_, page) => setCurrentPage(page)}
                                        color='primary'
                                    />
                                </Box>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            <LogDetailsDialog log={selectedLog} open={detailsOpen} onClose={() => setDetailsOpen(false)} />
        </>
    )
}

export default AuditLogListTable
