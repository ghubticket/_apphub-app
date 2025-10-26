// React Imports
import { useState } from 'react'

// MUI Imports
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid2'

// Third-party Imports
import { useForm, Controller } from 'react-hook-form'

// Component Imports
import CustomTextField from '@core/components/mui/TextField'
import { UserRole } from '@/types/roles'

type Props = {
  open: boolean
  handleClose: () => void
  userData?: any[]
  setData: (data: any[]) => void
}

type FormValidateType = {
  name: string
  username: string
  email: string
  password: string
  role: UserRole
  phone: string
  cpf: string
}

const AddUserDrawer = (props: Props) => {
  // Props
  const { open, handleClose, userData, setData } = props

  // Hooks
  const {
    control,
    reset: resetForm,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValidateType>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'CLIENTE',
      phone: '',
      cpf: ''
    }
  })

  const onSubmit = (data: FormValidateType) => {
    // Aqui você pode implementar a lógica para adicionar usuário via API
    console.log('Adicionar usuário:', data)
    handleClose()
    resetForm()
  }

  const handleReset = () => {
    handleClose()
    resetForm()
  }

  return (
    <Drawer
      open={open}
      anchor='right'
      onClose={handleReset}
      PaperProps={{
        sx: { width: { xs: 300, sm: 400 } }
      }}
    >
      <div className='flex items-center justify-between plb-5 pli-6'>
        <Typography variant='h5'>Add New User</Typography>
        <IconButton size='small' onClick={handleReset}>
          <i className='tabler-x' />
        </IconButton>
      </div>
      <Divider />
      <form noValidate autoComplete='off' onSubmit={handleSubmit(onSubmit)} className='p-6'>
        <Grid container spacing={5}>
          <Grid size={12}>
            <Controller
              name='name'
              control={control}
              rules={{ required: true }}
              render={({ field: { value, onChange } }) => (
                <CustomTextField
                  fullWidth
                  label='Full Name'
                  value={value}
                  onChange={onChange}
                  placeholder='John Doe'
                  error={Boolean(errors.name)}
                  helperText={errors.name ? 'This field is required' : ''}
                />
              )}
            />
          </Grid>
          <Grid size={12}>
            <Controller
              name='username'
              control={control}
              rules={{ required: true }}
              render={({ field: { value, onChange } }) => (
                <CustomTextField
                  fullWidth
                  label='Username'
                  value={value}
                  onChange={onChange}
                  placeholder='johndoe'
                  error={Boolean(errors.email)}
                  helperText={errors.email ? 'This field is required' : ''}
                />
              )}
            />
          </Grid>
          <Grid size={12}>
            <Controller
              name='email'
              control={control}
              rules={{ required: true }}
              render={({ field: { value, onChange } }) => (
                <CustomTextField
                  fullWidth
                  label='Email'
                  value={value}
                  onChange={onChange}
                  placeholder='john.doe@example.com'
                  error={Boolean(errors.email)}
                  helperText={errors.email ? 'This field is required' : ''}
                />
              )}
            />
          </Grid>
          <Grid size={12}>
            <Controller
              name='role'
              control={control}
              rules={{ required: true }}
              render={({ field: { value, onChange } }) => (
                <CustomTextField
                  select
                  fullWidth
                  label='Select Role'
                  value={value}
                  onChange={onChange}
                  error={Boolean(errors.role)}
                  helperText={errors.role ? 'This field is required' : ''}
                >
                  <MenuItem value='CLIENTE'>Client</MenuItem>
                  <MenuItem value='QRCODE'>QR Code</MenuItem>
                  <MenuItem value='ADMIN'>Admin</MenuItem>
                </CustomTextField>
              )}
            />
          </Grid>
          <Grid size={12}>
            <Controller
              name='phone'
              control={control}
              render={({ field: { value, onChange } }) => (
                <CustomTextField
                  fullWidth
                  label='Phone'
                  value={value}
                  onChange={onChange}
                  placeholder='+1 (999) 999-9999'
                />
              )}
            />
          </Grid>
          <Grid size={12}>
            <Controller
              name='cpf'
              control={control}
              render={({ field: { value, onChange } }) => (
                <CustomTextField
                  fullWidth
                  label='CPF'
                  value={value}
                  onChange={onChange}
                  placeholder='000.000.000-00'
                />
              )}
            />
          </Grid>
        </Grid>
        <div className='flex gap-4 mt-6'>
          <Button type='submit' variant='contained' className='flex-1'>
            Add User
          </Button>
          <Button variant='outlined' color='secondary' onClick={handleReset} className='flex-1'>
            Cancel
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export default AddUserDrawer