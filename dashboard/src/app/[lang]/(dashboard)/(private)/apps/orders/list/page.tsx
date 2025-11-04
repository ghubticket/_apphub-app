'use client'

// React Imports
import type { ReactElement } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid2'

// Component Imports
import { AdminOnly } from '@/components/RoleGuard'
import OrderListTable from './OrderListTable'
import OrderListCards from './OrderListCards'

const OrderList = () => {
  return (
    <AdminOnly>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <OrderListCards />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <OrderListTable />
        </Grid>
      </Grid>
    </AdminOnly>
  )
}

export default OrderList

