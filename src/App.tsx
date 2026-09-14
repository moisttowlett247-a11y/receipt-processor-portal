import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Key, 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  FileCode, 
  Copy, 
  ExternalLink, 
  ChevronDown, 
  RefreshCw, 
  Trash2, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  EyeOff, 
  UserCheck, 
  Calendar, 
  Lock, 
  Unlock, 
  Check, 
  X, 
  FileText, 
  Upload, 
  Crown, 
  Infinity as InfinityIcon, 
  ShieldAlert, 
  Clock, 
  Globe 
} from 'lucide-react';
import { 
  LicenseKeyRecord, 
  CategoryRule, 
  SoftwareRelease, 
  AuditLogEntry, 
  SecurityAlert 
} from './types';
import { 
  SAMPLE_KEYS, 
  SAMPLE_RULES, 
  SAMPLE_RELEASES, 
  SAMPLE_LOGS, 
  SAMPLE_ALERTS 
} from './sampleData';
import { LicenseManagerTable } from './components/LicenseManagerTable';
import { ClientPortalView } from './components/ClientPortalView';
import { computeSha256Hex } from './hashUtils';

const DEFAULT_ADMIN_PIN = '1234';

export const App: React.FC = () => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'licensing' | 'rules' | 'updates' | 'security' | 'python' | 'portal'>('portal');

  // Core Data
  const [licenseKeys, setLicenseKeys] = useState<LicenseKeyRecord[]>(() => {
    try {
      const saved = localStorage.getItem('receipt_processor_keys');
      return saved ? JSON.parse(saved) : SAMPLE_KEYS;
    } catch {
      return SAMPLE_KEYS;
    }
  });

  const [rules, setRules] = useState<CategoryRule[]>(() => {
    try {
      const saved = localStorage.getItem('receipt_processor_rules');
      return saved ? JSON.parse(saved) : SAMPLE_RULES;
    } catch {
      return SAMPLE_RULES;
    }
  });

  const [releases, setReleases] = useState<SoftwareRelease[]>(() => {
    try {
      const saved = localStorage.getItem('receipt_processor_releases');
      return saved ? JSON.parse(saved) : SAMPLE_RELEASES;
    } catch {
      return SAMPLE_RELEASES;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(SAMPLE_LOGS);
  const [alerts, setAlerts] = useState<SecurityAlert[]>(SAMPLE_ALERTS);

  // Admin PIN Protection State
  const [adminPin, setAdminPin] = useState<string>(() => {
    return localStorage.getItem('receipt_processor_pin') || DEFAULT_ADMIN_PIN;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('receipt_processor_auth') === 'true';
  });
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [showPinChangeModal, setShowPinChangeModal] = useState<boolean>(false);
  const [newPinInput, setNewPinInput] = useState<string>('');

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Current app release version
  const currentVersion = releases.find(r => r.isLatest)?.version || '2.4.0';

  const [copied, setCopied] = useState(false);
  const [isGhModalOpen, setIsGhModalOpen] = useState(false);

  // URL Route Detection for separating Client Portal from Admin Portal
  const checkIsAdminPath = (): boolean => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return (
      path.includes('/admin') ||
      search.includes('admin') ||
      search.includes('view=admin') ||
      hash.includes('admin')
    );
  };

  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(checkIsAdminPath);

  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminRoute(checkIsAdminPath());
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateTo = (pathOrSearch: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', pathOrSearch);
      setIsAdminRoute(checkIsAdminPath());
    }
  };

  // Persist keys to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('receipt_processor_keys', JSON.stringify(licenseKeys));
    } catch {}
  }, [licenseKeys]);

  // Persist rules to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('receipt_processor_rules', JSON.stringify(rules));
    } catch {}
  }, [rules]);

  // Persist releases to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('receipt_processor_releases', JSON.stringify(releases));
    } catch {}
  }, [releases]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const logAction = (action: string, details: string, severity: 'INFO' | 'WARN' | 'CRITICAL' = 'INFO') => {
    const entry: AuditLogEntry = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      action,
      details,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      severity
    };
    setAuditLogs(prev => [entry, ...prev]);
  };

  // Auth Handlers
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin === adminPin) {
      setIsAuthenticated(true);
      sessionStorage.setItem('receipt_processor_auth', 'true');
      setEnteredPin('');
      setPinError(null);
      logAction('ADMIN_LOGIN', 'Master administrator unlocked the dashboard', 'INFO');
      showToast('Authenticated successfully');
    } else {
      setPinError('Incorrect administrator PIN.');
      setEnteredPin('');
      logAction('FAILED_LOGIN', 'Incorrect PIN attempt on admin portal', 'WARN');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('receipt_processor_auth');
    showToast('Admin session locked');
  };

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinInput.length < 4) {
      alert('PIN must be at least 4 characters');
      return;
    }
    setAdminPin(newPinInput);
    localStorage.setItem('receipt_processor_pin', newPinInput);
    setShowPinChangeModal(false);
    setNewPinInput('');
    showToast('Admin PIN updated');
    logAction('PIN_CHANGED', 'Master administrator updated the security PIN', 'CRITICAL');
  };

  // License CRUD Handlers
  const handleToggleKeyStatus = (id: string) => {
    setLicenseKeys(prev => prev.map(k => {
      if (k.id === id) {
        const nextStatus = k.status === 'ACTIVE' ? 'NOT ACTIVE' : 'ACTIVE';
        logAction('KEY_STATUS_CHANGED', `Key ${k.key} status changed to ${nextStatus}`, nextStatus === 'ACTIVE' ? 'INFO' : 'WARN');
        return { ...k, status: nextStatus };
      }
      return k;
    }));
  };

  const handleToggleKeyInUse = (id: string) => {
    setLicenseKeys(prev => prev.map(k => {
      if (k.id === id) {
        const nextInUse = !k.inUse;
        logAction('KEY_IN_USE_TOGGLED', `Key ${k.key} inUse changed to ${nextInUse}`);
        return { ...k, inUse: nextInUse };
      }
      return k;
    }));
  };

  const handleDeleteKey = (id: string) => {
    const toDelete = licenseKeys.find(k => k.id === id);
    if (toDelete) {
      logAction('KEY_DELETED', `Key ${toDelete.key} permanently deleted`, 'CRITICAL');
    }
    setLicenseKeys(prev => prev.filter(k => k.id !== id));
    showToast('License key deleted');
  };

  const handleAddManualKey = (record: Omit<LicenseKeyRecord, 'id'>) => {
    const newRecord: LicenseKeyRecord = {
      ...record,
      id: `RP-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    };
    setLicenseKeys(prev => [newRecord, ...prev]);
    logAction('KEY_CREATED', `New key registered: ${newRecord.key} (${newRecord.plan})`);
    showToast('New license key registered');
  };

  const handleImportKeys = (newKeys: LicenseKeyRecord[]) => {
    setLicenseKeys(prev => [...newKeys, ...prev]);
    logAction('KEYS_IMPORTED', `Bulk imported ${newKeys.length} license keys`);
    showToast(`Imported ${newKeys.length} keys`);
  };

  // Python Script Download
  const handleDownloadPythonScript = async () => {
    try {
      const response = await fetch('/receipt_processor.py');
      if (response.ok) {
        const text = await response.text();
        const blob = new Blob([text], { type: 'text/x-python' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'receipt_processor.py';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Downloaded receipt_processor.py');
      } else {
        throw new Error('Failed to load file');
      }
    } catch {
      showToast('Could not fetch script file.');
    }
  };

  // Rule Handlers
  const handleAddRule = (category: string, keywordsStr: string) => {
    if (!category.trim() || !keywordsStr.trim()) return;
    const keywords = keywordsStr.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const newRule: CategoryRule = {
      id: `RULE-${Date.now()}`,
      category: category.trim(),
      keywords,
      isSystem: false
    };
    setRules(prev => [...prev, newRule]);
    logAction('RULE_ADDED', `New category rule added for "${category}" with ${keywords.length} keywords`);
    showToast(`Rule added for ${category}`);
  };

  const handleDeleteRule = (id: string) => {
    const r = rules.find(x => x.id === id);
    if (r?.isSystem) {
      alert('System baseline rules cannot be deleted.');
      return;
    }
    setRules(prev => prev.filter(x => x.id !== id));
    logAction('RULE_DELETED', `Deleted category rule ${r?.category || id}`);
    showToast('Rule removed');
  };

  // Software Release Handlers
  const handleAddRelease = (ver: string, notes: string, minKeyPlan: string) => {
    if (!ver.trim()) return;
    const newRel: SoftwareRelease = {
      id: `REL-${Date.now()}`,
      version: ver.trim(),
      releaseDate: new Date().toISOString().split('T')[0],
      releaseNotes: notes.trim() || 'Maintenance update and bug fixes',
      isLatest: true,
      minRequiredPlan: minKeyPlan as any
    };
    setReleases(prev => [newRel, ...prev.map(r => ({ ...r, isLatest: false }))]);
    logAction('RELEASE_PUBLISHED', `Published new release v${ver.trim()}`, 'INFO');
    showToast(`Published v${ver.trim()}`);
  };

  // Rule states for UI
  const [newCatName, setNewCatName] = useState('');
  const [newKeywords, setNewKeywords] = useState('');

  // Release states for UI
  const [newRelVer, setNewRelVer] = useState('');
  const [newRelNotes, setNewRelNotes] = useState('');
  const [newRelPlan, setNewRelPlan] = useState('ANNUAL');

  // If URL route is not admin, show public Client Portal
  if (!isAdminRoute) {
    return (
      <div className="relative">
        <ClientPortalView
          onDownloadScript={handleDownloadPythonScript}
          licenseKeys={licenseKeys}
          currentVersion={currentVersion}
          onGoToAdmin={() => navigateTo('/admin')}
        />

        {/* Global Toast */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 bg-stone-900 border border-stone-700 text-stone-100 text-xs px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  // If admin route, check PIN authentication
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-4 text-stone-100">
        <div className="max-w-sm w-full bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Administrator Access</h2>
            <p className="text-xs text-stone-400 mt-1">Enter master PIN to manage software licenses and updates.</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-3">
            <input
              type="password"
              autoFocus
              maxLength={8}
              value={enteredPin}
              onChange={(e) => setEnteredPin(e.target.value)}
              placeholder="Enter PIN (Default: 1234)"
              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2.5 text-center text-lg font-mono tracking-widest text-stone-100 focus:outline-none focus:border-amber-500"
            />

            {pinError && (
              <p className="text-xs text-rose-400 font-medium">{pinError}</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              Unlock Console
            </button>
          </form>

          <div className="pt-2 border-t border-stone-800/80">
            <button
              onClick={() => navigateTo('/')}
              className="text-xs text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
            >
              ← Return to Client Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-amber-500/20 selection:text-amber-300">
      {/* Top Admin Header */}
      <header className="border-b border-stone-800 bg-stone-900/60 backdrop-blur sticky top-0 z-40 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-black">
              RP
            </div>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-2">
                Receipt Processor Admin
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-300">
                  v{currentVersion}
                </span>
              </h1>
              <p className="text-[11px] text-stone-400">Licensing Registry & OCR Management Console</p>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('portal')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 rounded-md transition-colors cursor-pointer"
            title="Preview customer-facing license verification screen"
          >
            <UserCheck className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden sm:inline">Client Portal</span>
          </button>

          <button
            onClick={() => setActiveTab('updates')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 rounded-md transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
            <span>Updates</span>
          </button>

          {/* GitHub Direct Cloud Sync button */}
          <button
            onClick={() => {
              setActiveTab('licensing');
              setIsGhModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sky-950/90 hover:bg-sky-900 text-sky-300 border border-sky-600/80 rounded-md shadow-sm transition-all cursor-pointer"
            title="Configure GitHub Repository & Personal Access Token for direct hash sync"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>GH Sync</span>
          </button>
          
          <button
            onClick={handleDownloadPythonScript}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-stone-950 rounded-md shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Script</span>
          </button>

          <button
            onClick={() => setShowPinChangeModal(true)}
            title="Change Admin PIN"
            className="p-1.5 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 rounded-md transition-colors cursor-pointer"
          >
            <Key className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleLogout}
            title="Lock Console"
            className="p-1.5 bg-stone-900 hover:bg-rose-950/40 text-stone-400 hover:text-rose-400 border border-stone-800 rounded-md transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Admin Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <nav className="w-full md:w-56 bg-stone-950/80 border-r border-stone-800 p-4 space-y-1 shrink-0">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-stone-900 text-amber-400 border border-stone-800' : 'text-stone-400 hover:bg-stone-900/60 hover:text-stone-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('licensing')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'licensing' ? 'bg-stone-900 text-amber-400 border border-stone-800' : 'text-stone-400 hover:bg-stone-900/60 hover:text-stone-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>License Registry</span>
            <span className="ml-auto text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-800 text-stone-300">
              {licenseKeys.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'rules' ? 'bg-stone-900 text-amber-400 border border-stone-800' : 'text-stone-400 hover:bg-stone-900/60 hover:text-stone-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>OCR Tax Rules</span>
          </button>

          <button
            onClick={() => setActiveTab('updates')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'updates' ? 'bg-stone-900 text-amber-400 border border-stone-800' : 'text-stone-400 hover:bg-stone-900/60 hover:text-stone-200'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Releases & OTA</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'security' ? 'bg-stone-900 text-amber-400 border border-stone-800' : 'text-stone-400 hover:bg-stone-900/60 hover:text-stone-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Audit & Security</span>
          </button>

          <button
            onClick={() => setActiveTab('python')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'python' ? 'bg-stone-900 text-amber-400 border border-stone-800' : 'text-stone-400 hover:bg-stone-900/60 hover:text-stone-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Python Script Code</span>
          </button>

          <div className="pt-4 border-t border-stone-800/80 mt-4 space-y-1">
            <button
              onClick={() => navigateTo('/')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-stone-400 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Exit to Public URL</span>
            </button>
          </div>
        </nav>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
                  <span className="text-xs text-stone-400 font-medium">Total Registered Licenses</span>
                  <div className="text-2xl font-bold text-white mt-1 font-mono">{licenseKeys.length}</div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{licenseKeys.filter(k => k.status === 'ACTIVE').length} currently active</span>
                  </div>
                </div>

                <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
                  <span className="text-xs text-stone-400 font-medium">Licenses In Use</span>
                  <div className="text-2xl font-bold text-white mt-1 font-mono">
                    {licenseKeys.filter(k => k.inUse).length}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-stone-400">
                    <span>{licenseKeys.filter(k => !k.inUse).length} available for assignment</span>
                  </div>
                </div>

                <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
                  <span className="text-xs text-stone-400 font-medium">OCR Categorization Rules</span>
                  <div className="text-2xl font-bold text-white mt-1 font-mono">{rules.length}</div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-amber-400">
                    <span>{rules.reduce((acc, r) => acc + r.keywords.length, 0)} total keywords</span>
                  </div>
                </div>

                <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
                  <span className="text-xs text-stone-400 font-medium">Latest Desktop Version</span>
                  <div className="text-2xl font-bold text-white mt-1 font-mono">v{currentVersion}</div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-sky-400">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Auto-update polling enabled</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Recent Security & License Audits</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('security')}
                      className="text-xs text-stone-400 hover:text-stone-200 cursor-pointer"
                    >
                      View All Logs →
                    </button>
                  </div>

                  <div className="space-y-2">
                    {auditLogs.slice(0, 5).map(log => (
                      <div key={log.id} className="p-2.5 rounded-lg bg-stone-950/60 border border-stone-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            log.severity === 'CRITICAL' ? 'bg-rose-500' :
                            log.severity === 'WARN' ? 'bg-amber-500' : 'bg-sky-500'
                          }`}></span>
                          <span className="font-mono text-stone-300 font-medium">{log.action}</span>
                          <span className="text-stone-400">— {log.details}</span>
                        </div>
                        <span className="text-[10px] text-stone-500 font-mono shrink-0">{log.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-400" />
                    <span>GitHub Licensing State</span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    Desktop applications query cryptographically hashed SHA-256 files hosted at your public GitHub Pages or RAW endpoint.
                  </p>

                  <div className="p-3 bg-stone-950 rounded-lg border border-stone-800 font-mono text-[11px] text-stone-300 break-all space-y-1.5">
                    <div className="text-stone-500">Endpoint query structure:</div>
                    <div className="text-amber-300">.../public/licenses/&lt;sha256_hash&gt;.json</div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab('licensing');
                      setIsGhModalOpen(true);
                    }}
                    className="w-full py-2 bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 border border-sky-800/60 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Configure GitHub Sync
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LICENSE MANAGER TABLE */}
          {activeTab === 'licensing' && (
            <div className="space-y-4">
              <LicenseManagerTable
                keys={licenseKeys}
                onToggleStatus={handleToggleKeyStatus}
                onToggleInUse={handleToggleKeyInUse}
                onDeleteKey={handleDeleteKey}
                onAddManualKey={handleAddManualKey}
                onImportKeys={handleImportKeys}
                isGhModalOpen={isGhModalOpen}
                onCloseGhModal={() => setIsGhModalOpen(false)}
              />
            </div>
          )}

          {/* TAB 3: OCR TAX RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">OCR Tax Category Sorter Rules</h3>
                    <p className="text-xs text-stone-400">
                      When the desktop script scans a receipt image, it matches OCR words against these category keywords.
                    </p>
                  </div>
                </div>

                {/* Add Rule Form */}
                <div className="p-4 bg-stone-950/60 border border-stone-800 rounded-lg space-y-3">
                  <h4 className="text-xs font-bold text-amber-400">Add New Category Classification</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Category (e.g. Travel & Lodging)"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="bg-stone-900 border border-stone-700/80 rounded px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="Keywords (comma separated: hotel, airbnb, flight)"
                      value={newKeywords}
                      onChange={(e) => setNewKeywords(e.target.value)}
                      className="sm:col-span-2 bg-stone-900 border border-stone-700/80 rounded px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        handleAddRule(newCatName, newKeywords);
                        setNewCatName('');
                        setNewKeywords('');
                      }}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded transition-colors cursor-pointer"
                    >
                      Save Category Rule
                    </button>
                  </div>
                </div>

                {/* Existing Rules List */}
                <div className="space-y-3">
                  {rules.map(r => (
                    <div key={r.id} className="p-4 bg-stone-950/40 border border-stone-800/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-100">{r.category}</span>
                          {r.isSystem && (
                            <span className="text-[10px] bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {r.keywords.map((kw, i) => (
                            <span key={i} className="text-[11px] font-mono bg-stone-900 text-amber-300 border border-stone-800 px-2 py-0.5 rounded">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>

                      {!r.isSystem && (
                        <button
                          onClick={() => handleDeleteRule(r.id)}
                          className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer self-end sm:self-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RELEASES & OTA UPDATES */}
          {activeTab === 'updates' && (
            <div className="space-y-6">
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">Software Releases & Over-The-Air Versioning</h3>
                    <p className="text-xs text-stone-400">
                      The desktop application periodically queries this version manifest to notify clients of updates.
                    </p>
                  </div>
                </div>

                {/* Publish Release Form */}
                <div className="p-4 bg-stone-950/60 border border-stone-800 rounded-lg space-y-3">
                  <h4 className="text-xs font-bold text-sky-400">Publish New Version</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Version (e.g. 2.4.1)"
                      value={newRelVer}
                      onChange={(e) => setNewRelVer(e.target.value)}
                      className="bg-stone-900 border border-stone-700/80 rounded px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-sky-500 font-mono"
                    />
                    <select
                      value={newRelPlan}
                      onChange={(e) => setNewRelPlan(e.target.value)}
                      className="bg-stone-900 border border-stone-700/80 rounded px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      <option value="MONTHLY">Min Plan: Monthly</option>
                      <option value="ANNUAL">Min Plan: Annual</option>
                      <option value="LIFETIME">Min Plan: Lifetime</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Release notes / changelog"
                      value={newRelNotes}
                      onChange={(e) => setNewRelNotes(e.target.value)}
                      className="bg-stone-900 border border-stone-700/80 rounded px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        handleAddRelease(newRelVer, newRelNotes, newRelPlan);
                        setNewRelVer('');
                        setNewRelNotes('');
                      }}
                      className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded transition-colors cursor-pointer"
                    >
                      Publish Version
                    </button>
                  </div>
                </div>

                {/* Releases List */}
                <div className="space-y-3">
                  {releases.map(r => (
                    <div key={r.id} className="p-4 bg-stone-950/40 border border-stone-800/80 rounded-lg flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white font-mono">v{r.version}</span>
                          {r.isLatest && (
                            <span className="text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full">
                              LATEST RELEASE
                            </span>
                          )}
                          <span className="text-xs text-stone-500">Released {r.releaseDate}</span>
                        </div>
                        <p className="text-xs text-stone-300">{r.releaseNotes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SECURITY AUDIT LOGS */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Audit Logs & Security Events</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-stone-300 font-mono">
                    <thead className="bg-stone-950 text-stone-500 text-[10px] uppercase border-b border-stone-800">
                      <tr>
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3">Severity</th>
                        <th className="py-2.5 px-3">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/60">
                      {auditLogs.map(l => (
                        <tr key={l.id} className="hover:bg-stone-800/30">
                          <td className="py-2 px-3 text-stone-500 text-[11px] whitespace-nowrap">{l.timestamp}</td>
                          <td className="py-2 px-3 font-bold text-stone-200 whitespace-nowrap">{l.action}</td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              l.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                              l.severity === 'WARN' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                              'bg-stone-800 text-stone-300'
                            }`}>
                              {l.severity}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-stone-400 font-sans text-xs">{l.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PYTHON CLIENT SCRIPT INSPECTOR */}
          {activeTab === 'python' && (
            <div className="space-y-4">
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-amber-400" />
                      <span>Desktop Application Client Code (receipt_processor.py)</span>
                    </h3>
                    <p className="text-xs text-stone-400">
                      The standalone Python GUI with OCR parsing, Excel exports, and SHA-256 license verification.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadPythonScript}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-stone-950 rounded-md transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .py</span>
                  </button>
                </div>

                <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 font-mono text-xs text-stone-300 space-y-2">
                  <div className="text-stone-500"># Verification logic embedded in receipt_processor.py:</div>
                  <pre className="text-emerald-400 overflow-x-auto py-2">
{`clean_key = user_key.strip().upper()
key_hash = hashlib.sha256(clean_key.encode("utf-8")).hexdigest()

# Queries GitHub directly:
url = f"https://raw.githubusercontent.com/moisttowlett247-a11y/receipt-processor-portal/main/public/licenses/{key_hash}.json"
response = urllib.request.urlopen(url)
data = json.loads(response.read().decode("utf-8"))

if data.get("status") == "ACTIVE":
    unlock_software()
else:
    lock_software()`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: CLIENT PORTAL IN-TAB PREVIEW */}
          {activeTab === 'portal' && (
            <div className="border border-stone-800 rounded-xl overflow-hidden shadow-2xl">
              <ClientPortalView
                onDownloadScript={handleDownloadPythonScript}
                licenseKeys={licenseKeys}
                currentVersion={currentVersion}
              />
            </div>
          )}
        </main>
      </div>

      {/* Change PIN Modal */}
      {showPinChangeModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-sm font-bold text-stone-100">Update Master Admin PIN</h3>
              <button
                onClick={() => setShowPinChangeModal(false)}
                className="text-stone-400 hover:text-stone-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdatePin} className="space-y-3">
              <input
                type="password"
                required
                maxLength={8}
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value)}
                placeholder="Enter new 4+ digit PIN"
                className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-stone-100 text-center text-lg font-mono focus:outline-none focus:border-amber-500"
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowPinChangeModal(false)}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded text-xs cursor-pointer"
                >
                  Save PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-stone-900 border border-stone-700 text-stone-100 text-xs px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
