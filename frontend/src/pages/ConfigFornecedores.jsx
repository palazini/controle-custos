import React, { useEffect, useState, useMemo } from 'react';
import api from '../api';
import {
    Settings, Search, Check, X, Eye, EyeOff, Save, RefreshCw, Users, AlertTriangle, CheckSquare, Square
} from 'lucide-react';

export default function ConfigFornecedores() {
    const [fornecedores, setFornecedores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [busca, setBusca] = useState('');
    const [editando, setEditando] = useState({}); // {nome_original: {nome_exibicao, exibir}}
    const [mensagem, setMensagem] = useState(null);
    const [selecionados, setSelecionados] = useState(new Set()); // Set de nomes_originais selecionados

    useEffect(() => {
        fetchFornecedores();
    }, []);

    // Verificar se há alterações não salvas
    const temAlteracoesNaoSalvas = useMemo(() => {
        return fornecedores.some(f => {
            const edit = editando[f.nome_original];
            if (!edit) return false;
            const nomeOriginalConfig = f.nome_exibicao || '';
            const nomeEditado = edit.nome_exibicao || '';
            return nomeOriginalConfig !== nomeEditado || f.exibir !== edit.exibir;
        });
    }, [fornecedores, editando]);

    // Contar quantas alterações pendentes
    const quantidadeAlteracoes = useMemo(() => {
        return fornecedores.filter(f => {
            const edit = editando[f.nome_original];
            if (!edit) return false;
            const nomeOriginalConfig = f.nome_exibicao || '';
            const nomeEditado = edit.nome_exibicao || '';
            return nomeOriginalConfig !== nomeEditado || f.exibir !== edit.exibir;
        }).length;
    }, [fornecedores, editando]);

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
    }, [temAlteracoesNaoSalvas]);

    const fetchFornecedores = async () => {
        setLoading(true);
        try {
            const response = await api.get('fornecedores-unicos/');
            setFornecedores(response.data);
            // Inicializar estado de edição
            const edits = {};
            response.data.forEach(f => {
                edits[f.nome_original] = {
                    nome_exibicao: f.nome_exibicao || '',
                    exibir: f.exibir
                };
            });
            setEditando(edits);
            setSelecionados(new Set());
            setLoading(false);
        } catch (error) {
            console.error("Erro:", error);
            setLoading(false);
        }
    };

    // Filtrar por busca
    const fornecedoresFiltrados = useMemo(() => {
        if (!busca) return fornecedores;
        return fornecedores.filter(f =>
            f.nome_original.toLowerCase().includes(busca.toLowerCase()) ||
            (f.nome_exibicao && f.nome_exibicao.toLowerCase().includes(busca.toLowerCase()))
        );
    }, [fornecedores, busca]);

    // Verificar se todos os filtrados estão selecionados
    const todosFiltradosSelecionados = useMemo(() => {
        if (fornecedoresFiltrados.length === 0) return false;
        return fornecedoresFiltrados.every(f => selecionados.has(f.nome_original));
    }, [fornecedoresFiltrados, selecionados]);

    // Verificar se alguns estão selecionados
    const algunsSelecionados = useMemo(() => {
        return fornecedoresFiltrados.some(f => selecionados.has(f.nome_original));
    }, [fornecedoresFiltrados, selecionados]);

    const handleNomeChange = (nome_original, valor) => {
        setEditando(prev => ({
            ...prev,
            [nome_original]: {
                ...prev[nome_original],
                nome_exibicao: valor
            }
        }));
    };

    const handleExibirToggle = (nome_original) => {
        setEditando(prev => ({
            ...prev,
            [nome_original]: {
                ...prev[nome_original],
                exibir: !prev[nome_original].exibir
            }
        }));
    };

    // Toggle seleção individual
    const toggleSelecao = (nome_original) => {
        setSelecionados(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nome_original)) {
                newSet.delete(nome_original);
            } else {
                newSet.add(nome_original);
            }
            return newSet;
        });
    };

    // Selecionar/deselecionar todos os filtrados
    const toggleSelecionarTodos = () => {
        if (todosFiltradosSelecionados) {
            // Desselecionar todos os filtrados
            setSelecionados(prev => {
                const newSet = new Set(prev);
                fornecedoresFiltrados.forEach(f => newSet.delete(f.nome_original));
                return newSet;
            });
        } else {
            // Selecionar todos os filtrados
            setSelecionados(prev => {
                const newSet = new Set(prev);
                fornecedoresFiltrados.forEach(f => newSet.add(f.nome_original));
                return newSet;
            });
        }
    };

    // Ações em lote: Ocultar selecionados
    const ocultarSelecionados = () => {
        setEditando(prev => {
            const newState = { ...prev };
            selecionados.forEach(nome => {
                if (newState[nome]) {
                    newState[nome] = { ...newState[nome], exibir: false };
                }
            });
            return newState;
        });
        setMensagem({ tipo: 'sucesso', texto: `${selecionados.size} fornecedor(es) marcado(s) para ocultar` });
        setTimeout(() => setMensagem(null), 2000);
    };

    // Ações em lote: Exibir selecionados
    const exibirSelecionados = () => {
        setEditando(prev => {
            const newState = { ...prev };
            selecionados.forEach(nome => {
                if (newState[nome]) {
                    newState[nome] = { ...newState[nome], exibir: true };
                }
            });
            return newState;
        });
        setMensagem({ tipo: 'sucesso', texto: `${selecionados.size} fornecedor(es) marcado(s) para exibir` });
        setTimeout(() => setMensagem(null), 2000);
    };

    // Limpar seleção
    const limparSelecao = () => {
        setSelecionados(new Set());
    };

    const temAlteracao = (nome_original) => {
        const fornecedor = fornecedores.find(f => f.nome_original === nome_original);
        const edit = editando[nome_original];
        if (!fornecedor || !edit) return false;

        const nomeOriginalConfig = fornecedor.nome_exibicao || '';
        const nomeEditado = edit.nome_exibicao || '';

        return nomeOriginalConfig !== nomeEditado || fornecedor.exibir !== edit.exibir;
    };

    // Salvar todas as alterações em uma única requisição
    const salvarTodasAlteracoes = async () => {
        setSaving(true);

        try {
            // Coletar todos os fornecedores com alterações
            const fornecedoresAlterados = fornecedores.filter(f => temAlteracao(f.nome_original));

            // Montar payload para bulk save
            const configs = fornecedoresAlterados.map(f => ({
                nome_original: f.nome_original,
                nome_exibicao: editando[f.nome_original]?.nome_exibicao || null,
                exibir: editando[f.nome_original]?.exibir ?? true
            }));

            // Uma única requisição para salvar tudo
            const response = await api.post('fornecedor-config-bulk/', { configs });

            setMensagem({
                tipo: 'sucesso',
                texto: response.data.message || `${fornecedoresAlterados.length} configuração(ões) salva(s) com sucesso!`
            });
            setTimeout(() => setMensagem(null), 3000);
            fetchFornecedores();
        } catch (error) {
            console.error("Erro ao salvar:", error);
            setMensagem({ tipo: 'erro', texto: 'Erro ao salvar configurações' });
            setTimeout(() => setMensagem(null), 3000);
        } finally {
            setSaving(false);
        }
    };

    // Descartar todas as alterações
    const descartarAlteracoes = () => {
        const edits = {};
        fornecedores.forEach(f => {
            edits[f.nome_original] = {
                nome_exibicao: f.nome_exibicao || '',
                exibir: f.exibir
            };
        });
        setEditando(edits);
        setMensagem({ tipo: 'sucesso', texto: 'Alterações descartadas' });
        setTimeout(() => setMensagem(null), 2000);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Settings className="text-indigo-600" />
                            Configuração de Fornecedores
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Defina nomes de exibição e visibilidade para cada fornecedor
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchFornecedores}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
                            Atualizar
                        </button>
                    </div>
                </div>
            </header>

            {/* Barra de seleção */}
            {selecionados.size > 0 && (
                <div className="mx-8 mt-4 p-4 rounded-lg flex items-center justify-between bg-indigo-50 border border-indigo-200">
                    <div className="flex items-center gap-2 text-indigo-700">
                        <CheckSquare className="w-5 h-5" />
                        <span className="font-medium">
                            {selecionados.size} fornecedor(es) selecionado(s)
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={limparSelecao}
                            className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                        >
                            Limpar Seleção
                        </button>
                        <button
                            onClick={exibirSelecionados}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors text-sm font-medium"
                        >
                            <Eye className="w-4 h-4" />
                            Exibir Selecionados
                        </button>
                        <button
                            onClick={ocultarSelecionados}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium"
                        >
                            <EyeOff className="w-4 h-4" />
                            Ocultar Selecionados
                        </button>
                    </div>
                </div>
            )}

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
                    {mensagem.tipo === 'sucesso' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    {mensagem.texto}
                </div>
            )}

            <main className="flex-1 p-8">
                {/* Resumo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <Users className="w-5 h-5 text-indigo-600" />
                            </div>
                            <p className="text-sm text-gray-500">Total de Fornecedores</p>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">{fornecedores.length}</h3>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-100 rounded-lg">
                                <Eye className="w-5 h-5 text-emerald-600" />
                            </div>
                            <p className="text-sm text-gray-500">Visíveis</p>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {Object.values(editando).filter(e => e.exibir).length}
                        </h3>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <EyeOff className="w-5 h-5 text-amber-600" />
                            </div>
                            <p className="text-sm text-gray-500">Ocultos</p>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {Object.values(editando).filter(e => !e.exibir).length}
                        </h3>
                    </div>
                </div>

                {/* Tabela de configuração */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <h3 className="text-lg font-bold text-gray-800">Lista de Fornecedores</h3>
                            {busca && (
                                <span className="text-sm text-gray-500">
                                    ({fornecedoresFiltrados.length} de {fornecedores.length})
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar fornecedor..."
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-700 font-semibold sticky top-0">
                                <tr>
                                    <th className="px-4 py-4 w-12">
                                        <button
                                            onClick={toggleSelecionarTodos}
                                            className={`p-1.5 rounded transition-colors ${todosFiltradosSelecionados
                                                ? 'bg-indigo-100 text-indigo-600'
                                                : algunsSelecionados
                                                    ? 'bg-indigo-50 text-indigo-400'
                                                    : 'hover:bg-gray-100 text-gray-400'
                                                }`}
                                            title={todosFiltradosSelecionados ? 'Desselecionar todos' : 'Selecionar todos os filtrados'}
                                        >
                                            {todosFiltradosSelecionados ? (
                                                <CheckSquare className="w-4 h-4" />
                                            ) : (
                                                <Square className="w-4 h-4" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 w-16">Visível</th>
                                    <th className="px-4 py-4">Nome Original</th>
                                    <th className="px-4 py-4">Nome de Exibição</th>
                                    <th className="px-4 py-4 w-24">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {fornecedoresFiltrados.map((f) => (
                                    <tr
                                        key={f.nome_original}
                                        className={`hover:bg-gray-50 transition-colors ${editando[f.nome_original]?.exibir === false ? 'bg-gray-50 opacity-60' : ''
                                            } ${temAlteracao(f.nome_original) ? 'bg-amber-50/50' : ''} ${selecionados.has(f.nome_original) ? 'bg-indigo-50/50' : ''
                                            }`}
                                    >
                                        <td className="px-4 py-4">
                                            <button
                                                onClick={() => toggleSelecao(f.nome_original)}
                                                className={`p-1.5 rounded transition-colors ${selecionados.has(f.nome_original)
                                                    ? 'bg-indigo-100 text-indigo-600'
                                                    : 'hover:bg-gray-100 text-gray-400'
                                                    }`}
                                            >
                                                {selecionados.has(f.nome_original) ? (
                                                    <CheckSquare className="w-4 h-4" />
                                                ) : (
                                                    <Square className="w-4 h-4" />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-4 py-4">
                                            <button
                                                onClick={() => handleExibirToggle(f.nome_original)}
                                                className={`p-2 rounded-lg transition-colors ${editando[f.nome_original]?.exibir
                                                    ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                                    : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                                                    }`}
                                                title={editando[f.nome_original]?.exibir ? 'Clique para ocultar' : 'Clique para exibir'}
                                            >
                                                {editando[f.nome_original]?.exibir ? (
                                                    <Eye className="w-4 h-4" />
                                                ) : (
                                                    <EyeOff className="w-4 h-4" />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-4 py-4 font-medium text-gray-800 max-w-[300px]" title={f.nome_original}>
                                            <span className="truncate block">{f.nome_original}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                type="text"
                                                value={editando[f.nome_original]?.nome_exibicao || ''}
                                                onChange={(e) => handleNomeChange(f.nome_original, e.target.value)}
                                                placeholder="Usar nome original"
                                                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${temAlteracao(f.nome_original) ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                                                    }`}
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            {temAlteracao(f.nome_original) ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Alterado
                                                </span>
                                            ) : f.configurado ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                    <Check className="w-3 h-3" />
                                                    Salvo
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {fornecedoresFiltrados.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            Nenhum fornecedor encontrado
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
