// MUI Imports
import Pagination from '@mui/material/Pagination'
import Typography from '@mui/material/Typography'

// Third Party Imports
import type { useReactTable } from '@tanstack/react-table'

const TablePaginationComponent = ({ table }: { table: ReturnType<typeof useReactTable> }) => {
  return (
    <div className='flex flex-col md:flex-row md:justify-between md:items-center gap-3 border-bs bs-auto pt-5'>
      <Typography color='text.disabled' className='text-sm md:text-base text-center md:text-left'>
        {`Showing ${
          table.getFilteredRowModel().rows.length === 0
            ? 0
            : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1
        }
        to ${Math.min(
          (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
          table.getFilteredRowModel().rows.length
        )} of ${table.getFilteredRowModel().rows.length} entries`}
      </Typography>
      <Pagination
        shape='rounded'
        color='primary'
        variant='tonal'
        count={Math.ceil(table.getFilteredRowModel().rows.length / table.getState().pagination.pageSize)}
        page={table.getState().pagination.pageIndex + 1}
        onChange={(_, page) => {
          table.setPageIndex(page - 1)
        }}
        showFirstButton
        showLastButton
        size='small'
        sx={{
          '& .MuiPagination-ul': {
            flexWrap: 'wrap',
            justifyContent: 'center'
          }
        }}
      />
    </div>
  )
}

export default TablePaginationComponent
