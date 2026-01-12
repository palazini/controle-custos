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

// Interceptor para renovar token automaticamente quando expirar
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Se for erro 401 e ainda não tentamos renovar
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const refreshToken = localStorage.getItem('refresh_token');

            if (refreshToken) {
                try {
                    // Tentar renovar o token
                    const response = await axios.post(`${API_URL}token/refresh/`, {
                        refresh: refreshToken
                    });

                    const { access, refresh } = response.data;

                    // Salvar novos tokens
                    localStorage.setItem('access_token', access);
                    if (refresh) {
                        localStorage.setItem('refresh_token', refresh);
                    }

                    // Refazer a requisição original com o novo token
                    originalRequest.headers.Authorization = `Bearer ${access}`;
                    return api(originalRequest);
                } catch (refreshError) {
                    // Se refresh falhar, limpar tokens e redirecionar para login
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('username');

                    // Só redireciona se não estiver já na página de login
                    if (!window.location.pathname.includes('/login')) {
                        window.location.href = '/login';
                    }
                    return Promise.reject(refreshError);
                }
            } else {
                // Sem refresh token, redireciona para login
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
            }
        }

        return Promise.reject(error);
    }
);

export default api;
