import { useEffect, useState, useMemo } from 'react';
import api from '../api';
import { Save, Search, Settings, AlertCircle, Check, AlertTriangle, CheckSquare, Square, Eye, EyeOff } from 'lucide-react';

export default function ConfiguracoesMA() {
  const [responsaveis, setResponsaveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [editando, setEditando] = useState({}); // {id: {orcamento_mensal, nome_exibicao}}
  const [mensagem, setMensagem] = useState(null);
  const [selecionados, setSelecionados] = useState(new Set());

  useEffect(() => {
    fetchResponsaveis();
  }, []);

  // Aviso ao sair da página com alterações não salvas
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (temAlteracoesNaoSalvas) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const fetchResponsaveis = async () => {
    try {
      const res = await api.get('responsaveis/');
      const dadosOrdenados = res.data.sort((a, b) => a.nome.localeCompare(b.nome));
      setResponsaveis(dadosOrdenados);

      // Inicializar estado de edição
      const edits = {};
      dadosOrdenados.forEach(r => {
        edits[r.id] = {
          orcamento_mensal: r.orcamento_mensal,
          nome_exibicao: r.nome_exibicao || ''
        };
      });
      setEditando(edits);
      setSelecionados(new Set());
      setLoading(false);
    } catch (error) {
      console.error("Erro ao buscar", error);
      setLoading(false);
    }
  };

  // Filtra a lista na tela
  const listaFiltrada = useMemo(() => {
    return responsaveis.filter(r =>
      r.nome.toLowerCase().includes(filtro.toLowerCase()) ||
      (r.nome_exibicao && r.nome_exibicao.toLowerCase().includes(filtro.toLowerCase()))
    );
  }, [responsaveis, filtro]);

  // Verificar se todos os filtrados estão selecionados
  const todosFiltradosSelecionados = useMemo(() => {
    if (listaFiltrada.length === 0) return false;
    return listaFiltrada.every(r => selecionados.has(r.id));
  }, [listaFiltrada, selecionados]);

  const algunsSelecionados = useMemo(() => {
    return listaFiltrada.some(r => selecionados.has(r.id));
  }, [listaFiltrada, selecionados]);

  const temAlteracao = (id) => {
    const responsavel = responsaveis.find(r => r.id === id);
    const edit = editando[id];
    if (!responsavel || !edit) return false;

    const nomeOriginal = responsavel.nome_exibicao || '';
    const nomeEditado = edit.nome_exibicao || '';
    const metaOriginal = parseFloat(responsavel.orcamento_mensal) || 0;
    const metaEditada = parseFloat(edit.orcamento_mensal) || 0;

    return nomeOriginal !== nomeEditado || metaOriginal !== metaEditada;
  };

  const temAlteracoesNaoSalvas = useMemo(() => {
    return responsaveis.some(r => temAlteracao(r.id));
  }, [responsaveis, editando]);

  const quantidadeAlteracoes = useMemo(() => {
    return responsaveis.filter(r => temAlteracao(r.id)).length;
  }, [responsaveis, editando]);

  const handleMetaChange = (id, novoValor) => {
    setEditando(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        orcamento_mensal: novoValor
      }
    }));
  };

  const handleNomeChange = (id, novoValor) => {
    setEditando(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        nome_exibicao: novoValor
      }
    }));
  };

  const toggleSelecao = (id) => {
    setSelecionados(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelecionarTodos = () => {
    if (todosFiltradosSelecionados) {
      setSelecionados(prev => {
        const newSet = new Set(prev);
        listaFiltrada.forEach(r => newSet.delete(r.id));
        return newSet;
      });
    } else {
      setSelecionados(prev => {
        const newSet = new Set(prev);
        listaFiltrada.forEach(r => newSet.add(r.id));
        return newSet;
      });
    }
  };

  const limparSelecao = () => {
    setSelecionados(new Set());
  };

  // Salvar todas as alterações em uma única requisição
  const salvarTodasAlteracoes = async () => {
    setSaving(true);

    try {
      const responsaveisAlterados = responsaveis.filter(r => temAlteracao(r.id));

      // Salvar cada um via PATCH
      for (const r of responsaveisAlterados) {
        const edit = editando[r.id];
        await api.patch(`responsaveis/${r.id}/`, {
          orcamento_mensal: edit.orcamento_mensal,
          nome_exibicao: edit.nome_exibicao || null
        });
      }

      setMensagem({
        tipo: 'sucesso',
        texto: `${responsaveisAlterados.length} configuração(ões) salva(s) com sucesso!`
      });
      setTimeout(() => setMensagem(null), 3000);
      fetchResponsaveis();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar configurações' });
      setTimeout(() => setMensagem(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const descartarAlteracoes = () => {
    const edits = {};
    responsaveis.forEach(r => {
      edits[r.id] = {
        orcamento_mensal: r.orcamento_mensal,
        nome_exibicao: r.nome_exibicao || ''
      };
    });
    setEditando(edits);
    setMensagem({ tipo: 'sucesso', texto: 'Alterações descartadas' });
    setTimeout(() => setMensagem(null), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm px-8 py-5 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Settings className="text-indigo-600" />
              Configurações MA
            </h1>
            <p className="text-sm text-gray-500 mt-1">Configure nomes de exibição e metas para cada centro de responsabilidade.</p>
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

      {/* Barra de alterações pendentes */}
      {temAlteracoesNaoSalvas && (
        <div className="mx-8 mt-4 p-4 rounded-lg flex items-center justify-between bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">
              {quantidadeAlteracoes} alteração(ões) não salva(s)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={descartarAlteracoes}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Descartar
            </button>
            <button
              onClick={salvarTodasAlteracoes}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors font-medium"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Todas Alterações'}
            </button>
          </div>
        </div>
      )}

      {/* Mensagem de feedback */}
      {mensagem && (
        <div className={`mx-8 mt-4 p-4 rounded-lg flex items-center gap-2 ${mensagem.tipo === 'sucesso'
            ? 'bg-green-100 text-green-700 border border-green-200'
            : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
          {mensagem.tipo === 'sucesso' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {mensagem.texto}
        </div>
      )}

      <main className="flex-1 overflow-auto p-8">
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-4 py-4 w-1/3">Centro de Responsabilidade (MA)</th>
                  <th className="px-4 py-4 w-1/3">Nome de Exibição</th>
                  <th className="px-4 py-4 w-1/4">Meta Mensal (Budget)</th>
                  <th className="px-4 py-4 w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="4" className="p-8 text-center text-gray-500">Carregando setores...</td></tr>
                ) : listaFiltrada.map(item => {
                  const edit = editando[item.id] || {};
                  const alterado = temAlteracao(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-indigo-50/30 transition-colors group ${alterado ? 'bg-amber-50/50' : ''}`}
                    >
                      <td className="px-4 py-4 font-medium text-gray-800">
                        <span className="truncate block max-w-[300px]" title={item.nome}>
                          {item.nome}
                        </span>
                        {parseFloat(item.orcamento_mensal) === 0 && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            <AlertCircle className="w-3 h-3 mr-1" /> Sem meta
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="text"
                          value={edit.nome_exibicao || ''}
                          onChange={(e) => handleNomeChange(item.id, e.target.value)}
                          placeholder="Usar nome original"
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${alterado ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                            }`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative max-w-xs">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">R$</span>
                          <input
                            type="number"
                            value={edit.orcamento_mensal || 0}
                            onChange={(e) => handleMetaChange(item.id, e.target.value)}
                            className={`w-full pl-10 pr-4 py-2 border rounded-lg outline-none transition-all font-mono font-medium ${alterado
                                ? 'border-amber-300 bg-amber-50'
                                : 'border-gray-200 bg-gray-50 group-hover:bg-white focus:bg-white focus:border-indigo-400'
                              }`}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {alterado ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            <AlertTriangle className="w-3 h-3" />
                            Alterado
                          </span>
                        ) : item.nome_exibicao ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <Check className="w-3 h-3" />
                            Configurado
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

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