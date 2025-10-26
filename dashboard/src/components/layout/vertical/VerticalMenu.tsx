'use client'

// React Imports
import { useState } from 'react'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'

// Type Imports
import type { getDictionary } from '@/utils/getDictionary'

// Component Imports
import { RoleBasedMenu } from './RoleBasedMenu'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'



type Props = {
  dictionary: Awaited<ReturnType<typeof getDictionary>>
  scrollMenu: (container: any, isPerfectScrollbar: boolean) => void
}

const VerticalMenu = ({ dictionary, scrollMenu }: Props) => {
  // Hooks
  const verticalNavOptions = useVerticalNav()

  // Vars
  const { isBreakpointReached } = verticalNavOptions

  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  return (
    // eslint-disable-next-line lines-around-comment
    /* Custom scrollbar instead of browser scroll, remove if you want browser scroll only */
    <ScrollWrapper
      {...(verticalNavOptions.isCollapsed && !verticalNavOptions.isHovered
        ? {
            onScrollY: container => scrollMenu(container, false),
            options: { wheelPropagation: false, suppressScrollX: true }
          }
        : {
            options: { wheelPropagation: false, suppressScrollX: true },
            onScrollY: container => scrollMenu(container, true)
          })}
    >
      {/* Role-Based Menu */}
      <RoleBasedMenu dictionary={dictionary} />
    </ScrollWrapper>
  )
}

export default VerticalMenu