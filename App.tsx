import React, { useState, useEffect } from 'react';
import { IonApp, IonLoading } from '@ionic/react';
import Layout from './components/Layout';
import Calculator from './components/Calculator';
import Settings from './components/Settings';
import History from './components/History';
import Auth from './components/Auth';
import ObjectManager from './components/ObjectManager';
import { getObjects, createObject, restoreSession, saveSession, clearSession } from './services/db';
import { ViewState, User, UserObject } from './types';
import { User as UserIcon, LogOut, Globe, ChevronRight, Mail, ShieldCheck } from 'lucide-react';
import { LanguageProvider, useLanguage, Language } from './i18n';

const UserProfile: React.FC<{ user: User, onLogout: () => void }> = ({ user, onLogout }) => {
  const { setLanguage, language, t } = useLanguage();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
       
       <div className="flex flex-col items-center justify-center pt-8">
          <div className="h-28 w-28 bg-white border-4 border-slate-50 rounded-full shadow-lg flex items-center justify-center mb-4">
             <UserIcon className="h-12 w-12 text-slate-800" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t.layout.profile}</h2>
          
          <div className="flex flex-col items-center space-y-2 mt-2">
            <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-full">
              <Mail className="h-3 w-3 text-slate-500" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{user.email}</p>
            </div>
            
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-green-50 text-green-600 border-green-100">
              <ShieldCheck className="h-3 w-3" />
              <span>{t.layout.loggedIn} (Local)</span>
            </div>
          </div>
       </div>

       <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-2">{t.layout.settings}</h3>
          
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Globe className="h-5 w-5" />
                </div>
                <span className="font-bold text-slate-800">{t.settings.language}</span>
              </div>
              <div className="flex items-center space-x-2">
                 <select 
                   value={language}
                   onChange={(e) => setLanguage(e.target.value as Language)}
                   className="bg-transparent text-right font-medium text-slate-500 outline-none appearance-none pr-1"
                 >
                   <option value="en">English</option>
                   <option value="uk">Українська</option>
                 </select>
                 <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            </div>
          </div>
       </div>

       <div className="pt-4">
         <button 
           onClick={onLogout}
           className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 hover:bg-black transition-colors shadow-lg shadow-slate-200"
         >
           <LogOut className="h-5 w-5" />
           <span>{t.layout.signOut}</span>
         </button>
         <p className="text-center text-xs text-slate-300 mt-6 font-medium">UtiHome v1.0.4 (Local Mode)</p>
       </div>
    </div>
  )
}

const UtiHomeApp: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('calculator');
  const [objects, setObjects] = useState<UserObject[]>([]);
  const [currentObject, setCurrentObject] = useState<UserObject | null>(null);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [showObjectManager, setShowObjectManager] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const initSession = async () => {
      try {
        const savedUser = await restoreSession();
        if (savedUser) {
          setUser(savedUser);
        }
      } catch (e) {
        console.error("App: Restoration failed", e);
      } finally {
        setIsSessionLoading(false);
      }
    };
    initSession();
  }, []);

  useEffect(() => {
    if (user) {
      fetchObjects();
    } else {
      setObjects([]);
      setCurrentObject(null);
    }
  }, [user]);

  const fetchObjects = async () => {
    if (!user) return;
    setLoadingObjects(true);
    try {
      const objs = await getObjects(user.id);
      setObjects(objs);
      
      if (objs.length > 0) {
        setCurrentObject(prev => {
          if (prev) {
            const found = objs.find(o => o.id === prev.id);
            if (found) return found;
          }
          return objs[0];
        });
      } else {
        const defObj = await createObject(user.id, "My Home", "Main Residence");
        setObjects([defObj]);
        setCurrentObject(defObj);
      }
    } catch (e) {
      console.error("App: Objects fetch failed", e);
    } finally {
      setLoadingObjects(false);
    }
  };

  const handleObjectCreated = (newObj: UserObject) => {
    setObjects(prev => [...prev, newObj]);
    setCurrentObject(newObj);
  };

  const handleObjectUpdated = (updatedObj: UserObject) => {
    setObjects(prev => prev.map(o => o.id === updatedObj.id ? updatedObj : o));
    if (currentObject && currentObject.id === updatedObj.id) {
      setCurrentObject(updatedObj);
    }
  };

  const handleLogin = (loggedInUser: User) => {
    console.log("App: Logged in as", loggedInUser.email);
    setUser(loggedInUser);
    saveSession(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
    clearSession();
    setCurrentObject(null);
    setObjects([]);
    setCurrentView('calculator');
  };

  const renderContent = () => {
    if (!user || !currentObject) return null;
    if (currentView === 'profile') return <UserProfile user={user} onLogout={handleLogout} />;

    switch (currentView) {
      case 'calculator':
        return <Calculator user={user} currentObject={currentObject} onSaved={() => setCurrentView('history')} />;
      case 'settings':
        return <Settings user={user} currentObject={currentObject} onObjectUpdated={handleObjectUpdated} />;
      case 'history':
        return <History user={user} currentObject={currentObject} />;
      default:
        return <Calculator user={user} currentObject={currentObject} onSaved={() => setCurrentView('history')} />;
    }
  };

  return (
    <IonApp>
      {isSessionLoading ? (
        <IonLoading isOpen={true} message={t.common.loading} />
      ) : !user ? (
        <Auth onLogin={handleLogin} />
      ) : (
        <>
          {loadingObjects && !currentObject ? (
            <IonLoading isOpen={true} message={t.common.loading} />
          ) : (
            <Layout 
              user={user}
              currentView={currentView} 
              onChangeView={setCurrentView}
              onLogout={handleLogout}
              objects={objects}
              currentObject={currentObject}
              onObjectChange={setCurrentObject}
              onAddObject={() => setShowObjectManager(true)}
            >
              {renderContent()}
            </Layout>
          )}

          {showObjectManager && (
            <ObjectManager 
              user={user} 
              onObjectCreated={handleObjectCreated} 
              onClose={() => setShowObjectManager(false)} 
            />
          )}
        </>
      )}
    </IonApp>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <UtiHomeApp />
    </LanguageProvider>
  );
};

export default App;