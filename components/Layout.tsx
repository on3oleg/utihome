import React, { useState } from 'react';
import { ViewState, User, UserObject } from '../types';
import { 
  IonPage, 
  IonHeader, 
  IonToolbar, 
  IonContent, 
  IonFooter, 
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon
} from '@ionic/react';
import { FileText, History, Settings, User as UserIcon, Home, ChevronDown, PlusCircle } from 'lucide-react';
import { useLanguage } from '../i18n';

interface LayoutProps {
  user: User;
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  onLogout: () => void;
  objects: UserObject[];
  currentObject: UserObject | null;
  onObjectChange: (obj: UserObject) => void;
  onAddObject: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ 
  user, currentView, onChangeView, onLogout, 
  objects, currentObject, onObjectChange, onAddObject,
  children 
}) => {
  const [isObjectDropdownOpen, setIsObjectDropdownOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <IonPage>
      {/* Header */}
      <IonHeader className="ion-no-border">
        <IonToolbar className="bg-white">
          <div className="px-4 pt-2">
            <div className="relative inline-block">
              {currentObject ? (
                <button 
                  onClick={() => setIsObjectDropdownOpen(!isObjectDropdownOpen)}
                  className="flex items-center space-x-2 text-2xl font-bold text-slate-800 focus:outline-none"
                >
                  <Home className="h-6 w-6 stroke-[2.5]" />
                  <span className="truncate max-w-[200px]">{currentObject.name}</span>
                  <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isObjectDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <div className="h-8 bg-slate-100 w-48 rounded animate-pulse"></div>
              )}
            </div>
          </div>
        </IonToolbar>

        {/* Object Dropdown Overlay */}
        {isObjectDropdownOpen && (
          <div className="absolute top-14 left-4 z-50">
             <div 
                className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]" 
                onClick={() => setIsObjectDropdownOpen(false)}
              ></div>
            <div className="relative w-64 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="py-2">
                {objects.map(obj => (
                  <button
                    key={obj.id}
                    onClick={() => {
                      onObjectChange(obj);
                      setIsObjectDropdownOpen(false);
                    }}
                    className={`w-full text-left px-5 py-3 text-sm flex items-center justify-between ${
                      currentObject?.id === obj.id 
                        ? 'bg-indigo-50 text-indigo-700 font-bold' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{obj.name}</span>
                    {currentObject?.id === obj.id && <div className="h-2 w-2 rounded-full bg-indigo-600"></div>}
                  </button>
                ))}
                <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                    onClick={() => {
                      onAddObject();
                      setIsObjectDropdownOpen(false);
                    }}
                    className="w-full text-left px-5 py-3 text-sm text-indigo-600 font-medium hover:bg-indigo-50 flex items-center"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      {t.layout.addProperty}
                    </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </IonHeader>

      {/* Main Content - IonContent handles scrolling and safe areas */}
      <IonContent fullscreen className="ion-padding">
        <div className="max-w-lg mx-auto pb-6">
          {children}
        </div>
      </IonContent>

      {/* Bottom Navigation */}
      <IonFooter className="ion-no-border shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
        <IonToolbar className="py-2">
          <div className="flex justify-between items-center max-w-lg mx-auto w-full px-6">
            <button 
              onClick={() => onChangeView('calculator')}
              className={`flex flex-col items-center space-y-1 transition-colors ${currentView === 'calculator' ? 'text-black' : 'text-slate-400'}`}
            >
              <FileText className="h-7 w-7" strokeWidth={currentView === 'calculator' ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{t.layout.calculator}</span>
            </button>

            <button 
              onClick={() => onChangeView('history')}
              className={`flex flex-col items-center space-y-1 transition-colors ${currentView === 'history' ? 'text-black' : 'text-slate-400'}`}
            >
              <History className="h-7 w-7" strokeWidth={currentView === 'history' ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{t.layout.history}</span>
            </button>

            <button 
              onClick={() => onChangeView('settings')}
              className={`flex flex-col items-center space-y-1 transition-colors ${currentView === 'settings' ? 'text-black' : 'text-slate-400'}`}
            >
              <Settings className="h-7 w-7" strokeWidth={currentView === 'settings' ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{t.layout.settings}</span>
            </button>

            <button 
              onClick={() => onChangeView('profile')}
              className={`flex flex-col items-center space-y-1 transition-colors ${currentView === 'profile' ? 'text-black' : 'text-slate-400'}`}
            >
              <UserIcon className="h-7 w-7" strokeWidth={currentView === 'profile' ? 2.5 : 2} />
              <span className="text-[10px] font-medium">Profile</span>
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default Layout;