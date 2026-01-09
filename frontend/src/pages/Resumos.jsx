import React, { useEffect, useState } from 'react';
import api from '../api';
import {
    LayoutGrid, Calendar, ChevronLeft, ChevronRight, Award, Truck, Filter
} from 'lucide-react';

export default function Resumos() {
    const [dados, setDados] = useState({ top_setores: [], top_fornecedores: [], total_geral: 0 });
    const [loading, setLoading] = useState(true);

    // Filtros
    const [periodo, setPeriodo] = useState('mes'); // 'tudo', 'ano', 'mes', 'semana'
    const getCurrentWeek = () => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        // Thursday in current week decides the year.
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        const week1 = new Date(date.getFullYear(), 0, 4);
        return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    };

    const [ano, setAno] = useState(new Date().getFullYear());
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [semana, setSemana] = useState(getCurrentWeek());

    const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const CORES = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4'];

    useEffect(() => {
        fetchDados();
    }, [periodo, ano, mes, semana]);

    const fetchDados = async () => {
        setLoading(true);
        try {
            const url = `resumo-geral/?periodo=${periodo}&ano=${ano}&mes=${mes}&semana=${semana}`;
            const response = await api.get(url);
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

    const mesAnterior = () => {
        if (mes === 1) {
            setMes(12);
            setAno(a => a - 1);
        } else {
            setMes(m => m - 1);
        }
    };

    const mesSeguinte = () => {
        if (mes === 12) {
            setMes(1);
            setAno(a => a + 1);
        } else {
            setMes(m => m + 1);
        }
    };

    const semanaAnterior = () => {
        if (semana === 1) {
            setSemana(52);
            setAno(a => a - 1);
        } else {
            setSemana(s => s - 1);
        }
    };

    const semanaSeguinte = () => {
        // Lógica simples de 52 semanas (pode variar 53, mas ok para MVP)
        if (semana >= 52) {
            setSemana(1);
            setAno(a => a + 1);
        } else {
            setSemana(s => s + 1);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    const getWeekDateRange = (y, w) => {
        const d = new Date(y, 0, 1 + (w - 1) * 7);
        const dayOfWeek = d.getDay();
        const ISOweekStart = d;
        if (dayOfWeek <= 4)
            ISOweekStart.setDate(d.getDate() - d.getDay() + 1);
        else
            ISOweekStart.setDate(d.getDate() + 8 - d.getDay());

        const start = new Date(ISOweekStart);
        const end = new Date(ISOweekStart);
        end.setDate(end.getDate() + 6);

        const fmt = (date) => date.getDate().toString().padStart(2, '0') + '/' + (date.getMonth() + 1).toString().padStart(2, '0');
        return `${fmt(start)} até ${fmt(end)}`;
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <LayoutGrid className="text-indigo-600" />
                            Resumos Gerais
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Comparativo direto entre Setores e Fornecedores</p>
                    </div>

                    {/* Controles de Filtro */}
                    <div className="flex items-center gap-4">
                        {/* Seletor de Período */}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            {['tudo', 'ano', 'mes', 'semana'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriodo(p)}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${periodo === p
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* Controles de Data (só aparecem se não for 'tudo') */}
                        {periodo !== 'tudo' && (
                            <div className="flex items-center gap-3 border-l pl-4 border-gray-200">
                                {periodo === 'mes' && (
                                    <>
                                        <button onClick={mesAnterior} className="p-2 hover:bg-gray-100 rounded-lg">
                                            <ChevronLeft className="w-4 h-4 text-gray-600" />
                                        </button>
                                        <div className="font-bold text-indigo-700 min-w-[140px] text-center">
                                            {MESES[mes - 1]} {ano}
                                        </div>
                                        <button onClick={mesSeguinte} className="p-2 hover:bg-gray-100 rounded-lg">
                                            <ChevronRight className="w-4 h-4 text-gray-600" />
                                        </button>
                                    </>
                                )}

                                {periodo === 'ano' && (
                                    <>
                                        <button onClick={() => setAno(a => a - 1)} className="p-2 hover:bg-gray-100 rounded-lg">
                                            <ChevronLeft className="w-4 h-4 text-gray-600" />
                                        </button>
                                        <div className="font-bold text-indigo-700 min-w-[80px] text-center">
                                            {ano}
                                        </div>
                                        <button onClick={() => setAno(a => a + 1)} className="p-2 hover:bg-gray-100 rounded-lg">
                                            <ChevronRight className="w-4 h-4 text-gray-600" />
                                        </button>
                                    </>
                                )}

                                {periodo === 'semana' && (
                                    <>
                                        <button onClick={semanaAnterior} className="p-2 hover:bg-gray-100 rounded-lg">
                                            <ChevronLeft className="w-4 h-4 text-gray-600" />
                                        </button>
                                        <div className="flex items-center gap-2 text-sm text-gray-800 font-bold bg-white px-3 py-1 rounded border border-gray-200 min-w-[140px] justify-center">
                                            <Calendar className="w-4 h-4 text-indigo-600" />
                                            <span>Semana {semana} / {ano}</span>
                                        </div>
                                        <button onClick={semanaSeguinte} className="p-2 hover:bg-gray-100 rounded-lg">
                                            <ChevronRight className="w-4 h-4 text-gray-600" />
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1 p-8">
                {/* Total do Período */}
                {/* Cards de Topo */}
                <div className="mb-8 flex flex-wrap gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-w-[300px]">
                        <p className="text-sm text-gray-500 mb-1">Total no Período</p>
                        <h2 className="text-3xl font-bold text-gray-900">{formatCurrency(dados.total_geral)}</h2>
                    </div>

                    {periodo === 'semana' && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-w-[300px]">
                            <p className="text-sm text-gray-500 mb-1">Intervalo da Semana</p>
                            <h2 className="text-2xl font-bold text-indigo-600 flex items-center gap-2 h-9">
                                <Calendar className="w-6 h-6" />
                                {getWeekDateRange(ano, semana)}
                            </h2>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* COLUNA 1: TOP SETORES */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Award className="w-5 h-5 text-indigo-600" />
                            Top Setores
                        </h3>
                        <div className="space-y-4">
                            {dados.top_setores.map((setor, idx) => {
                                const percent = dados.total_geral > 0 ? (setor.total / dados.total_geral) * 100 : 0;
                                return (
                                    <div key={idx} className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-gray-400 w-6 text-center">{idx + 1}</span>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-gray-700 truncate max-w-[250px]" title={setor.nome}>
                                                    {setor.nome}
                                                </span>
                                                <span className="text-sm font-bold text-gray-900">{formatCurrency(setor.total)}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                                <div
                                                    className="h-2.5 rounded-full"
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

                    {/* COLUNA 2: TOP FORNECEDORES */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Truck className="w-5 h-5 text-emerald-600" />
                            Top Fornecedores
                        </h3>
                        <div className="space-y-4">
                            {dados.top_fornecedores.map((forn, idx) => {
                                const percent = dados.total_geral > 0 ? (forn.total / dados.total_geral) * 100 : 0;
                                return (
                                    <div key={idx} className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-gray-400 w-6 text-center">{idx + 1}</span>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-gray-700" title={forn.nome}>
                                                    {forn.nome}
                                                </span>
                                                <span className="text-sm font-bold text-gray-900">{formatCurrency(forn.total)}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                                <div
                                                    className="h-2.5 rounded-full"
                                                    style={{
                                                        width: `${percent}%`,
                                                        backgroundColor: CORES[(idx + 2) % CORES.length] // Offset cor para diferenciar
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
