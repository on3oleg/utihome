import React, { useState } from 'react';
import { loginUser, registerUser } from '../services/db';
import { User } from '../types';
import { Zap, Lock, Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { IonPage, IonContent, IonInput, IonButton, IonSpinner } from '@ionic/react';
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
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (view === 'forgot-password') {
        // Simulate password reset network request
        await new Promise(resolve => setTimeout(resolve, 1500));
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
    // Keep email if moving between screens, but clear password
    setPassword('');
  };

  const getHeader = () => {
    switch(view) {
      case 'login': return t.auth.welcomeBack;
      case 'register': return t.auth.createAccount;
      case 'forgot-password': return t.auth.resetPasswordTitle;
    }
  };

  const getDescription = () => {
    switch(view) {
      case 'login': return t.layout.subtitle;
      case 'register': return t.layout.subtitle;
      case 'forgot-password': return t.auth.resetDescription;
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding">
        <div className="min-h-full flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
          
          {/* Decorative Background Elements */}
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-200/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-200/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-500 px-6">
            
            {/* Header / Logo */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-200 mb-6 transform transition-transform hover:scale-105 duration-300">
                <Zap className="h-8 w-8 text-white" fill="currentColor" />
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{getHeader()}</h1>
              <p className="text-slate-500 mt-2 max-w-xs mx-auto text-sm leading-relaxed">{getDescription()}</p>
            </div>

            {/* Auth Card */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-white/50 p-8">
              
              {successMsg ? (
                <div className="text-center py-6 animate-in fade-in duration-300">
                  <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">{t.auth.sendResetLink}</h3>
                  <p className="text-slate-600 text-sm mb-6">{successMsg}</p>
                  <button 
                    onClick={() => switchView('login')}
                    className="text-indigo-600 font-bold text-sm hover:underline"
                  >
                    {t.auth.backToSignIn}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  {/* Email Input */}
                  <div className="group">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                      </div>
                      <input 
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50/50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 sm:text-sm font-medium text-slate-900"
                        placeholder="name@example.com"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  {view !== 'forgot-password' && (
                    <div className="group">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input 
                          type="password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          required
                          className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50/50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 sm:text-sm font-medium text-slate-900"
                          placeholder="••••••••"
                        />
                      </div>
                      {view === 'login' && (
                        <div className="flex justify-end mt-2">
                          <button 
                            type="button"
                            onClick={() => switchView('forgot-password')}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                          >
                            {t.auth.forgotPassword}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg text-center font-medium animate-in slide-in-from-top-1">
                      {error}
                    </div>
                  )}

                  {/* Submit Button */}
                  <IonButton 
                    expand="block" 
                    type="submit" 
                    disabled={loading}
                    className="h-12 font-bold shadow-lg shadow-indigo-200"
                    style={{ '--border-radius': '14px', '--background': '#4f46e5', '--color': '#ffffff' }}
                  >
                    {loading ? (
                      <IonSpinner name="crescent" color="light" /> 
                    ) : (
                      <span className="flex items-center text-base">
                        {view === 'login' && t.auth.signInAction}
                        {view === 'register' && t.auth.signUpAction}
                        {view === 'forgot-password' && t.auth.sendResetLink}
                        {view !== 'forgot-password' && <ArrowRight className="ml-2 h-4 w-4" strokeWidth={3} />}
                      </span>
                    )}
                  </IonButton>
                </form>
              )}
            </div>

            {/* Footer Links */}
            {!successMsg && (
              <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-2 delay-100">
                {view === 'login' && (
                  <p className="text-sm text-slate-500 font-medium">
                    {t.auth.noAccount}{" "}
                    <button onClick={() => switchView('register')} className="text-indigo-600 font-bold hover:underline">
                      {t.auth.signUpAction}
                    </button>
                  </p>
                )}
                
                {view === 'register' && (
                  <p className="text-sm text-slate-500 font-medium">
                    {t.auth.hasAccount}{" "}
                    <button onClick={() => switchView('login')} className="text-indigo-600 font-bold hover:underline">
                      {t.auth.signInAction}
                    </button>
                  </p>
                )}

                {view === 'forgot-password' && (
                  <button onClick={() => switchView('login')} className="flex items-center justify-center mx-auto text-sm text-slate-500 font-bold hover:text-slate-800 transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t.auth.backToSignIn}
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