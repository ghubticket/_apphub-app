'use client'

// MUI Imports
import Grid from '@mui/material/Grid2'

// Component Imports
import { AdminOnly } from '@/components/RoleGuard'
import UserListTable from './UserListTable'
import UserListCards from './UserListCards'

const UserList = () => {
  return (
    <AdminOnly>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <UserListCards />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <UserListTable />
        </Grid>
      </Grid>
    </AdminOnly>
  )
}

export default UserList