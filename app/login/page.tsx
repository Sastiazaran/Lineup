import { Brand, Routes } from "@/lib/constants";
import { getAppAccess } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const access = await getAppAccess();
  if (access) {
    redirect(Routes.Home);
  }

  const params = await searchParams;

  return (
    <main className="flex min-h-screen flex-col justify-end px-6 py-16 sm:px-12 lg:px-20">
      <p className="brand text-7xl leading-none tracking-wide text-lime sm:text-8xl lg:text-9xl">
        {Brand.Name}
      </p>
      <p className="mt-6 max-w-xl text-xl text-paper sm:text-2xl">{Brand.Tagline}</p>
      <LoginForm sent={params.sent === "1"} error={params.error} />
    </main>
  );
}
