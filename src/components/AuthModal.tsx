import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Building2,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  Phone,
  ArrowRight,
  RotateCcw,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { 
  loginWithEmail,
  registerWithEmail,
  resetPassword,
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
  const [authMode, setAuthMode] = useState<'SIGN_IN' | 'SIGN_UP'>('SIGN_IN');
  const [showPhoneAuth, setShowPhoneAuth] = useState<boolean>(false);
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);

  // Email/Password states
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Phone states
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
      setAuthMode('SIGN_IN');
      setShowPhoneAuth(false);
      setShowForgotPassword(false);
      setName('');
      setEmail('');
      setPassword('');
      setShowPassword(false);
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

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (authMode === 'SIGN_UP' && !name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    setIsLoading(true);
    try {
      if (authMode === 'SIGN_IN') {
        const { profile } = await loginWithEmail(email, password);
        onSuccess(profile);
        onClose();
      } else {
        const { profile } = await registerWithEmail(name, email, password);
        onSuccess(profile);
        onClose();
      }
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      const code = err?.code;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setErrorMessage('Invalid email or password. Please verify and retry.');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMessage('An account with this email already exists. Please sign in.');
      } else if (code === 'auth/weak-password') {
        setErrorMessage('Password must be at least 6 characters.');
      } else if (code === 'auth/invalid-email') {
        setErrorMessage('Please enter a valid email address.');
      } else {
        setErrorMessage(err?.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your email address to receive reset instructions.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await resetPassword(email);
      setSuccessMessage(`Password reset link sent to ${email.trim()}. Check your inbox.`);
      setShowForgotPassword(false);
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err?.code === 'auth/user-not-found') {
        setErrorMessage('No account found with this email address.');
      } else {
        setErrorMessage(err?.message || 'Failed to send password reset email.');
      }
    } finally {
      setIsLoading(false);
    }
  };

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
      let formattedPhone = phoneNumber.trim();
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = `+91${formattedPhone.replace(/\D/g, '')}`;
      }

      if (formattedPhone.length < 10) {
        setErrorMessage('Please enter a valid 10-digit phone number.');
        setIsLoading(false);
        return;
      }

      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = setupRecaptcha('modal-recaptcha-container');
      }

      const confirmation = await sendPhoneOtp(formattedPhone, recaptchaVerifierRef.current);
      confirmationResultRef.current = confirmation;
      setOtpSent(true);
      setSuccessMessage(`OTP sent to ${formattedPhone}`);
    } catch (err: any) {
      console.error('Send OTP error:', err);
      recaptchaVerifierRef.current = null;
      if (err?.code === 'auth/invalid-phone-number') {
        setErrorMessage('Invalid phone number format. Please check and retry.');
      } else if (err?.code === 'auth/quota-exceeded') {
        setErrorMessage('SMS verification quota exceeded. Please try Google or Email Sign-in.');
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/90 overflow-hidden relative"
        role="dialog"
        aria-modal="true"
      >
        {/* Invisible reCAPTCHA container */}
        <div id="modal-recaptcha-container"></div>

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 leading-tight">CivicPulse</h3>
              <p className="text-xs text-slate-500">Sign in to access your civic account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Notification Banners */}
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

          {!showPhoneAuth ? (
            <div>
              {/* Top Mode Switcher */}
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => { 
                    setAuthMode('SIGN_IN'); 
                    setShowForgotPassword(false);
                    setErrorMessage(null); 
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === 'SIGN_IN' && !showForgotPassword
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { 
                    setAuthMode('SIGN_UP'); 
                    setShowForgotPassword(false);
                    setErrorMessage(null); 
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === 'SIGN_UP'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {showForgotPassword ? (
                /* Forgot Password Form */
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="text-left space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Reset Password
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Enter your email address and we'll send you a link to reset your password.
                    </p>
                  </div>

                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl pl-10 pr-3.5 py-2.5 text-sm transition-all outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>Send Reset Link</span>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(false)}
                      className="text-xs text-slate-600 hover:text-slate-900 font-medium hover:underline cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              ) : (
                /* Standard Email/Password Form */
                <form onSubmit={handleEmailAuth} className="space-y-3.5">
                  {authMode === 'SIGN_UP' && (
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Full Name
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your full name"
                          className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl pl-10 pr-3.5 py-2.5 text-sm transition-all outline-none"
                          required={authMode === 'SIGN_UP'}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl pl-10 pr-3.5 py-2.5 text-sm transition-all outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        Password
                      </label>
                      {authMode === 'SIGN_IN' && (
                        <button
                          type="button"
                          onClick={() => { setShowForgotPassword(true); setErrorMessage(null); }}
                          className="text-[11px] text-blue-600 hover:text-blue-700 font-medium hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl pl-10 pr-10 py-2.5 text-sm transition-all outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>{authMode === 'SIGN_IN' ? 'Sign In to CivicPulse' : 'Create Civic Account'}</span>
                    )}
                  </button>
                </form>
              )}

              {/* OR DIVIDER */}
              <div className="relative my-4">
                <div className="border-t border-slate-200"></div>
                <span className="bg-white px-3 text-xs text-slate-400 font-medium absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  Or continue with
                </span>
              </div>

              {/* SECONDARY AUTH OPTIONS */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full bg-white hover:bg-slate-50 text-slate-700 font-medium py-2.5 border border-slate-200 rounded-xl shadow-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                  <span>Continue with Google</span>
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { 
                      setShowPhoneAuth(true); 
                      setErrorMessage(null); 
                      setSuccessMessage(null); 
                    }}
                    className="text-xs text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1.5 hover:underline cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>Sign in with Phone OTP</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* PHONE OTP VIEW */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">Mobile OTP Verification</span>
                <button
                  type="button"
                  onClick={() => { 
                    setShowPhoneAuth(false); 
                    setOtpSent(false); 
                    setOtpCode(''); 
                    setErrorMessage(null); 
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium hover:underline cursor-pointer"
                >
                  Back to Email Login
                </button>
              </div>

              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-3.5">
                  <div className="text-left space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Mobile Number
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Enter your 10-digit phone number for SMS verification.
                    </p>
                  </div>

                  <div className="flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-slate-900 focus-within:border-transparent transition">
                    <div className="px-3 py-2.5 bg-slate-50 border-r border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-600" />
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="98765 43210"
                      maxLength={10}
                      className="w-full px-3.5 py-2.5 text-sm text-slate-900 focus:outline-hidden"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !phoneNumber.trim()}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Send SMS OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                  <div className="text-left space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        6-Digit Verification Code
                      </label>
                      <button
                        type="button"
                        onClick={() => { setOtpSent(false); setOtpCode(''); }}
                        className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Change Number</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Enter the SMS code sent to your phone.
                    </p>
                  </div>

                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="• • • • • •"
                    className="w-full px-4 py-2.5 text-center text-lg font-mono tracking-widest text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                    maxLength={6}
                    autoFocus
                    required
                  />

                  <button
                    type="submit"
                    disabled={isLoading || otpCode.length < 6}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Token...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verify & Sign In</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Footer Note */}
          <div className="pt-3 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 leading-tight">
              By continuing, you agree to the Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
