import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
    Calendar, TrendingUp, TrendingDown, Target, ChevronLeft, ChevronRight,
    DollarSign, Percent, Clock, BarChart3, LineChart as LineChartIcon, Award
} from 'lucide-react';

export default function AnaliseMensal() {
    const [dados, setDados] = useState({ por_dia: [], por_setor: [], totais: {} });
    const [metas, setMetas] = useState({});
    const [loading, setLoading] = useState(true);
    const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
    const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);

    const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const CORES = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4'];

    useEffect(() => {
        fetchDados();
    }, [anoSelecionado, mesSelecionado]);

    const fetchDados = async () => {
        setLoading(true);
        try {
            const [resDiario, resResp] = await Promise.all([
                axios.get(`http://127.0.0.1:8000/api/resumo-diario/?ano=${anoSelecionado}&mes=${mesSelecionado}`),
                axios.get('http://127.0.0.1:8000/api/responsaveis/')
            ]);

            setDados(resDiario.data);

            const mapMetas = {};
            resResp.data.forEach(r => {
                mapMetas[r.nome] = parseFloat(r.orcamento_mensal);
            });
            setMetas(mapMetas);

            setLoading(false);
        } catch (error) {
            console.error("Erro:", error);
            setLoading(false);
        }
    };

    // Calcula métricas do mês
    const metricas = useMemo(() => {
        const totalMes = dados.totais.total_mes || 0;
        const diasComDados = dados.totais.dias_com_dados || [];
        const ultimoDia = diasComDados.length > 0 ? Math.max(...diasComDados) : 1;
        const diasNoMes = new Date(anoSelecionado, mesSelecionado, 0).getDate();

        // Meta mensal total
        const metaMensal = Object.values(metas).reduce((acc, m) => acc + m, 0);

        // Ritmo diário e projeção
        const ritmoDiario = ultimoDia > 0 ? totalMes / ultimoDia : 0;
        const projecaoFimMes = ritmoDiario * diasNoMes;

        // Percentuais
        const percentualMeta = metaMensal > 0 ? (totalMes / metaMensal) * 100 : 0;
        const percentualProjecao = metaMensal > 0 ? (projecaoFimMes / metaMensal) * 100 : 0;

        return {
            totalMes,
            metaMensal,
            ultimoDia,
            diasNoMes,
            ritmoDiario,
            projecaoFimMes,
            percentualMeta,
            percentualProjecao,
            diasRestantes: diasNoMes - ultimoDia
        };
    }, [dados, metas, anoSelecionado, mesSelecionado]);

    // Dados para gráfico de linha com acumulado
    const dadosGrafico = useMemo(() => {
        const diasNoMes = new Date(anoSelecionado, mesSelecionado, 0).getDate();
        const metaDiaria = metricas.metaMensal / diasNoMes;

        let acumulado = 0;
        let acumuladoMeta = 0;

        const result = [];
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const diaData = dados.por_dia.find(d => d.dia === dia);
            const valorDia = diaData?.total || 0;

            acumulado += valorDia;
            acumuladoMeta += metaDiaria;

            result.push({
                dia,
                valor: valorDia,
                acumulado,
                metaAcumulada: acumuladoMeta,
                temDados: !!diaData
            });
        }

        return result;
    }, [dados, metricas, anoSelecionado, mesSelecionado]);

    const formatCurrency = (value) => {
        if (!value) return 'R$ 0';
        if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(2)}M`;
        if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
        return `R$ ${value.toFixed(0)}`;
    };

    const mesAnterior = () => {
        if (mesSelecionado === 1) {
            setMesSelecionado(12);
            setAnoSelecionado(a => a - 1);
        } else {
            setMesSelecionado(m => m - 1);
        }
    };

    const mesSeguinte = () => {
        if (mesSelecionado === 12) {
            setMesSelecionado(1);
            setAnoSelecionado(a => a + 1);
        } else {
            setMesSelecionado(m => m + 1);
        }
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
                            <Calendar className="text-indigo-600" />
                            Análise Mensal
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Acompanhamento dia a dia do mês selecionado</p>
                    </div>

                    {/* Seletor de Mês/Ano */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={mesAnterior}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="flex items-center gap-2 bg-indigo-50 px-5 py-2 rounded-lg min-w-[180px] justify-center">
                            <Calendar className="w-4 h-4 text-indigo-600" />
                            <span className="font-bold text-indigo-700">
                                {MESES[mesSelecionado - 1]} {anoSelecionado}
                            </span>
                        </div>
                        <button
                            onClick={mesSeguinte}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-8 space-y-6">
                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <DollarSign className="w-5 h-5 text-blue-600" />
                            </div>
                            <p className="text-sm text-gray-500">Gasto no Mês</p>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(metricas.totalMes)}</h3>
                        <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full ${metricas.percentualMeta > 100 ? 'bg-red-500' : 'bg-blue-500'}`}
                                    style={{ width: `${Math.min(metricas.percentualMeta, 100)}%` }}
                                ></div>
                            </div>
                            <span className="text-xs text-gray-500">{metricas.percentualMeta.toFixed(0)}%</span>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-100 rounded-lg">
                                <Target className="w-5 h-5 text-emerald-600" />
                            </div>
                            <p className="text-sm text-gray-500">Meta do Mês</p>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(metricas.metaMensal)}</h3>
                        <p className="text-xs text-gray-400 mt-2">
                            Saldo: <span className={metricas.metaMensal - metricas.totalMes >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                {formatCurrency(metricas.metaMensal - metricas.totalMes)}
                            </span>
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-amber-600" />
                            </div>
                            <p className="text-sm text-gray-500">Projeção Fim do Mês</p>
                        </div>
                        <h3 className={`text-2xl font-bold ${metricas.percentualProjecao > 100 ? 'text-red-600' : 'text-gray-900'}`}>
                            {formatCurrency(metricas.projecaoFimMes)}
                        </h3>
                        <p className="text-xs text-gray-400 mt-2">
                            {metricas.percentualProjecao.toFixed(0)}% da meta | Ritmo: {formatCurrency(metricas.ritmoDiario)}/dia
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Clock className="w-5 h-5 text-purple-600" />
                            </div>
                            <p className="text-sm text-gray-500">Progresso do Mês</p>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">
                            Dia {metricas.ultimoDia}/{metricas.diasNoMes}
                        </h3>
                        <p className="text-xs text-gray-400 mt-2">
                            {metricas.diasRestantes} dias restantes
                        </p>
                    </div>
                </div>

                {/* GRÁFICO PRINCIPAL - Evolução Diária */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <LineChartIcon className="w-5 h-5 text-indigo-600" />
                        Evolução Diária vs Meta
                    </h3>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dadosGrafico} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="dia"
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
                                    formatter={(value, name) => [formatCurrency(value), name === 'acumulado' ? 'Acumulado Real' : 'Meta Acumulada']}
                                    labelFormatter={(label) => `Dia ${label}`}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="acumulado"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorAcumulado)"
                                    name="acumulado"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="metaAcumulada"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={false}
                                    name="metaAcumulada"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-1 bg-indigo-600 rounded"></div>
                            <span className="text-gray-600">Acumulado Real</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-1 bg-emerald-500 rounded" style={{ borderStyle: 'dashed' }}></div>
                            <span className="text-gray-600">Meta Acumulada (ideal)</span>
                        </div>
                    </div>
                </div>

                {/* GRID INFERIOR */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Gasto por Dia */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-indigo-600" />
                            Gasto por Dia
                        </h3>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dadosGrafico.filter(d => d.valor > 0)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="dia"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#6b7280', fontSize: 10 }}
                                    />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value) => [formatCurrency(value), 'Gasto']}
                                        labelFormatter={(label) => `Dia ${label}`}
                                    />
                                    <Bar dataKey="valor" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Setores do Mês */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Award className="w-5 h-5 text-amber-500" />
                            Top Setores do Mês
                        </h3>
                        <div className="space-y-3">
                            {dados.por_setor.slice(0, 8).map((setor, idx) => {
                                const percent = metricas.totalMes > 0 ? (setor.total / metricas.totalMes) * 100 : 0;
                                return (
                                    <div key={setor.setor} className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-gray-400 w-5">{idx + 1}.</span>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]" title={setor.setor}>
                                                    {setor.setor.substring(0, 30)}
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
                                        <span className="text-xs text-gray-500 w-12 text-right">{percent.toFixed(1)}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
