
import React, { useState } from 'react';
import Layout from './components/Layout';
import Calculator from './components/Calculator';
import Settings from './components/Settings';
import History from './components/History';
import Auth from './components/Auth';
import { ViewState, User } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('calculator');

  const renderContent = () => {
    if (!user) return null;

    switch (currentView) {
      case 'calculator':
        return <Calculator user={user} onSaved={() => setCurrentView('history')} />;
      case 'settings':
        return <Settings user={user} />;
      case 'history':
        return <History user={user} />;
      default:
        return <Calculator user={user} onSaved={() => setCurrentView('history')} />;
    }
  };

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  return (
    <Layout 
      user={user}
      currentView={currentView} 
      onChangeView={setCurrentView}
      onLogout={() => setUser(null)}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
