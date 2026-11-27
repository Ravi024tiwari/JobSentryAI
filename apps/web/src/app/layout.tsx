import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/navbar';
import { AuthProvider } from '@/context/auth-context';

export const metadata: Metadata = {
  title: 'Is this job real? Check any job offer or link · JobSentry AI',
  description:
    'Checked against the employer’s own careers site, with scam signs pointed out. Powered by autonomous AI multi-agent fraud heuristics. 100% private.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FAFAF9] text-slate-900 flex flex-col font-sans antialiased selection:bg-slate-900 selection:text-white">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
        </AuthProvider>
        
        {/* Production Footer modeled after Highlisted */}
        <footer className="border-t border-slate-200 bg-white py-12 text-xs text-slate-500">
          <div className="container max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-slate-100">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">JobSentry AI</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-600 text-xs">Autonomous Recruitment Fraud Radar</span>
                </div>
                <p className="text-slate-500 text-xs max-w-md">
                  Verifying jobs against legitimate employer career domains and known advance-fee, Telegram, and task scams in real time.
                </p>
              </div>
              <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600">
                <a href="#how-it-works" className="hover:text-slate-900 transition-colors">What we check</a>
                <a href="#scam-patterns" className="hover:text-slate-900 transition-colors">2026 Scam Types</a>
                <a href="#official-reporting" className="hover:text-slate-900 transition-colors">Official Helplines</a>
                <a href="#faq" className="hover:text-slate-900 transition-colors">Questions</a>
              </div>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11.5px] text-slate-400">
              <p>
                © 2026 JobSentry AI. Jobs are verified against employers' verified career portals and public corporate filings.
              </p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  🔒 Ephemeral Verification · Nothing is Saved
                </span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
