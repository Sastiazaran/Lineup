"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col justify-center px-6">
      <h1 className="font-display text-4xl">Something broke</h1>
      <p className="mt-3 max-w-md text-mist">Check your environment variables and try again.</p>
      <button type="button" onClick={reset} className="mt-8 self-start bg-lime px-5 py-3 font-display text-ink">
        Retry
      </button>
    </main>
  );
}
