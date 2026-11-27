'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isPasswordLongEnough = password.length >= 6;
  const doPasswordsMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please check again.');
      return;
    }

    setLoading(true);

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-md space-y-6 animate-in fade-in-50 duration-500">
        {/* Brand & Page Header */}
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-slate-900 text-white shadow-sm hover:scale-105 transition-transform mb-2"
          >
            <Shield className="h-6 w-6 text-blue-400 fill-blue-400/20" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black tracking-[-0.02em] text-slate-900">
            Create an account
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xs mx-auto">
            Get personalized job verification alerts and save case investigation reports.
          </p>
        </div>

        {/* Register Card */}
        <div className="rounded-[24px] border border-slate-200/90 bg-white p-7 sm:p-9 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.05),0_1px_3px_0_rgba(0,0,0,0.03)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 leading-relaxed animate-in fade-in-50">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 font-medium animate-in fade-in-50">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Account created successfully! Redirecting...</span>
              </div>
            )}

            {/* Name Field */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-800 block">
                Full name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading || success}
                  required
                  className="h-11 pl-10 rounded-[12px] border-slate-300 bg-white text-[14.5px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition outline-none"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-800 block">
                Email address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || success}
                  required
                  className="h-11 pl-10 rounded-[12px] border-slate-300 bg-white text-[14.5px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition outline-none"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-semibold text-slate-800 block">
                  Password <span className="text-rose-500">*</span>
                </label>
                {password && (
                  <span
                    className={`text-[11px] font-medium ${
                      isPasswordLongEnough ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {isPasswordLongEnough ? '✓ 6+ characters' : 'At least 6 characters'}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password (min. 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || success}
                  required
                  className="h-11 pl-10 pr-10 rounded-[12px] border-slate-300 bg-white text-[14.5px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-semibold text-slate-800 block">
                  Confirm password <span className="text-rose-500">*</span>
                </label>
                {confirmPassword && (
                  <span
                    className={`text-[11px] font-medium ${
                      doPasswordsMatch ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {doPasswordsMatch ? '✓ Passwords match' : 'Passwords do not match'}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading || success}
                  required
                  className="h-11 pl-10 rounded-[12px] border-slate-300 bg-white text-[14.5px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || success}
                className="inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.015em] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none bg-slate-900 text-white hover:bg-slate-800 shadow-[0_2px_10px_rgba(15,23,42,0.18)] h-[48px] px-8 text-[15px] w-full cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Switch to Login */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-semibold text-slate-900 hover:text-blue-600 transition-colors underline underline-offset-4"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        {/* Security badge & back to home */}
        <div className="text-center space-y-3">
          <Link
            href="/"
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            ← Back to Job Scanner
          </Link>
          <p className="text-[11.5px] text-slate-400">
            🔒 By continuing, you agree to JobSentry AI’s terms of service and privacy protection.
          </p>
        </div>
      </div>
    </div>
  );
}
