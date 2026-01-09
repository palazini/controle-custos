import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, FileText, Target, Save } from 'lucide-react';

export default function DetalhesModal({ isOpen, onClose, dados, responsavelNome, onMetaUpdate, loading }) {
    const [metaAtual, setMetaAtual] = useState('');
    const [idResponsavel, setIdResponsavel] = useState(null);
    const [editando, setEditando] = useState(false);

    // Quando abrir o modal, busca o ID e a Meta desse responsável específico
    useEffect(() => {
        if (isOpen && responsavelNome) {
            buscarMetaResponsavel();
        }
    }, [isOpen, responsavelNome]);
    // ... (omitted parts)
    {/* TABELA COM SCROLL */ }
    <div className="overflow-auto p-0 flex-1">
        {loading ? (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        ) : (
            <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-700 font-semibold sticky top-0 shadow-sm">
                    <tr>
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4">Descrição da Conta</th>
                        <th className="px-6 py-4">Detalhe (TXT)</th>
                        <th className="px-6 py-4 text-right">Valor</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {dados.map((item, index) => (
                        <tr key={index} className="hover:bg-indigo-50/50 transition-colors">
                            <td className="px-6 py-3 whitespace-nowrap text-gray-500">
                                {new Date(item.data).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-3 font-medium text-gray-800">
                                {item.descricao_conta}
                            </td>
                            <td className="px-6 py-3 text-xs text-gray-500 max-w-xs truncate" title={item.txt_detalhe}>
                                {item.txt_detalhe || '-'}
                            </td>
                            <td className="px-6 py-3 text-right font-mono text-gray-900">
                                R$ {parseFloat(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                        </tr>
                    ))}
                    {dados.length === 0 && (
                        <tr>
                            <td colSpan="4" className="text-center py-8 text-gray-400">
                                Nenhuma transação encontrada neste período.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        )}
    </div>

    const buscarMetaResponsavel = async () => {
        try {
            // Como não temos o ID direto, filtramos pelo nome na API (ou poderíamos passar o ID vindo do App.jsx)
            // Jeito rápido: buscar na lista de responsáveis
            const res = await axios.get('http://127.0.0.1:8000/api/responsaveis/');
            const responsavel = res.data.find(r => r.nome === responsavelNome);

            if (responsavel) {
                setIdResponsavel(responsavel.id);
                setMetaAtual(responsavel.orcamento_mensal);
            }
        } catch (error) {
            console.error("Erro ao buscar responsável", error);
        }
    };

    const salvarMeta = async () => {
        if (!idResponsavel) return;
        try {
            await axios.patch(`http://127.0.0.1:8000/api/responsaveis/${idResponsavel}/`, {
                orcamento_mensal: metaAtual
            });
            setEditando(false);
            if (onMetaUpdate) onMetaUpdate(); // Avisa o App.jsx para atualizar a tela principal
        } catch (error) {
            alert("Erro ao salvar meta");
        }
    };

    if (!isOpen) return null;

    const totalGasto = dados.reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
    const percentual = metaAtual > 0 ? (totalGasto / metaAtual) * 100 : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in">

                {/* CABEÇALHO */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <FileText className="text-indigo-600" />
                            {responsavelNome}
                        </h3>

                        {/* ÁREA DE META INTERATIVA */}
                        <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center text-sm text-gray-600 bg-white px-3 py-1 rounded border border-gray-200">
                                <Target className="w-4 h-4 mr-2 text-gray-400" />
                                <span className="mr-2">Meta Mensal:</span>

                                {editando ? (
                                    <div className="flex items-center">
                                        <span className="text-gray-500 mr-1">R$</span>
                                        <input
                                            type="number"
                                            value={metaAtual}
                                            onChange={(e) => setMetaAtual(e.target.value)}
                                            className="w-24 border-b border-indigo-500 outline-none text-indigo-700 font-bold"
                                            autoFocus
                                        />
                                        <button onClick={salvarMeta} className="ml-2 text-green-600 hover:text-green-800">
                                            <Save className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center cursor-pointer hover:bg-gray-50" onClick={() => setEditando(true)}>
                                        <span className="font-bold text-gray-800">
                                            R$ {parseFloat(metaAtual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className="ml-2 text-xs text-indigo-500 hover:underline">(editar)</span>
                                    </div>
                                )}
                            </div>

                            {/* Status Visual */}
                            {metaAtual > 0 && (
                                <span className={`text-xs font-bold px-2 py-1 rounded ${totalGasto > metaAtual ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    {percentual.toFixed(1)}% utilizado
                                </span>
                            )}
                        </div>

                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* TABELA COM SCROLL */}
                <div className="overflow-auto p-0 flex-1">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 font-semibold sticky top-0 shadow-sm">
                            <tr>
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">Descrição da Conta</th>
                                <th className="px-6 py-4">Detalhe (TXT)</th>
                                <th className="px-6 py-4 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {dados.map((item, index) => (
                                <tr key={index} className="hover:bg-indigo-50/50 transition-colors">
                                    <td className="px-6 py-3 whitespace-nowrap text-gray-500">
                                        {new Date(item.data).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-6 py-3 font-medium text-gray-800">
                                        {item.descricao_conta}
                                    </td>
                                    <td className="px-6 py-3 text-xs text-gray-500 max-w-xs truncate" title={item.txt_detalhe}>
                                        {item.txt_detalhe || '-'}
                                    </td>
                                    <td className="px-6 py-3 text-right font-mono text-gray-900">
                                        R$ {parseFloat(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                            {dados.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="text-center py-8 text-gray-400">
                                        Nenhuma transação encontrada neste período.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* RODAPÉ COM TOTAIS */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center rounded-b-xl">
                    <div className="w-1/2">
                        {metaAtual > 0 && (
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                    className={`h-2.5 rounded-full ${totalGasto > metaAtual ? 'bg-red-500' : 'bg-green-500'}`}
                                    style={{ width: `${Math.min(percentual, 100)}%` }}
                                ></div>
                            </div>
                        )}
                    </div>

                    <div className="text-right">
                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Realizado</span>
                        <div className="text-xl font-bold text-indigo-700">
                            R$ {totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}