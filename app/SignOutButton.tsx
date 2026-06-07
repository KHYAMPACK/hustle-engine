"use client";

import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export function SignOutButton() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      className="flex h-12 w-full items-center justify-center rounded-sm border border-border text-sm font-medium tracking-wide text-muted transition-colors hover:border-foreground/40 hover:bg-foreground/[0.04] hover:text-foreground"
    >
      Sign Out
    </button>
  );
}
