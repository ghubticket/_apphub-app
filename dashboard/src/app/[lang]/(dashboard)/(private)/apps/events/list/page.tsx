'use client'

import Grid from '@mui/material/Grid2'
import { AdminOnly } from '@/components/RoleGuard'
import EventListTable from './EventListTable'
import EventListCards from './EventListCards'

const EventListPage = () => {
    return (
        <AdminOnly>
            <Grid container spacing={6}>
                <Grid size={{ xs: 12 }}>
                    <EventListCards />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <EventListTable />
                </Grid>
            </Grid>
        </AdminOnly>
    )
}

export default EventListPage


