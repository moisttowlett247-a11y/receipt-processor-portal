import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  KeyRound, 
  Download, 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw, 
  Terminal, 
  Monitor, 
  Cpu, 
  Lock, 
  HelpCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Receipt
} from 'lucide-react';
import { LicenseKeyRecord } from '../types';

interface ClientPortalViewProps {
  onDownloadScript?: () => void;
  licenseKeys: LicenseKeyRecord[];
  currentVersion: string;
  onGoToAdmin?: () => void;
}

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
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

  const [activeTab, setActiveTab] = useState<'status' | 'setup' | 'faq'>('status');
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
      {/* Top Header */}
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

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col gap-8 justify-center">
        <div className="text-center space-y-2 mt-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900 border border-stone-800 text-xs text-stone-400 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Cryptographically Verified SHA-256 Licensing</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Client Verification & Setup Portal
          </h2>
          <p className="text-sm text-stone-400 max-w-lg mx-auto">
            Check the live authorization status of your desktop software license key or download the receipt processing application.
          </p>
        </div>

        {/* License Verification Card */}
        <div className="bg-stone-900/60 border border-stone-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-2xl">
          <form onSubmit={handleVerifyKey} className="space-y-4">
            <label className="block text-xs font-semibold text-stone-300 tracking-wide uppercase">
              Enter Your License Key
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                  <KeyRound className="w-4 h-4" />
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

          {/* Verification Results */}
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

        {/* Quick Start Instructions */}
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

      {/* Footer */}
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
