import React, { useState } from 'react';
import { loginUser, registerUser } from '../services/db';
import { User } from '../types';
import { Zap, Lock, Mail, UserPlus, LogIn } from 'lucide-react';
import { IonPage, IonContent, IonInput, IonButton, IonSpinner, IonItem, IonIcon, IonText } from '@ionic/react';
import { useLanguage } from '../i18n';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let user: User | null = null;
      if (isLogin) {
        user = await loginUser(email, password);
        if (!user) throw new Error(t.auth.errors.invalid);
      } else {
        user = await registerUser(email, password);
        if (!user) throw new Error(t.auth.errors.taken);
      }
      
      if (user) {
        onLogin(user);
      }
    } catch (err: any) {
      setError(err.message || t.auth.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div className="min-h-full flex flex-col justify-center items-center">
          <div className="mb-8 text-center animate-in fade-in zoom-in duration-500">
            <div className="bg-indigo-600 h-16 w-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg mb-4">
              <Zap className="h-8 w-8 text-yellow-300" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">UtiHome</h1>
            <p className="text-slate-500 mt-2">{t.layout.subtitle}</p>
          </div>

          <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
              {isLogin ? t.auth.welcomeBack : t.auth.createAccount}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <IonItem lines="full" className="rounded-xl border border-slate-200" style={{ '--background': '#f8fafc' }}>
                 <Mail className="text-slate-400 mr-2 h-5 w-5" slot="start" />
                 <IonInput 
                    type="email" 
                    placeholder="name@example.com" 
                    value={email}
                    onIonInput={e => setEmail(e.detail.value!)}
                    required
                 />
              </IonItem>

              <IonItem lines="full" className="rounded-xl border border-slate-200" style={{ '--background': '#f8fafc' }}>
                 <Lock className="text-slate-400 mr-2 h-5 w-5" slot="start" />
                 <IonInput 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onIonInput={e => setPassword(e.detail.value!)}
                    required
                 />
              </IonItem>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
                  {error}
                </div>
              )}

              <IonButton 
                expand="block" 
                type="submit" 
                disabled={loading}
                className="h-12 font-bold"
                style={{ '--border-radius': '12px' }}
              >
                {loading ? <IonSpinner /> : (isLogin ? t.auth.signInAction : t.auth.signUpAction)}
              </IonButton>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                {isLogin ? t.auth.noAccount : t.auth.hasAccount}{" "}
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                  }}
                  className="font-bold text-indigo-600 hover:text-indigo-700"
                >
                  {isLogin ? t.auth.signUpAction : t.auth.signInAction}
                </button>
              </p>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Auth;