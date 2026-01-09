import React, { useEffect, useState, useMemo } from 'react';
import api from '../api';
import * as XLSX from 'xlsx';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, LineChart, Line
} from 'recharts';
import {
    TrendingUp, TrendingDown, AlertTriangle, Calendar,
    ChevronLeft, ChevronRight, Download, Target, ArrowUpRight, ArrowDownRight, FileSpreadsheet
} from 'lucide-react';

export default function Analise() {
    // Estados otimizados
    const [dadosAgregados, setDadosAgregados] = useState({ por_mes: [], por_setor_mes: [], totais: {} });
    const [metas, setMetas] = useState({});
    const [loading, setLoading] = useState(true);
    const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
    const [setorExpandido, setSetorExpandido] = useState(null);

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // Busca dados quando o ano muda
    useEffect(() => {
        fetchDados();
    }, [anoSelecionado]);

    const fetchDados = async () => {
        setLoading(true);
        try {
            const [resResumo, resResp] = await Promise.all([
                api.get(`resumo-mensal/?ano=${anoSelecionado}`),
                api.get('responsaveis/')
            ]);

            setDadosAgregados(resResumo.data);

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

    // Transforma dados agregados em estrutura por mês
    const dadosPorMes = useMemo(() => {
        const agrupado = {};

        // Popula totalizadores
        dadosAgregados.por_mes.forEach(item => {
            if (!agrupado[item.mes]) agrupado[item.mes] = { total: 0, setores: {} };
            agrupado[item.mes].total = item.total;
        });

        // Popula setores
        dadosAgregados.por_setor_mes.forEach(item => {
            if (!agrupado[item.mes]) agrupado[item.mes] = { total: 0, setores: {} };
            agrupado[item.mes].setores[item.setor] = item.total;
        });

        return agrupado;
    }, [dadosAgregados]);

    // Lista de setores únicos
    const setoresUnicos = useMemo(() => {
        const setores = new Set();
        dadosAgregados.por_setor_mes.forEach(item => setores.add(item.setor));
        return Array.from(setores).sort();
    }, [dadosAgregados]);

    // Dados para o gráfico de barras (Mês a Mês)
    const dadosGrafico = useMemo(() => {
        return MESES.map((nome, idx) => {
            const mes = idx + 1;
            const dados = { name: nome, mes };
            setoresUnicos.slice(0, 5).forEach(setor => {
                dados[setor] = dadosPorMes[mes]?.setores[setor] || 0;
            });
            dados.total = dadosPorMes[mes]?.total || 0;
            return dados;
        });
    }, [dadosPorMes, setoresUnicos]);

    // KPIs Anuais
    const kpis = useMemo(() => {
        const totalAno = Object.values(dadosPorMes).reduce((acc, m) => acc + m.total, 0);

        const mesesComDados = dadosAgregados.totais.meses_com_dados?.length || 1;
        const mediaMensal = mesesComDados > 0 ? totalAno / mesesComDados : 0;

        // Orçamento Anual Total (Soma das metas mensais de todos setores * 12)
        let orcamentoMensalTotal = 0;
        setoresUnicos.forEach(setor => {
            orcamentoMensalTotal += (metas[setor] || 0);
        });
        const orcamentoAnual = orcamentoMensalTotal * 12;

        const percentualBudget = orcamentoAnual > 0 ? (totalAno / orcamentoAnual) * 100 : 0;

        // Setor com Maior Gasto no Ano
        const gastosPorSetor = {};
        dadosAgregados.por_setor_mes.forEach(item => {
            gastosPorSetor[item.setor] = (gastosPorSetor[item.setor] || 0) + item.total;
        });

        let topSetor = { nome: '-', total: 0 };
        Object.entries(gastosPorSetor).forEach(([nome, total]) => {
            if (total > topSetor.total) {
                topSetor = { nome, total };
            }
        });

        return {
            totalAno,
            mediaMensal,
            percentualBudget,
            orcamentoAnual,
            topSetor,
            mesesComDados
        };
    }, [dadosPorMes, metas, setoresUnicos, dadosAgregados]);

    // Tabela comparativa mês a mês
    const tabelaComparativa = useMemo(() => {
        return setoresUnicos.map(setor => {
            const linha = { setor, meses: [], total: 0 };
            for (let m = 1; m <= 12; m++) {
                const valor = dadosPorMes[m]?.setores[setor] || 0;
                linha.meses.push(valor);
                linha.total += valor;
            }

            // Tendência simples (Year over Year projections could go here, but sticking to simple trend)
            // Vamos manter a lógica anterior de tendência baseada nos últimos meses com dados
            const ultimos = linha.meses.filter(v => v > 0).slice(-2);
            linha.tendencia = (ultimos.length === 2 && ultimos[1] > ultimos[0]) ? 'up' :
                (ultimos.length === 2 && ultimos[1] < ultimos[0]) ? 'down' : 'stable';

            linha.meta = metas[setor] || 0;
            return linha;
        }).sort((a, b) => b.total - a.total);
    }, [dadosPorMes, setoresUnicos, metas]);

    // Drill-down details
    const [detalhesSetor, setDetalhesSetor] = useState([]);
    const [loadingDetalhes, setLoadingDetalhes] = useState(false);

    const fetchDetalhesSetor = async (nomeSetor) => {
        setLoadingDetalhes(true);
        try {
            const res = await api.get(`detalhes-setor/?ano=${anoSelecionado}&setor=${encodeURIComponent(nomeSetor)}`);
            setDetalhesSetor(res.data);
        } catch (error) {
            console.error("Erro ao buscar detalhes:", error);
            setDetalhesSetor([]);
        }
        setLoadingDetalhes(false);
    };

    useEffect(() => {
        if (setorExpandido) fetchDetalhesSetor(setorExpandido);
        else setDetalhesSetor([]);
    }, [setorExpandido, anoSelecionado]);

    // Treemap: Distribuição ANUAL por setor
    const dadosTreemap = useMemo(() => {
        const gastosPorSetor = {};
        dadosAgregados.por_setor_mes.forEach(item => {
            gastosPorSetor[item.setor] = (gastosPorSetor[item.setor] || 0) + item.total;
        });

        return Object.entries(gastosPorSetor)
            .map(([name, size]) => ({
                name: name.substring(0, 25),
                fullName: name,
                size,
                fill: COLORS[Math.abs(name.charCodeAt(0)) % COLORS.length]
            }))
            .sort((a, b) => b.size - a.size)
            .slice(0, 20); // Top 20 setores do ano
    }, [dadosAgregados]);

    // ... ExportExcel e formatCurrency mantidos ...
    const exportarExcel = () => {
        const dadosExport = tabelaComparativa.map(linha => {
            const row = { 'Setor': linha.setor };
            MESES.forEach((mes, idx) => row[mes] = linha.meses[idx] || 0);
            row['Total'] = linha.total;
            row['Meta Mensal'] = linha.meta || 0;
            return row;
        });

        const ws = XLSX.utils.json_to_sheet(dadosExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Custos ${anoSelecionado}`);
        XLSX.writeFile(wb, `Analise_Custos_${anoSelecionado}.xlsx`);
    };

    const formatCurrency = (value) => {
        if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
        return `R$ ${value.toFixed(0)}`;
    };

    if (loading) return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-gray-50 overflow-auto">
            {/* HEADER */}
            <header className="bg-white shadow-sm px-8 py-5 border-b border-gray-200 sticky top-0 z-10">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Target className="text-indigo-600" />
                            Análise Anual
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Visão consolidada do ano e comparativos</p>
                    </div>

                    {/* Seletor de Ano Apenas */}
                    <div className="flex items-center gap-2">
                        <button onClick={() => setAnoSelecionado(a => a - 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg">
                            <Calendar className="w-4 h-4 text-indigo-600" />
                            <span className="font-bold text-indigo-700">{anoSelecionado}</span>
                        </div>
                        <button onClick={() => setAnoSelecionado(a => a + 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-8 space-y-8">
                {/* KPI CARDS NOVOS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Total Acumulado ({anoSelecionado})</p>
                        <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.totalAno)}</h3>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Média Mensal</p>
                        <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.mediaMensal)}</h3>
                        <p className="text-xs text-gray-400 mt-1">Baseado em {kpis.mesesComDados} meses com dados</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Budget Consumido</p>
                        <h3 className={`text-2xl font-bold ${kpis.percentualBudget > 100 ? 'text-red-600' : 'text-blue-600'}`}>
                            {kpis.percentualBudget.toFixed(1)}%
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">Do orçamento anual projetado</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Maior Centro de Custo</p>
                        <h3 className="text-lg font-bold text-gray-900 truncate" title={kpis.topSetor.nome}>
                            {kpis.topSetor.nome.substring(0, 15)}...
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">{formatCurrency(kpis.topSetor.total)} acumulado</p>
                    </div>
                </div>

                {/* GRÁFICO DE LINHAS - Evolução Mensal */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-800">Evolução Mensal (Top 5 Setores)</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                            Valores mensais por setor
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dadosGrafico} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6b7280', fontSize: 11 }}
                                    tickFormatter={formatCurrency}
                                    width={70}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '8px',
                                        border: 'none',
                                        boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)',
                                        padding: '10px 14px'
                                    }}
                                    formatter={(value) => formatCurrency(value)}
                                />
                                <Legend
                                    wrapperStyle={{ paddingTop: '15px' }}
                                    iconType="circle"
                                    iconSize={8}
                                />
                                {setoresUnicos.slice(0, 5).map((setor, idx) => (
                                    <Line
                                        key={setor}
                                        type="monotone"
                                        dataKey={setor}
                                        stroke={COLORS[idx % COLORS.length]}
                                        strokeWidth={2}
                                        dot={{ fill: COLORS[idx % COLORS.length], strokeWidth: 0, r: 3 }}
                                        activeDot={{ r: 5 }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* RANKING DE CUSTOS - Substituindo o Treemap */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        Top 10 Centros de Custo - {anoSelecionado}
                    </h3>
                    <div className="space-y-4">
                        {dadosTreemap.slice(0, 10).map((item, index) => {
                            const maxValue = dadosTreemap[0]?.size || 1;
                            const percentage = (item.size / maxValue) * 100;
                            const meta = metas[item.fullName] || 0;
                            const metaAnual = meta * 12;
                            const estourou = metaAnual > 0 && item.size > metaAnual;

                            return (
                                <div
                                    key={item.fullName}
                                    className={`group cursor-pointer transition-all duration-200 hover:scale-[1.01] ${setorExpandido === item.fullName ? 'ring-2 ring-indigo-500 rounded-lg' : ''}`}
                                    onClick={() => {
                                        setSetorExpandido(setorExpandido === item.fullName ? null : item.fullName);
                                        setTimeout(() => {
                                            document.getElementById('tabela-comparativa')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }, 100);
                                    }}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Posição */}
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-amber-100 text-amber-700' :
                                            index === 1 ? 'bg-gray-200 text-gray-600' :
                                                index === 2 ? 'bg-orange-100 text-orange-700' :
                                                    'bg-gray-100 text-gray-500'
                                            }`}>
                                            {index + 1}
                                        </div>

                                        {/* Nome e Barra */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-gray-800 truncate max-w-[300px]" title={item.fullName}>
                                                    {item.fullName}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {estourou && (
                                                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                                                            Acima do Budget
                                                        </span>
                                                    )}
                                                    <span className="text-sm font-bold text-gray-900">
                                                        {formatCurrency(item.size)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Barra de Progresso */}
                                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${estourou ? 'bg-gradient-to-r from-red-400 to-red-500' :
                                                        index === 0 ? 'bg-gradient-to-r from-indigo-500 to-purple-500' :
                                                            'bg-gradient-to-r from-indigo-400 to-indigo-500'
                                                        }`}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {dadosTreemap.length > 10 && (
                        <p className="text-center text-sm text-gray-400 mt-4">
                            + {dadosTreemap.length - 10} outros setores na tabela abaixo
                        </p>
                    )}
                </div>

                {/* TABELA COMPARATIVA */}
                <div id="tabela-comparativa" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-800">Comparativo Mês a Mês</h3>
                        <button
                            onClick={exportarExcel}
                            className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            Exportar Excel
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-700 font-semibold">
                                <tr>
                                    <th className="px-6 py-4 sticky left-0 bg-gray-50 z-20">Setor</th>
                                    {MESES.map(m => (
                                        <th key={m} className="px-4 py-4 text-right whitespace-nowrap">{m}</th>
                                    ))}
                                    <th className="px-4 py-4 text-right">Total</th>
                                    <th className="px-4 py-4 text-center">Trend</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {tabelaComparativa.slice(0, 15).map((linha, idx) => {
                                    const isEstourado = linha.meta > 0 && linha.total > (linha.meta * 12);

                                    return (
                                        <React.Fragment key={linha.setor}>
                                            <tr
                                                className={`hover:bg-indigo-50/50 transition-colors cursor-pointer ${setorExpandido === linha.setor ? 'bg-indigo-50' : ''}`}
                                                onClick={() => setSetorExpandido(setorExpandido === linha.setor ? null : linha.setor)}
                                            >
                                                <td className="px-6 py-4 font-medium text-gray-800 sticky left-0 bg-white z-10 max-w-[200px] truncate" title={linha.setor}>
                                                    {linha.setor}
                                                    {isEstourado && <AlertTriangle className="inline w-4 h-4 ml-2 text-red-500" />}
                                                </td>
                                                {linha.meses.map((valor, mIdx) => (
                                                    <td key={mIdx} className="px-4 py-4 text-right font-mono text-gray-600 whitespace-nowrap">
                                                        {valor > 0 ? formatCurrency(valor) : '-'}
                                                    </td>
                                                ))}
                                                <td className="px-4 py-4 text-right font-mono font-bold text-gray-900">
                                                    {formatCurrency(linha.total)}
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    {linha.tendencia === 'up' && <TrendingUp className="inline w-5 h-5 text-red-500" />}
                                                    {linha.tendencia === 'down' && <TrendingDown className="inline w-5 h-5 text-green-500" />}
                                                    {linha.tendencia === 'stable' && <span className="text-gray-400">—</span>}
                                                </td>
                                            </tr>

                                            {/* DRILL-DOWN */}
                                            {setorExpandido === linha.setor && (
                                                <tr>
                                                    <td colSpan={15} className="bg-indigo-50/50 px-6 py-4">
                                                        <div className="ml-4">
                                                            <p className="text-sm font-semibold text-indigo-700 mb-3">Breakdown por Descrição de Conta:</p>
                                                            {loadingDetalhes ? (
                                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                                                                    Carregando...
                                                                </div>
                                                            ) : (
                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                                    {detalhesSetor.slice(0, 8).map((d, i) => (
                                                                        <div key={i} className="bg-white rounded-lg p-3 border border-indigo-100">
                                                                            <p className="text-xs text-gray-500 truncate" title={d.descricao}>{d.descricao}</p>
                                                                            <p className="font-bold text-gray-800">{formatCurrency(d.total)}</p>
                                                                            <p className="text-xs text-gray-400">{d.count} transações</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
