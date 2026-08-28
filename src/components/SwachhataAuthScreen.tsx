import React, { useState, useRef } from 'react';
import { 
  Shield, 
  Phone, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw, 
  ArrowRight, 
  Sparkles, 
  Lock, 
  Users, 
  UserCheck, 
  HardHat, 
  Award,
  Radio
} from 'lucide-react';
import { 
  loginWithGoogle, 
  setupRecaptcha, 
  sendPhoneOtp, 
  verifyPhoneOtp 
} from '../services/firebase';
import { UserProfile, UserRole } from '../types';
import { DEMO_PRESETS } from './DemoRoleSwitcher';
import { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';

interface SwachhataAuthScreenProps {
  onSuccess: (profile: UserProfile) => void;
}

export const SwachhataAuthScreen: React.FC<SwachhataAuthScreenProps> = ({ onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'GOOGLE' | 'PHONE' | 'PRESETS'>('PRESETS');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { profile } = await loginWithGoogle();
      setSuccessMessage(`Welcome, ${profile.name}! Logging you in...`);
      setTimeout(() => {
        onSuccess(profile);
      }, 600);
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Sign-in cancelled by user.');
      } else if (err?.code === 'auth/popup-blocked') {
        setErrorMessage('Sign-in popup blocked by browser. Please allow popups.');
      } else {
        setErrorMessage(err?.message || 'Failed to sign in with Google. You can also use Quick Personas or Phone OTP.');
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
      let formattedPhone = phoneNumber.trim();
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = `+91${formattedPhone.replace(/\D/g, '')}`;
      }

      if (formattedPhone.length < 10) {
        setErrorMessage('Please enter a valid 10-digit Indian phone number.');
        setIsLoading(false);
        return;
      }

      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = setupRecaptcha('auth-screen-recaptcha-container');
      }

      const confirmation = await sendPhoneOtp(formattedPhone, recaptchaVerifierRef.current);
      confirmationResultRef.current = confirmation;
      setOtpSent(true);
      setSuccessMessage(`OTP sent successfully to ${formattedPhone}`);
    } catch (err: any) {
      console.error('Send OTP error:', err);
      recaptchaVerifierRef.current = null;
      if (err?.code === 'auth/invalid-phone-number') {
        setErrorMessage('Invalid phone number format. Please check and retry.');
      } else if (err?.code === 'auth/quota-exceeded') {
        setErrorMessage('SMS verification quota exceeded. Please try Google Sign-In or Quick Demo Personas.');
      } else {
        setErrorMessage(err?.message || 'Failed to send OTP. Please try Quick Demo Personas.');
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
      setSuccessMessage(`Phone verified! Welcome, ${profile.name}`);
      setTimeout(() => {
        onSuccess(profile);
      }, 600);
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

  const handleSelectPreset = (preset: typeof DEMO_PRESETS[0]) => {
    const profile: UserProfile = {
      uid: preset.uid,
      name: preset.name,
      phone: preset.phone,
      email: preset.email,
      role: preset.role,
      assignedWard: preset.ward,
      designation: preset.designation
    };
    onSuccess(profile);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Invisible reCAPTCHA container */}
      <div id="auth-screen-recaptcha-container"></div>

      {/* Decorative background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#2d7a70]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="p-4 sm:p-6 border-b border-white/10 backdrop-blur-md bg-slate-900/60 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2d7a70] to-[#1f564f] border border-teal-400/30 flex items-center justify-center text-white shadow-lg font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base sm:text-lg tracking-tight">
                  Swachhata Dispatch Engine
                </span>
                <span className="text-[10px] bg-teal-500/20 text-teal-300 font-bold px-2 py-0.5 rounded-full border border-teal-500/30">
                  MoHUA National
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ministry of Housing and Urban Affairs • Real-Time Civic Redressal
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Ward 4 Central Grid Online</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-xl bg-white text-slate-800 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          
          {/* Card Header Banner */}
          <div className="bg-gradient-to-r from-[#2d7a70] to-[#23635b] text-white p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-teal-200 uppercase tracking-wider">
                  Swachh Bharat Mission (Urban)
                </span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
                  Sign In to Swachhata Portal
                </h1>
                <p className="text-xs text-teal-100 mt-1">
                  Report grievances, coordinate field crews, or supervise ward remediation.
                </p>
              </div>
            </div>

            {/* Auth Mode Tabs */}
            <div className="mt-5 grid grid-cols-3 gap-1 bg-black/20 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setActiveTab('PRESETS'); setErrorMessage(null); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'PRESETS'
                    ? 'bg-white text-[#2d7a70] shadow-sm'
                    : 'text-teal-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Demo Personas</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('GOOGLE'); setErrorMessage(null); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'GOOGLE'
                    ? 'bg-white text-[#2d7a70] shadow-sm'
                    : 'text-teal-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('PHONE'); setErrorMessage(null); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'PHONE'
                    ? 'bg-white text-[#2d7a70] shadow-sm'
                    : 'text-teal-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Mobile OTP</span>
              </button>
            </div>
          </div>

          {/* Form / Tab Body */}
          <div className="p-6 space-y-4">
            
            {/* Status Notifications */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
                <div className="leading-snug">{errorMessage}</div>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                <div className="leading-snug">{successMessage}</div>
              </div>
            )}

            {/* TAB 1: DEMO PERSONAS (1-Click Instant Evaluator Access) */}
            {activeTab === 'PRESETS' && (
              <div className="space-y-3">
                <div className="text-center pb-1">
                  <p className="text-xs font-bold text-slate-700">
                    Instant Evaluator Access — Choose a Role:
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Inspect the app immediately with full role-based permissions and scoped views.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DEMO_PRESETS.map((preset) => {
                    const isCitizen = preset.role === 'CITIZEN';
                    const isCrew = preset.role === 'FIELD_CREW';
                    const isOfficer = preset.role === 'WARD_OFFICER';
                    const isAdmin = preset.role === 'SUPER_ADMIN';

                    return (
                      <button
                        key={preset.uid}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className="p-3 rounded-2xl border border-slate-200 bg-slate-50/80 hover:bg-white hover:border-[#2d7a70] hover:shadow-md transition-all text-left group cursor-pointer flex items-start gap-3"
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs ${
                          isCitizen ? 'bg-teal-600' :
                          isCrew ? 'bg-amber-600' :
                          isOfficer ? 'bg-indigo-600' : 'bg-rose-700'
                        }`}>
                          {isCitizen && <UserCheck className="w-4 h-4" />}
                          {isCrew && <HardHat className="w-4 h-4" />}
                          {isOfficer && <Shield className="w-4 h-4" />}
                          {isAdmin && <Award className="w-4 h-4" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-[#2d7a70] transition truncate">
                              {preset.name}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                              {preset.role.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {preset.designation}
                          </p>
                          <p className="text-[10px] font-medium text-teal-700 truncate mt-0.5">
                            {preset.ward}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: GOOGLE SIGN-IN */}
            {activeTab === 'GOOGLE' && (
              <div className="space-y-4 py-2">
                <div className="text-center space-y-1">
                  <p className="text-sm font-bold text-slate-800">1-Click Google Sign-In</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Authenticates via Google Identity. Automatically links your verified citizen profile.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full h-12 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-300 rounded-2xl shadow-xs flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50"
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
                  <span className="text-sm">Continue with Google Account</span>
                </button>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Secured by Municipal Single Sign-On & Cloud Identity Standards.</span>
                </div>
              </div>
            )}

            {/* TAB 3: MOBILE NUMBER & OTP */}
            {activeTab === 'PHONE' && (
              <div className="space-y-4">
                {!otpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-3">
                    <div className="text-left space-y-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Enter 10-Digit Mobile Number
                      </label>
                      <p className="text-[11px] text-slate-500">
                        An SMS OTP will be dispatched to verify your identity.
                      </p>
                    </div>

                    <div className="flex items-center rounded-2xl border border-slate-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#2d7a70] focus-within:border-transparent transition">
                      <div className="px-3.5 py-3 bg-slate-50 border-r border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#2d7a70]" />
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="98765 43210"
                        maxLength={10}
                        className="w-full px-3.5 py-3 text-sm text-slate-800 focus:outline-hidden"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || !phoneNumber.trim()}
                      className="w-full h-12 bg-[#2d7a70] hover:bg-[#23635b] text-white font-bold text-xs rounded-2xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending SMS OTP...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Verification OTP</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-3">
                    <div className="text-left space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700">
                          6-Digit SMS Verification Code
                        </label>
                        <button
                          type="button"
                          onClick={() => { setOtpSent(false); setOtpCode(''); }}
                          className="text-[11px] font-semibold text-[#2d7a70] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Change Number</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Enter code sent to +91 {phoneNumber}
                      </p>
                    </div>

                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="• • • • • •"
                      maxLength={6}
                      autoFocus
                      className="w-full text-center tracking-[0.4em] text-xl font-mono font-bold px-3 py-3 border border-slate-300 rounded-2xl bg-white focus:ring-2 focus:ring-[#2d7a70] focus:border-transparent focus:outline-hidden"
                      required
                    />

                    <button
                      type="submit"
                      disabled={isLoading || otpCode.length < 6}
                      className="w-full h-12 bg-[#2d7a70] hover:bg-[#23635b] text-white font-bold text-xs rounded-2xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying Code...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Verify & Proceed</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

          </div>

          {/* Footer Note */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Swachh Bharat Mission (Urban 2.0)</span>
            <span className="font-mono">v2.5-Live-Sync</span>
          </div>

        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="p-4 text-center text-xs text-slate-500 border-t border-white/5 bg-slate-900/40 z-10">
        Ministry of Housing and Urban Affairs, Government of India • National Citizen Grievance Portal
      </footer>
    </div>
  );
};
