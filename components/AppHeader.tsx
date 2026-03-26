"use client";

import Link from "next/link";

interface AppHeaderProps {
  showBack?: boolean;
  onBack?: () => void;
}

export const AppHeader = ({ showBack, onBack }: AppHeaderProps) => {
  return (
    <header className="relative border-b border-zinc-200 bg-white/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-4">
          {showBack && (
            <button
              onClick={onBack}
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-all duration-150 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-200"
            >
              <span aria-hidden="true">←</span>
              Back
            </button>
          )}
          <div>
            <Link href="/" className="text-xl font-semibold text-zinc-900 dark:text-white">
              DrugScanner
            </Link>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Live medicine prices across India</p>
          </div>
        </div>

        <div />
      </div>
    </header>
  );
};
