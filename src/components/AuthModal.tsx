import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Phone, 
  Shield, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw, 
  ArrowRight,
  Sparkles,
  Lock
} from 'lucide-react';
import { 
  loginWithGoogle, 
  setupRecaptcha, 
  sendPhoneOtp, 
  verifyPhoneOtp 
} from '../services/firebase';
import { UserProfile } from '../types';
import { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: UserProfile) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'GOOGLE' | 'PHONE'>('GOOGLE');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset modal state on close
      setPhoneNumber('');
      setOtpCode('');
      setOtpSent(false);
      setIsLoading(false);
      setErrorMessage(null);
      setSuccessMessage(null);
      confirmationResultRef.current = null;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { profile } = await loginWithGoogle();
      onSuccess(profile);
      onClose();
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Sign-in cancelled by user.');
      } else if (err?.code === 'auth/popup-blocked') {
        setErrorMessage('Sign-in popup blocked by browser. Please allow popups.');
      } else {
        setErrorMessage(err?.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setErrorMessage('Please enter a valid mobile number.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Format number to international E.164 standard (default India +91)
      let formattedPhone = phoneNumber.trim();
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = `+91${formattedPhone.replace(/\D/g, '')}`;
      }

      if (formattedPhone.length < 10) {
        setErrorMessage('Please enter a valid 10-digit phone number.');
        setIsLoading(false);
        return;
      }

      // Initialize recaptcha verifier
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = setupRecaptcha('recaptcha-container');
      }

      const confirmation = await sendPhoneOtp(formattedPhone, recaptchaVerifierRef.current);
      confirmationResultRef.current = confirmation;
      setOtpSent(true);
      setSuccessMessage(`OTP sent to ${formattedPhone}`);
    } catch (err: any) {
      console.error('Send OTP error:', err);
      // Reset reCAPTCHA if it errored out
      recaptchaVerifierRef.current = null;
      if (err?.code === 'auth/invalid-phone-number') {
        setErrorMessage('Invalid phone number format. Please check and retry.');
      } else if (err?.code === 'auth/quota-exceeded') {
        setErrorMessage('SMS verification quota exceeded. Please try Google Sign-in.');
      } else {
        setErrorMessage(err?.message || 'Failed to send OTP. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResultRef.current) {
      setErrorMessage('Session expired. Please request a new OTP.');
      setOtpSent(false);
      return;
    }

    if (!otpCode.trim() || otpCode.length < 6) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { profile } = await verifyPhoneOtp(confirmationResultRef.current, otpCode.trim());
      onSuccess(profile);
      onClose();
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      if (err?.code === 'auth/invalid-verification-code') {
        setErrorMessage('Invalid OTP code. Please check and re-enter.');
      } else if (err?.code === 'auth/code-expired') {
        setErrorMessage('The verification code has expired. Please request a new one.');
      } else {
        setErrorMessage(err?.message || 'OTP verification failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = () => {
    setOtpCode('');
    setOtpSent(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    confirmationResultRef.current = null;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative"
        role="dialog"
        aria-modal="true"
      >
        {/* Invisible reCAPTCHA container */}
        <div id="recaptcha-container"></div>

        {/* Modal Header */}
        <div className="bg-[#2d7a70] text-white p-5 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-xs">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight">CivicPulse Citizen Account</h3>
                <p className="text-xs text-teal-100">Live Civic Grievance Redressal Matrix</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Tabs */}
          <div className="mt-4 grid grid-cols-2 gap-1.5 bg-black/15 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => { setActiveTab('GOOGLE'); setErrorMessage(null); }}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'GOOGLE' 
                  ? 'bg-white text-[#2d7a70] shadow-xs' 
                  : 'text-teal-100 hover:text-white hover:bg-white/5'
              }`}
            >
              Google Sign-In
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('PHONE'); setErrorMessage(null); }}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'PHONE' 
                  ? 'bg-white text-[#2d7a70] shadow-xs' 
                  : 'text-teal-100 hover:text-white hover:bg-white/5'
              }`}
            >
              Mobile & OTP
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Notification / Error / Success Banners */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
              <div className="leading-snug">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
              <div className="leading-snug">{successMessage}</div>
            </div>
          )}

          {/* TAB 1: GOOGLE SIGN-IN */}
          {activeTab === 'GOOGLE' && (
            <div className="space-y-4 py-2">
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-slate-800">Quick 1-Click Authentication</p>
                <p className="text-xs text-slate-500">
                  Instant sync with your civic grievances, real-time status updates, and resolution ratings.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full h-12 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-300 rounded-xl shadow-xs flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#2d7a70]" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span className="text-sm">Continue with Google</span>
              </button>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Protected by Municipal Single Sign-On & Cloud Identity Standards.</span>
              </div>
            </div>
          )}

          {/* TAB 2: MOBILE NUMBER & OTP */}
          {activeTab === 'PHONE' && (
            <div className="space-y-4">
              {!otpSent ? (
                /* Step A: Phone Input */
                <form onSubmit={handleSendOtp} className="space-y-3">
                  <div className="text-left space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Mobile Number
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Enter your 10-digit Indian phone number to receive an SMS OTP.
                    </p>
                  </div>

                  <div className="flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#2d7a70] focus-within:border-transparent transition">
                    <div className="px-3 py-2.5 bg-slate-50 border-r border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#2d7a70]" />
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="98765 43210"
                      maxLength={10}
                      className="w-full px-3 py-2.5 text-sm text-slate-800 focus:outline-hidden"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !phoneNumber.trim()}
                    className="w-full h-11 bg-[#2d7a70] hover:bg-[#23635b] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending SMS OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Send OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Step B: OTP Input */
                <form onSubmit={handleVerifyOtp} className="space-y-3 animate-fade-in">
                  <div className="text-left space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        6-Digit Verification Code
                      </label>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className="text-[11px] font-semibold text-[#2d7a70] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Change Number</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Enter the 6-digit SMS code sent to your phone.
                    </p>
                  </div>

                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="• • • • • •"
                    maxLength={6}
                    autoFocus
                    className="w-full text-center tracking-[0.4em] text-lg font-mono font-bold px-3 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-[#2d7a70] focus:border-transparent focus:outline-hidden"
                    required
                  />

                  <button
                    type="submit"
                    disabled={isLoading || otpCode.length < 6}
                    className="w-full h-11 bg-[#2d7a70] hover:bg-[#23635b] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying OTP...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verify & Login</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500">
            By continuing, you agree to MoHUA Swachh Bharat Mission terms of civic engagement.
          </p>
        </div>
      </div>
    </div>
  );
}
