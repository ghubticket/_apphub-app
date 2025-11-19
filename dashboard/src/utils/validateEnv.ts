/**
 * Validação de Variáveis de Ambiente
 * 
 * Valida se todas as variáveis obrigatórias estão definidas no startup
 * Impede que a aplicação inicie com configuração inválida
 */

interface EnvVar {
  name: string
  required: boolean
  description: string
  defaultValue?: string
  validate?: (value: string) => boolean
}

/**
 * Definição das variáveis de ambiente esperadas
 */
const ENV_VARS: EnvVar[] = [
  // Autenticação
  {
    name: 'NEXTAUTH_SECRET',
    required: true,
    description: 'Secret para criptografia de sessões NextAuth',
    validate: (value) => value.length >= 32
  },
  {
    name: 'NEXTAUTH_URL',
    required: false,
    description: 'URL base do NextAuth',
    defaultValue: 'http://localhost:3000/api/auth'
  },
  
  // API
  {
    name: 'API_URL',
    required: true,
    description: 'URL do backend API',
    validate: (value) => value.endsWith('/api') && (value.startsWith('http://') || value.startsWith('https://'))
  },
  {
    name: 'NEXT_PUBLIC_API_URL',
    required: true,
    description: 'URL pública do backend API (client-side)',
    validate: (value) => value.endsWith('/api')
  },
  
  // App
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: false,
    description: 'URL pública do dashboard',
    defaultValue: 'http://localhost:3000'
  },
  
  // Google OAuth (opcional)
  {
    name: 'GOOGLE_CLIENT_ID',
    required: false,
    description: 'Google OAuth Client ID'
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    required: false,
    description: 'Google OAuth Client Secret'
  },
  
  // Mapbox (opcional)
  {
    name: 'MAPBOX_ACCESS_TOKEN',
    required: false,
    description: 'Token do Mapbox para mapas'
  }
]

interface ValidationError {
  variable: string
  message: string
  severity: 'error' | 'warning'
}

interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

/**
 * Valida todas as variáveis de ambiente
 * 
 * @returns Resultado da validação
 */
export function validateEnvironmentVariables(): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name]

    // Verificar se variável obrigatória está definida
    if (envVar.required && !value) {
      errors.push({
        variable: envVar.name,
        message: `${envVar.description} não está definida`,
        severity: 'error'
      })
      continue
    }

    // Se não é obrigatória e não está definida, avisar
    if (!envVar.required && !value && envVar.defaultValue) {
      warnings.push({
        variable: envVar.name,
        message: `${envVar.description} não está definida. Usando valor padrão: ${envVar.defaultValue}`,
        severity: 'warning'
      })
      continue
    }

    // Validar formato se houver validador customizado
    if (value && envVar.validate && !envVar.validate(value)) {
      errors.push({
        variable: envVar.name,
        message: `${envVar.description} tem formato inválido`,
        severity: 'error'
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Valida e exibe resultados no console
 * Termina o processo com erro se houver variáveis inválidas
 */
export function validateAndExit(): void {
  console.log('🔍 Validando variáveis de ambiente...\n')

  const result = validateEnvironmentVariables()

  // Exibir warnings
  if (result.warnings.length > 0) {
    console.warn('⚠️  AVISOS:')
    result.warnings.forEach(warning => {
      console.warn(`   - ${warning.variable}: ${warning.message}`)
    })
    console.warn('')
  }

  // Exibir erros
  if (result.errors.length > 0) {
    console.error('❌ ERROS DE CONFIGURAÇÃO:')
    result.errors.forEach(error => {
      console.error(`   - ${error.variable}: ${error.message}`)
    })
    console.error('\n💡 Configure as variáveis em .env.local e reinicie o servidor.\n')
    
    if (process.env.NODE_ENV === 'production') {
      // Em produção, terminar processo
      process.exit(1)
    } else {
      // Em desenvolvimento, apenas avisar
      console.error('⚠️  Continuando em modo desenvolvimento, mas a aplicação pode não funcionar corretamente.\n')
    }
  } else {
    console.log('✅ Todas as variáveis de ambiente estão configuradas corretamente!\n')
  }
}

/**
 * Retorna valor de variável de ambiente com validação
 * 
 * @param name - Nome da variável
 * @param defaultValue - Valor padrão se não definida
 * @returns Valor da variável
 * @throws Error se variável obrigatória não estiver definida
 */
export function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name]
  
  if (!value && !defaultValue) {
    throw new Error(`Variável de ambiente ${name} não está definida`)
  }
  
  return value || defaultValue || ''
}

/**
 * Verifica se está em ambiente de desenvolvimento
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * Verifica se está em ambiente de produção
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

