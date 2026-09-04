import { createContext, useContext, useState, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch session on mount
        supabaseService.getCurrentUser().then(sessionUser => {
            setUser(sessionUser);
            setLoading(false);
        });
    }, []);

    const login = (mockRole) => {
        // Implementation for later
        console.log(`Logging in as ${mockRole}`);
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);