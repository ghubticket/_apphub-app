'use client'

// React Imports
import type { ReactElement } from 'react'

// Type Imports
import type { SystemMode } from '@core/types'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'
import useLayoutInit from '@core/hooks/useLayoutInit'
import { useSessionTimeout } from '@/hooks/useSessionTimeout'

// Component Imports
import { SessionTimeoutModal } from '@/components/SessionTimeoutModal'

type LayoutWrapperProps = {
  systemMode: SystemMode
  verticalLayout: ReactElement
  horizontalLayout: ReactElement
}

const LayoutWrapper = (props: LayoutWrapperProps) => {
  // Props
  const { systemMode, verticalLayout, horizontalLayout } = props

  // Hooks
  const { settings } = useSettings()
  const sessionTimeout = useSessionTimeout()

  useLayoutInit(systemMode)

  // Return the layout based on the layout context
  return (
    <>
      <div className='flex flex-col flex-auto' data-skin={settings.skin}>
        {settings.layout === 'horizontal' ? horizontalLayout : verticalLayout}
      </div>
      
      {/* Session Timeout Modal */}
      <SessionTimeoutModal
        open={sessionTimeout.isWarning}
        timeLeft={sessionTimeout.timeLeft}
        onExtend={sessionTimeout.extendSession}
        onLogout={sessionTimeout.handleLogout}
        formatTime={sessionTimeout.formatTime}
      />
    </>
  )
}

export default LayoutWrapper
