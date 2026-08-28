"use client";

import { Routes } from "@/lib/constants";
import { clearGuestFavorites } from "@/lib/guest-client";

type SignOutButtonProps = {
  isGuest?: boolean;
};

export function SignOutButton({ isGuest }: SignOutButtonProps) {
  function handleSignOut() {
    if (isGuest) {
      clearGuestFavorites();
    }
  }

  return (
    <form action={Routes.AuthLogout} method="post" onSubmit={handleSignOut}>
      <button type="submit" className="underline decoration-lime underline-offset-4">
        Sign out
      </button>
    </form>
  );
}
