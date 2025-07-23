'use client';

import Link from 'next/link';

export function FooterSection() {
  return (
    <footer className="py-8 px-4 border-t border-slate-200/30">
      <div className="mx-auto max-w-md md:max-w-2xl">
        <div className="text-center">
          <p className="text-xs text-slate-400">
            Built with ❤️ using{' '}
            <Link 
              href="/" 
              className="hover:text-slate-600 transition-colors underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Landie
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}