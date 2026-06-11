import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (token && storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        if (data.success) {
            if (data.requires2FA) {
                return data; // Return to component to handle the UI challenge
            }
            localStorage.setItem('token', data.data.access_token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            setUser(data.data.user);
            return data.data.user;
        }
    };

    const verify2FA = async (userId, code) => {
        const { data } = await api.post('/auth/2fa/verify', { userId, code });
        if (data.success) {
            localStorage.setItem('token', data.data.access_token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            setUser(data.data.user);
            return data.data.user;
        }
    };

    const register = async (userData) => {
        const response = await api.post('/auth/register', userData);
        const { user, access_token, refresh_token } = response.data.data;
        localStorage.setItem('token', access_token);
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        
        return user;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        window.location.href = '/';
    };

    return (
        <AuthContext.Provider value={{ user, login, verify2FA, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
