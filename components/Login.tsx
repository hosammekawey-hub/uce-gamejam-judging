
import React, { useState } from 'react';
import { UserRole } from '../types';

interface LoginProps {
  onLogin: (name: string, role: UserRole) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [phrase, setPhrase] = useState('');
  const [role, setRole] = useState<UserRole>('judge');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const judgePhrase = 'mask';
    const organizerPhrase = 'admin';

    if (role === 'judge' && phrase.toLowerCase() !== judgePhrase) {
      setError('Invalid Judge secret phrase.');
      return;
    }

    if (role === 'organizer' && phrase.toLowerCase() !== organizerPhrase) {
      setError('Invalid Organizer secret phrase.');
      return;
    }

    if (name.trim()) {
      onLogin(name.trim(), role);
    }
  };

  const isValid = name.trim().length > 0 && phrase.trim().length > 0;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-indigo-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-md w-full relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-[2.6rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <div className="bg-slate-900 border border-white/10 p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-500 rounded-3xl mb-6 shadow-2xl shadow-indigo-500/30 transform transition-transform group-hover:scale-110">
              <span className="text-4xl">🏆</span>
            </div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight leading-tight">UCE Global <br/>Game Jam</h1>
            <p className="text-indigo-400 font-black uppercase tracking-[0.25em] text-[10px]">Official Authority Console</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div className="bg-slate-800 p-1.5 rounded-2xl flex gap-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setRole('judge')}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  role === 'judge' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Judge
              </button>
              <button
                type="button"
                onClick={() => setRole('organizer')}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  role === 'organizer' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Organizer
              </button>
            </div>

            <div className="space-y-2">
              <label htmlFor="judge-name" className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                Display Name
              </label>
              <input
                id="judge-name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                placeholder="Enter your name"
                className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-white placeholder-slate-600 transition-all font-bold"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="secret-phrase" className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                Access Phrase
              </label>
              <input
                id="secret-phrase"
                type="password"
                value={phrase}
                onChange={(e) => { setPhrase(e.target.value); setError(''); }}
                placeholder="Enter secret code"
                className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-white placeholder-slate-600 transition-all font-bold"
                required
              />
            </div>

            {error && (
              <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs py-3 px-4 rounded-xl font-black uppercase tracking-wider animate-shake text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!isValid}
              className={`w-full py-5 px-6 font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all active:scale-[0.97] flex items-center justify-center gap-3 text-sm ${
                isValid 
                ? role === 'judge' ? 'bg-indigo-500 text-white hover:bg-indigo-400 shadow-indigo-500/25' : 'bg-amber-500 text-white hover:bg-amber-400 shadow-amber-500/25'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              Access Portal
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] text-slate-600 uppercase tracking-[0.4em] font-black">
              Official Judging Portal 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;