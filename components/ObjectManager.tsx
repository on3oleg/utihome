import React, { useState } from 'react';
import { createObject } from '../services/db';
import { User, UserObject } from '../types';
import { Home, Loader2, X, Building2 } from 'lucide-react';
import { useLanguage } from '../i18n';

interface ObjectManagerProps {
  user: User;
  onObjectCreated: (obj: UserObject) => void;
  onClose: () => void;
}

const ObjectManager: React.FC<ObjectManagerProps> = ({ user, onObjectCreated, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newObj = await createObject(user.id, name, description);
      onObjectCreated(newObj);
      onClose();
    } catch (e) {
      console.error(e);
      alert(t.objectManager.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
          <div className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <h2 className="font-bold">{t.objectManager.addNew}</h2>
          </div>
          <button onClick={onClose} className="hover:bg-indigo-700 p-1 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.objectManager.name}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.objectManager.placeholderName}
              className="block w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.objectManager.description}</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.objectManager.placeholderDesc}
              className="block w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-slate-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex justify-center items-center"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t.objectManager.create}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ObjectManager;