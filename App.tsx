import React, { useState, useEffect } from 'react';
import { IonApp, IonLoading, IonContent, IonPage } from '@ionic/react';
import Layout from './components/Layout';
import Calculator from './components/Calculator';
import Settings from './components/Settings';
import History from './components/History';
import Auth from './components/Auth';
import ObjectManager from './components/ObjectManager';
import { getObjects, createObject, restoreSession, saveSession, clearSession } from './services/db';
import { ViewState, User, UserObject } from './types';
import { User as UserIcon, LogOut, Globe } from 'lucide-react';
import { LanguageProvider, useLanguage, Language } from './i18n';

// Simple Profile Component
const UserProfile: React.FC<{ user: User, onLogout: () => void }> = ({ user, onLogout }) => {
  const { setLanguage, language, t } = useLanguage();
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 p-4">
       <div className="flex flex-col items-center justify-center py-10">
          <div className="h-24 w-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
             <UserIcon className="h-12 w-12 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">{user.email}</h2>
          <p className="text-slate-500">ID: {user.id}</p>
       </div>

       <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between p-2">
             <div className="flex items-center space-x-3">
               <Globe className="h-5 w-5 text-slate-500" />
               <span className="font-medium text-slate-700">{t.settings.language}</span>
             </div>
             <select 
               value={language}
               onChange={(e) => setLanguage(e.target.value as Language)}
               className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium outline-none"
             >
               <option value="en">English</option>
               <option value="uk">Українська</option>
             </select>
          </div>
       </div>

       <button 
         onClick={onLogout}
         className="w-full bg-red-50 text-red-600 font-bold py-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-red-100 transition-colors"
       >
         <LogOut className="h-5 w-5" />
         <span>{t.layout.signOut}</span>
       </button>
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
        console.error("Session restore error", e);
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
          if (prev && objs.find(o => o.id === prev.id)) return prev;
          return objs[0];
        });
      } else {
        const defObj = await createObject(user.id, "My Home", "Main Residence");
        setObjects([defObj]);
        setCurrentObject(defObj);
      }
    } catch (e) {
      console.error("Failed to fetch objects", e);
    } finally {
      setLoadingObjects(false);
    }
  };

  const handleObjectCreated = (newObj: UserObject) => {
    setObjects(prev => [...prev, newObj]);
    setCurrentObject(newObj);
  };

  const handleLogin = (loggedInUser: User) => {
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
    if (!user) return null;

    if (currentView === 'profile') {
      return <UserProfile user={user} onLogout={handleLogout} />;
    }

    if (!currentObject) return null;

    switch (currentView) {
      case 'calculator':
        return <Calculator user={user} currentObject={currentObject} onSaved={() => setCurrentView('history')} />;
      case 'settings':
        return <Settings user={user} currentObject={currentObject} />;
      case 'history':
        return <History user={user} currentObject={currentObject} />;
      default:
        return <Calculator user={user} currentObject={currentObject} onSaved={() => setCurrentView('history')} />;
    }
  };

  // Show loading spinner while checking for session
  if (isSessionLoading) {
    return (
      <IonApp>
        <IonLoading isOpen={true} message={t.common.loading} />
      </IonApp>
    );
  }

  // Show Auth screen if no user is found
  if (!user) {
    return (
      <IonApp>
        <Auth onLogin={handleLogin} />
      </IonApp>
    );
  }

  return (
    <IonApp>
      {loadingObjects && !currentObject ? (
         <IonLoading isOpen={true} message={t.common.loading} />
      ) : (
        <>
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