"use client";

import { createClient } from "@/lib/supabase";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [redirectTo, setRedirectTo] = useState<string | undefined>();

  useEffect(() => {
    setRedirectTo(`${window.location.origin}/onboarding`);
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/onboarding");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.replace("/onboarding");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <p className="text-xs font-medium tracking-[0.35em] text-muted">
            HUSTLE ENGINE
          </p>
          <h1 className="mt-3 text-2xl font-medium tracking-tight text-foreground">
            Sign in
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
            Use your email and password to access your ventures.
          </p>
        </header>

        <div className="rounded-sm border border-border bg-foreground/[0.02] p-6">
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            theme="dark"
            providers={[]}
            magicLink={false}
            redirectTo={redirectTo}
          />
        </div>
      </div>
    </main>
  );
}
