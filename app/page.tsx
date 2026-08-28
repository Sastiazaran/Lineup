import { eq } from "drizzle-orm";
import { requireAppAccess } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { favorites } from "@/lib/db/schema";
import { HomeDashboard } from "@/components/home-dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const access = await requireAppAccess();

  const initialFavorites =
    access.mode === "authenticated"
      ? (
          await getDb()
            .select()
            .from(favorites)
            .where(eq(favorites.userId, access.session.userId))
        ).map((row) => ({
          sportKey: row.sportKey,
          teamName: row.teamName,
        }))
      : [];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10 sm:px-10">
      <HomeDashboard
        mode={access.mode}
        email={access.mode === "authenticated" ? access.session.email : undefined}
        initialFavorites={initialFavorites}
      />
    </main>
  );
}
