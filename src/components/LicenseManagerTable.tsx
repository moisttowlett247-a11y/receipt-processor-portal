import React, { useState, useRef } from 'react';
import { 
  Key, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Copy, 
  Check, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Calendar,
  Sparkles,
  FileText,
  Upload,
  UserCheck,
  Globe,
  Settings
} from 'lucide-react';
import { LicenseKeyRecord } from '../types';
import { computeSha256Hex } from '../hashUtils';
import { 
  getStoredGitHubConfig, 
  saveStoredGitHubConfig, 
  syncSingleKeyToGitHub, 
  GitHubSyncConfig, 
  buildHashFileContent 
} from '../githubSyncService';

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

export const LicenseManagerTable: React.FC<LicenseManagerTableProps> = ({
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

  // Manual Add Form Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newPlan, setNewPlan] = useState<'MONTHLY' | 'ANNUAL' | 'LIFETIME' | 'ADMIN'>('ANNUAL');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerNotes, setNewCustomerNotes] = useState('');
  const [newExpiresDate, setNewExpiresDate] = useState('');

  // Bulk Import CSV State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatusMsg, setImportStatusMsg] = useState<string | null>(null);

  // GitHub Settings & Sync state
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

  // 1-Click single hash file generator & downloader
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

  // Direct sync to GitHub repository via GitHub REST API
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
      {/* Header & Controls Bar */}
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

        {/* Action Buttons Toolbar */}
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

      {/* Filter and Search Bar */}
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

      {/* Table Element */}
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
                    {/* Status Badge */}
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

                    {/* Key String & Copy */}
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

                    {/* Plan */}
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

                    {/* Customer */}
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

                    {/* Issued */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-stone-400 font-mono text-[11px]">
                      {k.issuedDate}
                    </td>

                    {/* Expires */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-stone-400 font-mono text-[11px]">
                      {k.expiresDate}
                    </td>

                    {/* In Use Toggle */}
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

                    {/* Action buttons */}
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

      {/* Manual Key Creation Modal */}
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

      {/* GitHub Sync Config Modal */}
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
