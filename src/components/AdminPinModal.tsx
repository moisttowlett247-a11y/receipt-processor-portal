import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, KeyRound, X, Check, AlertCircle, ShieldAlert, Key } from 'lucide-react';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentPin: string | null;
  onChangePin?: (newPin: string) => void;
  mode?: 'unlock' | 'change';
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentPin,
  onChangePin,
  mode = 'unlock'
}) => {
  const [pinInput, setPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmNewPinInput, setConfirmNewPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isChanging, setIsChanging] = useState(mode === 'change');
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setNewPinInput('');
      setConfirmNewPinInput('');
      setErrorMsg(null);
      setIsChanging(mode === 'change');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setPinInput('');
  };

  const handleUnlockSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput) {
      triggerError('Please enter the Admin Master PIN');
      return;
    }

    const trimmed = pinInput.trim();
    if (trimmed === currentPin) {
      onSuccess();
      onClose();
    } else {
      triggerError('Incorrect Master PIN. Access Denied.');
    }
  };

  const handleChangePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = pinInput.trim();
    if (trimmed !== currentPin) {
      triggerError('Current PIN is incorrect');
      return;
    }
    if (newPinInput.length < 4) {
      triggerError('New PIN must be at least 4 digits');
      return;
    }
    if (newPinInput !== confirmNewPinInput) {
      triggerError('New PIN and confirmation do not match');
      return;
    }

    if (onChangePin) {
      onChangePin(newPinInput);
      onClose();
    }
  };

  const handleKeypadPress = (val: string) => {
    if (isChanging) return;
    if (pinInput.length < 8) {
      const next = pinInput + val;
      setPinInput(next);
      setErrorMsg(null);
      if (next === currentPin) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 150);
      }
    }
  };

  const handleBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className={`bg-stone-900 border border-stone-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-5 transition-transform ${
          shake ? 'animate-bounce border-rose-500/80' : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100">
                {isChanging ? 'Change Admin Master PIN' : 'Admin PIN Authentication'}
              </h3>
              <p className="text-xs text-stone-400">
                {isChanging ? 'Set a new master passcode' : 'Restricted Management Console'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-lg flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!isChanging ? (
          <form onSubmit={handleUnlockSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-stone-300 block mb-1.5 text-center">
                Enter Master Admin PIN
              </label>
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

            {/* Quick Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-1">
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

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 font-semibold text-white rounded-xl text-xs transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                Unlock Admin Console
              </button>

              <div className="flex items-center justify-end text-[11px] text-stone-500 pt-1">
                {onChangePin && (
                  <button
                    type="button"
                    onClick={() => setIsChanging(true)}
                    className="text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    Change Master PIN
                  </button>
                )}
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleChangePinSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-stone-300 block mb-1">Current PIN</label>
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter current PIN"
                className="w-full text-xs font-mono px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:border-amber-500"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-medium text-stone-300 block mb-1">New PIN (4-8 digits)</label>
              <input
                type="password"
                maxLength={8}
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value)}
                placeholder="Enter new PIN"
                className="w-full text-xs font-mono px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-stone-300 block mb-1">Confirm New PIN</label>
              <input
                type="password"
                maxLength={8}
                value={confirmNewPinInput}
                onChange={(e) => setConfirmNewPinInput(e.target.value)}
                placeholder="Re-enter new PIN"
                className="w-full text-xs font-mono px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="pt-2 flex justify-between items-center gap-2">
              <button
                type="button"
                onClick={() => setIsChanging(false)}
                className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Back to Unlock
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Save New PIN
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
