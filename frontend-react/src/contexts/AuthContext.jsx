import { createContext, useContext, useState, useEffect } from 'react';
import { getToken, getUserId, saveAuth, clearAuth } from '../utils/utils';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Verificar se há token salvo ao carregar a aplicação
        const token = getToken();
        const userId = getUserId();

        if (token && userId) {
            setIsAuthenticated(true);
            setUser({ id: userId });
        }

        setLoading(false);
    }, []);

    const login = (token, userId) => {
        saveAuth(token, userId);
        setIsAuthenticated(true);
        setUser({ id: userId });
    };

    const logout = () => {
        clearAuth();
        setIsAuthenticated(false);
        setUser(null);
    };

    const value = {
        isAuthenticated,
        user,
        loading,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
