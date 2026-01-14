import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Resumos from './pages/Resumos';
import AnaliseFornecedores from './pages/AnaliseFornecedores';
import Analise from './pages/Analise';
import ConfigMA from './pages/ConfigMA';
import ConfigFornecedores from './pages/ConfigFornecedores';
import Login from './pages/Login';
import { AuthProvider, AuthContext } from './contexts/AuthContext';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return <div className="h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="resumos" element={<Resumos />} />
            <Route path="fornecedores" element={<AnaliseFornecedores />} />
            <Route path="analise" element={<Analise />} />
            {/* Redirects antigos para compatibilidade */}
            <Route path="mensal" element={<Navigate to="/analise" replace />} />
            <Route path="anual" element={<Navigate to="/analise" replace />} />
            <Route path="config-ma" element={<ConfigMA />} />
            <Route path="config-fornecedores" element={<ConfigFornecedores />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;