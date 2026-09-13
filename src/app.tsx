import React, { useState, useEffect } from 'react';
import {
  Key,
  Shield,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Copy,
  Check,
  Calendar,
  Lock,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  Terminal,
  FileCode,
  ArrowRight,
  Printer,
  ChevronDown
} from 'lucide-react';

type LicenseStatus = 'ACTIVE' | 'NOT ACTIVE' | 'EXPIRED';
type PlanTier = 'ADMIN' | 'DEMO' | 'MONTHLY' | '3MONTH' | '6MONTH' | 'ANNUAL';

interface LicenseKeyRecord {
  id: string;
  key: string;
  clientName: string;
  clientEmail: string;
  plan: PlanTier;
  status: LicenseStatus;
  inUse: boolean;
  issuedDate: string;
  activatedDate?: string;
  expiresDate: string;
  hardwareId?: string;
  notes?: string;
}

const INITIAL_KEYS: LicenseKeyRecord[] = [
  {
    id: '1',
    key: 'ADMIN-8821-4910-MASTER',
    clientName: 'Main Operator',
    clientEmail: 'admin@workstation.internal',
    plan: 'ADMIN',
    status: 'ACTIVE',
    inUse: true,
    issuedDate: '2026-01-01',
    activatedDate: '2026-01-01',
    expiresDate: 'Never (Perpetual)',
    hardwareId: 'DESKTOP-WIN11-MASTER-01',
    notes: 'Internal primary workstation'
  },
  {
    id: '2',
    key: 'ANNUAL-3921-8840-2026',
    clientName: 'Pacific Auto Logistics',
    clientEmail: 'dispatch@pacificautolog.com',
    plan: 'ANNUAL',
    status: 'ACTIVE',
    inUse: true,
    issuedDate: '2026-02-15',
    activatedDate: '2026-02-15',
    expiresDate: '2027-02-15',
    hardwareId: 'OFFICE-HP-SCANNER-4',
    notes: 'Annual commercial production seat'
  },
  {
    id: '3',
    key: 'MONTHLY-1092-4421-2026',
    clientName: 'Tri-County Parts',
    clientEmail: 'billing@tricountyparts.net',
    plan: 'MONTHLY',
    status: 'ACTIVE',
    inUse: false,
    issuedDate: '2026-09-01',
    activatedDate: '2026-09-01',
    expiresDate: '2026-10-01',
    notes: 'Monthly active seat'
  }
];

export default function App() {
  const [isAdminView, setIsAdminView] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [masterPin, setMasterPin] = useState<string | null>(() => localStorage.getItem('app_master_pin'));
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [licenses, setLicenses] = useState<LicenseKeyRecord[]>(() => {
    const saved = localStorage.getItem('app_licenses_registry');
    return saved ? JSON.parse(saved) : INITIAL_KEYS;
  });

  const [lookupKey, setLookupKey] = useState('');
  const [lookupResult, setLookupResult] = useState<LicenseKeyRecord | null | 'NOT_FOUND'>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // New key form
  const [newClient, setNewClient] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPlan, setNewPlan] = useState<PlanTier>('MONTHLY');
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => {
    const checkRoute = () => {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes('admin') || search.includes('admin=true')) {
        setIsAdminView(true);
      } else {
        setIsAdminView(false);
      }
    };
    checkRoute();
    window.addEventListener('hashchange', checkRoute);
    return () => window.removeEventListener('hashchange', checkRoute);
  }, []);

  useEffect(() => {
    localStorage.setItem('app_licenses_registry', JSON.stringify(licenses));
  }, [licenses]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = lookupKey.trim().toUpperCase();
    if (!clean) return;
    const found = licenses.find(l => l.key.toUpperCase() === clean);
    setLookupResult(found || 'NOT_FOUND');
  };

  const handleSetPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }
    if (pinInput !== confirmPinInput) {
      setPinError('PINs do not match');
      return;
    }
    localStorage.setItem('app_master_pin', pinInput);
    setMasterPin(pinInput);
    setAdminUnlocked(true);
    setPinError(null);
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === masterPin) {
      setAdminUnlocked(true);
      setPinError(null);
      setPinInput('');
    } else {
      setPinError('Incorrect Master PIN');
    }
  };

  const generateNewKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.trim()) return;

    const r1 = Math.floor(1000 + Math.random() * 9000);
    const r2 = Math.floor(1000 + Math.random() * 9000);
    const year = new Date().getFullYear();
    const generated = newPlan === 'ADMIN'
      ? `ADMIN-${r1}-${r2}-MASTER`
      : `${newPlan}-${r1}-${r2}-${year}`;

    const nowStr = new Date().toISOString().split('T')[0];
    let expStr = 'Never (Perpetual)';
    if (newPlan === 'DEMO') {
      const d = new Date(); d.setDate(d.getDate() + 7); expStr = d.toISOString().split('T')[0];
    } else if (newPlan === 'MONTHLY') {
      const d = new Date(); d.setDate(d.getDate() + 30); expStr = d.toISOString().split('T')[0];
    } else if (newPlan === '3MONTH') {
      const d = new Date(); d.setDate(d.getDate() + 90); expStr = d.toISOString().split('T')[0];
    } else if (newPlan === '6MONTH') {
      const d = new Date(); d.setDate(d.getDate() + 180); expStr = d.toISOString().split('T')[0];
    } else if (newPlan === 'ANNUAL') {
      const d = new Date(); d.setDate(d.getDate() + 365); expStr = d.toISOString().split('T')[0];
    }

    const rec: LicenseKeyRecord = {
      id: Date.now().toString(),
      key: generated,
      clientName: newClient.trim(),
      clientEmail: newEmail.trim() || 'unspecified@client.local',
      plan: newPlan,
      status: 'ACTIVE',
      inUse: false,
      issuedDate: nowStr,
      expiresDate: expStr,
      notes: newNotes.trim()
    };

    setLicenses([rec, ...licenses]);
    setNewClient('');
    setNewEmail('');
    setNewNotes('');
  };

  const toggleStatus = (id: string) => {
    setLicenses(licenses.map(l => {
      if (l.id !== id) return l;
      return { ...l, status: l.status === 'ACTIVE' ? 'NOT ACTIVE' : 'ACTIVE' };
    }));
  };

  const deleteLicense = (id: string) => {
    if (confirm('Delete this license key?')) {
      setLicenses(licenses.filter(l => l.id !== id));
    }
  };

  const exportRegistryJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(licenses, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', 'license_registry.json');
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans flex flex-col justify-between selection:bg-amber-500 selection:text-stone-950">
      {/* Top Navigation */}
      <header className="border-b border-stone-800 bg-stone-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-stone-100">Receipt Processor Portal</h1>
            <p className="text-[11px] text-stone-400">Workstation Automation & License Services</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAdminView ? (
            <button
              onClick={() => {
                window.location.hash = '';
                setIsAdminView(false);
              }}
              className="px-3 py-1.5 rounded-lg border border-stone-800 bg-stone-900 hover:bg-stone-800 text-xs text-stone-300 transition-colors cursor-pointer"
            >
              Public Client Portal
            </button>
          ) : (
            <button
              onClick={() => {
                window.location.hash = 'admin';
                setIsAdminView(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs text-amber-400 font-medium transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Operator Login</span>
            </button>
          )}
        </div>
      </header>

      {/* Main View */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-8">
        {isAdminView ? (
          /* ADMIN VIEW */
          !adminUnlocked ? (
            /* PIN Screen */
            <div className="max-w-sm mx-auto my-12 p-6 rounded-2xl bg-stone-900/80 border border-stone-800 shadow-xl space-y-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-100">
                  {!masterPin ? 'Set Master Admin PIN' : 'Master PIN Required'}
                </h2>
                <p className="text-xs text-stone-400 mt-1">
                  {!masterPin ? 'Create a 4-8 digit PIN to secure your portal.' : 'Enter your secret PIN to access the manager.'}
                </p>
              </div>

              {pinError && (
                <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
                  {pinError}
                </div>
              )}

              <form onSubmit={!masterPin ? handleSetPin : handleUnlock} className="space-y-3">
                <input
                  type="password"
                  placeholder="Enter PIN"
                  maxLength={8}
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value)}
                  className="w-full text-center text-xl tracking-[0.3em] font-mono py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-amber-400 focus:outline-none focus:border-amber-500"
                  autoFocus
                />
                {!masterPin && (
                  <input
                    type="password"
                    placeholder="Confirm PIN"
                    maxLength={8}
                    value={confirmPinInput}
                    onChange={e => setConfirmPinInput(e.target.value)}
                    className="w-full text-center text-xl tracking-[0.3em] font-mono py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                )}
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  {!masterPin ? 'Save Master PIN & Unlock' : 'Unlock Admin Portal'}
                </button>
              </form>
            </div>
          ) : (
            /* Unlocked Admin Dashboard */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900/60 border border-stone-800 p-4 rounded-2xl">
                <div>
                  <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    License Key Registry & Generation
                  </h2>
                  <p className="text-xs text-stone-400">Create, revoke, and export license files for local workstations</p>
                </div>
                <button
                  onClick={exportRegistryJson}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export license_registry.json</span>
                </button>
              </div>

              {/* Add New Key Form */}
              <form onSubmit={generateNewKey} className="bg-stone-900/40 border border-stone-800 p-4 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider">Issue New License Key</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Client or Company Name"
                    value={newClient}
                    onChange={e => setNewClient(e.target.value)}
                    className="px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="email"
                    placeholder="Client Email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                  <select
                    value={newPlan}
                    onChange={e => setNewPlan(e.target.value as PlanTier)}
                    className="px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="ADMIN">ADMIN MASTER (Perpetual)</option>
                    <option value="DEMO">DEMO (7 Days)</option>
                    <option value="MONTHLY">MONTHLY (30 Days)</option>
                    <option value="3MONTH">3 MONTHS (90 Days)</option>
                    <option value="6MONTH">6 MONTHS (180 Days)</option>
                    <option value="ANNUAL">ANNUAL (1 Year)</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Workstation / Seat Notes (Optional)"
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                    className="flex-1 px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Generate Key</span>
                  </button>
                </div>
              </form>

              {/* License Table */}
              <div className="border border-stone-800 rounded-2xl overflow-x-auto bg-stone-900/20">
                <table className="w-full text-left text-xs text-stone-300">
                  <thead className="bg-stone-900/80 text-stone-400 border-b border-stone-800">
                    <tr>
                      <th className="p-3">License Key</th>
                      <th className="p-3">Client</th>
                      <th className="p-3">Plan</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Expires</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60">
                    {licenses.map(l => (
                      <tr key={l.id} className="hover:bg-stone-900/40">
                        <td className="p-3 font-mono font-medium text-amber-400 flex items-center gap-2">
                          <span>{l.key}</span>
                          <button
                            onClick={() => handleCopy(l.key)}
                            className="p-1 hover:text-stone-100 cursor-pointer"
                            title="Copy Key"
                          >
                            {copiedKey === l.key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-stone-200">{l.clientName}</div>
                          <div className="text-[10px] text-stone-500">{l.clientEmail}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-stone-800 text-[10px] font-mono font-bold text-stone-300">
                            {l.plan}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => toggleStatus(l.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                              l.status === 'ACTIVE'
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                                : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                            }`}
                          >
                            {l.status}
                          </button>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-stone-400">{l.expiresDate}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => deleteLicense(l.id)}
                            className="p-1 hover:text-rose-400 text-stone-500 transition-colors cursor-pointer"
                            title="Delete Key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          /* CLIENT VIEW */
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="text-center space-y-3 py-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Automated Receipt & Document Dispatch Engine
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-100 tracking-tight">
                High-Speed Batch Scanning & Thermal Printing
              </h2>
              <p className="text-sm text-stone-400 max-w-2xl mx-auto leading-relaxed">
                Connect your flatbed scanner, auto-crop thermal receipts, apply dynamic contrast, and dispatch directly to your warehouse printer queue.
              </p>
            </div>

            {/* License Verification Tool */}
            <div className="max-w-xl mx-auto bg-stone-900/70 border border-stone-800 p-6 rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-stone-200 font-bold text-sm">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Verify Your Software License</span>
              </div>
              <form onSubmit={handleLookup} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. ANNUAL-3921-8840-2026"
                  value={lookupKey}
                  onChange={e => setLookupKey(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500 uppercase placeholder:normal-case placeholder:text-stone-600"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Verify</span>
                </button>
              </form>

              {lookupResult === 'NOT_FOUND' && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-300">
                  <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>License key not found or expired. Contact system admin for renewal.</span>
                </div>
              )}

              {lookupResult && lookupResult !== 'NOT_FOUND' && (
                <div className="p-4 bg-stone-950/80 border border-emerald-500/30 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Valid & Authorized License
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 text-[10px] font-bold">
                      {lookupResult.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-stone-400 pt-2 border-t border-stone-800/80">
                    <div>Licensed Client: <strong className="text-stone-200">{lookupResult.clientName}</strong></div>
                    <div>Plan Tier: <strong className="text-stone-200">{lookupResult.plan}</strong></div>
                    <div>Expiration: <strong className="text-stone-200">{lookupResult.expiresDate}</strong></div>
                    <div>Seat Binding: <strong className="text-stone-200">{lookupResult.hardwareId || 'Unbound (Ready)'}</strong></div>
                  </div>
                </div>
              )}
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800 space-y-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <h3 className="text-xs font-bold text-stone-200">Zero-Click Dispatch</h3>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Immediately sends scanned tickets to ESC/POS or standard Windows printers without print dialogs.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800 space-y-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <h3 className="text-xs font-bold text-stone-200">Hardware Bound Keys</h3>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Keys link automatically to workstation motherboards to prevent seat sharing and key theft.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800 space-y-2">
                <FileCode className="w-5 h-5 text-amber-400" />
                <h3 className="text-xs font-bold text-stone-200">Offline Fallback</h3>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Operate securely even in remote warehouse facilities without active internet connections.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800/80 bg-stone-950 py-4 px-6 text-center text-xs text-stone-600">
        Receipt Processor Desktop Automation • All rights reserved
      </footer>
    </div>
  );
}
