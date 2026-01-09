import { useEffect, useState } from 'react';
import api from '../api';
import { Save, Search, Wallet, AlertCircle } from 'lucide-react';

export default function Orcamentos() {
  const [responsaveis, setResponsaveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [metasEditadas, setMetasEditadas] = useState({}); // Guarda mudanças não salvas

  useEffect(() => {
    fetchResponsaveis();
  }, []);

  const fetchResponsaveis = async () => {
    try {
      const res = await api.get('responsaveis/');
      // Ordena alfabeticamente
      const dadosOrdenados = res.data.sort((a, b) => a.nome.localeCompare(b.nome));
      setResponsaveis(dadosOrdenados);
      setLoading(false);
    } catch (error) {
      console.error("Erro ao buscar", error);
      setLoading(false);
    }
  };

  const handleMetaChange = (id, novoValor) => {
    setMetasEditadas(prev => ({
      ...prev,
      [id]: novoValor
    }));
  };

  const salvarMeta = async (id, valorOriginal) => {
    const novaMeta = metasEditadas[id];
    if (novaMeta === undefined || novaMeta === valorOriginal) return;

    try {
      await api.patch(`responsaveis/${id}/`, {
        orcamento_mensal: novaMeta
      });

      // Atualiza lista local para remover o estado de "editado"
      setResponsaveis(prev => prev.map(r =>
        r.id === id ? { ...r, orcamento_mensal: novaMeta } : r
      ));

      const novasEdicoes = { ...metasEditadas };
      delete novasEdicoes[id];
      setMetasEditadas(novasEdicoes);

    } catch (error) {
      alert("Erro ao salvar meta");
    }
  };

  // Filtra a lista na tela
  const listaFiltrada = responsaveis.filter(r =>
    r.nome.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm px-8 py-5 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Wallet className="text-indigo-600" />
              Gestão de Orçamentos
            </h1>
            <p className="text-sm text-gray-500 mt-1">Defina as metas mensais para cada centro de responsabilidade.</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar setor..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
            />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8">
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 w-2/3">Centro de Responsabilidade (MA)</th>
                <th className="px-6 py-4 w-1/3">Meta Mensal (Budget)</th>
                <th className="px-6 py-4 w-24">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="3" className="p-8 text-center text-gray-500">Carregando setores...</td></tr>
              ) : listaFiltrada.map(item => {
                const valorEdicao = metasEditadas[item.id];
                const valorExibir = valorEdicao !== undefined ? valorEdicao : item.orcamento_mensal;
                const foiAlterado = valorEdicao !== undefined && valorEdicao != item.orcamento_mensal;

                return (
                  <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-6 py-4 font-medium text-gray-800">
                      {item.nome}
                      {parseFloat(item.orcamento_mensal) === 0 && (
                        <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          <AlertCircle className="w-3 h-3 mr-1" /> Sem meta
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative max-w-xs">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">R$</span>
                        <input
                          type="number"
                          value={valorExibir}
                          onChange={(e) => handleMetaChange(item.id, e.target.value)}
                          className={`w-full pl-10 pr-4 py-2 border rounded-lg outline-none transition-all font-mono font-medium ${foiAlterado
                            ? 'border-indigo-500 ring-1 ring-indigo-500 bg-white'
                            : 'border-gray-200 bg-gray-50 group-hover:bg-white focus:bg-white focus:border-indigo-400'
                            }`}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {foiAlterado && (
                        <button
                          onClick={() => salvarMeta(item.id, item.orcamento_mensal)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg shadow-sm transition-all animate-fade-in"
                          title="Salvar alteração"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!loading && listaFiltrada.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              Nenhum setor encontrado com esse nome.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}