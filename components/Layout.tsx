
import React, { useState } from 'react';
import { ViewState, User, UserObject } from '../types';
import { Calculator, History, Settings, Zap, Menu, X, LogOut, User as UserIcon, Home, ChevronDown, PlusCircle } from 'lucide-react';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isObjectDropdownOpen, setIsObjectDropdownOpen] = useState(false);

  const handleNavClick = (view: ViewState) => {
    onChangeView(view);
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'calculator', label: 'Calculator', icon: Calculator },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-indigo-600 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center space-x-2 shrink-0">
            <Zap className="h-6 w-6 text-yellow-300" />
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">UtiHome</h1>
          </div>

          {/* Object Switcher (Center-ish) */}
          <div className="relative mx-2 sm:mx-4 flex-1 max-w-xs">
            {currentObject && (
              <button 
                onClick={() => setIsObjectDropdownOpen(!isObjectDropdownOpen)}
                className="w-full flex items-center justify-between bg-indigo-700 hover:bg-indigo-800 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-indigo-500/50"
              >
                <div className="flex items-center truncate">
                  <Home className="h-4 w-4 mr-2 text-indigo-300" />
                  <span className="truncate">{currentObject.name}</span>
                </div>
                <ChevronDown className="h-4 w-4 ml-1 text-indigo-300" />
              </button>
            )}

            {isObjectDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsObjectDropdownOpen(false)}
                ></div>
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-150">
                  <div className="py-1">
                    {objects.map(obj => (
                      <button
                        key={obj.id}
                        onClick={() => {
                          onObjectChange(obj);
                          setIsObjectDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${
                          currentObject?.id === obj.id 
                            ? 'bg-indigo-50 text-indigo-700 font-semibold' 
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
                        className="w-full text-left px-4 py-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50 flex items-center"
                       >
                         <PlusCircle className="h-4 w-4 mr-2" />
                         Add Property
                       </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 shrink-0">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center space-x-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  currentView === item.id 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-indigo-100 hover:bg-indigo-500/50 hover:text-white'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            ))}
            <div className="w-px h-6 bg-indigo-500 mx-2"></div>
            <button 
              onClick={onLogout}
              className="flex items-center space-x-1 px-3 py-2 rounded-full text-sm font-medium text-indigo-100 hover:bg-indigo-500 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 -mr-2 rounded-lg text-indigo-100 hover:bg-indigo-500 focus:outline-none transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-white shadow-xl border-t border-slate-100 animate-in slide-in-from-top-2 duration-200 z-50">
            <div className="p-4 border-b border-slate-100 flex items-center space-x-3 bg-slate-50">
               <div className="bg-indigo-100 p-2 rounded-full">
                 <UserIcon className="h-5 w-5 text-indigo-600" />
               </div>
               <div className="overflow-hidden">
                 <p className="text-sm font-bold text-slate-900 truncate">{user.email}</p>
                 <p className="text-xs text-slate-500">Logged in</p>
               </div>
            </div>
            <div className="p-2 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    currentView === item.id 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-slate-600 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              ))}
              <div className="border-t border-slate-100 my-1"></div>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
