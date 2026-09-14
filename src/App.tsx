import React, { useState, useEffect, useRef } from 'react';
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
  Globe,
  Sparkles,
  Terminal,
  Receipt,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================
export type LicensePlan = 'MONTHLY' | 'ANNUAL' | 'LIFETIME' | 'ADMIN';
export type LicenseStatus = 'ACTIVE' | 'EXPIRED' | 'NOT ACTIVE';

export interface LicenseKeyRecord {
  id: string;
  key: string;
  plan: LicensePlan;
  status: LicenseStatus;
  inUse: boolean;
  issuedDate: string;
  expiresDate: string;
  customerName?: string;
  customerEmail?: string;
  notes?: string;
}

export interface SoftwareRelease {
  version: string;
  releaseDate: string;
  mandatory: boolean;
  notes?: string;
}

export interface CategoryRule {
  id: string;
  keyword: string;
  category: string;
}

export interface GitHubSyncConfig {
  owner: string;
  repo: string;
  branch: string;
  token?: string;
}

// ==========================================
// 2. HELPER UTILITIES & LOCAL STORAGE
// ==========================================
export async function computeSha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.trim().toUpperCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getStoredGitHubConfig(): GitHubSyncConfig {
  const saved = localStorage.getItem('rp_github_sync_config');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      // Fall through to default
    }
  }
  return {
    owner: 'moisttowlett247-a11y',
    repo: 'receipt-processor-portal',
    branch: 'main',
    token: ''
  };
}

export function saveStoredGitHubConfig(config: GitHubSyncConfig): void {
  localStorage.setItem('rp_github_sync_config', JSON.stringify(config));
}

export function buildHashFileContent(record: LicenseKeyRecord) {
  return {
    key: record.key,
    status: record.status,
    plan: record.plan,
    inUse: record.inUse,
    issuedDate: record.issuedDate,
    expiresDate: record.expiresDate,
    lastVerifiedAt: new Date().toISOString()
  };
}

export async function syncSingleKeyToGitHub(
  record: LicenseKeyRecord,
  action: 'UPSERT' | 'DELETE',
  config: GitHubSyncConfig
): Promise<{ success: boolean; message: string }> {
  if (!config.token) {
    return { success: false, message: 'GitHub Personal Access Token is missing.' };
  }

  try {
    const hash = await computeSha256Hex(record.key);
    const path = `public/licenses/${hash}.json`;
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;

    // Get existing SHA if file exists
    let sha: string | undefined = undefined;
    const checkRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    if (checkRes.ok) {
      const data = await checkRes.json();
      sha = data.sha;
    }

    if (action === 'DELETE') {
      if (!sha) {
        return { success: true, message: `Hash file ${hash.substring(0, 8)}... not found on GitHub, already clean.` };
      }
      const delRes = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${config.token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Delete license hash file ${hash.substring(0, 8)}...`,
          sha,
          branch: config.branch
        })
      });
      if (delRes.ok) {
        return { success: true, message: `Successfully deleted hash file ${hash.substring(0, 8)}... from GitHub.` };
      }
      const err = await delRes.json();
      return { success: false, message: err.message || 'Failed to delete file on GitHub.' };
    }

    // UPSERT action
    const contentObj = buildHashFileContent(record);
    const contentStr = JSON.stringify(contentObj, null, 2);
    const contentEncoded = btoa(unescape(encodeURIComponent(contentStr)));

    const bodyPayload: any = {
      message: `Update license hash file ${hash.substring(0, 8)}... (${record.status})`,
      content: contentEncoded,
      branch: config.branch
    };
    if (sha) bodyPayload.sha = sha;

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyPayload)
    });

    if (putRes.ok) {
      return { success: true, message: `Synced license hash ${hash.substring(0, 8)}... to GitHub!` };
    }
    const errData = await putRes.json();
    return { success: false, message: errData.message || 'GitHub API error.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error during GitHub Sync.' };
  }
}

// ==========================================
// 3. INITIAL MOCK SAMPLE DATA
// ==========================================
const INITIAL_KEYS: LicenseKeyRecord[] = [
  {
    id: '1',
    key: 'ADMIN-9183-7009-MASTER',
    plan: 'ADMIN',
    status: 'ACTIVE',
    inUse: false,
    issuedDate: '2026-01-01',
    expiresDate: 'Never',
    customerName: 'Owner',
    customerEmail: 'moisttowlett247@gmail.com'
  },
  {
    id: '2',
    key: 'RP-ANNUAL-9821-4401',
    plan: 'ANNUAL',
    status: 'ACTIVE',
    inUse: true,
    issuedDate: '2026-05-10',
    expiresDate: '2027-05-10',
    customerName: 'Acme Hardware Inc',
    customerEmail: 'billing@acmehardware.com',
    notes: 'Invoice #8841 paid'
  },
  {
    id: '3',
    key: 'RP-MONTHLY-1102-7749',
    plan: 'MONTHLY',
    status: 'EXPIRED',
    inUse: false,
    issuedDate: '2026-07-01',
    expiresDate: '2026-08-01',
    customerName: 'Tech Tools LLC',
    customerEmail: 'support@techtools.io'
  }
];

// ==========================================
// 4. CLIENT PORTAL SUBVIEW COMPONENT
// ==========================================
interface ClientPortalViewProps {
  onDownloadScript?: () => void;
  licenseKeys: LicenseKeyRecord[];
  currentVersion: string;
  onGoToAdmin?: () => void;
}

const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  onDownloadScript,
  licenseKeys,
  currentVersion,
  onGoToAdmin
}) => {
  const [clientKeyInput, setClientKeyInput] = useState('');
  const [checkResult, setCheckResult] = useState<{
    status: 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'NOT_FOUND' | null;
    plan?: string;
    expires?: string;
    issued?: string;
    message?: string;
  } | null>(null);

  const [copiedPip, setCopiedPip] = useState(false);

  const handleVerifyKey = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = clientKeyInput.trim().toUpperCase();
    if (!clean) return;

    const found = licenseKeys.find(k => k.key.toUpperCase() === clean);
    if (!found) {
      setCheckResult({
        status: 'NOT_FOUND',
        message: 'This license key was not recognized by the central license server. Please verify all characters or contact support.'
      });
      return;
    }

    if (found.status === 'NOT ACTIVE') {
      setCheckResult({
        status: 'REVOKED',
        plan: found.plan,
        expires: found.expiresDate,
        issued: found.issuedDate,
        message: 'This license key has been revoked by the system administrator.'
      });
      return;
    }

    if (found.status === 'EXPIRED') {
      setCheckResult({
        status: 'EXPIRED',
        plan: found.plan,
        expires: found.expiresDate,
        issued: found.issuedDate,
        message: 'This license key has expired. Please renew your subscription to reactivate.'
      });
      return;
    }

    setCheckResult({
      status: 'ACTIVE',
      plan: found.plan,
      expires: found.expiresDate,
      issued: found.issuedDate,
      message: 'License is in good standing and ready for use with the desktop application.'
    });
  };

  const copyPipCommand = () => {
    navigator.clipboard.writeText('pip install pillow pytesseract openpyxl');
    setCopiedPip(true);
    setTimeout(() => setCopiedPip(false), 2000);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-amber-500/20 selection:text-amber-300">
      <header className="border-b border-stone-800/80 bg-stone-900/40 backdrop-blur sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Receipt className="w-4 h-4 text-stone-950" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              Receipt Processor
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                v{currentVersion}
              </span>
            </h1>
            <p className="text-xs text-stone-400">Desktop OCR & Tax Category Sorter</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onGoToAdmin && (
            <button
              onClick={onGoToAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 hover:border-stone-700 rounded-lg transition-colors cursor-pointer"
              title="Admin Console & Licensing Manager"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin Portal</span>
            </button>
          )}

          <button
            onClick={onDownloadScript}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Desktop App</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col gap-8 justify-center">
        <div className="text-center space-y-2 mt-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900 border border-stone-800 text-xs text-stone-400 mb-2">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Cryptographically Verified SHA-256 Licensing</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Client Verification & Setup Portal
          </h2>
          <p className="text-sm text-stone-400 max-w-lg mx-auto">
            Check the live authorization status of your desktop software license key or download the receipt processing application.
          </p>
        </div>

        <div className="bg-stone-900/60 border border-stone-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-2xl">
          <form onSubmit={handleVerifyKey} className="space-y-4">
            <label className="block text-xs font-semibold text-stone-300 tracking-wide uppercase">
              Enter Your License Key
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={clientKeyInput}
                  onChange={(e) => setClientKeyInput(e.target.value.toUpperCase())}
                  placeholder="RP-ANNUAL-XXXX-XXXX"
                  className="w-full bg-stone-950 border border-stone-700/80 rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-stone-100 hover:bg-white text-stone-950 text-sm font-bold rounded-xl transition-colors cursor-pointer shrink-0 shadow-sm"
              >
                Verify Status
              </button>
            </div>
          </form>

          {checkResult && (
            <div className="mt-6 pt-6 border-t border-stone-800/80">
              {checkResult.status === 'ACTIVE' && (
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-emerald-300">License Valid & Active</h4>
                    <p className="text-xs text-stone-300">{checkResult.message}</p>
                    <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono text-stone-400">
                      <span>Plan: <strong className="text-emerald-300">{checkResult.plan}</strong></span>
                      <span>Expires: <strong className="text-stone-200">{checkResult.expires}</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {checkResult.status === 'REVOKED' && (
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-rose-300">License Revoked</h4>
                    <p className="text-xs text-stone-300">{checkResult.message}</p>
                  </div>
                </div>
              )}

              {checkResult.status === 'EXPIRED' && (
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-amber-300">License Expired</h4>
                    <p className="text-xs text-stone-300">{checkResult.message}</p>
                  </div>
                </div>
              )}

              {checkResult.status === 'NOT_FOUND' && (
                <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-700/60 flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-stone-200">Key Not Found</h4>
                    <p className="text-xs text-stone-400">{checkResult.message}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-stone-900/40 border border-stone-800/80 space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              1. Prerequisites
            </h3>
            <p className="text-xs text-stone-400">
              Run this once in your terminal to install the necessary image processing libraries:
            </p>
            <div className="flex items-center justify-between bg-stone-950 px-3 py-2 rounded-lg border border-stone-800 font-mono text-xs text-amber-200/90">
              <code>pip install pillow pytesseract openpyxl</code>
              <button
                onClick={copyPipCommand}
                className="text-stone-400 hover:text-stone-200 cursor-pointer pl-2"
                title="Copy command"
              >
                {copiedPip ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-stone-900/40 border border-stone-800/80 space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-amber-400" />
              2. Launch Application
            </h3>
            <p className="text-xs text-stone-400">
              Download <code className="text-amber-300">receipt_processor.py</code> and execute it with Python. Paste your active license key when prompted.
            </p>
            <button
              onClick={onDownloadScript}
              className="mt-1 w-full py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              Download receipt_processor.py
            </button>
          </div>
        </div>
      </main>

      <footer className="border-t border-stone-800/80 bg-stone-950 py-4 px-6 text-center text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Receipt Processor Desktop • Automated Receipt OCR & Tax Prep Application</span>
        <div className="flex items-center gap-4">
          {onGoToAdmin && (
            <button
              onClick={onGoToAdmin}
              className="text-stone-500 hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer text-xs"
            >
              <Lock className="w-3 h-3 text-amber-400" />
              Admin Management
            </button>
          )}
          <span>License Support: <strong className="text-stone-400">moisttowlett247@gmail.com</strong></span>
        </div>
      </footer>
    </div>
  );
};

// ==========================================
// 5. LICENSE MANAGER TABLE SUBCOMPONENT
// ==========================================
interface LicenseManagerTableProps {
  keys: LicenseKeyRecord[];
  onToggleStatus: (id: string) => void;
  onToggleInUse: (id: string) => void;
  onDeleteKey: (id: string) => void;
  onAddManualKey: (record: Omit<LicenseKeyRecord, 'id'>) => void;
  onImportKeys?: (keys: LicenseKeyRecord[]) => void;
  isGhModalOpen?: boolean;
  onCloseGhModal?: () => void;
}

const LicenseManagerTable: React.FC<LicenseManagerTableProps> = ({
  keys,
  onToggleStatus,
  onToggleInUse,
  onDeleteKey,
  onAddManualKey,
  onImportKeys,
  isGhModalOpen = false,
  onCloseGhModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'NOT ACTIVE' | 'IN_USE' | 'AVAILABLE'>('ALL');
  const [filterPlan, setFilterPlan] = useState<string>('ALL');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newPlan, setNewPlan] = useState<'MONTHLY' | 'ANNUAL' | 'LIFETIME' | 'ADMIN'>('ANNUAL');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerNotes, setNewCustomerNotes] = useState('');
  const [newExpiresDate, setNewExpiresDate] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatusMsg, setImportStatusMsg] = useState<string | null>(null);

  const [ghConfig, setGhConfig] = useState<GitHubSyncConfig>(getStoredGitHubConfig);
  const [internalGhModalOpen, setInternalGhModalOpen] = useState(false);
  const showGhConfigModal = isGhModalOpen || internalGhModalOpen;

  const closeGhModal = () => {
    setInternalGhModalOpen(false);
    if (onCloseGhModal) onCloseGhModal();
  };

  const [syncingKeyId, setSyncingKeyId] = useState<string | null>(null);

  const handleSaveGhConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredGitHubConfig(ghConfig);
    closeGhModal();
    setImportStatusMsg('GitHub Sync Configuration saved.');
    setTimeout(() => setImportStatusMsg(null), 3000);
  };

  const handleDownloadSingleHashJson = async (k: LicenseKeyRecord) => {
    try {
      const hash = await computeSha256Hex(k.key);
      const content = buildHashFileContent(k);
      const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${hash}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error generating hash file: ' + String(err));
    }
  };

  const handleDirectSyncToGitHub = async (k: LicenseKeyRecord) => {
    if (!ghConfig.token) {
      setInternalGhModalOpen(true);
      return;
    }
    setSyncingKeyId(k.id);
    const result = await syncSingleKeyToGitHub(k, 'UPSERT', ghConfig);
    setSyncingKeyId(null);
    setImportStatusMsg(result.message);
    setTimeout(() => setImportStatusMsg(null), 4000);
  };

  const handleCopyKey = (keyString: string, id: string) => {
    navigator.clipboard.writeText(keyString);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleGenerateRandomKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const gen = `RP-${newPlan}-${segment()}-${segment()}`;
    setNewKey(gen);

    const now = new Date();
    if (newPlan === 'MONTHLY') {
      now.setDate(now.getDate() + 30);
      setNewExpiresDate(now.toISOString().split('T')[0]);
    } else if (newPlan === 'ANNUAL') {
      now.setDate(now.getDate() + 365);
      setNewExpiresDate(now.toISOString().split('T')[0]);
    } else {
      setNewExpiresDate('Never');
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;

    onAddManualKey({
      key: newKey.trim().toUpperCase(),
      plan: newPlan,
      status: 'ACTIVE',
      inUse: false,
      issuedDate: new Date().toISOString().split('T')[0],
      expiresDate: newExpiresDate || 'Never',
      customerName: newCustomerName.trim() || undefined,
      customerEmail: newCustomerEmail.trim() || undefined,
      notes: newCustomerNotes.trim() || undefined
    });

    setNewKey('');
    setNewCustomerName('');
    setNewCustomerEmail('');
    setNewCustomerNotes('');
    setNewExpiresDate('');
    setShowAddModal(false);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Key', 'Plan', 'Status', 'In Use', 'Issued Date', 'Expires Date', 'Customer Name', 'Customer Email', 'Notes'];
    const rows = filteredKeys.map(k => [
      k.id,
      k.key,
      k.plan,
      k.status,
      k.inUse ? 'Yes' : 'No',
      k.issuedDate,
      k.expiresDate,
      k.customerName || '',
      k.customerEmail || '',
      `"${(k.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `receipt_processor_licenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportKeys) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          setImportStatusMsg('CSV file is empty or missing headers.');
          return;
        }

        const newRecords: LicenseKeyRecord[] = [];
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
          if (parts.length >= 2) {
            const keyStr = parts[1] || parts[0];
            if (!keyStr || keyStr.length < 5) continue;

            newRecords.push({
              id: `RP-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
              key: keyStr.toUpperCase(),
              plan: (parts[2] as any) || 'ANNUAL',
              status: parts[3] === 'NOT ACTIVE' ? 'NOT ACTIVE' : parts[3] === 'EXPIRED' ? 'EXPIRED' : 'ACTIVE',
              inUse: parts[4]?.toLowerCase() === 'yes' || parts[4]?.toLowerCase() === 'true',
              issuedDate: parts[5] || new Date().toISOString().split('T')[0],
              expiresDate: parts[6] || 'Never',
              customerName: parts[7] || undefined,
              customerEmail: parts[8] || undefined,
              notes: parts[9] || undefined
            });
          }
        }

        if (newRecords.length > 0) {
          onImportKeys(newRecords);
          setImportStatusMsg(`Successfully imported ${newRecords.length} license keys!`);
        } else {
          setImportStatusMsg('Could not parse any valid license records.');
        }
      } catch (err) {
        setImportStatusMsg('Error parsing CSV file.');
      }
      setTimeout(() => setImportStatusMsg(null), 4000);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredKeys = keys.filter(k => {
    const matchesSearch = 
      k.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (k.customerName && k.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (k.customerEmail && k.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (k.notes && k.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = 
      filterStatus === 'ALL' ? true :
      filterStatus === 'IN_USE' ? k.inUse :
      filterStatus === 'AVAILABLE' ? !k.inUse :
      k.status === filterStatus;

    const matchesPlan = filterPlan === 'ALL' ? true : k.plan === filterPlan;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-stone-800 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-stone-950/40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
              License Registry
              <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 font-mono">
                {filteredKeys.length} of {keys.length}
              </span>
            </h2>
            <p className="text-xs text-stone-400">Manage, revoke, assign, and hash client activation licenses</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => {
              handleGenerateRandomKey();
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-stone-950 rounded-md shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create Key</span>
          </button>

          <button
            onClick={handleExportCSV}
            title="Export filtered records as CSV spreadsheet"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-stone-950 hover:bg-stone-800 text-stone-300 border border-stone-800 rounded-md transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {onImportKeys && (
            <>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleCsvFileUpload} 
                accept=".csv" 
                className="hidden" 
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Bulk import license records from CSV"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-stone-950 hover:bg-stone-800 text-stone-300 border border-stone-800 rounded-md transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-stone-400" />
                <span className="hidden sm:inline">Import</span>
              </button>
            </>
          )}

          <button
            onClick={() => setInternalGhModalOpen(true)}
            title="Configure GitHub Repository & Personal Access Token for direct hash sync"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sky-950/90 hover:bg-sky-900 text-sky-300 border border-sky-600/80 rounded-md shadow-sm transition-all cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>GH Sync</span>
          </button>
        </div>
      </div>

      {importStatusMsg && (
        <div className="bg-sky-950/40 border-b border-sky-800/40 px-4 py-2 text-xs text-sky-300 flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span>{importStatusMsg}</span>
        </div>
      )}

      <div className="p-3 bg-stone-950/20 border-b border-stone-800/60 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
          <input
            type="text"
            placeholder="Search by key, customer, or note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-stone-950 border border-stone-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-800 rounded-md px-2 py-1">
            <Filter className="w-3 h-3 text-stone-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-transparent text-xs text-stone-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="EXPIRED">Expired Only</option>
              <option value="NOT ACTIVE">Revoked Only</option>
              <option value="IN_USE">In Use Only</option>
              <option value="AVAILABLE">Available Only</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-800 rounded-md px-2 py-1">
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="bg-transparent text-xs text-stone-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Plans</option>
              <option value="MONTHLY">Monthly</option>
              <option value="ANNUAL">Annual</option>
              <option value="LIFETIME">Lifetime</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-stone-300">
          <thead className="bg-stone-950/60 text-stone-400 font-medium uppercase tracking-wider border-b border-stone-800 text-[10px]">
            <tr>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">License Key</th>
              <th className="py-2.5 px-3">Plan</th>
              <th className="py-2.5 px-3">Customer / Assignment</th>
              <th className="py-2.5 px-3">Issued</th>
              <th className="py-2.5 px-3">Expires</th>
              <th className="py-2.5 px-3 text-center">In Use</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/60 font-mono">
            {filteredKeys.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-stone-500 font-sans">
                  No license keys matched your filters.
                </td>
              </tr>
            ) : (
              filteredKeys.map((k) => {
                const isCopied = copiedKeyId === k.id;
                return (
                  <tr key={k.id} className="hover:bg-stone-800/40 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <button
                        onClick={() => onToggleStatus(k.id)}
                        title="Click to toggle Active / Revoked"
                        className="cursor-pointer inline-flex items-center gap-1.5 focus:outline-none"
                      >
                        {k.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            ACTIVE
                          </span>
                        ) : k.status === 'EXPIRED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-medium bg-amber-950/60 text-amber-400 border border-amber-800/60">
                            EXPIRED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-medium bg-rose-950/60 text-rose-400 border border-rose-800/60">
                            REVOKED
                          </span>
                        )}
                      </button>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap font-bold text-stone-100">
                      <div className="flex items-center gap-2">
                        <span>{k.key}</span>
                        <button
                          onClick={() => handleCopyKey(k.key, k.id)}
                          title="Copy license key to clipboard"
                          className="text-stone-500 hover:text-amber-400 transition-colors cursor-pointer"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap font-sans">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        k.plan === 'ADMIN' ? 'bg-purple-950/60 text-purple-300 border border-purple-800/50' :
                        k.plan === 'LIFETIME' ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50' :
                        k.plan === 'ANNUAL' ? 'bg-sky-950/60 text-sky-300 border border-sky-800/50' :
                        'bg-stone-800 text-stone-300'
                      }`}>
                        {k.plan}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap font-sans">
                      {k.customerName ? (
                        <div>
                          <div className="font-medium text-stone-200">{k.customerName}</div>
                          {k.customerEmail && <div className="text-[10px] text-stone-500">{k.customerEmail}</div>}
                        </div>
                      ) : (
                        <span className="text-stone-600 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap text-stone-400 font-mono text-[11px]">
                      {k.issuedDate}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap text-stone-400 font-mono text-[11px]">
                      {k.expiresDate}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap text-center">
                      <button
                        onClick={() => onToggleInUse(k.id)}
                        title="Toggle in-use reservation status"
                        className={`px-2 py-0.5 text-[10px] rounded border transition-colors cursor-pointer ${
                          k.inUse 
                            ? 'bg-amber-950/40 text-amber-400 border-amber-800/60 hover:bg-amber-900/50' 
                            : 'bg-stone-950 text-stone-500 border-stone-800 hover:text-stone-300'
                        }`}
                      >
                        {k.inUse ? 'In Use' : 'Ready'}
                      </button>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          title="Download individual SHA-256 hash JSON file"
                          onClick={() => handleDownloadSingleHashJson(k)}
                          className="p-1 text-stone-400 hover:text-amber-400 bg-stone-950 hover:bg-stone-800 rounded border border-stone-800 transition-colors cursor-pointer text-[10px] font-mono flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span className="hidden xl:inline">Hash JSON</span>
                        </button>

                        <button
                          title={ghConfig.token ? "Sync status directly to GitHub repository" : "Click to configure GitHub Token and sync"}
                          disabled={syncingKeyId === k.id}
                          onClick={() => handleDirectSyncToGitHub(k)}
                          className="p-1 text-sky-400 hover:text-sky-200 bg-sky-950/40 hover:bg-sky-900/60 rounded border border-sky-800/60 hover:border-sky-500 transition-colors cursor-pointer text-[10px] font-mono flex items-center gap-1"
                        >
                          <Globe className={`w-3 h-3 ${syncingKeyId === k.id ? 'animate-spin' : ''}`} />
                          <span>Sync GH</span>
                        </button>

                        <button
                          title="Delete License Key"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete license key ${k.key}?`)) {
                              onDeleteKey(k.id);
                            }
                          }}
                          className="p-1 text-stone-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2 text-stone-100 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Create & Register New License</span>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-stone-500 hover:text-stone-300 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-stone-400 mb-1">License Plan Tier</label>
                <select
                  value={newPlan}
                  onChange={(e) => {
                    setNewPlan(e.target.value as any);
                    setTimeout(handleGenerateRandomKey, 50);
                  }}
                  className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-stone-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="MONTHLY">Monthly (30 Days)</option>
                  <option value="ANNUAL">Annual (365 Days)</option>
                  <option value="LIFETIME">Lifetime (Never Expires)</option>
                  <option value="ADMIN">Admin / Developer</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-stone-400">License Key Code</label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomKey}
                    className="text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                  >
                    Regenerate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                  className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-stone-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 mb-1">Customer Name</label>
                  <input
                    type="text"
                    placeholder="Jane Doe"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Customer Email</label>
                  <input
                    type="email"
                    placeholder="jane@example.com"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-400 mb-1">Expiration Date</label>
                <input
                  type="text"
                  value={newExpiresDate}
                  onChange={(e) => setNewExpiresDate(e.target.value)}
                  placeholder="YYYY-MM-DD or Never"
                  className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-stone-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Paid via Stripe invoice #1024"
                  value={newCustomerNotes}
                  onChange={(e) => setNewCustomerNotes(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-stone-200 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-stone-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded cursor-pointer"
                >
                  Save & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGhConfigModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-stone-100">GitHub Direct Sync Settings</h3>
              </div>
              <button
                onClick={closeGhModal}
                className="text-stone-400 hover:text-stone-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGhConfig} className="space-y-3.5 text-xs">
              <p className="text-stone-400">
                Directly push or delete SHA-256 hash files inside your repository's <code className="text-amber-300">public/licenses/</code> folder.
              </p>

              <div>
                <label className="block text-stone-300 font-medium mb-1">GitHub Owner / Organization</label>
                <input
                  type="text"
                  required
                  value={ghConfig.owner}
                  onChange={(e) => setGhConfig({ ...ghConfig, owner: e.target.value })}
                  placeholder="moisttowlett247-a11y"
                  className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-stone-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-medium mb-1">Repository Name</label>
                <input
                  type="text"
                  required
                  value={ghConfig.repo}
                  onChange={(e) => setGhConfig({ ...ghConfig, repo: e.target.value })}
                  placeholder="receipt-processor-portal"
                  className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-stone-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-medium mb-1">Target Branch</label>
                <input
                  type="text"
                  required
                  value={ghConfig.branch}
                  onChange={(e) => setGhConfig({ ...ghConfig, branch: e.target.value })}
                  placeholder="main"
                  className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-stone-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-medium mb-1">Personal Access Token (with repo scope)</label>
                <input
                  type="password"
                  value={ghConfig.token || ''}
                  onChange={(e) => setGhConfig({ ...ghConfig, token: e.target.value })}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-stone-100 font-mono focus:outline-none focus:border-sky-500"
                />
                <p className="text-[10px] text-stone-500 mt-1">
                  Stored securely only in your local browser storage.
                </p>
              </div>

              <div className="pt-3 border-t border-stone-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeGhModal}
                  className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 6. MAIN APPLICATION ROOT COMPONENT
// ==========================================
export function App() {
  const [viewMode, setViewMode] = useState<'client' | 'admin'>('client');
  const [activeTab, setActiveTab] = useState<'licensing' | 'updates' | 'rules' | 'pin'>('licensing');
  
  const [licenseKeys, setLicenseKeys] = useState<LicenseKeyRecord[]>(() => {
    const saved = localStorage.getItem('rp_license_keys');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return INITIAL_KEYS; }
    }
    return INITIAL_KEYS;
  });

  const [currentVersion, setCurrentVersion] = useState('1.2.0');
  const [releases, setReleases] = useState<SoftwareRelease[]>([
    { version: '1.2.0', releaseDate: '2026-09-01', mandatory: false, notes: 'Added tax category sorter and direct OCR parsing enhancements.' },
    { version: '1.1.0', releaseDate: '2026-08-15', mandatory: false, notes: 'Initial release with thermal receipt parser support.' }
  ]);
  const [newRelVersion, setNewRelVersion] = useState('');
  const [newRelNotes, setNewRelNotes] = useState('');
  const [newRelMandatory, setNewRelMandatory] = useState(false);

  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([
    { id: '1', keyword: 'HOME DEPOT', category: 'Building Supplies & Maintenance' },
    { id: '2', keyword: 'SHELL', category: 'Vehicle Fuel & Mileage' },
    { id: '3', keyword: 'USPS', category: 'Postage & Shipping' }
  ]);
  const [newRuleKeyword, setNewRuleKeyword] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState('');

  const [adminPin, setAdminPin] = useState(() => localStorage.getItem('rp_admin_pin') || '1234');
  const [pinInput, setPinInput] = useState('');
  const [isPinAuthenticated, setIsPinAuthenticated] = useState(false);
  const [pinError, setPinError] = useState(false);

  const [isGhModalOpen, setIsGhModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('rp_license_keys', JSON.stringify(licenseKeys));
  }, [licenseKeys]);

  const handleAuthPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === adminPin) {
      setIsPinAuthenticated(true);
      setPinError(false);
      setPinInput('');
    } else {
      setPinError(true);
    }
  };

  const handleToggleKeyStatus = (id: string) => {
    setLicenseKeys(prev => prev.map(k => {
      if (k.id === id) {
        const nextStatus = k.status === 'ACTIVE' ? 'NOT ACTIVE' : 'ACTIVE';
        return { ...k, status: nextStatus };
      }
      return k;
    }));
  };

  const handleToggleKeyInUse = (id: string) => {
    setLicenseKeys(prev => prev.map(k => k.id === id ? { ...k, inUse: !k.inUse } : k));
  };

  const handleDeleteKey = (id: string) => {
    setLicenseKeys(prev => prev.filter(k => k.id !== id));
  };

  const handleAddManualKey = (record: Omit<LicenseKeyRecord, 'id'>) => {
    const newRecord: LicenseKeyRecord = {
      ...record,
      id: `RP-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    };
    setLicenseKeys(prev => [newRecord, ...prev]);
  };

  const handleImportKeys = (importedKeys: LicenseKeyRecord[]) => {
    setLicenseKeys(prev => [...importedKeys, ...prev]);
  };

  const handleAddSoftwareRelease = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRelVersion.trim()) return;
    const newRel: SoftwareRelease = {
      version: newRelVersion.trim(),
      releaseDate: new Date().toISOString().split('T')[0],
      mandatory: newRelMandatory,
      notes: newRelNotes.trim()
    };
    setReleases(prev => [newRel, ...prev]);
    setCurrentVersion(newRel.version);
    setNewRelVersion('');
    setNewRelNotes('');
    setNewRelMandatory(false);
  };

  const handleAddCategoryRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleKeyword.trim() || !newRuleCategory.trim()) return;
    const rule: CategoryRule = {
      id: `RULE-${Date.now()}`,
      keyword: newRuleKeyword.trim().toUpperCase(),
      category: newRuleCategory.trim()
    };
    setCategoryRules(prev => [...prev, rule]);
    setNewRuleKeyword('');
    setNewRuleCategory('');
  };

  const handleDeleteCategoryRule = (id: string) => {
    setCategoryRules(prev => prev.filter(r => r.id !== id));
  };

  const handleDownloadScript = () => {
    const scriptContent = `# Receipt Processor Python Client Code v${currentVersion}\nprint("Receipt Processor App Initializing...")\n`;
    const blob = new Blob([scriptContent], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'receipt_processor.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (viewMode === 'client') {
    return (
      <ClientPortalView
        licenseKeys={licenseKeys}
        currentVersion={currentVersion}
        onDownloadScript={handleDownloadScript}
        onGoToAdmin={() => setViewMode('admin')}
      />
    );
  }

  if (!isPinAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl max-w-sm w-full space-y-4 text-stone-100 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-400" />
              <h2 className="font-bold text-sm">Admin Portal Authentication</h2>
            </div>
            <button
              onClick={() => setViewMode('client')}
              className="text-xs text-stone-400 hover:text-stone-200 cursor-pointer"
            >
              Exit
            </button>
          </div>

          <form onSubmit={handleAuthPin} className="space-y-3">
            <div>
              <label className="block text-xs text-stone-400 mb-1">Enter Master PIN Code</label>
              <input
                type="password"
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="****"
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-center text-lg font-mono tracking-widest focus:outline-none focus:border-amber-500"
              />
              {pinError && <p className="text-[10px] text-rose-400 mt-1">Invalid Admin PIN</p>}
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
            >
              Unlock Console
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <header className="border-b border-stone-800 bg-stone-900/60 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <h1 className="font-bold text-sm">Receipt Processor Admin Console</h1>
          </div>
          <div className="flex gap-1 bg-stone-950 p-1 rounded-lg border border-stone-800 text-xs">
            <button
              onClick={() => setActiveTab('licensing')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${activeTab === 'licensing' ? 'bg-stone-800 text-amber-400 font-bold' : 'text-stone-400 hover:text-stone-200'}`}
            >
              Licensing
            </button>
            <button
              onClick={() => setActiveTab('updates')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${activeTab === 'updates' ? 'bg-stone-800 text-amber-400 font-bold' : 'text-stone-400 hover:text-stone-200'}`}
            >
              Releases & Updates
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${activeTab === 'rules' ? 'bg-stone-800 text-amber-400 font-bold' : 'text-stone-400 hover:text-stone-200'}`}
            >
              Tax Rules
            </button>
            <button
              onClick={() => setActiveTab('pin')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${activeTab === 'pin' ? 'bg-stone-800 text-amber-400 font-bold' : 'text-stone-400 hover:text-stone-200'}`}
            >
              Security
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('licensing');
              setIsGhModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sky-950/90 hover:bg-sky-900 text-sky-300 border border-sky-600/80 rounded-md shadow-sm transition-all cursor-pointer"
            title="Configure GitHub Repository & Personal Access Token"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>GH Sync</span>
          </button>

          <button
            onClick={() => setViewMode('client')}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-md transition-colors cursor-pointer"
          >
            Switch to Client Portal
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {activeTab === 'licensing' && (
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
        )}

        {activeTab === 'updates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-stone-100 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-amber-400" />
                Publish Software Version Release
              </h3>
              <form onSubmit={handleAddSoftwareRelease} className="space-y-3 text-xs">
                <div>
                  <label className="block text-stone-400 mb-1">Version String</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1.2.1"
                    value={newRelVersion}
                    onChange={(e) => setNewRelVersion(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-stone-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Release Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Describe update changes and fixes..."
                    value={newRelNotes}
                    onChange={(e) => setNewRelNotes(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-stone-100 resize-none"
                  />
                </div>
                <label className="flex items-center gap-2 text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRelMandatory}
                    onChange={(e) => setNewRelMandatory(e.target.checked)}
                    className="rounded border-stone-800 text-amber-500 focus:ring-amber-500"
                  />
                  <span>Mark as Mandatory Update</span>
                </label>
                <button
                  type="submit"
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded text-xs transition-colors cursor-pointer"
                >
                  Publish Update Release
                </button>
              </form>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-stone-100">Release History</h3>
              <div className="space-y-3">
                {releases.map((r, i) => (
                  <div key={i} className="p-3 bg-stone-950 rounded-lg border border-stone-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-400">v{r.version}</span>
                      <span className="text-stone-500 text-[10px]">{r.releaseDate}</span>
                    </div>
                    {r.notes && <p className="text-stone-300">{r.notes}</p>}
                    {r.mandatory && <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">Mandatory</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-stone-100">Add Automated Merchant Sorter Rule</h3>
              <form onSubmit={handleAddCategoryRule} className="space-y-3 text-xs">
                <div>
                  <label className="block text-stone-400 mb-1">Merchant Keyword</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HOME DEPOT"
                    value={newRuleKeyword}
                    onChange={(e) => setNewRuleKeyword(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-stone-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Assigned Tax Expense Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Building Supplies & Maintenance"
                    value={newRuleCategory}
                    onChange={(e) => setNewRuleCategory(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-stone-100"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded text-xs transition-colors cursor-pointer"
                >
                  Add Category Rule
                </button>
              </form>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-stone-100">Active Keyword Rules</h3>
              <div className="space-y-2">
                {categoryRules.map((rule) => (
                  <div key={rule.id} className="p-2.5 bg-stone-950 rounded-lg border border-stone-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono text-amber-400 font-bold mr-2">{rule.keyword}</span>
                      <span className="text-stone-300">→ {rule.category}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteCategoryRule(rule.id)}
                      className="text-stone-500 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pin' && (
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 max-w-md mx-auto space-y-4">
            <h3 className="font-bold text-sm">Security Master PIN Settings</h3>
            <div>
              <label className="block text-xs text-stone-400 mb-1">New Master PIN</label>
              <input
                type="text"
                value={adminPin}
                onChange={(e) => {
                  setAdminPin(e.target.value);
                  localStorage.setItem('rp_admin_pin', e.target.value);
                }}
                className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-xs font-mono text-center tracking-widest text-amber-400"
              />
            </div>
            <p className="text-[11px] text-stone-500">
              This master PIN restricts access to the Admin Portal, software releases, and license keys.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
