'use client'

// React Imports
import type { ReactElement } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid2'

// Component Imports
import { AdminOnly } from '@/components/RoleGuard'
import AuditLogListTable from './AuditLogListTable'

const AuditLogList = () => {
  return (
    <AdminOnly>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <AuditLogListTable />
        </Grid>
      </Grid>
    </AdminOnly>
  )
}

export default AuditLogList
