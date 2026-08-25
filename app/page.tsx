import { eq } from "drizzle-orm";
import { Brand, Routes } from "@/lib/constants";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { favorites } from "@/lib/db/schema";
import { TeamSelector } from "@/components/team-selector";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await requireSession();
  const rows = await getDb()
    .select()
    .from(favorites)
    .where(eq(favorites.userId, session.userId));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10 sm:px-10">
      <header className="flex items-end justify-between gap-4">
        <p className="brand text-5xl tracking-wide text-lime sm:text-6xl">{Brand.Name}</p>
        <div className="flex items-center gap-4 text-sm text-mist">
          <span>{session.email}</span>
          <form action={Routes.AuthLogout} method="post">
            <button type="submit" className="underline decoration-lime underline-offset-4">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <h1 className="mt-10 font-display text-4xl tracking-wide text-paper sm:text-5xl">
        Pick the teams you bet
      </h1>
      <div className="mt-10">
        <TeamSelector
          initialFavorites={rows.map((row) => ({
            sportKey: row.sportKey,
            teamName: row.teamName,
          }))}
        />
      </div>
    </main>
  );
}
