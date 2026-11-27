'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, LogOut, LogIn, Briefcase } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export function Navbar() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="container flex h-16 max-w-5xl mx-auto items-center justify-between px-4 sm:px-6">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm transition-transform group-hover:scale-105">
            <Shield className="h-4.5 w-4.5 text-blue-400 fill-blue-400/20" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-slate-900">
              JobSentry
            </span>
            <span className="text-xs font-bold text-blue-600 tracking-wide uppercase px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200/60">
              AI
            </span>
          </div>
        </Link>

        {/* Status Indicators & Auth Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Applications Tracker Link */}
          <Link
            href="/applications"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[12px] font-semibold text-slate-700 transition-colors shadow-2xs"
          >
            <Briefcase className="h-3.5 w-3.5 text-blue-600" />
            <span className="hidden sm:inline">Applications</span>
            <span>Tracker</span>
          </Link>

          <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-[12px] font-medium text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Careers Radar
          </div>

          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11.5px] font-semibold border border-emerald-200">
            <Shield className="h-3 w-3" />
            100% Private
          </div>

          {/* Authentication State: Strictly hides Login/Register when user is logged in */}
          <div className="flex items-center pl-1 sm:pl-2 border-l border-slate-200">
            {user ? (
              /* LOGGED IN: Show user profile badge & Sign Out button (NO login/register) */
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200/70 shadow-sm">
                  <div className="h-5 w-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="max-w-[120px] truncate">{user.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => logout()}
                  title="Sign Out"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : !loading ? (
              /* LOGGED OUT: Show Sign In and Sign Up buttons */
              <div className="flex items-center gap-1.5">
                <Link
                  href="/login"
                  className="text-xs font-semibold px-3 py-1.5 rounded-full text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center gap-1"
                >
                  <LogIn className="h-3.5 w-3.5 text-slate-400" />
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-sm active:scale-95"
                >
                  Sign Up
                </Link>
              </div>
            ) : (
              /* Loading placeholder to prevent layout shift */
              <div className="h-8 w-20 bg-slate-100 animate-pulse rounded-full" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
