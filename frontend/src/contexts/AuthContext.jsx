import { createContext, useState, useEffect } from 'react';
import api from '../api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Tenta recuperar token e username ao iniciar
        const token = localStorage.getItem('access_token');
        const savedUsername = localStorage.getItem('username');
        if (token) {
            setUser({ token, username: savedUsername });
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        const response = await api.post('token/', {
            username,
            password
        });

        const { access, refresh } = response.data;

        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('username', username);

        setUser({ username, token: access });
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('username');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
