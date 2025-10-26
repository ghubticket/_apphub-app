'use client'

import { Chip, Box, Typography } from '@mui/material'
import { useUserRole } from '@/hooks/useUserRole'

export const UserRoleBadge = () => {
  const { roleConfig, user } = useUserRole()

  if (!roleConfig || !user) {
    return null
  }

  return (
    <Box className="flex items-center gap-2">
      <Chip
        label={roleConfig.label}
        color={roleConfig.color as any}
        size="small"
        icon={<i className={roleConfig.icon} />}
        variant="outlined"
      />
      <Typography variant="caption" className="text-gray-500">
        {user.name}
      </Typography>
    </Box>
  )
}
