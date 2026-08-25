import { Brand, Routes } from "@/lib/constants";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const done = status === "done";
  const invalid = status === "invalid";

  return (
    <main className="flex min-h-screen flex-col justify-center px-6 py-16 sm:px-12">
      <p className="brand text-6xl text-lime">{Brand.Name}</p>
      <h1 className="mt-8 font-display text-4xl">
        {done ? "You’re off the list." : invalid ? "That unsubscribe link is invalid." : "Manage email."}
      </h1>
      <p className="mt-4 max-w-md text-lg text-mist">
        {done
          ? "We won’t send another digest until you sign in again."
          : "Open the link from your latest email, or sign in to keep your lineup."}
      </p>
      <a href={Routes.Login} className="mt-8 self-start bg-lime px-6 py-3 font-display text-lg text-ink">
        Back to Lineup
      </a>
    </main>
  );
}
