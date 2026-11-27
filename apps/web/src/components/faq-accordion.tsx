'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How do I check if a job offer is real?',
    answer:
      'Check whether the opening exists on the employer’s official careers page (e.g. company.com/careers). Look at the sender’s email address: legitimate recruiters use corporate domains (@company.com), never free Gmail or Yahoo accounts. Real hiring teams never conduct entire interviews exclusively via Telegram or WhatsApp.',
  },
  {
    question: 'Do real companies ask for a registration or training fee?',
    answer:
      'Never. No legitimate company charges candidates an application fee, interview pass fee, background verification charge, or laptop security deposit. Any request for money—no matter how small or "refundable" they claim it is—is an immediate sign of a scam.',
  },
  {
    question: 'What is a task scam?',
    answer:
      'Task scams promise easy remote work (e.g. liking YouTube videos, rating Google Maps listings, or doing small data entry) for daily payouts of Rs. 1,500–5,000. Scammers send small payouts at first to gain your trust, then move you to a Telegram group and demand a "prepaid deposit" or "investment" before releasing larger earnings, after which your money is stolen.',
  },
  {
    question: 'Where do I report a job scam in India?',
    answer:
      'Report immediately to the National Cyber Crime Reporting Portal at cybercrime.gov.in or call toll-free helpline 1930. For fraudulent recruitment messages on WhatsApp or SMS, report the sender’s number on the Chakshu portal at sancharsaathi.gov.in.',
  },
  {
    question: 'Does this tool say a company is fake?',
    answer:
      'No. JobSentry AI evaluates whether a specific job listing, email, or message is authentic. Scammers commonly impersonate genuine, highly respected brands (like Amazon, TCS, Google, Swiggy, or airlines) without the company’s knowledge or authorization.',
  },
  {
    question: 'Is what I paste saved or tracked?',
    answer:
      'No. The check runs once in real time and nothing you type or paste is saved or stored in a persistent database. It works instantly without requiring an account or signing in.',
  },
];

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="space-y-3">
      {FAQ_ITEMS.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={idx}
            className="rounded-[16px] border border-slate-200 bg-white transition-all overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggle(idx)}
              className="w-full py-4 px-5 text-left flex items-center justify-between gap-4 font-semibold text-[15px] text-slate-900 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <span>{item.question}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                  isOpen ? 'transform rotate-180 text-slate-900' : ''
                }`}
              />
            </button>
            {isOpen && (
              <div className="px-5 pb-5 pt-0 text-[14px] leading-relaxed text-slate-600 border-t border-slate-100 animate-in fade-in-50 duration-200">
                <p className="pt-3">{item.answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
