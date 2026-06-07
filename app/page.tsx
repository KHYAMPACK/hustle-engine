import { SignOutButton } from "@/app/SignOutButton";
import Link from "next/link";

export default function LandingGate() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <h1 className="text-xs font-medium tracking-[0.4em] text-foreground">
          HUSTLE ENGINE
        </h1>

        <p className="mt-8 max-w-xs text-sm leading-relaxed text-muted">
          Teaching you how to think and build—not just giving commands.
        </p>

        <div className="mt-16 flex w-full flex-col gap-3">
          <Link
            href="/onboarding?new=true"
            className="flex h-12 w-full items-center justify-center rounded-sm bg-foreground text-sm font-medium tracking-wide text-background transition-opacity hover:opacity-90"
          >
            Initiate a New Venture
          </Link>

          <Link
            href="/onboarding"
            className="flex h-12 w-full items-center justify-center rounded-sm border border-border text-sm font-medium tracking-wide text-foreground transition-colors hover:border-foreground/40 hover:bg-foreground/[0.04]"
          >
            Resume Active Venture
          </Link>

          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
