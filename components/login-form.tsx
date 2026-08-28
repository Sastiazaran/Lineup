import { Routes } from "@/lib/constants";

export function LoginForm({ sent, error }: { sent: boolean; error?: string }) {
  return (
    <div className="mt-10 flex w-full max-w-md flex-col gap-8">
      <form action={Routes.AuthLogin} method="post" className="flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm uppercase tracking-[0.18em] text-mist">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="border-0 border-b border-lime bg-transparent px-0 py-3 text-lg text-paper outline-none placeholder:text-mist/70"
          />
        </label>
        {sent ? (
          <p className="text-lime">
            Check your inbox (and Spam) for the sign-in link. In local dev, the link is also printed in the
            terminal running <code className="text-paper">npm run dev</code>.
          </p>
        ) : null}
        {error ? (
          <p className="text-clay">
            {error === "expired" ? "That link expired. Request a new one." : "Could not verify that link."}
          </p>
        ) : null}
        <button
          type="submit"
          className="mt-4 self-start bg-lime px-8 py-3 font-display text-xl tracking-wide text-ink hover:bg-paper"
        >
          Send link
        </button>
      </form>

      <div className="flex flex-col gap-3 border-t border-white/15 pt-8">
        <p className="text-sm text-mist">No email? Browse odds and build a lineup on this device.</p>
        <form action={Routes.AuthGuest} method="post">
          <button
            type="submit"
            className="border border-lime/60 px-8 py-3 font-display text-xl tracking-wide text-lime hover:bg-lime/10"
          >
            Continue without email
          </button>
        </form>
      </div>
    </div>
  );
}
