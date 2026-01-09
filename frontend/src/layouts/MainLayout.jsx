import { Outlet, Link, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { LayoutDashboard, Wallet, Activity, BarChart3, CalendarDays, Users, LayoutGrid, LogOut } from 'lucide-react';

export default function MainLayout() {
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);

  const getLinkClass = (path) => {
    const baseClass = "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors";
    return location.pathname === path
      ? `${baseClass} bg-indigo-50 text-indigo-700`
      : `${baseClass} text-gray-600 hover:bg-gray-50 hover:text-gray-900`;
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans">
      {/* SIDEBAR FIXO */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <Activity className="text-indigo-600 w-6 h-6 mr-2" />
          <span className="font-bold text-xl text-gray-800">Custos</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          <Link to="/" className={getLinkClass('/')}>
            <LayoutDashboard className="w-5 h-5 mr-3" />
            Dashboard
          </Link>
          <Link to="/resumos" className={getLinkClass('/resumos')}>
            <LayoutGrid className="w-5 h-5 mr-3" />
            Resumos Gerais
          </Link>
          <Link to="/analise-fornecedores" className={getLinkClass('/analise-fornecedores')}>
            <Users className="w-5 h-5 mr-3" />
            Fornecedores
          </Link>
          <Link to="/analise-mensal" className={getLinkClass('/analise-mensal')}>
            <CalendarDays className="w-5 h-5 mr-3" />
            Análise Mensal
          </Link>
          <Link to="/analise" className={getLinkClass('/analise')}>
            <BarChart3 className="w-5 h-5 mr-3" />
            Análise Anual
          </Link>
          <Link to="/orcamentos" className={getLinkClass('/orcamentos')}>
            <Wallet className="w-5 h-5 mr-3" />
            Gestão de Orçamentos
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase">
                {user?.username?.substring(0, 2) || 'US'}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 max-w-[100px] truncate" title={user?.username}>
                  {user?.username || 'Usuário'}
                </p>
                <p className="text-xs text-gray-500">Logado</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* AQUI ENTRA O CONTEÚDO DAS PÁGINAS */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}