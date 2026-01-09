import { useState } from 'react';
import api from '../api';
import { X, Upload, CheckCircle, AlertCircle } from 'lucide-react';

export default function UploadModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setStatus(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setStatus('success');
      setMessage(response.data.message);
      setTimeout(() => {
        onSuccess(); // Atualiza o dashboard
        onClose();   // Fecha o modal
        setStatus(null);
        setFile(null);
      }, 2000);
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.error || "Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative animate-fade-in">

        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Upload className="w-5 h-5 mr-2 text-indigo-600" />
          Importar Planilha
        </h3>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
          <input
            type="file"
            accept=".xlsx, .csv"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {file ? file.name : "Clique para selecionar o Excel"}
            </span>
            <span className="text-xs text-gray-500 mt-1">.xlsx ou .csv</span>
          </label>
        </div>

        {status && (
          <div className={`mt-4 p-3 rounded-lg flex items-center text-sm ${status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
            {status === 'success' ? <CheckCircle className="w-4 h-4 mr-2" /> : <AlertCircle className="w-4 h-4 mr-2" />}
            {message}
          </div>
        )}

        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {uploading ? "Processando..." : "Enviar Arquivo"}
          </button>
        </div>

      </div>
    </div>
  );
}