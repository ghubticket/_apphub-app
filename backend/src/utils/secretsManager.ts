/**
 * Utilitário para gerenciamento de secrets em produção
 * 
 * Suporta múltiplos provedores:
 * - AWS Secrets Manager
 * - Azure Key Vault
 * - Variáveis de ambiente (fallback)
 * 
 * Uso:
 *   import { getSecret } from './utils/secretsManager';
 *   const secret = await getSecret('ENCRYPTION_KEY');
 */

// AWS SDK é opcional - só importa se SECRETS_PROVIDER=aws
let AWSSecretsManagerClient: any = null;
let GetSecretValueCommand: any = null;

interface SecretsProvider {
    getSecret(name: string): Promise<string | null>;
}

/**
 * Provedor para AWS Secrets Manager
 */
class AWSSecretsProvider implements SecretsProvider {
    private client: any;
    private region: string;

    constructor(region: string = process.env.AWS_REGION || 'us-east-1') {
        this.region = region;
        
        // Carregar AWS SDK dinamicamente (opcional)
        try {
            if (!AWSSecretsManagerClient) {
                const awsSDK = require('@aws-sdk/client-secrets-manager');
                AWSSecretsManagerClient = awsSDK.SecretsManagerClient;
                GetSecretValueCommand = awsSDK.GetSecretValueCommand;
            }
            this.client = new AWSSecretsManagerClient({ region: this.region });
        } catch (error) {
            console.warn('⚠️ @aws-sdk/client-secrets-manager não instalado. Instale com: npm install @aws-sdk/client-secrets-manager');
            throw new Error('AWS SDK não disponível. Instale @aws-sdk/client-secrets-manager para usar AWS Secrets Manager.');
        }
    }

    async getSecret(name: string): Promise<string | null> {
        try {
            if (!GetSecretValueCommand) {
                throw new Error('AWS SDK não disponível');
            }
            
            const command = new GetSecretValueCommand({
                SecretId: name,
            });

            const response = await this.client.send(command);
            
            if (response.SecretString) {
                // Se for JSON, parsear
                try {
                    const parsed = JSON.parse(response.SecretString);
                    return parsed[name] || parsed.value || response.SecretString;
                } catch {
                    return response.SecretString;
                }
            }

            if (response.SecretBinary) {
                return Buffer.from(response.SecretBinary).toString('utf-8');
            }

            return null;
        } catch (error: any) {
            if (error.name === 'ResourceNotFoundException') {
                console.warn(`⚠️ Secret ${name} não encontrado no AWS Secrets Manager`);
                return null;
            }
            console.error(`Erro ao buscar secret ${name} do AWS Secrets Manager:`, error);
            return null;
        }
    }
}

/**
 * Provedor para variáveis de ambiente (fallback)
 */
class EnvSecretsProvider implements SecretsProvider {
    async getSecret(name: string): Promise<string | null> {
        return process.env[name] || null;
    }
}

/**
 * Factory para criar o provedor apropriado
 */
function createSecretsProvider(): SecretsProvider {
    const provider = process.env.SECRETS_PROVIDER?.toLowerCase();

    switch (provider) {
        case 'aws':
        case 'aws-secrets-manager':
            if (!process.env.AWS_REGION) {
                console.warn('⚠️ SECRETS_PROVIDER=aws mas AWS_REGION não configurado. Usando variáveis de ambiente.');
                return new EnvSecretsProvider();
            }
            return new AWSSecretsProvider();
        
        case 'env':
        case 'environment':
        default:
            return new EnvSecretsProvider();
    }
}

// Instância singleton do provedor
let secretsProvider: SecretsProvider | null = null;

/**
 * Obtém um secret do provedor configurado
 * 
 * @param name - Nome do secret (ex: 'ENCRYPTION_KEY')
 * @param required - Se true, lança erro se secret não for encontrado
 * @returns Valor do secret ou null se não encontrado
 */
export async function getSecret(name: string, required: boolean = false): Promise<string | null> {
    if (!secretsProvider) {
        secretsProvider = createSecretsProvider();
    }

    const value = await secretsProvider.getSecret(name);

    if (required && !value) {
        throw new Error(`Secret obrigatório ${name} não encontrado. Configure SECRETS_PROVIDER e o secret correspondente.`);
    }

    return value;
}

/**
 * Obtém múltiplos secrets de uma vez
 * 
 * @param names - Array de nomes de secrets
 * @returns Objeto com os valores dos secrets
 */
export async function getSecrets(names: string[]): Promise<Record<string, string | null>> {
    const results: Record<string, string | null> = {};
    
    await Promise.all(
        names.map(async (name) => {
            results[name] = await getSecret(name);
        })
    );

    return results;
}

/**
 * Verifica se um secret está configurado
 * 
 * @param name - Nome do secret
 * @returns true se o secret existe e tem valor
 */
export async function hasSecret(name: string): Promise<boolean> {
    const value = await getSecret(name);
    return value !== null && value.trim() !== '';
}

/**
 * Inicializa secrets críticos na inicialização do servidor
 * 
 * @param requiredSecrets - Array de nomes de secrets obrigatórios
 */
export async function initializeSecrets(requiredSecrets: string[] = []): Promise<void> {
    const isProd = (process.env.NODE_ENV || 'development') === 'production';
    
    if (!isProd) {
        console.log('🔍 Ambiente de desenvolvimento - usando variáveis de ambiente');
        return;
    }

    console.log('🔐 Inicializando secrets do provedor:', process.env.SECRETS_PROVIDER || 'env');

    for (const secretName of requiredSecrets) {
        const value = await getSecret(secretName, true);
        if (value) {
            // Atualizar process.env para compatibilidade com código existente
            process.env[secretName] = value;
            console.log(`✅ Secret ${secretName} carregado`);
        }
    }
}

