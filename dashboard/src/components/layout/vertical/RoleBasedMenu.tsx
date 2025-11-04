import { useUserRole } from '@/hooks/useUserRole'
import { Menu, MenuSection, MenuItem } from '@menu/vertical-menu'
import { useParams } from 'next/navigation'
import { getDictionary } from '@/utils/getDictionary'
import { useTheme } from '@mui/material/styles'
import useVerticalNav from '@menu/hooks/useVerticalNav'
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

type RenderExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

const RenderExpandIcon = ({ open, transitionDuration }: RenderExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='tabler-chevron-right' />
  </StyledVerticalNavExpandIcon>
)

interface RoleBasedMenuProps {
  dictionary: Awaited<ReturnType<typeof getDictionary>>
}

export const RoleBasedMenu = ({ dictionary }: RoleBasedMenuProps) => {
  const { isAdmin, isQRCode, userRole } = useUserRole()
  const { lang: locale } = useParams()
  const theme = useTheme()
  const verticalNavOptions = useVerticalNav()

  // CLIENTE não acessa dashboard admin - redirecionar
  if (userRole === 'CLIENTE') {
    return null
  }

  return (
    <Menu
      popoutMenuOffset={{ mainAxis: 23 }}
      menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
      renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={verticalNavOptions.transitionDuration} />}
      renderExpandedMenuItemIcon={{ icon: <i className='tabler-circle text-xs' /> }}
      menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
    >
      {/* Dashboard sempre visível para ADMIN e QRCODE */}
      <MenuSection label="Principal">
        <MenuItem
          href={`/${locale}/dashboards/crm`}
          icon={<i className="tabler-smart-home" />}
        >
          Dashboard
        </MenuItem>
      </MenuSection>

      {/* Menu de Usuários - apenas para ADMIN */}
      {isAdmin() && (
        <MenuSection label="Administração">
          <MenuItem
            href={`/${locale}/apps/user/list`}
            icon={<i className="tabler-users" />}
          >
            Usuários
          </MenuItem>
          <MenuItem
            href={`/${locale}/apps/events/list`}
            icon={<i className="tabler-calendar-event" />}
          >
            Eventos
          </MenuItem>
          <MenuItem
            href={`/${locale}/apps/orders/list`}
            icon={<i className="tabler-shopping-cart" />}
          >
            Pedidos
          </MenuItem>
        </MenuSection>
      )}

      {/* Menu QR Scanner - apenas para QRCODE */}
      {isQRCode() && (
        <MenuSection label="Validação">
          <MenuItem
            href={`/${locale}/apps/qr-scanner`}
            icon={<i className="tabler-qrcode" />}
          >
            Scanner QR
          </MenuItem>
        </MenuSection>
      )}
    </Menu>
  )
}
