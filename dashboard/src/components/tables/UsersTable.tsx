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
    TextField,
    InputAdornment,
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
    Search,
    FilterList,
    Refresh
} from '@mui/icons-material'

// Interface para usuário
interface User {
    _id: string
    name: string
    email: string
    role: 'ADMIN' | 'TURMA'
    phone?: string
    cpf?: string
    isActive: boolean
    lastLogin?: string
    createdAt: string
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
    const [searchTerm, setSearchTerm] = useState('')
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [userToDelete, setUserToDelete] = useState<User | null>(null)

    // Filtrar usuários baseado na busca
    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )

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
            {/* Header com busca e ações */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                        Usuários ({filteredUsers.length})
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            size="small"
                            placeholder="Buscar usuários..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search />
                                    </InputAdornment>
                                )
                            }}
                        />
                        <Button
                            variant="outlined"
                            startIcon={<FilterList />}
                            size="small"
                        >
                            Filtros
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<Refresh />}
                            onClick={onRefresh}
                            size="small"
                        >
                            Atualizar
                        </Button>
                    </Box>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
            </Box>

            {/* Tabela */}
            <TableContainer>
                <Table>
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
                                    active={orderBy === 'email'}
                                    direction={orderBy === 'email' ? order : 'asc'}
                                    onClick={() => handleSort('email')}
                                >
                                    Email
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
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Avatar
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    mr: 2,
                                                    bgcolor: user.isActive ? 'primary.main' : 'grey.400'
                                                }}
                                            >
                                                {user.name.charAt(0).toUpperCase()}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight="bold">
                                                    {user.name}
                                                </Typography>
                                                {user.phone && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {user.phone}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {user.email}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={user.role}
                                            color={user.role === 'ADMIN' ? 'primary' : 'default'}
                                            size="small"
                                        />
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
                                        <IconButton
                                            size="small"
                                            onClick={(e) => handleMenuClick(e, user)}
                                        >
                                            <MoreVert />
                                        </IconButton>
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
