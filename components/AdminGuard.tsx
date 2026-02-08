
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SyncService } from '../services/syncService';

export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingDb, setCheckingDb] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
        if (!authLoading) {
            if (user && user.email) {
                const authorized = await SyncService.isSystemAdmin(user.email);
                setIsAdmin(authorized);
            } else {
                setIsAdmin(false);
            }
            setCheckingDb(false);
        }
    };
    checkAccess();
  }, [user, authLoading]);

  if (authLoading || checkingDb) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-indigo-500 font-bold text-xs uppercase tracking-widest">Verifying Identity...</div>
            </div>
        </div>
      );
  }

  if (isAdmin) {
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
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Restricted Access</p>
            </div>

            <div className="space-y-6">
                {user ? (
                    <div className="bg-slate-950 border border-slate-700 p-6 rounded-2xl text-center space-y-4">
                         <div>
                            <p className="text-[10px] uppercase font-black text-slate-500 mb-1">Logged in as</p>
                            <p className="text-white font-bold text-sm">{user.email}</p>
                         </div>
                         <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                            <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest">⛔ Access Denied</p>
                            <p className="text-[10px] text-rose-300 mt-1">This account is not listed in the System Admins registry.</p>
                         </div>
                    </div>
                ) : (
                    <div className="bg-slate-950 border border-slate-700 p-6 rounded-2xl text-center">
                        <p className="text-xs text-slate-400 leading-relaxed">
                            This area is restricted to authorized personnel only. Please sign in with your verified administrative account.
                        </p>
                    </div>
                )}

                {!user && (
                    <button 
                        onClick={() => signInWithGoogle()}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                        Sign in to Access
                    </button>
                )}

                <div className="text-center pt-4">
                    <a href="/" className="text-slate-600 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors">
                        ← Return to Portal
                    </a>
                </div>
            </div>
        </div>
    </div>
  );
};
