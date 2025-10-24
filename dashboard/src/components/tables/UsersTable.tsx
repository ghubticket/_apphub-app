'use client'

import React, { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Checkbox,
    IconButton,
    Menu,
    MenuItem,
    Chip,
    Avatar,
    Typography,
    Box,
    Tooltip,
    TablePagination,
    TableSortLabel,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress
} from '@mui/material'
import {
    MoreVert,
    Edit,
    Block,
    CheckCircle,
    Delete,
} from '@mui/icons-material'

// Interface para usuário
interface User {
    _id: string
    name: string
    email: string
    role: 'ADMIN' | 'CLIENTE' | 'QRCODE'
    phone?: string
    cpf?: string
    isActive: boolean
    lastLogin?: string
    createdAt: string
}

// Função para gerar cor aleatória baseada no nome
const getAvatarColor = (name: string): string => {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
        '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
        '#A9DFBF', '#F9E79F', '#AED6F1', '#D5DBDB', '#FADBD8'
    ]
    
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    return colors[Math.abs(hash) % colors.length]
}

// Função para obter ícone e cor do role (baseado no tema Vuexy)
const getRoleIcon = (role: string) => {
    switch (role) {
        case 'ADMIN':
            return { 
                icon: 'tabler-crown', 
                color: 'text-primary', 
                label: 'Admin' 
            }
        case 'CLIENTE':
            return { 
                icon: 'tabler-user', 
                color: 'text-success', 
                label: 'Cliente' 
            }
        case 'QRCODE':
            return { 
                icon: 'tabler-qrcode', 
                color: 'text-info', 
                label: 'QR Code' 
            }
        default:
            return { 
                icon: 'tabler-user', 
                color: 'text-secondary', 
                label: role 
            }
    }
}

// Interface para props
interface UsersTableProps {
    users: User[]
    loading?: boolean
    error?: string | null
    onUpdateStatus?: (userId: string, isActive: boolean) => void
    onEdit?: (user: User) => void
    onDelete?: (userId: string) => void
    onRefresh?: () => void
}

export default function UsersTable({
    users,
    loading = false,
    error = null,
    onUpdateStatus,
    onEdit,
    onDelete,
    onRefresh
}: UsersTableProps) {
    const [selected, setSelected] = useState<string[]>([])
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(10)
    const [orderBy, setOrderBy] = useState<keyof User>('name')
    const [order, setOrder] = useState<'asc' | 'desc'>('asc')
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [userToDelete, setUserToDelete] = useState<User | null>(null)

    // Usar todos os usuários (sem filtro de busca)
    const filteredUsers = users

    // Ordenar usuários
    const sortedUsers = [...filteredUsers].sort((a, b) => {
        const aValue = a[orderBy] || ''
        const bValue = b[orderBy] || ''

        if (order === 'asc') {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        } else {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
        }
    })

    // Paginação
    const paginatedUsers = sortedUsers.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    )

    // Handlers
    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const newSelected = paginatedUsers.map(user => user._id)
            setSelected(newSelected)
        } else {
            setSelected([])
        }
    }

    const handleClick = (event: React.MouseEvent<unknown>, userId: string) => {
        const selectedIndex = selected.indexOf(userId)
        let newSelected: string[] = []

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, userId)
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1))
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1))
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1)
            )
        }

        setSelected(newSelected)
    }

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>, user: User) => {
        setAnchorEl(event.currentTarget)
        setSelectedUser(user)
    }

    const handleMenuClose = () => {
        setAnchorEl(null)
        setSelectedUser(null)
    }

    const handleSort = (property: keyof User) => {
        const isAsc = orderBy === property && order === 'asc'
        setOrder(isAsc ? 'desc' : 'asc')
        setOrderBy(property)
    }

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10))
        setPage(0)
    }

    const handleUpdateStatus = (user: User) => {
        if (onUpdateStatus) {
            onUpdateStatus(user._id, !user.isActive)
        }
        handleMenuClose()
    }

    const handleEdit = (user: User) => {
        if (onEdit) {
            onEdit(user)
        }
        handleMenuClose()
    }

    const handleDeleteClick = (user: User) => {
        setUserToDelete(user)
        setDeleteDialogOpen(true)
        handleMenuClose()
    }

    const handleDeleteConfirm = () => {
        if (userToDelete && onDelete) {
            onDelete(userToDelete._id)
        }
        setDeleteDialogOpen(false)
        setUserToDelete(null)
    }

    const isSelected = (userId: string) => selected.indexOf(userId) !== -1

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                <CircularProgress />
            </Box>
        )
    }

    return (
        <Paper>
            {/* Header */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                    Usuários ({filteredUsers.length})
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
            </Box>

            {/* Tabela */}
            <TableContainer>
                <Table sx={{ '& .MuiTableCell-root': { padding: '16px 24px' } }}>
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={selected.length > 0 && selected.length < paginatedUsers.length}
                                    checked={paginatedUsers.length > 0 && selected.length === paginatedUsers.length}
                                    onChange={handleSelectAllClick}
                                />
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'name'}
                                    direction={orderBy === 'name' ? order : 'asc'}
                                    onClick={() => handleSort('name')}
                                >
                                    Usuário
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'role'}
                                    direction={orderBy === 'role' ? order : 'asc'}
                                    onClick={() => handleSort('role')}
                                >
                                    Role
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'isActive'}
                                    direction={orderBy === 'isActive' ? order : 'asc'}
                                    onClick={() => handleSort('isActive')}
                                >
                                    Status
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'createdAt'}
                                    direction={orderBy === 'createdAt' ? order : 'asc'}
                                    onClick={() => handleSort('createdAt')}
                                >
                                    Criado em
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedUsers.map((user) => {
                            const isItemSelected = isSelected(user._id)
                            const labelId = `enhanced-table-checkbox-${user._id}`

                            return (
                                <TableRow
                                    key={user._id}
                                    hover
                                    role="checkbox"
                                    aria-checked={isItemSelected}
                                    selected={isItemSelected}
                                    onClick={(event) => handleClick(event, user._id)}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={isItemSelected}
                                            inputProps={{ 'aria-labelledby': labelId }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Avatar
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    bgcolor: getAvatarColor(user.name),
                                                    color: 'white',
                                                    fontWeight: 'bold',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                {user.name.charAt(0).toUpperCase()}
                                            </Avatar>
                                            <Box>
                                                <Typography 
                                                    variant="subtitle1" 
                                                    fontWeight="600"
                                                    sx={{ color: 'text.primary', mb: 0.5 }}
                                                >
                                                    {user.name}
                                                </Typography>
                                                <Typography 
                                                    variant="body2" 
                                                    sx={{ color: 'text.secondary' }}
                                                >
                                                    {user.email}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <i 
                                                className={`icon-base ti ${getRoleIcon(user.role).icon} icon-lg ${getRoleIcon(user.role).color} me-3`}
                                            />
                                            <Typography sx={{ fontWeight: 500, fontSize: '1.1rem' }}>
                                                {getRoleIcon(user.role).label}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={user.isActive ? 'Ativo' : 'Inativo'}
                                            color={user.isActive ? 'success' : 'error'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                            <Tooltip title="Excluir">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => onDelete?.(user._id)}
                                                    sx={{ 
                                                        color: 'text.secondary',
                                                        '&:hover': { 
                                                            backgroundColor: 'action.hover',
                                                            borderRadius: '50%'
                                                        }
                                                    }}
                                                >
                                                    <i className="icon-base ti tabler-trash icon-22px" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Visualizar">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => console.log('Visualizar', user)}
                                                    sx={{ 
                                                        color: 'text.secondary',
                                                        '&:hover': { 
                                                            backgroundColor: 'action.hover',
                                                            borderRadius: '50%'
                                                        }
                                                    }}
                                                >
                                                    <i className="icon-base ti tabler-eye icon-22px" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Mais opções">
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleMenuClick(e, user)}
                                                    sx={{ 
                                                        color: 'text.secondary',
                                                        '&:hover': { 
                                                            backgroundColor: 'action.hover',
                                                            borderRadius: '50%'
                                                        }
                                                    }}
                                                >
                                                    <i className="icon-base ti tabler-dots-vertical icon-35px" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Paginação */}
            <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredUsers.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Linhas por página:"
                labelDisplayedRows={({ from, to, count }) =>
                    `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
                }
            />

            {/* Menu de ações */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={() => selectedUser && handleEdit(selectedUser)}>
                    <Edit sx={{ mr: 1 }} />
                    Editar
                </MenuItem>
                <MenuItem
                    onClick={() => selectedUser && handleUpdateStatus(selectedUser)}
                    sx={{ color: selectedUser?.isActive ? 'error.main' : 'success.main' }}
                >
                    {selectedUser?.isActive ? <Block sx={{ mr: 1 }} /> : <CheckCircle sx={{ mr: 1 }} />}
                    {selectedUser?.isActive ? 'Desativar' : 'Ativar'}
                </MenuItem>
                <MenuItem
                    onClick={() => selectedUser && handleDeleteClick(selectedUser)}
                    sx={{ color: 'error.main' }}
                >
                    <Delete sx={{ mr: 1 }} />
                    Excluir
                </MenuItem>
            </Menu>

            {/* Dialog de confirmação de exclusão */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogContent>
                    <Typography>
                        Tem certeza que deseja excluir o usuário <strong>{userToDelete?.name}</strong>?
                        Esta ação não pode ser desfeita.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        color="error"
                        variant="contained"
                    >
                        Excluir
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    )
}
