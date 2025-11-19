'use client'

// React Imports
import { useEffect, useState, useMemo } from 'react'

// Next Imports
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import { styled } from '@mui/material/styles'
import TablePagination from '@mui/material/TablePagination'
import Pagination from '@mui/material/Pagination'
import type { TextFieldProps } from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Switch from '@mui/material/Switch'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'

// Third-party Imports
import classnames from 'classnames'
import { rankItem } from '@tanstack/match-sorter-utils'
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getFilteredRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFacetedMinMaxValues,
    getPaginationRowModel,
    getSortedRowModel
} from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import type { RankingInfo } from '@tanstack/match-sorter-utils'

// Type Imports
import type { ThemeColor } from '@core/types'
import type { Locale } from '@configs/i18n'
import type { UserRole } from '@/types/roles'

// Component Imports
import OptionMenu from '@core/components/option-menu'
import TablePaginationComponent from '@components/TablePaginationComponent'
import CustomTextField from '@core/components/mui/TextField'
import CustomAvatar from '@core/components/mui/Avatar'

// Hook Imports
import { useUsers } from '@/hooks/useUsers'

// Util Imports
import { getInitials } from '@/utils/getInitials'
import { getLocalizedUrl } from '@/utils/i18n'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

declare module '@tanstack/table-core' {
    interface FilterFns {
        fuzzy: FilterFn<unknown>
    }
    interface FilterMeta {
        itemRank: RankingInfo
    }
}

// Styled Components
const Icon = styled('i')(({ theme }) => ({
    cursor: 'pointer',
    fontSize: '1.25rem',
    color: theme.palette.text.secondary,
    '&:hover': {
        color: theme.palette.primary.main
    }
}))

// Vars
const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
    const itemRank = rankItem(row.getValue(columnId), value)

    addMeta({
        itemRank
    })
    
return itemRank.passed
}

const DebouncedInput = ({
    value: initialValue,
    onChange,
    debounce = 500,
    ...props
}: {
    value: string | number
    onChange: (value: string | number) => void
    debounce?: number
} & Omit<TextFieldProps, 'onChange'>) => {
    const [value, setValue] = useState(initialValue)

    useEffect(() => {
        setValue(initialValue)
    }, [initialValue])

    useEffect(() => {
        const timeout = setTimeout(() => {
            onChange(value)
        }, debounce)

        return () => clearTimeout(timeout)
    }, [value, onChange, debounce])

    return <CustomTextField {...props} value={value} onChange={e => setValue(e.target.value)} />
}

const userRoleObj = {
    ADMIN: { icon: 'tabler-crown', color: 'error' },
    QRCODE: { icon: 'tabler-qrcode', color: 'primary' },
    CLIENTE: { icon: 'tabler-user', color: 'success' }
}

const userStatusObj = {
    active: 'success',
    inactive: 'secondary'
}

// Column Definitions
const columnHelper = createColumnHelper<any>()

const UserListTable = ({ tableData }: { tableData?: any[] }) => {
    // States
    const [addUserOpen, setAddUserOpen] = useState(false)
    const [rowSelection, setRowSelection] = useState({})
    const [data, setData] = useState<any[]>([])
    const [filteredData, setFilteredData] = useState<any[]>(data)
    const [globalFilter, setGlobalFilter] = useState('')
    const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
    const [statusFilter, setStatusFilter] = useState<'all' | 'true' | 'false'>('all')
    const [suspiciousFilter, setSuspiciousFilter] = useState<'all' | 'true' | 'false'>('all')
    const [blacklistedFilter, setBlacklistedFilter] = useState<'all' | 'true' | 'false'>('all')

    // Hooks
    const { lang: locale } = useParams()
    const router = useRouter()
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    
    const { users, loading, error, pagination, updateUserStatus } = useUsers({
        page: currentPage,
        limit: pageSize,
        role: roleFilter === 'all' ? undefined : roleFilter as UserRole,
        status: statusFilter === 'all' ? undefined : statusFilter === 'true',
        suspicious: suspiciousFilter === 'all' ? undefined : suspiciousFilter === 'true',
        blacklisted: blacklistedFilter === 'all' ? undefined : blacklistedFilter === 'true',
        search: globalFilter || undefined
    })

    // Update data when users change (sem filtros locais - busca no backend)
    useEffect(() => {
        if (users) {
            setData(users)
            setFilteredData(users) // Sem filtros locais, apenas para display
        }
    }, [users])
    
    // Resetar página quando filtros mudarem
    useEffect(() => {
        setCurrentPage(1)
    }, [roleFilter, statusFilter, suspiciousFilter, blacklistedFilter, globalFilter])

    const columns = useMemo<ColumnDef<any, any>[]>(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <Checkbox
                        {...{
                            checked: table.getIsAllRowsSelected(),
                            indeterminate: table.getIsSomeRowsSelected(),
                            onChange: table.getToggleAllRowsSelectedHandler()
                        }}
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        {...{
                            checked: row.getIsSelected(),
                            disabled: !row.getCanSelect(),
                            indeterminate: row.getIsSomeSelected(),
                            onChange: row.getToggleSelectedHandler()
                        }}
                    />
                )
            },
            {
                accessorKey: 'name',
                header: 'User',
                cell: ({ row }) => (
                    <div className='flex items-center gap-4'>
                        <CustomAvatar src={row.original.image} alt={row.original.name}>
                            {getInitials(row.original.name)}
                        </CustomAvatar>
                        <div className='flex flex-col'>
                            <Typography color='text.primary' className='font-medium'>
                                {row.original.name}
                            </Typography>
                            <Typography variant='body2'>{row.original.email}</Typography>
                        </div>
                    </div>
                )
            },
            {
                accessorKey: 'role',
                header: 'Role',
                cell: ({ row }) => {
                    const role = row.original.role as UserRole
                    const roleConfig = userRoleObj[role]

                    
return (
                        <div className='flex items-center gap-2'>
                            <Icon
                                className={roleConfig?.icon}
                                sx={{ color: `var(--mui-palette-${roleConfig?.color}-main)` }}
                            />
                            <Typography className='capitalize' color='text.primary'>
                                {row.original.role}
                            </Typography>
                        </div>
                    )
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
                                    await updateUserStatus(row.original._id, !row.original.isActive)
                                } catch (error) {
                                    console.error('Erro ao atualizar status:', error)
                                }
                            }}
                            size='small'
                        />
                        <Chip
                            label={row.original.isActive ? 'Active' : 'Inactive'}
                            color={userStatusObj[row.original.isActive ? 'active' : 'inactive'] as ThemeColor}
                            size='small'
                            variant='tonal'
                        />
                    </div>
                )
            },
            {
                accessorKey: 'security',
                header: 'Segurança',
                cell: ({ row }) => {
                    const isSuspicious = row.original.isSuspicious
                    const isBlacklisted = row.original.isBlacklisted
                    const suspiciousCount = row.original.suspiciousActivityCount || 0
                    
                    return (
                        <div className='flex items-center gap-2 flex-wrap'>
                            {isBlacklisted && (
                                <Chip
                                    label='BLOQUEADO'
                                    color='error'
                                    size='small'
                                    variant='tonal'
                                    icon={<i className='tabler-ban text-base' />}
                                />
                            )}
                            {isSuspicious && !isBlacklisted && (
                                <Chip
                                    label={`SUSPEITO${suspiciousCount > 0 ? ` (${suspiciousCount})` : ''}`}
                                    color='warning'
                                    size='small'
                                    variant='tonal'
                                    icon={<i className='tabler-alert-triangle text-base' />}
                                />
                            )}
                            {!isSuspicious && !isBlacklisted && (
                                <Chip
                                    label='OK'
                                    color='success'
                                    size='small'
                                    variant='tonal'
                                />
                            )}
                        </div>
                    )
                }
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
                    <div className='flex items-center gap-2'>
                        <OptionMenu
                            iconButtonProps={{ size: 'small' }}
                            options={[
                                {
                                    text: 'Visualizar',
                                    icon: 'tabler-eye',
                                    menuItemProps: {
                                        onClick: () => router.push(`/${locale}/apps/user/edit/${row.original._id}`)
                                    }
                                }
                            ]}
                        />
                    </div>
                )
            }
        ],
        [locale, updateUserStatus]
    )

    const table = useReactTable({
        data: filteredData,
        columns,
        state: {
            rowSelection,
            globalFilter,
            pagination: {
                pageIndex: currentPage - 1,
                pageSize: pageSize
            }
        },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: fuzzyFilter,
        getSortedRowModel: getSortedRowModel(),
        manualPagination: true, // Paginação controlada pelo backend
        pageCount: pagination ? pagination.totalPages : 0,
        filterFns: {
            fuzzy: fuzzyFilter
        }
    })

    // Verificar se há filtros aplicados
    const hasActiveFilters = 
        globalFilter !== '' ||
        roleFilter !== 'all' ||
        statusFilter !== 'all' ||
        suspiciousFilter !== 'all' ||
        blacklistedFilter !== 'all'

    if (error) {
        return (
            <Card>
                <CardHeader
                    title='Erro'
                    subheader='Não foi possível carregar os usuários'
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
                    title='Usuários'
                    subheader='Lista de todos os usuários cadastrados'
                />
                <CardContent>
                    {/* Sempre mostrar os filtros */}
                    <div className='flex items-center gap-4 mb-6 flex-wrap'>
                        <CustomTextField
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            placeholder='Buscar usuários...'
                            className='flex-1 min-w-[200px]'
                            InputProps={{
                                startAdornment: <i className='tabler-search text-xl text-textSecondary' />
                            }}
                        />
                        <Select
                            value={roleFilter}
                            onChange={(e: any) => setRoleFilter(e.target.value as UserRole | 'all')}
                            size='small'
                        >
                            <MenuItem value='all'>Todas as Roles</MenuItem>
                            <MenuItem value='ADMIN'>Admin</MenuItem>
                            <MenuItem value='QRCODE'>QR Code</MenuItem>
                            <MenuItem value='CLIENTE'>Cliente</MenuItem>
                        </Select>
                        <Select
                            value={statusFilter}
                            onChange={(e: any) => {
                                const value = e.target.value

                                if (value === 'all' || value === 'true' || value === 'false') {
                                    setStatusFilter(value)
                                }
                            }}
                            size='small'
                        >
                            <MenuItem value='all'>Todos os Status</MenuItem>
                            <MenuItem value='true'>Ativo</MenuItem>
                            <MenuItem value='false'>Inativo</MenuItem>
                        </Select>
                        <Select
                            value={suspiciousFilter}
                            onChange={(e: any) => {
                                const value = e.target.value

                                if (value === 'all' || value === 'true' || value === 'false') {
                                    setSuspiciousFilter(value)
                                }
                            }}
                            size='small'
                        >
                            <MenuItem value='all'>Todos (Suspeitos)</MenuItem>
                            <MenuItem value='true'>Suspeitos</MenuItem>
                            <MenuItem value='false'>Não Suspeitos</MenuItem>
                        </Select>
                        <Select
                            value={blacklistedFilter}
                            onChange={(e: any) => {
                                const value = e.target.value

                                if (value === 'all' || value === 'true' || value === 'false') {
                                    setBlacklistedFilter(value)
                                }
                            }}
                            size='small'
                        >
                            <MenuItem value='all'>Todos (Blacklist)</MenuItem>
                            <MenuItem value='true'>Bloqueados</MenuItem>
                            <MenuItem value='false'>Não Bloqueados</MenuItem>
                        </Select>
                    </div>

                    {loading ? (
                        <Box className='flex flex-col items-center justify-center py-12'>
                            <i className='tabler-loader-2 animate-spin text-6xl text-textSecondary mb-4' />
                            <Typography variant='h6' color='text.secondary'>
                                Carregando usuários...
                            </Typography>
                        </Box>
                    ) : data.length === 0 ? (
                        <Box className='flex flex-col items-center justify-center py-12'>
                            <i className='tabler-users text-6xl text-textSecondary mb-4' />
                            <Typography variant='h6' color='text.secondary' className='mb-2'>
                                {hasActiveFilters 
                                    ? 'Não foram encontrados resultados para esse filtro'
                                    : 'Nenhum usuário encontrado'
                                }
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                                {hasActiveFilters
                                    ? 'Tente ajustar os filtros acima para ver outros resultados'
                                    : 'Os usuários aparecerão aqui quando forem criados'
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
                                        {table.getFilteredRowModel().rows.length === 0 ? (
                                            <tr>
                                                <td colSpan={table.getAllColumns().length} className='text-center'>
                                                    <Typography variant='body2' color='text.secondary' className='py-8'>
                                                        Nenhum usuário encontrado
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
                                    <div className='flex justify-between items-center flex-wrap pli-6 border-bs bs-auto plb-[12.5px] gap-2'>
                                        <Typography color='text.disabled'>
                                            {pagination ? (
                                                `Mostrando ${pagination.total === 0
                                                    ? 0
                                                    : (currentPage - 1) * pageSize + 1
                                                } a ${Math.min(currentPage * pageSize, pagination.total)} de ${pagination.total} registros`
                                            ) : (
                                                `Mostrando ${filteredData.length} registros`
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
                                count={pagination?.total || filteredData.length}
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
        </>
    )
}

export default UserListTable