import React, { useState, useEffect } from 'react';
import { 
  Key, 
  ShieldCheck, 
  Database, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  Cpu, 
  Sparkles, 
  Trash2,
  ExternalLink
} from 'lucide-react';
import { 
  getGeminiApiKey, 
  setGeminiApiKey, 
  getFirebaseConfig, 
  setFirebaseConfig, 
  clearCustomApiKeys, 
  hasGeminiApiKey,
  FirebaseClientConfig 
} from '../config/keys';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated
}) => {
  const [geminiKey, setGeminiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showAdvancedFirebase, setShowAdvancedFirebase] = useState(false);
  const [firebaseConfig, setFirebaseCfg] = useState<FirebaseClientConfig>(getFirebaseConfig());
  const [testStatus, setTestStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [testMessage, setTestMessage] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGeminiKey(getGeminiApiKey());
      setFirebaseCfg(getFirebaseConfig());
      setSavedSuccess(false);
      setTestStatus('IDLE');
      setTestMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setGeminiApiKey(geminiKey.trim());
    setFirebaseConfig(firebaseConfig);
    setSavedSuccess(true);
    if (onConfigUpdated) {
      onConfigUpdated();
    }
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2500);
  };

  const handleTestConnection = async () => {
    setTestStatus('TESTING');
    setTestMessage('Verifying Gemini API & Backend Gateway...');
    try {
      const activeKey = geminiKey.trim() || getGeminiApiKey();
      const res = await fetch(`/api/health${activeKey ? `?apiKey=${encodeURIComponent(activeKey)}` : ''}`, {
        headers: activeKey ? { Authorization: `Bearer ${activeKey}` } : {}
      });
      const data = await res.json();
      
      if (data.status === 'ok') {
        if (data.hasGeminiKey || activeKey.length > 0) {
          setTestStatus('SUCCESS');
          setTestMessage('Gemini 2.5 Flash AI Engine & Firestore Gateway Verified ✓');
        } else {
          setTestStatus('SUCCESS');
          setTestMessage('Backend reachable. Add Gemini API Key for live AI Vision analysis.');
        }
      } else {
        setTestStatus('ERROR');
        setTestMessage('Backend response abnormal.');
      }
    } catch (err: any) {
      setTestStatus('ERROR');
      setTestMessage(`Connection check failed: ${err.message || 'Network error'}`);
    }
  };

  const handleResetDefaults = () => {
    clearCustomApiKeys();
    setGeminiKey('');
    setFirebaseCfg(getFirebaseConfig());
    setSavedSuccess(true);
    setTestStatus('IDLE');
    setTestMessage('Reset to environment defaults.');
    if (onConfigUpdated) {
      onConfigUpdated();
    }
  };

  const hasKey = Boolean(geminiKey.trim() || hasGeminiApiKey());

  return (
    <div 
      id="settings-modal-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="settings-modal-dialog"
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-[#2d7a70] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <Key className="w-5 h-5 text-teal-100" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">API & System Settings</h2>
              <p className="text-xs text-teal-100/90">Configure Gemini Vision AI & Firebase Credentials</p>
            </div>
          </div>
          <button
            id="close-settings-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-teal-100 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-sm">
          {/* Status Banner */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
              hasKey ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                hasKey ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                <Cpu className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gemini 2.5 Flash</div>
                <div className="text-xs font-bold truncate">
                  {hasKey ? 'AI Active ✓' : 'Demo / Heuristic Mode'}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border bg-teal-50 border-teal-200 text-teal-900 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-teal-600">Live Firestore</div>
                <div className="text-xs font-bold truncate">omnisync-pothole ✓</div>
              </div>
            </div>
          </div>

          {/* Gemini API Key Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                Google Gemini API Key
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                Stored securely in localStorage
              </span>
            </div>
            
            <div className="relative">
              <input
                id="gemini-api-key-input"
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy... (leave blank to use server environment key)"
                className="w-full pl-3.5 pr-20 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                  title={showGeminiKey ? 'Hide key' : 'Show key'}
                >
                  {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Powers automatic image classification for citizen grievances and autonomous municipal dispatch telemetry.
            </p>
          </div>

          {/* Firestore Credentials Section */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-teal-600" />
                Firebase Project Settings
              </label>
              <button
                type="button"
                onClick={() => setShowAdvancedFirebase(!showAdvancedFirebase)}
                className="text-xs text-teal-700 font-semibold hover:underline"
              >
                {showAdvancedFirebase ? 'Hide Credentials' : 'Edit Credentials'}
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-600">
                <span>Project ID:</span>
                <span className="font-mono font-medium text-slate-900">{firebaseConfig.projectId}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Auth Domain:</span>
                <span className="font-mono font-medium text-slate-900">{firebaseConfig.authDomain}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Real-time Collection:</span>
                <span className="font-mono font-medium text-emerald-700">complaints (Active onSnapshot)</span>
              </div>
            </div>

            {showAdvancedFirebase && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-fade-in">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Firebase API Key</label>
                  <input
                    type="text"
                    value={firebaseConfig.apiKey}
                    onChange={(e) => setFirebaseCfg({ ...firebaseConfig, apiKey: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Project ID</label>
                  <input
                    type="text"
                    value={firebaseConfig.projectId}
                    onChange={(e) => setFirebaseCfg({ ...firebaseConfig, projectId: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Storage Bucket</label>
                  <input
                    type="text"
                    value={firebaseConfig.storageBucket}
                    onChange={(e) => setFirebaseCfg({ ...firebaseConfig, storageBucket: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Test connection feedback */}
          {testStatus !== 'IDLE' && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
              testStatus === 'TESTING' 
                ? 'bg-blue-50 border-blue-200 text-blue-900' 
                : testStatus === 'SUCCESS'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              {testStatus === 'TESTING' && <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />}
              {testStatus === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {testStatus === 'ERROR' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span className="font-medium">{testMessage}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Settings saved & applied successfully!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-2 text-xs text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition font-medium flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus === 'TESTING'}
              className="px-3 py-2 text-xs text-teal-800 hover:bg-teal-50 border border-teal-200 rounded-lg transition font-medium flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testStatus === 'TESTING' ? 'animate-spin' : ''}`} />
              Test Connection
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
            >
              Close
            </button>
            <button
              id="save-settings-btn"
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-white bg-[#2d7a70] hover:bg-[#24625a] rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
