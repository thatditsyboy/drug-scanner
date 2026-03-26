"use client";

interface SearchProgressOverlayProps {
  visible: boolean;
  query: string;
}

export const SearchProgressOverlay = ({ visible, query }: SearchProgressOverlayProps) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/65 px-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-6 text-zinc-100 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.14em] text-zinc-400">Analyzing Prices</p>
        <h3 className="mt-2 text-2xl font-semibold">{query}</h3>
        <p className="mt-3 text-sm text-zinc-300">
          Running tracker-style extraction across PharmEasy results. This can take a few seconds.
        </p>

        <div className="mt-5 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-2 w-full animate-[pulse_1.2s_ease-in-out_infinite] bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400" />
        </div>
      </div>
    </div>
  );
};
