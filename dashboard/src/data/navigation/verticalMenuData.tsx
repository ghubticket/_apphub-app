// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes'

const verticalMenuData = (): VerticalMenuDataType[] => [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'tabler-dashboard'
  },
  {
    label: 'Admin',
    href: '/admin',
    icon: 'tabler-settings',
    auth: ['ADMIN']
  },
  {
    label: 'QR Reader',
    href: '/qr-reader',
    icon: 'tabler-qrcode',
    auth: ['TURMA']
  },
  {
    label: 'Configurações',
    href: '/configuracoes',
    icon: 'tabler-settings-2',
    auth: ['ADMIN']
  }
]

export default verticalMenuData
