'use client'

// React Imports
import { useEffect, useState, useMemo } from 'react'

// Next Imports
import Link from 'next/link'
import { useParams } from 'next/navigation'

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
import type { TextFieldProps } from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import CardContent from '@mui/material/CardContent'

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
import { UserRole } from '@/types/roles'

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

    // Hooks
    const { lang: locale } = useParams()
    const { users, loading, error, pagination, updateUserStatus } = useUsers({
        limit: 10,
        role: roleFilter === 'all' ? undefined : roleFilter as UserRole,
        status: statusFilter === 'all' ? undefined : statusFilter === 'true'
    })

    // Update data when users change
    useEffect(() => {
        if (users) {
            setData(users)
            setFilteredData(users)
        }
    }, [users])

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
                    <div className='flex items-center gap-2'>
                        <OptionMenu
                            iconButtonProps={{ size: 'small' }}
                            options={[
                                {
                                    text: 'View',
                                    icon: 'tabler-eye',
                                    menuItemProps: {
                                        onClick: () => console.log('View user')
                                    }
                                },
                                {
                                    text: 'Edit',
                                    icon: 'tabler-edit',
                                    menuItemProps: {
                                        onClick: () => console.log('Edit user')
                                    }
                                },
                                {
                                    text: 'Delete',
                                    icon: 'tabler-trash',
                                    menuItemProps: {
                                        onClick: () => console.log('Delete user')
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
            globalFilter
        },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: fuzzyFilter,
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        getFacetedMinMaxValues: getFacetedMinMaxValues(),
        getPaginationRowModel: getPaginationRowModel(),
        filterFns: {
            fuzzy: fuzzyFilter
        }
    })

    if (loading) {
        return (
            <Card>
                <CardContent>
                    <Typography>Carregando usuários...</Typography>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardContent>
                    <Typography color='error'>Erro ao carregar usuários: {error}</Typography>
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Card>
                <CardHeader title='Filters' className='pbe-4' />

                {/* Filtros e Busca */}
                <div className='p-6 border-bs'>
                    <div className='flex flex-col lg:flex-row gap-4 w-full'>
                        <CustomTextField
                            select
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value as UserRole | 'all')}
                            placeholder='Filtrar por Role'
                            className='flex-1'
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    height: '60px',
                                    fontSize: '14px'
                                }
                            }}
                        >
                            <MenuItem value='all'>Todas as Roles</MenuItem>
                            <MenuItem value='ADMIN'>Admin</MenuItem>
                            <MenuItem value='QRCODE'>QR Code</MenuItem>
                            <MenuItem value='CLIENTE'>Cliente</MenuItem>
                        </CustomTextField>
                        <CustomTextField
                            select
                            value={statusFilter}
                            onChange={e => {
                                const value = e.target.value
                                if (value === 'all' || value === 'true' || value === 'false') {
                                    setStatusFilter(value)
                                }
                            }}
                            placeholder='Filtrar por Status'
                            className='flex-1'
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    height: '60px',
                                    fontSize: '14px'
                                }
                            }}
                        >
                            <MenuItem value='all'>Todos os Status</MenuItem>
                            <MenuItem value='true'>Ativo</MenuItem>
                            <MenuItem value='false'>Inativo</MenuItem>
                        </CustomTextField>
                        <DebouncedInput
                            value={globalFilter ?? ''}
                            onChange={value => setGlobalFilter(String(value))}
                            placeholder='Search User'
                            className='flex-1'
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    height: '60px',
                                    fontSize: '14px'
                                }   
                            }}
                        />
                    </div>
                </div>

                <div className='flex justify-between flex-col items-start md:flex-row md:items-center p-6 border-bs gap-4'>
                    <CustomTextField
                        select
                        value={table.getState().pagination.pageSize}
                        onChange={e => table.setPageSize(Number(e.target.value))}
                        className='max-sm:is-full sm:is-[70px]'
                    >
                        <MenuItem value='10'>10</MenuItem>
                        <MenuItem value='25'>25</MenuItem>
                        <MenuItem value='50'>50</MenuItem>
                    </CustomTextField>
                    <div className='flex flex-col sm:flex-row max-sm:is-full items-start sm:items-center gap-4'>
                        <Button
                            color='secondary'
                            variant='tonal'
                            startIcon={<i className='tabler-upload' />}
                            className='max-sm:is-full'
                        >
                            Export
                        </Button>
                        <Button
                            variant='contained'
                            startIcon={<i className='tabler-plus' />}
                            onClick={() => setAddUserOpen(!addUserOpen)}
                            className='max-sm:is-full'
                        >
                            Add New User
                        </Button>
                    </div>
                </div>
                <div className='overflow-x-auto'>
                    <table className={tableStyles.table}>
                        <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id}>
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        {table.getFilteredRowModel().rows.length === 0 ? (
                            <tbody>
                                <tr>
                                    <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                                        No data available
                                    </td>
                                </tr>
                            </tbody>
                        ) : (
                            <tbody>
                                {table
                                    .getRowModel()
                                    .rows.slice(0, table.getState().pagination.pageSize)
                                    .map(row => {
                                        return (
                                            <tr key={row.id} className={classnames({ selected: row.getIsSelected() })}>
                                                {row.getVisibleCells().map(cell => (
                                                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                                                ))}
                                            </tr>
                                        )
                                    })}
                            </tbody>
                        )}
                    </table>
                </div>
                <TablePagination
                    component={() => <TablePaginationComponent table={table} />}
                    count={table.getFilteredRowModel().rows.length}
                    rowsPerPage={table.getState().pagination.pageSize}
                    page={table.getState().pagination.pageIndex}
                    onPageChange={(_, page) => {
                        table.setPageIndex(page)
                    }}
                />
            </Card>
        </>
    )
}

export default UserListTable