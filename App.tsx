import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Calculator from './components/Calculator';
import Settings from './components/Settings';
import History from './components/History';
import Auth from './components/Auth';
import ObjectManager from './components/ObjectManager';
import { getObjects, createObject } from './services/db';
import { ViewState, User, UserObject } from './types';
import { Loader2 } from 'lucide-react';
import { LanguageProvider, useLanguage } from './i18n';

const UtiHomeApp: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('calculator');
  const [objects, setObjects] = useState<UserObject[]>([]);
  const [currentObject, setCurrentObject] = useState<UserObject | null>(null);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [showObjectManager, setShowObjectManager] = useState(false);
  const { t } = useLanguage();

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
      
      // Auto-select first object or create default if none
      if (objs.length > 0) {
        // If we already have one selected and it's in the list, keep it
        // Otherwise pick the first one
        setCurrentObject(prev => {
          if (prev && objs.find(o => o.id === prev.id)) return prev;
          return objs[0];
        });
      } else {
        // Create a default object if none exist (e.g. for new users)
        // Note: Ideally "My Home" should be localized, but since this persists in DB,
        // it creates a static string. We use English or a neutral default.
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

  const renderContent = () => {
    if (!user || !currentObject) return null;

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

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  if (loadingObjects && !currentObject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <>
      <Layout 
        user={user}
        currentView={currentView} 
        onChangeView={setCurrentView}
        onLogout={() => setUser(null)}
        objects={objects}
        currentObject={currentObject}
        onObjectChange={setCurrentObject}
        onAddObject={() => setShowObjectManager(true)}
      >
        {currentObject ? renderContent() : (
          <div className="text-center p-10 text-slate-500">
             {t.common.loading}
          </div>
        )}
      </Layout>

      {showObjectManager && (
        <ObjectManager 
          user={user} 
          onObjectCreated={handleObjectCreated} 
          onClose={() => setShowObjectManager(false)} 
        />
      )}
    </>
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
