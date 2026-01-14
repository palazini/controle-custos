import React, { useEffect, useState, useMemo } from 'react';
import api from '../api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
    Users, TrendingUp, DollarSign, Package, ChevronLeft, ChevronRight, Search, Calendar, Clock, Target, List, FileDown, X
} from 'lucide-react';
import * as XLSX from 'xlsx';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_COMPLETOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const CORES = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4'];

// Componente para a tabela de transações
function TransacoesTable({ fornecedor, ano, mes }) {
    const [transacoes, setTransacoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');

    useEffect(() => {
        const fetchTransacoes = async () => {
            setLoading(true);
            try {
                let url = `transacoes-fornecedor/?ano=${ano}&fornecedor=${encodeURIComponent(fornecedor)}`;
                if (mes) url += `&mes=${mes}`;

                const response = await api.get(url);
                setTransacoes(response.data);
            } catch (error) {
                console.error("Erro ao buscar transações:", error);
            }
            setLoading(false);
        };
        fetchTransacoes();
    }, [fornecedor, ano, mes]);

    const transacoesFiltradas = useMemo(() => {
        if (!busca) return transacoes;
        const termo = busca.toLowerCase();
        return transacoes.filter(t =>
            t.descricao_conta.toLowerCase().includes(termo) ||
            t.centro_custo.toLowerCase().includes(termo) ||
            (t.detalhe && t.detalhe.toLowerCase().includes(termo))
        );
    }, [transacoes, busca]);

    const exportarExcel = () => {
        const ws = XLSX.utils.json_to_sheet(transacoes.map(t => ({
            Data: new Date(t.data).toLocaleDateString('pt-BR'),
            Fornecedor: fornecedor,
            'Centro de Custo': t.centro_custo,
            'Conta': t.descricao_conta,
            'Detalhe': t.detalhe || '',
            'Valor': t.valor
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Transacoes");
        XLSX.writeFile(wb, `Transacoes_${fornecedor}_${ano}${mes ? '_' + mes : ''}.xlsx`);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-sm">Carregando transações...</p>
        </div>
    );

    if (transacoes.length === 0) return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <List className="w-12 h-12 mb-2 opacity-20" />
            <p>Nenhuma transação encontrada.</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por descrição, centro de custo ou detalhe..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <button
                    onClick={exportarExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    <FileDown className="w-4 h-4" />
                    Excel
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-gray-700 font-semibold sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3">Data</th>
                            <th className="px-6 py-3">Centro de Custo</th>
                            <th className="px-6 py-3">Conta</th>
                            <th className="px-6 py-3">Detalhe</th>
                            <th className="px-6 py-3 text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {transacoesFiltradas.map((t) => (
                            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-3 whitespace-nowrap text-gray-500">
                                    {new Date(t.data).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-6 py-3 text-gray-800 font-medium">
                                    {t.centro_custo}
                                </td>
                                <td className="px-6 py-3 text-gray-600">
                                    {t.descricao_conta}
                                </td>
                                <td className="px-6 py-3 text-gray-500 max-w-[300px] truncate" title={t.detalhe}>
                                    {t.detalhe || '-'}
                                </td>
                                <td className="px-6 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                                    R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold text-gray-900 sticky bottom-0">
                        <tr>
                            <td colSpan={4} className="px-6 py-3 text-right">Total:</td>
                            <td className="px-6 py-3 text-right">
                                R$ {transacoesFiltradas.reduce((acc, t) => acc + t.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div className="p-2 text-xs text-gray-400 text-center border-t border-gray-100">
                Mostrando {transacoesFiltradas.length} de {transacoes.length} transações
            </div>
        </div>
    );
}

export default function AnaliseFornecedores() {
    // Toggle de modo (persistido)
    const [modo, setModo] = useState(() => {
        const saved = localStorage.getItem('fornecedores_modo');
        return saved || 'anual';
    });

    // Estados
    const [showModalTransacoes, setShowModalTransacoes] = useState(false);

    // Estados persistidos

    // Estados persistidos
    const [anoSelecionado, setAnoSelecionado] = useState(() => {
        const saved = localStorage.getItem('fornecedores_ano');
        return saved ? parseInt(saved) : new Date().getFullYear();
    });
    const [mesSelecionado, setMesSelecionado] = useState(() => {
        const saved = localStorage.getItem('fornecedores_mes');
        return saved ? parseInt(saved) : new Date().getMonth() + 1;
    });

    // Estados de dados
    const [dadosAnual, setDadosAnual] = useState({ por_fornecedor: [], por_setor: {}, evolucao_mensal: {}, total_ano: 0 });
    const [dadosMensal, setDadosMensal] = useState({ por_fornecedor: [], total_mes: 0 });
    const [loading, setLoading] = useState(true);
    const [fornecedorSelecionado, setFornecedorSelecionado] = useState(null);
    const [detalhesFornecedor, setDetalhesFornecedor] = useState([]);
    const [loadingDetalhes, setLoadingDetalhes] = useState(false);
    const [busca, setBusca] = useState('');

    // Persistência
    useEffect(() => { localStorage.setItem('fornecedores_modo', modo); }, [modo]);
    useEffect(() => { localStorage.setItem('fornecedores_ano', anoSelecionado.toString()); }, [anoSelecionado]);
    useEffect(() => { localStorage.setItem('fornecedores_mes', mesSelecionado.toString()); }, [mesSelecionado]);

    // Fetch dados
    useEffect(() => {
        const fetchDados = async () => {
            setLoading(true);
            try {
                if (modo === 'anual') {
                    const response = await api.get(`resumo-fornecedores/?ano=${anoSelecionado}`);
                    setDadosAnual(response.data);
                } else {
                    const response = await api.get(`resumo-fornecedores-mensal/?ano=${anoSelecionado}&mes=${mesSelecionado}`);
                    setDadosMensal(response.data);
                }
            } catch (error) {
                console.error("Erro:", error);
            }
            setLoading(false);
        };
        fetchDados();
    }, [modo, anoSelecionado, mesSelecionado]);

    // Fetch detalhes do fornecedor
    useEffect(() => {
        const fetchDetalhes = async () => {
            if (!fornecedorSelecionado) {
                setDetalhesFornecedor([]);
                return;
            }
            setLoadingDetalhes(true);
            try {
                const params = modo === 'anual'
                    ? `ano=${anoSelecionado}&fornecedor=${encodeURIComponent(fornecedorSelecionado)}`
                    : `ano=${anoSelecionado}&mes=${mesSelecionado}&fornecedor=${encodeURIComponent(fornecedorSelecionado)}`;
                const response = await api.get(`detalhes-fornecedor/?${params}`);
                setDetalhesFornecedor(response.data);
            } catch (error) {
                console.error("Erro ao buscar detalhes:", error);
                setDetalhesFornecedor([]);
            }
            setLoadingDetalhes(false);
        };
        fetchDetalhes();
    }, [fornecedorSelecionado, modo, anoSelecionado, mesSelecionado]);

    // Reset fornecedor ao mudar modo
    useEffect(() => {
        setFornecedorSelecionado(null);
    }, [modo, anoSelecionado, mesSelecionado]);

    const formatCurrency = (value) => {
        if (!value) return 'R$ 0';
        if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(2)}M`;
        if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
        return `R$ ${value.toFixed(0)}`;
    };

    // Dados atuais baseados no modo
    const dados = modo === 'anual' ? dadosAnual : dadosMensal;
    const totalGeral = modo === 'anual' ? dados.total_ano : dados.total_mes;

    // Fornecedores filtrados
    const fornecedoresFiltrados = useMemo(() => {
        const lista = dados.por_fornecedor || [];
        if (!busca) return lista;
        return lista.filter(f => f.fornecedor.toLowerCase().includes(busca.toLowerCase()));
    }, [dados.por_fornecedor, busca]);

    // Top 10 para gráficos
    const top10 = useMemo(() => (dados.por_fornecedor || []).slice(0, 10), [dados.por_fornecedor]);

    // Evolução mensal (só anual)
    const dadosEvolucao = useMemo(() => {
        if (modo !== 'anual' || !dadosAnual.evolucao_mensal) return [];
        const result = [];
        for (let mes = 1; mes <= 12; mes++) {
            const ponto = { mes: MESES[mes - 1] };
            Object.keys(dadosAnual.evolucao_mensal).forEach(fornecedor => {
                ponto[fornecedor] = dadosAnual.evolucao_mensal[fornecedor][mes] || 0;
            });
            result.push(ponto);
        }
        return result;
    }, [modo, dadosAnual.evolucao_mensal]);

    // Dados do setor para fornecedor selecionado (anual)
    const dadosSetor = useMemo(() => {
        if (!fornecedorSelecionado || !dadosAnual.por_setor?.[fornecedorSelecionado]) return [];
        return dadosAnual.por_setor[fornecedorSelecionado];
    }, [fornecedorSelecionado, dadosAnual.por_setor]);

    if (loading) return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            {/* HEADER */}
            <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Users className="text-indigo-600" />
                            Análise de Fornecedores
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {modo === 'anual' ? 'Visão consolidada do ano' : `Gastos de ${MESES_COMPLETOS[mesSelecionado - 1]}`}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Toggle Mensal/Anual */}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setModo('mensal')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${modo === 'mensal' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                                    }`}
                            >
                                Mensal
                            </button>
                            <button
                                onClick={() => setModo('anual')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${modo === 'anual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                                    }`}
                            >
                                Anual
                            </button>
                        </div>

                        {/* Seletor de Mês (só mensal) */}
                        {modo === 'mensal' && (
                            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                                <button
                                    onClick={() => {
                                        if (mesSelecionado === 1) {
                                            setMesSelecionado(12);
                                            setAnoSelecionado(a => a - 1);
                                        } else {
                                            setMesSelecionado(m => m - 1);
                                        }
                                    }}
                                    className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                                </button>
                                <span className="px-3 py-1 text-sm font-medium text-gray-700 min-w-[50px] text-center">
                                    {MESES[mesSelecionado - 1]}
                                </span>
                                <button
                                    onClick={() => {
                                        if (mesSelecionado === 12) {
                                            setMesSelecionado(1);
                                            setAnoSelecionado(a => a + 1);
                                        } else {
                                            setMesSelecionado(m => m + 1);
                                        }
                                    }}
                                    className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4 text-gray-600" />
                                </button>
                            </div>
                        )}

                        {/* Seletor de Ano */}
                        <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                            <button onClick={() => setAnoSelecionado(a => a - 1)} className="p-1.5 hover:bg-gray-200 rounded-md transition-colors">
                                <ChevronLeft className="w-4 h-4 text-gray-600" />
                            </button>
                            <div className="flex items-center gap-2 px-2 py-1">
                                <Calendar className="w-4 h-4 text-indigo-600" />
                                <span className="font-medium text-gray-700">{anoSelecionado}</span>
                            </div>
                            <button onClick={() => setAnoSelecionado(a => a + 1)} className="p-1.5 hover:bg-gray-200 rounded-md transition-colors">
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-8 space-y-6">
                {/* KPI CARDS - Unificados */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <DollarSign className="w-5 h-5 text-blue-600" />
                            </div>
                            <p className="text-sm text-gray-500">
                                {modo === 'anual' ? `Total ${anoSelecionado}` : `Gasto em ${MESES[mesSelecionado - 1]}`}
                            </p>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(totalGeral)}</h3>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-100 rounded-lg">
                                <Users className="w-5 h-5 text-emerald-600" />
                            </div>
                            <p className="text-sm text-gray-500">Fornecedores Ativos</p>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">{(dados.por_fornecedor || []).length}</h3>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Package className="w-5 h-5 text-amber-600" />
                            </div>
                            <p className="text-sm text-gray-500">Maior Fornecedor</p>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 truncate" title={top10[0]?.fornecedor}>
                            {top10[0]?.fornecedor || '-'}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">{formatCurrency(top10[0]?.total)}</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-purple-600" />
                            </div>
                            <p className="text-sm text-gray-500">Top 10 Concentram</p>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {totalGeral > 0 ? ((top10.reduce((a, f) => a + f.total, 0) / totalGeral) * 100).toFixed(0) : 0}%
                        </h3>
                    </div>
                </div>

                {/* GRID PRINCIPAL */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top 10 Fornecedores - Gráfico */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" />
                            Top 10 Fornecedores
                        </h3>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={top10} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                                    <XAxis type="number" tickFormatter={formatCurrency} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                                    <YAxis type="category" dataKey="fornecedor" width={150} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => v.length > 20 ? v.substring(0, 20) + '...' : v} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => [formatCurrency(value), 'Total']} />
                                    <Bar dataKey="total" fill="#6366f1" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(data) => setFornecedorSelecionado(data.fornecedor)} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 text-center">Clique em uma barra para ver detalhes</p>
                    </div>

                    {/* Detalhes do Fornecedor Selecionado */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Package className="w-5 h-5 text-indigo-600" />
                                {fornecedorSelecionado ? `Detalhes: ${fornecedorSelecionado}` : 'Selecione um Fornecedor'}
                            </h3>
                            {fornecedorSelecionado && (
                                <button
                                    onClick={() => setShowModalTransacoes(true)}
                                    className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    <List className="w-4 h-4" />
                                    Ver Transações
                                </button>
                            )}
                        </div>

                        {fornecedorSelecionado ? (
                            loadingDetalhes ? (
                                <div className="flex items-center justify-center h-[300px]">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : detalhesFornecedor.length > 0 ? (
                                <div className="space-y-3 max-h-[350px] overflow-y-auto">
                                    {detalhesFornecedor.map((item, idx) => {
                                        const maxValue = detalhesFornecedor[0]?.total || 1;
                                        const percent = (item.total / maxValue) * 100;
                                        return (
                                            <div key={idx} className="flex items-center gap-3">
                                                <span className="text-xs font-bold text-gray-400 w-5">{idx + 1}.</span>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]" title={item.descricao || item.setor}>
                                                            {item.descricao || item.setor}
                                                        </span>
                                                        <span className="text-sm font-bold text-gray-900">{formatCurrency(item.total)}</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                                        <div className="h-2 rounded-full" style={{ width: `${percent}%`, backgroundColor: CORES[idx % CORES.length] }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-[300px] text-gray-400">
                                    <p>Nenhum detalhe encontrado</p>
                                </div>
                            )
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-gray-400">
                                <p>Clique em um fornecedor no gráfico ao lado</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* MODAL TRANSAÇÕES */}
                {showModalTransacoes && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                        <List className="w-5 h-5 text-indigo-600" />
                                        Transações: {fornecedorSelecionado}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {modo === 'anual' ? `Ano ${anoSelecionado}` : `${MESES[mesSelecionado - 1]}/${anoSelecionado}`}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowModalTransacoes(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5 rotate-90" />
                                </button>
                            </div>

                            <div className="p-0 overflow-auto flex-1">
                                <TransacoesTable
                                    fornecedor={fornecedorSelecionado}
                                    ano={anoSelecionado}
                                    mes={modo === 'mensal' ? mesSelecionado : null}
                                />
                            </div>

                            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
                                <button
                                    onClick={() => setShowModalTransacoes(false)}
                                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Evolução Mensal (só modo anual) */}
                {modo === 'anual' && Object.keys(dadosAnual.evolucao_mensal || {}).length > 0 && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-indigo-600" />
                            Evolução Mensal - Top 5 Fornecedores
                        </h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={dadosEvolucao} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={formatCurrency} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value, name) => [formatCurrency(value), name.substring(0, 30)]} />
                                    {Object.keys(dadosAnual.evolucao_mensal).slice(0, 5).map((fornecedor, idx) => (
                                        <Line key={fornecedor} type="monotone" dataKey={fornecedor} stroke={CORES[idx]} strokeWidth={2} dot={false} />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 mt-4">
                            {Object.keys(dadosAnual.evolucao_mensal).slice(0, 5).map((fornecedor, idx) => (
                                <div key={fornecedor} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CORES[idx] }}></div>
                                    <span className="text-xs text-gray-600" title={fornecedor}>{fornecedor}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Lista Completa */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-800">Lista de Fornecedores</h3>
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
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-700 font-semibold sticky top-0">
                                <tr>
                                    <th className="px-6 py-4">#</th>
                                    <th className="px-6 py-4">Fornecedor</th>
                                    <th className="px-6 py-4 text-right">Total</th>
                                    <th className="px-6 py-4 text-right">Transações</th>
                                    <th className="px-6 py-4 text-right">% do Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {fornecedoresFiltrados.slice(0, 50).map((f, idx) => (
                                    <tr
                                        key={f.fornecedor}
                                        className={`hover:bg-indigo-50/50 cursor-pointer transition-colors ${fornecedorSelecionado === f.fornecedor ? 'bg-indigo-50' : ''}`}
                                        onClick={() => setFornecedorSelecionado(f.fornecedor)}
                                    >
                                        <td className="px-6 py-4 text-gray-500">{idx + 1}</td>
                                        <td className="px-6 py-4 font-medium text-gray-800 max-w-[300px] truncate" title={f.fornecedor}>
                                            {f.fornecedor}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                                            {formatCurrency(f.total)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-600">
                                            {f.transacoes}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${totalGeral > 0 && (f.total / totalGeral * 100) > 10 ? 'bg-red-100 text-red-700' :
                                                totalGeral > 0 && (f.total / totalGeral * 100) > 5 ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {totalGeral > 0 ? ((f.total / totalGeral) * 100).toFixed(1) : 0}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
