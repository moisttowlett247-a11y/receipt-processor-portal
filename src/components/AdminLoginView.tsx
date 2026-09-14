import React, { useState, useRef, useEffect } from 'react';
import { Lock, Unlock, ArrowLeft, AlertCircle, ShieldCheck, Check } from 'lucide-react';

interface AdminLoginViewProps {
  onUnlock: () => void;
  currentPin: string | null;
  onSetInitialPin?: (newPin: string) => void;
  onGoToClientPortal: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onUnlock,
  currentPin,
  onSetInitialPin,
  onGoToClientPortal
}) => {
  const isInitialSetup = !currentPin;
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [isInitialSetup]);

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setPinInput('');
    setConfirmPinInput('');
  };

  const handleUnlockSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isInitialSetup) {
      if (pinInput.length < 4) {
        triggerError('PIN must be at least 4 digits');
        return;
      }
      if (pinInput !== confirmPinInput) {
        triggerError('PINs do not match. Please re-enter.');
        return;
      }
      if (onSetInitialPin) {
        onSetInitialPin(pinInput);
      }
      onUnlock();
      return;
    }

    if (!pinInput) {
      triggerError('Please enter your Master Admin PIN');
      return;
    }

    const trimmed = pinInput.trim();
    if (currentPin && trimmed === currentPin) {
      onUnlock();
    } else {
      triggerError('Incorrect Master PIN. Access Denied.');
    }
  };

  const handleKeypadPress = (val: string) => {
    if (isInitialSetup) return; // Keypad is used for standard unlock
    if (pinInput.length < 8) {
      const next = pinInput + val;
      setPinInput(next);
      setErrorMsg(null);
      if (currentPin && next === currentPin) {
        setTimeout(() => {
          onUnlock();
        }, 150);
      }
    }
  };

  const handleBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-between font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Top minimal header */}
      <header className="border-b border-stone-800/80 bg-stone-900/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-stone-100">Private Operator Console</h1>
            <p className="text-[11px] text-stone-500 font-mono">RESTRICTED ADMIN ACCESS ONLY</p>
          </div>
        </div>

        <button
          onClick={onGoToClientPortal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit to Public Portal</span>
        </button>
      </header>

      {/* Center login card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div 
          className={`bg-stone-900/90 border border-stone-800 rounded-2xl max-w-sm w-full p-7 shadow-2xl space-y-6 transition-all ${
            shake ? 'animate-bounce border-rose-500/80 ring-2 ring-rose-500/20' : ''
          }`}
        >
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-inner">
              {isInitialSetup ? <ShieldCheck className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
            <h2 className="text-lg font-extrabold text-stone-100 tracking-tight">
              {isInitialSetup ? 'Initialize Master Admin PIN' : 'Admin Master PIN Required'}
            </h2>
            <p className="text-xs text-stone-400 leading-relaxed">
              {isInitialSetup 
                ? 'Create a secret 4-8 digit master PIN to secure your administrative dashboard.'
                : 'Enter your master authentication PIN to access license management and workstation registry.'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-center gap-2 text-xs text-rose-300 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleUnlockSubmit} className="space-y-4">
            {isInitialSetup ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-stone-300 block mb-1">Set New Master PIN (4-8 digits)</label>
                  <input
                    ref={inputRef}
                    type="password"
                    maxLength={8}
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Enter PIN"
                    className="w-full text-center text-xl tracking-[0.3em] font-mono py-2.5 px-4 bg-stone-950 border border-stone-800 rounded-xl text-amber-400 focus:outline-none focus:border-amber-500 shadow-inner"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-300 block mb-1">Confirm Master PIN</label>
                  <input
                    type="password"
                    maxLength={8}
                    value={confirmPinInput}
                    onChange={(e) => {
                      setConfirmPinInput(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Confirm PIN"
                    className="w-full text-center text-xl tracking-[0.3em] font-mono py-2.5 px-4 bg-stone-950 border border-stone-800 rounded-xl text-amber-400 focus:outline-none focus:border-amber-500 shadow-inner"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 font-semibold text-white rounded-xl text-xs transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  <Check className="w-4 h-4" />
                  Save Master PIN & Unlock
                </button>
              </div>
            ) : (
              <>
                <div>
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="password"
                      maxLength={8}
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value);
                        setErrorMsg(null);
                      }}
                      placeholder="••••"
                      className="w-full text-center text-2xl tracking-[0.5em] font-mono py-2.5 px-4 bg-stone-950 border border-stone-800 rounded-xl text-amber-400 focus:outline-none focus:border-amber-500 shadow-inner"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Numeric Keypad */}
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(num)}
                      className="py-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800/80 text-base font-semibold text-stone-200 active:scale-95 transition-all cursor-pointer"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPinInput('')}
                    className="py-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800/80 text-xs font-semibold text-stone-400 active:scale-95 transition-all cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    key="0"
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="py-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800/80 text-base font-semibold text-stone-200 active:scale-95 transition-all cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="py-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800/80 text-xs font-semibold text-stone-400 active:scale-95 transition-all cursor-pointer"
                  >
                    ⌫
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 font-semibold text-white rounded-xl text-xs transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Unlock className="w-4 h-4" />
                    Unlock Admin Console
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="border-t border-stone-800/80 bg-stone-950 py-4 px-6 text-center text-xs text-stone-600">
        Receipt Processor Desktop • Private Administrative Portal
      </footer>
    </div>
  );
};
