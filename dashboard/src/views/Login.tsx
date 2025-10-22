'use client'

// React Imports
import { useState } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// MUI Imports
import useMediaQuery from '@mui/material/useMediaQuery'
import { styled, useTheme } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Checkbox from '@mui/material/Checkbox'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import Divider from '@mui/material/Divider'

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { SystemMode } from '@core/types'

// Component Imports
import Link from '@components/Link'
import Logo from '@components/layout/shared/Logo'
import CustomTextField from '@core/components/mui/TextField'
import LoginForm from '@/components/auth/LoginForm'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Hook Imports
import { useImageVariant } from '@core/hooks/useImageVariant'
import { useSettings } from '@core/hooks/useSettings'

// Styled Custom Components
const LoginIllustration = styled('img')(({ theme }) => ({
    zIndex: 2,
    blockSize: 'auto',
    maxBlockSize: 680,
    maxInlineSize: '100%',
    margin: theme.spacing(12),
    [theme.breakpoints.down(1536)]: {
        maxBlockSize: 550
    },
    [theme.breakpoints.down('lg')]: {
        maxBlockSize: 450
    }
}))

const MaskImg = styled('img')({
    blockSize: 'auto',
    maxBlockSize: 355,
    inlineSize: '100%',
    position: 'absolute',
    insetBlockEnd: 0,
    zIndex: -1
})

const LoginV2 = ({ mode }: { mode: SystemMode }) => {
    // States
    const [isPasswordShown, setIsPasswordShown] = useState(false)

    // Vars
    const darkImg = '/images/pages/auth-mask-dark.png'
    const lightImg = '/images/pages/auth-mask-light.png'
    const darkIllustration = '/images/illustrations/auth/v2-login-dark.png'
    const lightIllustration = '/images/illustrations/auth/v2-login-light.png'
    const borderedDarkIllustration = '/images/illustrations/auth/v2-login-dark-border.png'
    const borderedLightIllustration = '/images/illustrations/auth/v2-login-light-border.png'

    // Hooks
    const router = useRouter()
    const { settings } = useSettings()
    const theme = useTheme()
    const hidden = useMediaQuery(theme.breakpoints.down('md'))
    const authBackground = useImageVariant(mode, lightImg, darkImg)

    const characterIllustration = useImageVariant(
        mode,
        lightIllustration,
        darkIllustration,
        borderedLightIllustration,
        borderedDarkIllustration
    )

    const handleClickShowPassword = () => setIsPasswordShown(show => !show)

    return (
        <div className='flex bs-full justify-center'>
            <div
                className={classnames(
                    'flex bs-full items-center justify-center flex-1 min-bs-[100dvh] relative p-6 max-md:hidden',
                    {
                        'border-ie': settings.skin === 'bordered'
                    }
                )}
            >
                <LoginIllustration src={characterIllustration} alt='character-illustration' />
                {!hidden && (
                    <MaskImg
                        alt='mask'
                        src={authBackground}
                        className={classnames({ 'scale-x-[-1]': theme.direction === 'rtl' })}
                    />
                )}
            </div>
            <div className='flex justify-center items-center bs-full bg-backgroundPaper !min-is-full p-6 md:!min-is-[unset] md:p-12 md:is-[560px]'>
                <Link className='absolute block-start-5 sm:block-start-[33px] inline-start-6 sm:inline-start-[38px]'>
                    <figure>
                        <img src="/images/5521.png" alt="5521 Logo" className="h-12 w-auto brightness-0 invert" />
                    </figure>
                </Link>
                <div className='flex flex-col gap-6 is-full sm:is-auto md:is-full sm:max-is-[400px] md:max-is-[unset] mbs-11 sm:mbs-14 md:mbs-0'>
                    <div className='flex flex-col gap-1'>
                        <Typography variant='h4'>{`Seja bem vindo ao seu painel da  ${themeConfig.templateName}! 👋🏻`}</Typography>
                    </div>

                    {/* New Login Form with Role Selection */}
                    <LoginForm />
                </div>
            </div>
        </div>
    )
}

export default LoginV2
