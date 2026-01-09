import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
    Users, TrendingUp, DollarSign, Package, ChevronLeft, ChevronRight, Search
} from 'lucide-react';

export default function AnaliseFornecedores() {
    const [dados, setDados] = useState({ por_fornecedor: [], por_setor: {}, evolucao_mensal: {}, total_ano: 0 });
    const [loading, setLoading] = useState(true);
    const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
    const [fornecedorSelecionado, setFornecedorSelecionado] = useState(null);
    const [busca, setBusca] = useState('');

    const CORES = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4'];
    const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    useEffect(() => {
        fetchDados();
    }, [anoSelecionado]);

    const fetchDados = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`http://127.0.0.1:8000/api/resumo-fornecedores/?ano=${anoSelecionado}`);
            setDados(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Erro:", error);
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        if (!value) return 'R$ 0';
        if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(2)}M`;
        if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
        return `R$ ${value.toFixed(0)}`;
    };

    // Dados filtrados por busca
    const fornecedoresFiltrados = useMemo(() => {
        if (!busca) return dados.por_fornecedor;
        return dados.por_fornecedor.filter(f =>
            f.fornecedor.toLowerCase().includes(busca.toLowerCase())
        );
    }, [dados.por_fornecedor, busca]);

    // Top 10 para o gráfico de barras
    const top10 = useMemo(() => {
        return dados.por_fornecedor.slice(0, 10);
    }, [dados.por_fornecedor]);

    // Dados do gráfico de evolução mensal
    const dadosEvolucao = useMemo(() => {
        const result = [];
        for (let mes = 1; mes <= 12; mes++) {
            const ponto = { mes: MESES[mes - 1] };
            Object.keys(dados.evolucao_mensal).forEach(fornecedor => {
                ponto[fornecedor] = dados.evolucao_mensal[fornecedor][mes] || 0;
            });
            result.push(ponto);
        }
        return result;
    }, [dados.evolucao_mensal]);

    // Dados do setor para o fornecedor selecionado
    const dadosSetor = useMemo(() => {
        if (!fornecedorSelecionado || !dados.por_setor[fornecedorSelecionado]) return [];
        return dados.por_setor[fornecedorSelecionado];
    }, [fornecedorSelecionado, dados.por_setor]);

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
                            <Users className="text-indigo-600" />
                            Análise de Fornecedores
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Identifique os maiores fornecedores e onde estão os gastos</p>
                    </div>

                    {/* Seletor de Ano */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setAnoSelecionado(a => a - 1)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="flex items-center gap-2 bg-indigo-50 px-5 py-2 rounded-lg">
                            <span className="font-bold text-indigo-700">{anoSelecionado}</span>
                        </div>
                        <button
                            onClick={() => setAnoSelecionado(a => a + 1)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-8 space-y-6">
                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <DollarSign className="w-5 h-5 text-blue-600" />
                            </div>
                            <p className="text-sm text-gray-500">Total com Fornecedores</p>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(dados.total_ano)}</h3>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-100 rounded-lg">
                                <Users className="w-5 h-5 text-emerald-600" />
                            </div>
                            <p className="text-sm text-gray-500">Fornecedores Ativos</p>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">{dados.por_fornecedor.length}</h3>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Package className="w-5 h-5 text-amber-600" />
                            </div>
                            <p className="text-sm text-gray-500">Maior Fornecedor</p>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900" title={top10[0]?.fornecedor}>
                            {top10[0]?.fornecedor || '-'}
                        </h3>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-purple-600" />
                            </div>
                            <p className="text-sm text-gray-500">Top 10 Concentram</p>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {dados.total_ano > 0 ? ((top10.reduce((a, f) => a + f.total, 0) / dados.total_ano) * 100).toFixed(0) : 0}%
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
                                    <XAxis
                                        type="number"
                                        tickFormatter={(v) => formatCurrency(v)}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#6b7280', fontSize: 11 }}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="fornecedor"
                                        width={150}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#6b7280', fontSize: 11 }}
                                        tickFormatter={(v) => v.length > 20 ? v.substring(0, 20) + '...' : v}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value) => [formatCurrency(value), 'Total']}
                                    />
                                    <Bar
                                        dataKey="total"
                                        fill="#6366f1"
                                        radius={[0, 4, 4, 0]}
                                        cursor="pointer"
                                        onClick={(data) => setFornecedorSelecionado(data.fornecedor)}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 text-center">Clique em uma barra para ver detalhes por setor</p>
                    </div>

                    {/* Detalhes do Fornecedor Selecionado */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Package className="w-5 h-5 text-indigo-600" />
                            {fornecedorSelecionado ? `Gastos por Setor: ${fornecedorSelecionado}` : 'Selecione um Fornecedor'}
                        </h3>
                        {fornecedorSelecionado && dadosSetor.length > 0 ? (
                            <div className="space-y-3">
                                {dadosSetor.map((setor, idx) => {
                                    const maxValue = dadosSetor[0]?.total || 1;
                                    const percent = (setor.total / maxValue) * 100;
                                    return (
                                        <div key={setor.setor} className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-gray-400 w-5">{idx + 1}.</span>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-medium text-gray-700" title={setor.setor}>
                                                        {setor.setor}
                                                    </span>
                                                    <span className="text-sm font-bold text-gray-900">{formatCurrency(setor.total)}</span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2">
                                                    <div
                                                        className="h-2 rounded-full"
                                                        style={{
                                                            width: `${percent}%`,
                                                            backgroundColor: CORES[idx % CORES.length]
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-gray-400">
                                <p>Clique em um fornecedor no gráfico ao lado</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Evolução Mensal dos Top 5 */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        Evolução Mensal - Top 5 Fornecedores
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dadosEvolucao} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="mes"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6b7280', fontSize: 11 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6b7280', fontSize: 11 }}
                                    tickFormatter={(v) => formatCurrency(v)}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value, name) => [formatCurrency(value), name.substring(0, 30)]}
                                />
                                {Object.keys(dados.evolucao_mensal).slice(0, 5).map((fornecedor, idx) => (
                                    <Line
                                        key={fornecedor}
                                        type="monotone"
                                        dataKey={fornecedor}
                                        stroke={CORES[idx]}
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 mt-4">
                        {Object.keys(dados.evolucao_mensal).slice(0, 5).map((fornecedor, idx) => (
                            <div key={fornecedor} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CORES[idx] }}></div>
                                <span className="text-xs text-gray-600" title={fornecedor}>
                                    {fornecedor}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Lista Completa com Busca */}
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
                                        className="hover:bg-indigo-50/50 cursor-pointer transition-colors"
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
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${(f.total / dados.total_ano * 100) > 10 ? 'bg-red-100 text-red-700' :
                                                (f.total / dados.total_ano * 100) > 5 ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {((f.total / dados.total_ano) * 100).toFixed(1)}%
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
