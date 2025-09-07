"use client"

import AppShell from "@/components/app-shell"
import OnboardingGate from "@/components/auth/OnboardingGate"
import OnboardingCards from "@/components/onboarding/OnboardingCards"

export default function OnboardingPage() {
  return (
    <AppShell title="Onboarding">
      {/* OnboardingGate silently ensures Team -> Vendor -> User Profile exist.
         It does NOT redirect; the UI below stays visible. */}
      <OnboardingGate redirectOnDone={false}>
        <div className="p-6 space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Get your catalog into Odyssey B2B</h1>
            <p className="text-sm text-muted-foreground">
              Import a CSV now or wire up your API. You can do both — start with whichever is
              fastest, then refine.
            </p>
          </div>

          <OnboardingCards />
        </div>
      </OnboardingGate>
    </AppShell>
  )
}
