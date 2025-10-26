import { AdminOnly } from '@/components/RoleGuard'
import { useUserRole } from '@/hooks/useUserRole'

const AdminDashboardPage = () => {
  const { roleConfig, user } = useUserRole()

  return (
    <AdminOnly fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <i className="tabler-crown-off text-6xl text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesso Restrito</h2>
          <p className="text-gray-600">Apenas administradores podem acessar esta página.</p>
        </div>
      </div>
    }>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Painel Administrativo
          </h1>
          <p className="text-gray-600">
            Bem-vindo, {user?.name}! Você tem acesso total ao sistema.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <i className="tabler-users text-2xl text-blue-500 mr-3" />
              <h3 className="text-xl font-semibold">Gerenciar Usuários</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Visualize, edite e gerencie todos os usuários do sistema.
            </p>
            <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
              Gerenciar Usuários
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <i className="tabler-chart-bar text-2xl text-green-500 mr-3" />
              <h3 className="text-xl font-semibold">Relatórios</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Acesse relatórios detalhados e estatísticas do sistema.
            </p>
            <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
              Ver Relatórios
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <i className="tabler-settings text-2xl text-purple-500 mr-3" />
              <h3 className="text-xl font-semibold">Configurações</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Configure parâmetros e preferências do sistema.
            </p>
            <button className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors">
              Configurações
            </button>
          </div>
        </div>

        <div className="mt-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center mb-4">
            <i className="tabler-crown text-2xl mr-3" />
            <h3 className="text-xl font-semibold">Privilégios de Administrador</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Permissões:</h4>
              <ul className="space-y-1 text-sm">
                <li>• Gerenciar usuários</li>
                <li>• Acessar relatórios</li>
                <li>• Configurar sistema</li>
                <li>• Visualizar logs</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Acesso:</h4>
              <ul className="space-y-1 text-sm">
                <li>• Todas as páginas</li>
                <li>• APIs administrativas</li>
                <li>• Configurações avançadas</li>
                <li>• Monitoramento</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminOnly>
  )
}

export default AdminDashboardPage
