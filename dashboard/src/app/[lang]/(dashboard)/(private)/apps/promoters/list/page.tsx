'use client'

// React Imports
import type { ReactElement } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid2'

// Component Imports
import { AdminOnly } from '@/components/RoleGuard'
import PromoterCodeListTable from './PromoterCodeListTable'
import PromoterCodeListCards from './PromoterCodeListCards'

const PromoterCodeList = () => {
  return (
    <AdminOnly>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <PromoterCodeListCards />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <PromoterCodeListTable />
        </Grid>
      </Grid>
    </AdminOnly>
  )
}

export default PromoterCodeList

