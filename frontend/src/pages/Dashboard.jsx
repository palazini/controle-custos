import { useEffect, useState } from 'react';
import api from '../api';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
  LayoutDashboard, Wallet, PieChart as PieIcon,
  ArrowUpRight, DollarSign, Activity, Calendar, Filter
} from 'lucide-react';
import UploadModal from '../components/UploadModal';
import DetalhesModal from '../components/DetalhesModal';

function App() {
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [dadosTempo, setDadosTempo] = useState([]);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [totalGasto, setTotalGasto] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [detalhesModalOpen, setDetalhesModalOpen] = useState(false);
  const [transacoesFiltradas, setTransacoesFiltradas] = useState([]);
  const [responsavelSelecionado, setResponsavelSelecionado] = useState('');
  const [responsavelOriginalSelecionado, setResponsavelOriginalSelecionado] = useState(''); // Novo estado

  const [metas, setMetas] = useState({});

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    fetchDados();
    fetchMetas();
  }, []);

  const fetchMetas = async () => {
    try {
      const response = await api.get('responsaveis/');
      const mapMetas = {};
      response.data.forEach(r => {
        // Usa nome_exibicao como chave se existir, senão usa nome
        const chave = r.nome_exibicao || r.nome;
        mapMetas[chave] = parseFloat(r.orcamento_mensal) || 0;
      });
      setMetas(mapMetas);
    } catch (error) {
      console.error("Erro ao buscar metas", error);
    }
  };

  const fetchDados = async () => {
    setLoading(true);
    try {
      let url = 'dashboard-resumo/';
      if (dataInicio && dataFim) {
        url += `?inicio=${dataInicio}&fim=${dataFim}`;
      }

      const response = await api.get(url);
      const dados = response.data;

      setTotalGasto(dados.total_gasto);

      // Mapear para o formato do Recharts
      setDadosGrafico(dados.resumo_setor.map(s => ({
        name: s.responsavel_nome,
        originalName: s.responsavel_original, // Nome real para buscar na API
        value: s.total
      })));

      setDadosTempo(dados.resumo_tempo.map(t => ({
        name: t.nome, // "Jan/2024"
        value: t.total
      })));

      setLoading(false);
    } catch (error) {
      console.error("Erro:", error);
      setLoading(false);
    }
  };

  const handleFiltrar = (e) => {
    e.preventDefault();
    fetchDados();
  }

  const abrirDetalhes = async (item) => {
    // Se recebeu o objeto do gráfico (clique na tabela/pizza), usa .name e .originalName
    // Se recebeu string (legado/outros), tenta usar como está
    const nomeExibicao = item.name || item;
    const nomeOriginal = item.originalName || item;

    setResponsavelSelecionado(nomeExibicao);
    setResponsavelOriginalSelecionado(nomeOriginal); // Guarda o original
    setDetalhesModalOpen(true);
    setLoadingDetalhes(true);
    setTransacoesFiltradas([]); // Limpa enquanto carrega

    try {
      // Usa o nome original para filtrar no backend
      let url = `transacoes/?responsavel__nome=${encodeURIComponent(nomeOriginal)}`;
      // Aplica filtros de data se existirem
      if (dataInicio && dataFim) {
        url += `&inicio=${dataInicio}&fim=${dataFim}`;
      }

      const response = await api.get(url);
      setTransacoesFiltradas(response.data);
    } catch (error) {
      console.error("Erro ao buscar detalhes:", error);
    } finally {
      setLoadingDetalhes(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans">
      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm px-8 py-4 sticky top-0 z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

            <h2 className="text-xl font-semibold text-gray-800">Visão Geral</h2>

            {/* ÁREA DE FILTROS E AÇÕES */}
            <div className="flex flex-wrap items-center gap-3">

              {/* Formulário de Data */}
              <form onSubmit={handleFiltrar} className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="bg-transparent text-sm text-gray-600 outline-none px-2 py-1"
                  required
                />
                <span className="text-gray-400">-</span>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="bg-transparent text-sm text-gray-600 outline-none px-2 py-1"
                  required
                />
                <button
                  type="submit"
                  className="bg-white hover:bg-gray-100 text-indigo-600 p-1.5 rounded-md border border-gray-200 shadow-sm transition-all"
                  title="Aplicar Filtro"
                >
                  <Filter className="w-4 h-4" />
                </button>
              </form>

              {/* Botão de limpar filtro (Só aparece se tiver filtro) */}
              {(dataInicio || dataFim) && (
                <button
                  onClick={() => {
                    setDataInicio('');
                    setDataFim('');
                    api.get('transacoes/')
                      .then(res => {
                        setTransacoes(res.data);
                        processarDados(res.data);
                      });
                  }}
                  className="text-xs text-red-500 hover:text-red-700 underline"
                >
                  Limpar
                </button>
              )}

              <div className="h-6 w-px bg-gray-300 mx-2 hidden md:block"></div>

              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm flex items-center"
              >
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Importar
              </button>
            </div>

          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-8">

          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Custo Total</p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    R$ {totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="p-3 bg-red-50 rounded-full">
                  <DollarSign className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Maior Centro de Custo</p>
                  <h3 className="text-lg font-bold text-gray-900 truncate max-w-[200px]" title={dadosGrafico[0]?.name}>
                    {dadosGrafico[0]?.name || '-'}
                  </h3>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <Activity className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Meses Analisados</p>
                  <h3 className="text-2xl font-bold text-gray-900">{dadosTempo.length}</h3>
                </div>
                <div className="p-3 bg-indigo-50 rounded-full">
                  <Calendar className="w-6 h-6 text-indigo-500" />
                </div>
              </div>
            </div>
          </div>

          {/* GRÁFICO DE EVOLUÇÃO (NOVO) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Evolução de Custos (Mensal)</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dadosTempo} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Custo']}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#6366f1"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorValor)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GRID INFERIOR (PIZZA + TABELA) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-w-0">

            {/* PIZZA */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Distribuição por Responsável</h3>
              <div className="flex-1 min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosGrafico}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      onClick={(data) => abrirDetalhes(data)}
                      cursor="pointer"
                    >
                      {dadosGrafico.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* TABELA TOP 5 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800">Maiores Custos (Top 5)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-gray-900 font-medium">
                    <tr>
                      <th className="px-6 py-4">Responsável</th>
                      <th className="px-6 py-4 text-right whitespace-nowrap">Valor</th>
                      <th className="px-6 py-4 text-right whitespace-nowrap w-40">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dadosGrafico.slice(0, 5).map((item, index) => {
                      const metaMensal = metas[item.name] || 0; // Meta mensal
                      // Calcula a meta acumulada baseada no número de meses com dados
                      const mesesNoPeriodo = dadosTempo.length || 1;
                      const metaAcumulada = metaMensal * mesesNoPeriodo;
                      const percentualMeta = metaAcumulada > 0 ? (item.value / metaAcumulada) * 100 : 0;
                      const isEstourado = percentualMeta > 100;

                      return (
                        <tr
                          key={index}
                          className="hover:bg-gray-50 transition-colors cursor-pointer group"
                          onClick={() => abrirDetalhes(item)}
                        >
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-800">{item.name}</div>
                            {/* Barra de Progresso Mini */}
                            {metaAcumulada > 0 && (
                              <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${isEstourado ? 'bg-red-500' : 'bg-green-500'}`}
                                  style={{ width: `${Math.min(percentualMeta, 100)}%` }}
                                ></div>
                              </div>
                            )}
                            {metaAcumulada > 0 && (
                              <div className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">
                                Meta ({mesesNoPeriodo} {mesesNoPeriodo === 1 ? 'mês' : 'meses'}): R$ {metaAcumulada.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-mono whitespace-nowrap">
                            R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            {metaAcumulada > 0 ? (
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${isEstourado ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {percentualMeta.toFixed(0)}% da Meta
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">Sem meta</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        {/* MODAL DE UPLOAD */}
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={() => fetchDados()}
        />

        {/* MODAL DE DETALHES */}
        <DetalhesModal
          isOpen={detalhesModalOpen}
          onClose={() => setDetalhesModalOpen(false)}
          dados={transacoesFiltradas}
          responsavelNome={responsavelSelecionado}
          responsavelOriginal={responsavelOriginalSelecionado} // Passa o original
          meses={dadosTempo.length || 1} // Passa quantidade de meses
          onMetaUpdate={fetchMetas}
          loading={loadingDetalhes}
        />

      </main>
    </div>
  );
}

export default App;