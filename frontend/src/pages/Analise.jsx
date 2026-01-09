import React, { useEffect, useState, useMemo } from 'react';
import api from '../api';
import * as XLSX from 'xlsx';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, Treemap
} from 'recharts';
import {
    TrendingUp, TrendingDown, AlertTriangle, Calendar,
    ChevronLeft, ChevronRight, Download, Target, ArrowUpRight, ArrowDownRight, FileSpreadsheet, Map
} from 'lucide-react';

export default function Analise() {
    // Estados otimizados - não armazena mais transações brutas
    const [dadosAgregados, setDadosAgregados] = useState({ por_mes: [], por_setor_mes: [], totais: {} });
    const [metas, setMetas] = useState({});
    const [loading, setLoading] = useState(true);
    const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
    const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
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

            // Auto-seleciona o último mês com dados
            const mesesComDados = resResumo.data.totais.meses_com_dados || [];
            if (mesesComDados.length > 0) {
                setMesSelecionado(mesesComDados[mesesComDados.length - 1]);
            }

            setLoading(false);
        } catch (error) {
            console.error("Erro:", error);
            setLoading(false);
        }
    };

    // Transforma dados agregados em estrutura por mês (já vem pronto do backend!)
    const dadosPorMes = useMemo(() => {
        const agrupado = {};

        // Popula totais por mês
        dadosAgregados.por_mes.forEach(item => {
            if (!agrupado[item.mes]) agrupado[item.mes] = { total: 0, setores: {} };
            agrupado[item.mes].total = item.total;
        });

        // Popula setores por mês
        dadosAgregados.por_setor_mes.forEach(item => {
            if (!agrupado[item.mes]) agrupado[item.mes] = { total: 0, setores: {} };
            agrupado[item.mes].setores[item.setor] = item.total;
        });

        return agrupado;
    }, [dadosAgregados]);

    // Lista de setores únicos (extraída dos dados agregados)
    const setoresUnicos = useMemo(() => {
        const setores = new Set();
        dadosAgregados.por_setor_mes.forEach(item => setores.add(item.setor));
        return Array.from(setores).sort();
    }, [dadosAgregados]);

    // Dados para o gráfico de barras empilhadas
    const dadosGrafico = useMemo(() => {
        return MESES.map((nome, idx) => {
            const mes = idx + 1;
            const dados = { name: nome, mes };

            setoresUnicos.slice(0, 8).forEach(setor => {
                dados[setor] = dadosPorMes[mes]?.setores[setor] || 0;
            });

            dados.total = dadosPorMes[mes]?.total || 0;
            return dados;
        });
    }, [dadosPorMes, setoresUnicos]);

    // KPIs - agora usa o mês selecionado + projeções
    const kpis = useMemo(() => {
        const totalAno = Object.values(dadosPorMes).reduce((acc, m) => acc + m.total, 0);
        const totalMesSelecionado = dadosPorMes[mesSelecionado]?.total || 0;
        const mesAnterior = mesSelecionado > 1 ? mesSelecionado - 1 : 12;
        const totalMesAnterior = dadosPorMes[mesAnterior]?.total || 0;

        const variacao = totalMesAnterior > 0
            ? ((totalMesSelecionado - totalMesAnterior) / totalMesAnterior) * 100
            : 0;

        // Setores estourados (acima da meta)
        let estourados = 0;
        let maiorCrescimento = { setor: '-', percent: 0 };

        const mesAnteriorCalc = mesSelecionado > 1 ? mesSelecionado - 1 : 12;

        // Cálculos de orçamento
        let orcamentoTotalAnual = 0;
        let orcamentoMesAtual = 0;

        setoresUnicos.forEach(setor => {
            const valorAtual = dadosPorMes[mesSelecionado]?.setores[setor] || 0;
            const valorAnterior = dadosPorMes[mesAnteriorCalc]?.setores[setor] || 0;
            const meta = metas[setor] || 0;

            orcamentoMesAtual += meta;
            orcamentoTotalAnual += meta * 12;

            if (meta > 0 && valorAtual > meta) estourados++;

            if (valorAnterior > 0) {
                const cresc = ((valorAtual - valorAnterior) / valorAnterior) * 100;
                if (cresc > maiorCrescimento.percent) {
                    maiorCrescimento = { setor, percent: cresc };
                }
            }
        });

        // Projeção: ritmo diário médio * dias do mês
        const hoje = new Date();
        const diaAtual = hoje.getDate();
        const diasNoMes = new Date(anoSelecionado, mesSelecionado, 0).getDate();
        const ritmoDiario = diaAtual > 0 ? totalMesSelecionado / diaAtual : 0;
        const projecaoFimMes = ritmoDiario * diasNoMes;

        // YTD vs Budget
        const ytdReal = totalAno;
        const mesesPassados = dadosAgregados.totais.meses_com_dados?.length || 1;
        const ytdBudget = orcamentoMesAtual * mesesPassados;
        const ytdPercentual = ytdBudget > 0 ? (ytdReal / ytdBudget) * 100 : 0;

        return {
            totalAno,
            totalMesSelecionado,
            variacao,
            estourados,
            maiorCrescimento,
            // Novas métricas
            projecaoFimMes,
            orcamentoMesAtual,
            projecaoVsMeta: orcamentoMesAtual > 0 ? (projecaoFimMes / orcamentoMesAtual) * 100 : 0,
            ytdReal,
            ytdBudget,
            ytdPercentual,
            diaAtual,
            diasNoMes
        };
    }, [dadosPorMes, metas, setoresUnicos, mesSelecionado, anoSelecionado, dadosAgregados]);

    // Tabela comparativa mês a mês por setor
    const tabelaComparativa = useMemo(() => {
        return setoresUnicos.map(setor => {
            const linha = { setor, meses: [], total: 0 };

            for (let m = 1; m <= 12; m++) {
                const valor = dadosPorMes[m]?.setores[setor] || 0;
                linha.meses.push(valor);
                linha.total += valor;
            }

            // Tendência (compara últimos 2 meses com dados)
            const ultimos = linha.meses.filter(v => v > 0).slice(-2);
            if (ultimos.length === 2) {
                linha.tendencia = ultimos[1] > ultimos[0] ? 'up' : 'down';
            } else {
                linha.tendencia = 'stable';
            }

            linha.meta = metas[setor] || 0;
            return linha;
        }).sort((a, b) => b.total - a.total);
    }, [dadosPorMes, setoresUnicos, metas]);

    // Drill-down: busca detalhes do setor quando expandido
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

    // Quando o setor expandido muda, busca os detalhes
    useEffect(() => {
        if (setorExpandido) {
            fetchDetalhesSetor(setorExpandido);
        } else {
            setDetalhesSetor([]);
        }
    }, [setorExpandido, anoSelecionado]);

    // Dados para o Treemap (custos do mês selecionado)
    const dadosTreemap = useMemo(() => {
        const setoresDoMes = dadosPorMes[mesSelecionado]?.setores || {};
        return Object.entries(setoresDoMes)
            .map(([name, size]) => ({
                name: name.substring(0, 25),
                fullName: name,
                size,
                fill: COLORS[Math.abs(name.charCodeAt(0)) % COLORS.length]
            }))
            .sort((a, b) => b.size - a.size)
            .slice(0, 15);
    }, [dadosPorMes, mesSelecionado]);

    // ========== EXPORTAÇÃO EXCEL ==========
    const exportarExcel = () => {
        // Prepara dados para a planilha
        const dadosExport = tabelaComparativa.map(linha => {
            const row = { 'Setor': linha.setor };
            MESES.forEach((mes, idx) => {
                row[mes] = linha.meses[idx] || 0;
            });
            row['Total'] = linha.total;
            row['Meta Mensal'] = linha.meta || 0;
            row['Tendência'] = linha.tendencia === 'up' ? '↑' : linha.tendencia === 'down' ? '↓' : '—';
            return row;
        });

        // Cria workbook e worksheet
        const ws = XLSX.utils.json_to_sheet(dadosExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Custos ${anoSelecionado}`);

        // Define largura das colunas
        ws['!cols'] = [
            { wch: 40 }, // Setor
            ...MESES.map(() => ({ wch: 12 })), // Meses
            { wch: 15 }, // Total
            { wch: 15 }, // Meta
            { wch: 10 }  // Tendência
        ];

        // Baixa o arquivo
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
                            Análise Detalhada
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Comparativo mês a mês e drill-down por setor</p>
                    </div>

                    {/* Seletor de Ano e Mês */}
                    <div className="flex items-center gap-4">
                        {/* Seletor de Mês */}
                        <select
                            value={mesSelecionado}
                            onChange={(e) => setMesSelecionado(Number(e.target.value))}
                            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            {MESES.map((nome, idx) => (
                                <option key={idx} value={idx + 1}>{nome}</option>
                            ))}
                        </select>

                        {/* Seletor de Ano */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setAnoSelecionado(a => a - 1)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg">
                                <Calendar className="w-4 h-4 text-indigo-600" />
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
                </div>
            </header>

            <main className="flex-1 p-8 space-y-8">
                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Total do Ano</p>
                        <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.totalAno)}</h3>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">{MESES[mesSelecionado - 1]}/{anoSelecionado}</p>
                        <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.totalMesSelecionado)}</h3>
                        <div className={`flex items-center mt-1 text-sm ${kpis.variacao >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {kpis.variacao >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            <span>{Math.abs(kpis.variacao).toFixed(1)}% vs {MESES[mesSelecionado - 2] || 'Dez'}</span>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Setores Estourados</p>
                        <h3 className={`text-2xl font-bold ${kpis.estourados > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {kpis.estourados}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">Acima da meta mensal</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Maior Crescimento</p>
                        <h3 className="text-lg font-bold text-gray-900 truncate" title={kpis.maiorCrescimento.setor}>
                            {kpis.maiorCrescimento.setor.substring(0, 20)}...
                        </h3>
                        <div className="flex items-center mt-1 text-sm text-red-600">
                            <TrendingUp className="w-4 h-4 mr-1" />
                            <span>+{kpis.maiorCrescimento.percent.toFixed(0)}%</span>
                        </div>
                    </div>
                </div>

                {/* GRÁFICO EMPILHADO */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Evolução Mensal por Setor (Top 8)</h3>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dadosGrafico} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                    tickFormatter={(value) => formatCurrency(value)}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value) => formatCurrency(value)}
                                />
                                <Legend />
                                {setoresUnicos.slice(0, 8).map((setor, idx) => (
                                    <Bar
                                        key={setor}
                                        dataKey={setor}
                                        stackId="a"
                                        fill={COLORS[idx % COLORS.length]}
                                        radius={idx === setoresUnicos.slice(0, 8).length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* TREEMAP - Distribuição do Mês */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Map className="w-5 h-5 text-indigo-600" />
                        Mapa de Custos - {MESES[mesSelecionado - 1]}/{anoSelecionado}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">Tamanho proporcional ao valor gasto. Clique para ver detalhes na tabela.</p>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <Treemap
                                data={dadosTreemap}
                                dataKey="size"
                                aspectRatio={4 / 3}
                                stroke="#fff"
                                fill="#6366f1"
                                content={({ root, depth, x, y, width, height, index, name, size, fill }) => {
                                    const handleClick = () => {
                                        const fullName = dadosTreemap[index]?.fullName;
                                        if (fullName) {
                                            setSetorExpandido(fullName);
                                            // Scroll para a tabela após um pequeno delay
                                            setTimeout(() => {
                                                document.getElementById('tabela-comparativa')?.scrollIntoView({
                                                    behavior: 'smooth',
                                                    block: 'start'
                                                });
                                            }, 100);
                                        }
                                    };

                                    // Calcula se cabe texto
                                    const cabeTexto = width > 60 && height > 40;
                                    const cabeValor = width > 50 && height > 25;

                                    return (
                                        <g onClick={handleClick} style={{ cursor: 'pointer' }}>
                                            <rect
                                                x={x}
                                                y={y}
                                                width={width}
                                                height={height}
                                                style={{
                                                    fill: fill || COLORS[index % COLORS.length],
                                                    stroke: '#fff',
                                                    strokeWidth: 2
                                                }}
                                            />
                                            {cabeTexto && (
                                                <text
                                                    x={x + width / 2}
                                                    y={y + height / 2 - (cabeValor ? 6 : 0)}
                                                    textAnchor="middle"
                                                    fill="#fff"
                                                    fontSize={Math.min(14, width / 10)}
                                                    fontWeight="600"
                                                    style={{
                                                        textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                                                        pointerEvents: 'none'
                                                    }}
                                                >
                                                    {(name || '').substring(0, Math.floor(width / 7))}
                                                </text>
                                            )}
                                            {cabeValor && (
                                                <text
                                                    x={x + width / 2}
                                                    y={y + height / 2 + (cabeTexto ? 12 : 4)}
                                                    textAnchor="middle"
                                                    fill="#fff"
                                                    fontSize={Math.min(12, width / 12)}
                                                    fontWeight="500"
                                                    style={{
                                                        textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                                                        pointerEvents: 'none'
                                                    }}
                                                >
                                                    {formatCurrency(size || 0)}
                                                </text>
                                            )}
                                        </g>
                                    );
                                }}
                            />
                        </ResponsiveContainer>
                    </div>
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
