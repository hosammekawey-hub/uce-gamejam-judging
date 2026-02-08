
import React, { useState, useEffect } from 'react';

// Safely access environment variables to prevent crashes if import.meta.env is undefined
const getEnv = (key: string) => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env[key];
    }
    return undefined;
};

// In a real app, this would be an environment variable.
// For this jam/demo, we use a hardcoded fallback.
const MASTER_ADMIN_KEY = getEnv('VITE_ADMIN_KEY') || 'admin-master';

export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');

  // Check session storage on mount to persist login during refresh
  useEffect(() => {
    if (sessionStorage.getItem('admin_token') === 'valid') {
        setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey === MASTER_ADMIN_KEY) {
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_token', 'valid');
        setError('');
    } else {
        setError('Access Denied: Invalid Master Key');
        setInputKey('');
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 animate-fadeIn">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 to-indigo-600" />
            
            <div className="text-center mb-10">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-inner">
                    🛡️
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">System Admin</h1>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Authorized Personnel Only</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                    <input 
                        type="password"
                        value={inputKey}
                        onChange={(e) => setInputKey(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-6 py-4 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-center font-bold tracking-widest placeholder-slate-600 transition-all"
                        placeholder="Enter Master Key"
                        autoFocus
                    />
                </div>
                
                {error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-[10px] font-black uppercase tracking-widest text-center animate-shake">
                        {error}
                    </div>
                )}

                <button 
                    type="submit"
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                >
                    Unlock System
                </button>

                <div className="text-center">
                    <a href="/" className="text-slate-600 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors">
                        ← Return to Portal
                    </a>
                </div>
            </form>
        </div>
    </div>
  );
};
