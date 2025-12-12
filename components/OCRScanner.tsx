import React, { useState, useRef } from 'react';
import { Camera, X, Check, RotateCcw, Loader2 } from 'lucide-react';
import { recognizeMeterReading } from '../services/genai';
import { useLanguage } from '../i18n';
import { IonSpinner } from '@ionic/react';

interface OCRScannerProps {
  onScanComplete: (value: string) => void;
  title?: string;
}

const OCRScanner: React.FC<OCRScannerProps> = ({ onScanComplete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [recognizedValue, setRecognizedValue] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setIsModalOpen(true);
        setAnalyzing(true);
        setRecognizedValue('');

        try {
          const result = await recognizeMeterReading(base64String);
          setRecognizedValue(result);
        } catch (error) {
          console.error("Scanning failed", error);
        } finally {
          setAnalyzing(false);
        }
      };
      
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleConfirm = () => {
    if (recognizedValue) {
      onScanComplete(recognizedValue);
      closeModal();
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setImagePreview(null);
    setRecognizedValue('');
  };

  const triggerCamera = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <button 
        type="button"
        onClick={triggerCamera}
        className="p-3 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 hover:text-indigo-600 transition-colors"
      >
        <Camera className="h-6 w-6" strokeWidth={1.5} />
      </button>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment" // Forces rear camera on mobile
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-slate-50 border-b border-slate-100">
               <h3 className="font-bold text-slate-800">{t.ocr.scan}</h3>
               <button onClick={closeModal} className="p-2 bg-white rounded-full shadow-sm text-slate-400 hover:text-slate-900">
                  <X className="h-5 w-5" />
               </button>
            </div>

            {/* Image Preview Area */}
            <div className="relative flex-1 bg-black min-h-[300px] flex items-center justify-center overflow-hidden">
               {imagePreview && (
                 <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
               )}
               
               {/* Scanning Overlay Effect */}
               {analyzing && (
                 <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-full h-1 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
                    <div className="absolute flex flex-col items-center text-white font-bold drop-shadow-md">
                       <IonSpinner color="light" className="mb-2"/>
                       {t.ocr.analyzing}
                    </div>
                 </div>
               )}
            </div>

            {/* Controls */}
            <div className="p-6 bg-white space-y-4">
               {!analyzing && (
                 <div className="flex flex-col gap-4">
                    <div>
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                          Reading Value
                       </label>
                       <input 
                         type="text" 
                         inputMode="decimal"
                         value={recognizedValue}
                         onChange={(e) => setRecognizedValue(e.target.value)}
                         className="w-full text-3xl font-bold text-center bg-slate-50 border border-slate-200 rounded-xl py-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                       />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                       <button 
                         onClick={triggerCamera}
                         className="flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                       >
                         <RotateCcw className="h-4 w-4" />
                         {t.ocr.retake}
                       </button>
                       <button 
                         onClick={handleConfirm}
                         disabled={!recognizedValue}
                         className="flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
                       >
                         <Check className="h-4 w-4" />
                         {t.ocr.use}
                       </button>
                    </div>
                 </div>
               )}
               
               {analyzing && (
                  <div className="text-center py-6 text-slate-400 text-sm">
                     Please wait while we process the image...
                  </div>
               )}
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </>
  );
};

export default OCRScanner;