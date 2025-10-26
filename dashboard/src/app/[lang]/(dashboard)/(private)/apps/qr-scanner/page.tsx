import { RoleGuard, QRCodeOnly } from '@/components/RoleGuard'
import { useUserRole } from '@/hooks/useUserRole'

const QRScannerPage = () => {
  const { roleConfig } = useUserRole()

  return (
    <QRCodeOnly fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <i className="tabler-shield-x text-6xl text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesso Negado</h2>
          <p className="text-gray-600">Apenas usuários com role QRCODE podem acessar esta página.</p>
        </div>
      </div>
    }>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Scanner QR Code
          </h1>
          <p className="text-gray-600">
            Bem-vindo, {roleConfig?.label}! Use esta ferramenta para validar QR codes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <i className="tabler-qrcode text-2xl text-blue-500 mr-3" />
              <h3 className="text-xl font-semibold">Scanner QR</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Escaneie códigos QR para validar e processar informações.
            </p>
            <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
              Iniciar Scanner
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <i className="tabler-check text-2xl text-green-500 mr-3" />
              <h3 className="text-xl font-semibold">Validações</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Visualize e gerencie validações realizadas.
            </p>
            <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
              Ver Validações
            </button>
          </div>
        </div>
      </div>
    </QRCodeOnly>
  )
}

export default QRScannerPage
