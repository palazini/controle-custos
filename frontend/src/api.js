import axios from 'axios';

// Usa variável de ambiente ou fallback para localhost
export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/';

// Instância do axios configurada
const api = axios.create({
    baseURL: API_URL,
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
