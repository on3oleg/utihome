import React, { useState, useEffect } from 'react';
import { loginUser, registerUser, checkHealth } from '../services/db';
import { User } from '../types';
import { Zap, Lock, Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Database, Server, Info } from 'lucide-react';
import { IonPage, IonContent, IonSpinner } from '@ionic/react';
import { useLanguage } from '../i18n';

interface AuthProps {
  onLogin: (user: User) => void;
}

type AuthView = 'login' | 'register' | 'forgot-password';

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const { t } = useLanguage();

  useEffect(() => {
    const verifyConnection = async () => {
      try {
        await checkHealth();
        setDbStatus('connected');
      } catch (err) {
        setDbStatus('error');
      }
    };
    verifyConnection();
    const interval = setInterval(verifyConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (view === 'forgot-password') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSuccessMsg(t.auth.resetSuccess);
        setLoading(false);
        return;
      }

      let user: User | null = null;
      if (view === 'login') {
        user = await loginUser(email, password);
        if (!user) throw new Error(t.auth.errors.invalid);
      } else if (view === 'register') {
        user = await registerUser(email, password);
        if (!user) throw new Error(t.auth.errors.taken);
      }
      
      if (user) {
        onLogin(user);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(err.message || t.auth.errors.generic);
    } finally {
      if (view !== 'forgot-password') {
        setLoading(false);
      }
    }
  };

  const switchView = (newView: AuthView) => {
    setView(newView);
    setError(null);
    setSuccessMsg(null);
    setPassword('');
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding">
        <div className="min-h-full flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden py-12">
          
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-200/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-200/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-500 px-6">
            
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-200 mb-6">
                <Zap className="h-8 w-8 text-white" fill="currentColor" />
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {view === 'login' && t.auth.welcomeBack}
                {view === 'register' && t.auth.createAccount}
                {view === 'forgot-password' && t.auth.resetPasswordTitle}
              </h1>
              <p className="text-slate-500 mt-2 max-w-xs mx-auto text-sm font-medium">
                {view === 'forgot-password' ? t.auth.resetDescription : t.layout.subtitle}
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-8">
              
              {successMsg ? (
                <div className="text-center py-4 animate-in fade-in">
                  <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <p className="text-slate-600 text-sm mb-6">{successMsg}</p>
                  <button onClick={() => switchView('login')} className="text-indigo-600 font-bold text-sm">
                    {t.auth.backToSignIn}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input 
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        placeholder={t.auth.email}
                      />
                    </div>
                  </div>

                  {view !== 'forgot-password' && (
                    <div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                          type="password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                          placeholder={t.auth.password}
                        />
                      </div>
                      {view === 'login' && (
                        <div className="flex justify-end mt-1">
                          <button type="button" onClick={() => switchView('forgot-password')} className="text-xs font-bold text-indigo-600">
                            {t.auth.forgotPassword}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 text-xs rounded-lg font-bold border border-red-100">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={loading || dbStatus === 'error'}
                    className="w-full h-12 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    {loading ? (
                      <IonSpinner name="crescent" color="light" /> 
                    ) : (
                      <span className="flex items-center">
                        {view === 'login' ? t.auth.signInAction : (view === 'register' ? t.auth.signUpAction : t.auth.sendResetLink)}
                        {view !== 'forgot-password' && <ArrowRight className="ml-2 h-4 w-4" />}
                      </span>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Connection Debug Panel */}
            <div className="mt-8 bg-slate-100 rounded-2xl p-4 border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4 text-slate-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Redis Cloud Connectivity</span>
                 </div>
                 <div className={`flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                   dbStatus === 'connected' ? 'bg-green-100 text-green-700' : 
                   dbStatus === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                 }`}>
                   <div className={`h-1.5 w-1.5 rounded-full ${
                     dbStatus === 'connected' ? 'bg-green-500' : 
                     dbStatus === 'error' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'
                   }`}></div>
                   <span>{dbStatus === 'connected' ? 'Online' : dbStatus === 'error' ? 'Offline' : 'Checking'}</span>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between text-[11px]">
                   <span className="text-slate-400 font-medium">Provider:</span>
                   <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-600">Redis Cloud</code>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                   <span className="text-slate-400 font-medium">Endpoint:</span>
                   <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 truncate max-w-[200px]">redis-12937.c14...</code>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                   <span className="text-slate-400 font-medium">Region:</span>
                   <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">us-east-1</code>
                </div>
              </div>

              {dbStatus === 'error' && (
                <div className="mt-3 p-2 bg-red-50 rounded-lg border border-red-100 flex items-start space-x-2">
                  <Info className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-[9px] text-red-600 leading-normal">
                    Redis connection failed. Verify your <code>REDIS_URL</code> environment variable in Vercel or your local server configuration.
                  </p>
                </div>
              )}
            </div>

            {!successMsg && (
              <div className="mt-6 text-center">
                <p className="text-sm text-slate-500 font-medium">
                  {view === 'login' ? t.auth.noAccount : t.auth.hasAccount}{" "}
                  <button onClick={() => switchView(view === 'login' ? 'register' : 'login')} className="text-indigo-600 font-bold">
                    {view === 'login' ? t.auth.signUpAction : t.auth.signInAction}
                  </button>
                </p>
                {view === 'forgot-password' && (
                  <button onClick={() => switchView('login')} className="mt-4 flex items-center justify-center mx-auto text-sm text-slate-500 font-bold">
                    <ArrowLeft className="mr-2 h-4 w-4" /> {t.auth.backToSignIn}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Auth;