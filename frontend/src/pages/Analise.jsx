import React, { useEffect, useState, useMemo } from 'react';
import api from '../api';
import * as XLSX from 'xlsx';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, LineChart, Line,
    AreaChart, Area
} from 'recharts';
import {
    TrendingUp, TrendingDown, AlertTriangle, Calendar,
    ChevronLeft, ChevronRight, Download, Target, ArrowUpRight, ArrowDownRight, FileSpreadsheet,
    Settings, Check, X, DollarSign, Clock, BarChart3, Award, Table, ChevronDown, ChevronUp
} from 'lucide-react';

export default function Analise() {
    // Toggle de modo: 'anual' ou 'mensal' (persistido)
    const [modo, setModo] = useState(() => {
        const saved = localStorage.getItem('analise_modo');
        return saved || 'anual';
    });

    // Estados compartilhados (persistidos)
    const [metas, setMetas] = useState({});
    const [loading, setLoading] = useState(true);
    const [anoSelecionado, setAnoSelecionado] = useState(() => {
        const saved = localStorage.getItem('analise_ano');
        return saved ? parseInt(saved) : new Date().getFullYear();
    });
    const [mesSelecionado, setMesSelecionado] = useState(() => {
        const saved = localStorage.getItem('analise_mes');
        return saved ? parseInt(saved) : new Date().getMonth() + 1;
    });
    const [setorExpandido, setSetorExpandido] = useState(null);

    // Salvar preferências quando mudam
    useEffect(() => {
        localStorage.setItem('analise_modo', modo);
    }, [modo]);

    useEffect(() => {
        localStorage.setItem('analise_ano', anoSelecionado.toString());
    }, [anoSelecionado]);

    useEffect(() => {
        localStorage.setItem('analise_mes', mesSelecionado.toString());
    }, [mesSelecionado]);

    // Estados específicos para ANUAL
    const [dadosAgregados, setDadosAgregados] = useState({ por_mes: [], por_setor_mes: [], totais: {} });
    const [setoresSelecionados, setSetoresSelecionados] = useState(() => {
        const saved = localStorage.getItem('analise_setores_selecionados');
        return saved ? JSON.parse(saved) : [];
    });
    const [showSelectorPopup, setShowSelectorPopup] = useState(false);

    // Estados específicos para MENSAL
    const [dadosMensal, setDadosMensal] = useState({ por_dia: [], por_setor: [], totais: {} });
    const [detalhesSetor, setDetalhesSetor] = useState([]);
    const [loadingDetalhes, setLoadingDetalhes] = useState(false);

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const MESES_COMPLETOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    // Busca dados quando modo/ano/mês muda
    useEffect(() => {
        fetchDados();
    }, [modo, anoSelecionado, mesSelecionado]);

    const fetchDados = async () => {
        setLoading(true);
        try {
            // Sempre busca metas
            const resResp = await api.get('responsaveis/');
            const mapMetas = {};
            resResp.data.forEach(r => {
                const chave = r.nome_exibicao || r.nome;
                mapMetas[chave] = parseFloat(r.orcamento_mensal) || 0;
            });
            setMetas(mapMetas);

            if (modo === 'anual') {
                const resResumo = await api.get(`resumo-mensal/?ano=${anoSelecionado}`);
                setDadosAgregados(resResumo.data);
            } else {
                const resDiario = await api.get(`resumo-diario/?ano=${anoSelecionado}&mes=${mesSelecionado}`);
                setDadosMensal(resDiario.data);
            }

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

    // Salva preferências no localStorage quando setoresSelecionados muda
    useEffect(() => {
        if (setoresSelecionados.length > 0) {
            localStorage.setItem('analise_setores_selecionados', JSON.stringify(setoresSelecionados));
        }
    }, [setoresSelecionados]);

    // Setores efetivos para exibição no gráfico (selecionados ou top 5 padrão)
    const setoresParaGrafico = useMemo(() => {
        // Se tiver setores selecionados válidos (que existem nos dados atuais), usa eles
        const selecionadosValidos = setoresSelecionados.filter(s => setoresUnicos.includes(s));
        if (selecionadosValidos.length > 0) {
            return selecionadosValidos;
        }
        // Caso contrário, usa top 5 por valor total
        const gastosPorSetor = {};
        dadosAgregados.por_setor_mes.forEach(item => {
            gastosPorSetor[item.setor] = (gastosPorSetor[item.setor] || 0) + item.total;
        });
        return Object.entries(gastosPorSetor)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([setor]) => setor);
    }, [setoresSelecionados, setoresUnicos, dadosAgregados]);

    // Toggle de setor na seleção
    const toggleSetor = (setor) => {
        setSetoresSelecionados(prev => {
            if (prev.includes(setor)) {
                return prev.filter(s => s !== setor);
            } else if (prev.length < 8) { // Máximo 8 setores
                return [...prev, setor];
            }
            return prev;
        });
    };

    // Dados para o gráfico de barras (Mês a Mês)
    const dadosGrafico = useMemo(() => {
        return MESES.map((nome, idx) => {
            const mes = idx + 1;
            const dados = { name: nome, mes };
            setoresParaGrafico.forEach(setor => {
                dados[setor] = dadosPorMes[mes]?.setores[setor] || 0;
            });
            dados.total = dadosPorMes[mes]?.total || 0;
            return dados;
        });
    }, [dadosPorMes, setoresParaGrafico]);

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

    // ========================
    // MÉTRICAS E DADOS MENSAIS
    // ========================

    // Métricas do mês
    const metricasMensal = useMemo(() => {
        const totalMes = dadosMensal.totais.total_mes || 0;
        const diasComDados = dadosMensal.totais.dias_com_dados || [];
        const ultimoDia = diasComDados.length > 0 ? Math.max(...diasComDados) : 1;
        const diasNoMes = new Date(anoSelecionado, mesSelecionado, 0).getDate();

        const metaMensal = Object.values(metas).reduce((acc, m) => acc + m, 0);
        const ritmoDiario = ultimoDia > 0 ? totalMes / ultimoDia : 0;
        const projecaoFimMes = ritmoDiario * diasNoMes;
        const percentualMeta = metaMensal > 0 ? (totalMes / metaMensal) * 100 : 0;
        const percentualProjecao = metaMensal > 0 ? (projecaoFimMes / metaMensal) * 100 : 0;

        return {
            totalMes, metaMensal, ultimoDia, diasNoMes,
            ritmoDiario, projecaoFimMes, percentualMeta, percentualProjecao,
            diasRestantes: diasNoMes - ultimoDia
        };
    }, [dadosMensal, metas, anoSelecionado, mesSelecionado]);

    // Dados para gráfico de evolução diária
    const dadosGraficoDiario = useMemo(() => {
        const diasNoMes = new Date(anoSelecionado, mesSelecionado, 0).getDate();
        const metaDiaria = metricasMensal.metaMensal / diasNoMes;
        let acumulado = 0;
        let acumuladoMeta = 0;

        const result = [];
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const diaData = dadosMensal.por_dia.find(d => d.dia === dia);
            const valorDia = diaData?.total || 0;
            acumulado += valorDia;
            acumuladoMeta += metaDiaria;
            result.push({ dia, valor: valorDia, acumulado, metaAcumulada: acumuladoMeta, temDados: !!diaData });
        }
        return result;
    }, [dadosMensal, metricasMensal, anoSelecionado, mesSelecionado]);

    // Tabela detalhada mensal
    const tabelaDetalhadaMensal = useMemo(() => {
        return dadosMensal.por_setor.map(setor => {
            const meta = metas[setor.setor] || 0;
            const variacao = meta > 0 ? ((setor.total - meta) / meta) * 100 : 0;
            return {
                setor: setor.setor,
                setor_original: setor.setor_original || setor.setor,
                total: setor.total, meta, variacao,
                estourado: meta > 0 && setor.total > meta
            };
        }).sort((a, b) => b.total - a.total);
    }, [dadosMensal.por_setor, metas]);

    // Fetch detalhes de setor (mensal com mês)
    const fetchDetalhesMensal = async (nomeSetor) => {
        setLoadingDetalhes(true);
        try {
            const res = await api.get(`detalhes-setor/?ano=${anoSelecionado}&mes=${mesSelecionado}&setor=${encodeURIComponent(nomeSetor)}`);
            setDetalhesSetor(res.data);
        } catch (error) {
            console.error("Erro ao buscar detalhes:", error);
            setDetalhesSetor([]);
        }
        setLoadingDetalhes(false);
    };

    // Efeito para buscar detalhes quando setor expande (mensal)
    useEffect(() => {
        if (modo === 'mensal' && setorExpandido) {
            fetchDetalhesMensal(setorExpandido);
        } else if (modo === 'anual' && setorExpandido) {
            fetchDetalhesSetorAnual(setorExpandido);
        } else {
            setDetalhesSetor([]);
        }
    }, [setorExpandido, modo, anoSelecionado, mesSelecionado]);

    // Drill-down details (anual)

    const fetchDetalhesSetorAnual = async (nomeSetor) => {
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
                            Análise
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {modo === 'anual' ? 'Visão consolidada do ano e comparativos' : `Acompanhamento dia a dia de ${MESES_COMPLETOS[mesSelecionado - 1]}`}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Toggle Mensal/Anual */}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setModo('mensal')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${modo === 'mensal'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                                    }`}
                            >
                                Mensal
                            </button>
                            <button
                                onClick={() => setModo('anual')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${modo === 'anual'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                                    }`}
                            >
                                Anual
                            </button>
                        </div>

                        {/* Seletor de Mês (só no modo mensal) */}
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

            <main className="flex-1 p-8 space-y-8">
                {/* KPI CARDS - Unificados para ambos os modos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Card 1: Total Gasto */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <DollarSign className="w-5 h-5 text-blue-600" />
                            </div>
                            <p className="text-sm text-gray-500">
                                {modo === 'anual' ? `Total ${anoSelecionado}` : `Gasto em ${MESES[mesSelecionado - 1]}`}
                            </p>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {formatCurrency(modo === 'anual' ? kpis.totalAno : metricasMensal.totalMes)}
                        </h3>
                        <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full ${(modo === 'anual' ? kpis.percentualBudget : metricasMensal.percentualMeta) > 100
                                        ? 'bg-red-500' : 'bg-blue-500'
                                        }`}
                                    style={{ width: `${Math.min(modo === 'anual' ? kpis.percentualBudget : metricasMensal.percentualMeta, 100)}%` }}
                                ></div>
                            </div>
                            <span className="text-xs text-gray-500">
                                {(modo === 'anual' ? kpis.percentualBudget : metricasMensal.percentualMeta).toFixed(0)}%
                            </span>
                        </div>
                    </div>

                    {/* Card 2: Meta */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-100 rounded-lg">
                                <Target className="w-5 h-5 text-emerald-600" />
                            </div>
                            <p className="text-sm text-gray-500">
                                {modo === 'anual' ? 'Orçamento Anual' : 'Meta Mensal'}
                            </p>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {formatCurrency(modo === 'anual' ? kpis.orcamentoAnual : metricasMensal.metaMensal)}
                        </h3>
                        <p className="text-xs text-gray-400 mt-2">
                            Saldo: <span className={
                                (modo === 'anual' ? (kpis.orcamentoAnual - kpis.totalAno) : (metricasMensal.metaMensal - metricasMensal.totalMes)) >= 0
                                    ? 'text-green-600 font-medium' : 'text-red-600 font-medium'
                            }>
                                {formatCurrency(modo === 'anual' ? (kpis.orcamentoAnual - kpis.totalAno) : (metricasMensal.metaMensal - metricasMensal.totalMes))}
                            </span>
                        </p>
                    </div>

                    {/* Card 3: Projeção/Média */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-amber-600" />
                            </div>
                            <p className="text-sm text-gray-500">
                                {modo === 'anual' ? 'Média Mensal' : 'Projeção Fim do Mês'}
                            </p>
                        </div>
                        <h3 className={`text-2xl font-bold ${modo === 'mensal' && metricasMensal.percentualProjecao > 100 ? 'text-red-600' : 'text-gray-900'
                            }`}>
                            {formatCurrency(modo === 'anual' ? kpis.mediaMensal : metricasMensal.projecaoFimMes)}
                        </h3>
                        <p className="text-xs text-gray-400 mt-2">
                            {modo === 'anual'
                                ? `Baseado em ${kpis.mesesComDados} meses com dados`
                                : `${metricasMensal.percentualProjecao.toFixed(0)}% da meta | Ritmo: ${formatCurrency(metricasMensal.ritmoDiario)}/dia`
                            }
                        </p>
                    </div>

                    {/* Card 4: Top Setor / Progresso */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                {modo === 'anual' ? <Award className="w-5 h-5 text-purple-600" /> : <Clock className="w-5 h-5 text-purple-600" />}
                            </div>
                            <p className="text-sm text-gray-500">
                                {modo === 'anual' ? 'Maior Centro de Custo' : 'Progresso do Mês'}
                            </p>
                        </div>
                        {modo === 'anual' ? (
                            <>
                                <h3 className="text-lg font-bold text-gray-900 truncate" title={kpis.topSetor.nome}>
                                    {kpis.topSetor.nome.substring(0, 20)}...
                                </h3>
                                <p className="text-xs text-gray-400 mt-2">{formatCurrency(kpis.topSetor.total)} acumulado</p>
                            </>
                        ) : (
                            <>
                                <h3 className="text-2xl font-bold text-gray-900">
                                    Dia {metricasMensal.ultimoDia}/{metricasMensal.diasNoMes}
                                </h3>
                                <p className="text-xs text-gray-400 mt-2">{metricasMensal.diasRestantes} dias restantes</p>
                            </>
                        )}
                    </div>
                </div>

                {/* ================= MODO ANUAL ================= */}
                {modo === 'anual' && (
                    <>

                        {/* GRÁFICO DE LINHAS - Evolução Mensal */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-gray-800">
                                    Evolução Mensal
                                    <span className="text-sm font-normal text-gray-500 ml-2">
                                        ({setoresSelecionados.length > 0 ? `${setoresParaGrafico.length} selecionados` : 'Top 5'})
                                    </span>
                                </h3>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setShowSelectorPopup(!showSelectorPopup)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${showSelectorPopup
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        <Settings className="w-4 h-4" />
                                        Selecionar Setores
                                    </button>
                                </div>
                            </div>

                            {/* Popup de seleção de setores */}
                            {showSelectorPopup && (
                                <div className="absolute top-20 right-6 z-20 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-semibold text-gray-800">Selecionar Setores</h4>
                                        <button
                                            onClick={() => setShowSelectorPopup(false)}
                                            className="p-1 hover:bg-gray-100 rounded-md"
                                        >
                                            <X className="w-4 h-4 text-gray-500" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3">
                                        Selecione até 8 setores para exibir no gráfico
                                    </p>
                                    {setoresSelecionados.length > 0 && (
                                        <button
                                            onClick={() => setSetoresSelecionados([])}
                                            className="text-xs text-red-500 hover:text-red-700 mb-3"
                                        >
                                            Limpar seleção (usar Top 5)
                                        </button>
                                    )}
                                    <div className="space-y-1">
                                        {setoresUnicos.map((setor, idx) => {
                                            const isSelected = setoresSelecionados.includes(setor);
                                            return (
                                                <button
                                                    key={setor}
                                                    onClick={() => toggleSetor(setor)}
                                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all ${isSelected
                                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                        : 'hover:bg-gray-50 text-gray-600'
                                                        }`}
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                                                        }`}>
                                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <div
                                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: isSelected ? COLORS[setoresSelecionados.indexOf(setor) % COLORS.length] : '#d1d5db' }}
                                                    />
                                                    <span className="truncate flex-1" title={setor}>{setor}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

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
                                        {setoresParaGrafico.map((setor, idx) => (
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
                                                                            {detalhesSetor.map((d, i) => (
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
                    </>
                )}

                {/* ================= MODO MENSAL ================= */}
                {modo === 'mensal' && (
                    <>
                        {/* GRÁFICO EVOLUÇÃO DIÁRIA */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-indigo-600" />
                                Evolução Diária vs Meta
                            </h3>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dadosGraficoDiario} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value, name) => [formatCurrency(value), name === 'acumulado' ? 'Acumulado Real' : 'Meta Acumulada']}
                                            labelFormatter={(label) => `Dia ${label}`}
                                        />
                                        <Area type="monotone" dataKey="acumulado" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorAcumulado)" name="acumulado" />
                                        <Line type="monotone" dataKey="metaAcumulada" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} name="metaAcumulada" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* GRID INFERIOR MENSAL */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Gasto por Dia */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                                    Gasto por Dia
                                </h3>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={dadosGraficoDiario.filter(d => d.valor > 0)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                            <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
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
                                    {(() => {
                                        const top8 = dadosMensal.por_setor.slice(0, 8);
                                        const totalTop8 = top8.reduce((acc, s) => acc + s.total, 0);
                                        return top8.map((setor, idx) => {
                                            const percent = totalTop8 > 0 ? (setor.total / totalTop8) * 100 : 0;
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
                                                                style={{ width: `${percent}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-gray-500 w-12 text-right">{percent.toFixed(1)}%</span>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* TABELA DETALHADA MENSAL */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Table className="w-5 h-5 text-indigo-600" />
                                    Detalhamento por Centro de Custo
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-700 font-semibold">
                                        <tr>
                                            <th className="px-6 py-4">Centro de Custo</th>
                                            <th className="px-4 py-4 text-right">Gasto no Mês</th>
                                            <th className="px-4 py-4 text-right">Meta Mensal</th>
                                            <th className="px-4 py-4 text-right">Variação</th>
                                            <th className="px-4 py-4 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {tabelaDetalhadaMensal.map((linha, idx) => (
                                            <React.Fragment key={linha.setor_original}>
                                                <tr
                                                    className={`hover:bg-indigo-50/50 transition-colors cursor-pointer ${setorExpandido === linha.setor_original ? 'bg-indigo-50' : ''}`}
                                                    onClick={() => setSetorExpandido(setorExpandido === linha.setor_original ? null : linha.setor_original)}
                                                >
                                                    <td className="px-6 py-4 font-medium text-gray-800 max-w-[250px] truncate" title={linha.setor}>
                                                        {linha.setor}
                                                        {linha.estourado && <AlertTriangle className="inline w-4 h-4 ml-2 text-red-500" />}
                                                    </td>
                                                    <td className="px-4 py-4 text-right font-mono font-bold text-gray-900">
                                                        {formatCurrency(linha.total)}
                                                    </td>
                                                    <td className="px-4 py-4 text-right font-mono text-gray-600">
                                                        {linha.meta > 0 ? formatCurrency(linha.meta) : '-'}
                                                    </td>
                                                    <td className={`px-4 py-4 text-right font-mono ${linha.variacao > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {linha.meta > 0 ? `${linha.variacao.toFixed(1)}%` : '-'}
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        {linha.estourado ? (
                                                            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">Acima</span>
                                                        ) : linha.meta > 0 ? (
                                                            <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full font-medium">OK</span>
                                                        ) : (
                                                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-medium">Sem Meta</span>
                                                        )}
                                                    </td>
                                                </tr>
                                                {/* DRILL-DOWN - Detalhes por Descrição de Conta */}
                                                {setorExpandido === linha.setor_original && (
                                                    <tr>
                                                        <td colSpan={5} className="bg-indigo-50/50 px-6 py-4">
                                                            <div className="ml-4">
                                                                <p className="text-sm font-semibold text-indigo-700 mb-3">
                                                                    Breakdown por Descrição de Conta:
                                                                </p>
                                                                {loadingDetalhes ? (
                                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                                                                        Carregando...
                                                                    </div>
                                                                ) : detalhesSetor.length === 0 ? (
                                                                    <p className="text-sm text-gray-500">Nenhum detalhe encontrado.</p>
                                                                ) : (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                        {detalhesSetor.map((detalhe, i) => (
                                                                            <div key={i} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-gray-100">
                                                                                <span className="text-sm text-gray-700 truncate max-w-[200px]" title={detalhe.descricao}>
                                                                                    {detalhe.descricao}
                                                                                </span>
                                                                                <span className="text-sm font-bold text-gray-900 ml-2">{formatCurrency(detalhe.total)}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
