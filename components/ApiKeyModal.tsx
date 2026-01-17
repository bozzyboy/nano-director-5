import React, { useEffect, useState } from 'react';
import { Lock, CheckCircle, ExternalLink, Key, Settings, Cloud, LogOut } from 'lucide-react';
import { setClientId } from '../services/driveService';
import { setGeminiApiKey } from '../services/geminiService';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ApiKeyModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [hasKey, setHasKey] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [clientId, setClientIdInput] = useState('');

  const checkKey = async () => {
    // Check if process.env.API_KEY is already set
    if (process.env.API_KEY) {
        setHasKey(true);
        setManualKey(process.env.API_KEY); // Pre-fill if exists
        return;
    }

    // @ts-ignore
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
      // @ts-ignore
      const selected = await window.aistudio.hasSelectedApiKey();
      if (selected) {
        setHasKey(true);
      }
    }
  };

  useEffect(() => {
    // Load stored values on mount
    const storedClientId = localStorage.getItem('nano_gcp_client_id');
    if (storedClientId) setClientIdInput(storedClientId);
    checkKey();
  }, []);

  // Poll for env changes just in case
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
        if (process.env.API_KEY) {
            setHasKey(true);
        }
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleConnect = async () => {
    // @ts-ignore
    if (window.aistudio && window.aistudio.openSelectKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setHasKey(true); 
    } else {
        alert("AI Studio environment not detected. Please use the manual input.");
    }
  };

  const handleManualSubmit = () => {
      if(manualKey.trim().length > 0) {
          process.env.API_KEY = manualKey.trim();
          setGeminiApiKey(manualKey.trim());
          setHasKey(true);
      }
  };

  const handleSaveClientId = () => {
      if(clientId.trim()) {
          setClientId(clientId.trim());
          localStorage.setItem('nano_gcp_client_id', clientId.trim());
          alert("Client ID Saved. Please refresh to initialize Drive features.");
      }
  }

  const handleClearKey = () => {
      process.env.API_KEY = '';
      setGeminiApiKey('');
      setHasKey(false);
      setManualKey('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 relative">
        
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
        >
            ✕
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-slate-800 rounded-lg text-slate-200">
            <Settings className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">App Settings</h2>
        </div>
        
        {/* API Key Section */}
        <div className="space-y-4 mb-8">
            <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
                <Key className="w-3 h-3" /> Gemini API Key
            </h3>
            
            {!hasKey ? (
                <div className="space-y-4">
                    <p className="text-xs text-slate-400">
                        Connect a valid API key to access GenAI features.
                    </p>

                    {/* AI Studio Button */}
                    <button
                        onClick={handleConnect}
                        className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Connect via AI Studio
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-700"></span>
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase">
                            <span className="bg-slate-900 px-2 text-slate-500">Or Enter Manually</span>
                        </div>
                    </div>

                    {/* Manual Input */}
                    <div className="flex gap-2">
                        <input 
                            type="password" 
                            placeholder="Paste API Key"
                            value={manualKey}
                            onChange={(e) => setManualKey(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white focus:border-amber-500 outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                        />
                        <button 
                            onClick={handleManualSubmit}
                            disabled={!manualKey}
                            className="bg-slate-700 hover:bg-slate-600 text-white px-4 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Save
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs font-medium">API Key Active</span>
                    </div>
                    <button onClick={handleClearKey} className="text-xs text-slate-500 hover:text-white flex items-center gap-1">
                        <LogOut className="w-3 h-3" /> Change
                    </button>
                </div>
            )}
            
            <div className="text-[10px] text-slate-500">
                <a 
                    href="https://ai.google.dev/gemini-api/docs/billing" 
                    target="_blank" 
                    rel="noreferrer"
                    className="hover:text-amber-400 flex items-center gap-1"
                >
                    Billing Documentation <ExternalLink className="w-3 h-3" />
                </a>
            </div>
        </div>

        {/* Drive Settings */}
        <div className="space-y-4 pt-6 border-t border-slate-800">
             <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                 <Cloud className="w-3 h-3" /> Google Drive Access
             </h3>
             
             <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 space-y-3">
                 <p className="text-[10px] text-slate-400">
                     Required for Cloud Save/Load features. Create an OAuth 2.0 Client ID in GCP Console and add <code>http://localhost:3000</code> to Authorized Origins.
                 </p>
                 <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="apps.googleusercontent.com"
                        value={clientId}
                        onChange={(e) => setClientIdInput(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                    />
                     <button 
                        onClick={handleSaveClientId}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-xs"
                    >
                        Save
                    </button>
                 </div>
             </div>
        </div>

      </div>
    </div>
  );
};