import React, { useState } from 'react';
import Layout from './components/Layout';
import Calculator from './components/Calculator';
import Settings from './components/Settings';
import History from './components/History';
import { ViewState } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('calculator');

  const renderContent = () => {
    switch (currentView) {
      case 'calculator':
        return <Calculator onSaved={() => setCurrentView('history')} />;
      case 'settings':
        return <Settings />;
      case 'history':
        return <History />;
      default:
        return <Calculator onSaved={() => setCurrentView('history')} />;
    }
  };

  return (
    <Layout currentView={currentView} onChangeView={setCurrentView}>
      {renderContent()}
    </Layout>
  );
};

export default App;