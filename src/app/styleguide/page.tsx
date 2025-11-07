// src/app/styleguide/page.tsx
import { redirect } from "next/navigation";

const isProduction = process.env.NODE_ENV === "production";

export default function Styleguide() {
  if (isProduction) {
    redirect("/");
  }

  const tokens = [
    { name: "background", fg: "foreground" },
    { name: "card", fg: "card-foreground" },
    { name: "primary", fg: "primary-foreground" },
    { name: "secondary", fg: "secondary-foreground" },
    { name: "accent", fg: "accent-foreground" },
    { name: "muted", fg: "muted-foreground" },
    { name: "destructive", fg: "destructive-foreground" },
    { name: "border", fg: "foreground" },
    { name: "ring", fg: "foreground" },
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-10 p-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Design Tokens Preview</h1>
        <p className="text-sm text-foreground/70">
          Quick visual check for readability and component states using your
          palette.
        </p>
      </header>

      {/* Swatches */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium">Color Swatches</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {tokens.map((t) => (
            <div
              key={t.name}
              className="rounded-xl border border-border"
              style={{ background: `rgb(var(--${t.name}))` }}
            >
              <div className="p-4">
                <div
                  className="rounded-md p-3 text-sm"
                  style={{
                    background: `rgba(0,0,0,0.12)`,
                    color: `rgb(var(--${t.fg}))`,
                  }}
                >
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs opacity-80">{t.fg}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Text on backgrounds */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium">Text Legibility</h2>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Text on white/card */}
          <div className="rounded-xl border border-border bg-card p-6 text-card-foreground">
            <div className="text-xs uppercase tracking-wider text-foreground/70 mb-2">
              Text on card (white)
            </div>
            <p className="text-base">Body text should be clearly readable.</p>
            <p className="text-sm text-foreground/80">
              Muted/secondary text should still be readable.
            </p>
            <p className="text-sm text-muted-foreground">
              Using muted-foreground (check contrast here).
            </p>
          </div>

          {/* Text on background */}
          <div className="rounded-xl border border-border bg-background p-6 text-foreground">
            <div className="text-xs uppercase tracking-wider text-foreground/70 mb-2">
              Text on background
            </div>
            <p className="text-base">Body text should be clearly readable.</p>
            <p className="text-sm text-foreground/80">
              Slightly muted via opacity.
            </p>
            <p className="text-sm text-muted-foreground">
              Using muted-foreground (check contrast here).
            </p>
          </div>
        </div>
      </section>

      {/* Buttons in cards (the problem area) */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium">Buttons inside Cards</h2>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Primary */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 text-sm text-card-foreground/70">
              Primary button on white card
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
                Primary
              </button>
              <button className="rounded-md border border-input bg-background px-4 py-2 text-foreground hover:bg-muted/10">
                Outline
              </button>
              <button className="rounded-md px-4 py-2 text-primary underline-offset-4 hover:underline">
                Link
              </button>
            </div>
          </div>

          {/* Secondary / Accent */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 text-sm text-card-foreground/70">
              Secondary / Accent on white card
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button className="rounded-md bg-secondary px-4 py-2 text-secondary-foreground hover:bg-secondary/90">
                Secondary
              </button>
              <button className="rounded-md bg-accent px-4 py-2 text-accent-foreground hover:bg-accent/90">
                Accent
              </button>
              <button className="rounded-md bg-destructive px-4 py-2 text-destructive-foreground hover:bg-destructive/90">
                Destructive
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Icon tile example like your dashboard cards */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium">Dashboard Card Example</h2>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-5 text-card-foreground"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                {/* pretend icon */}
                <span className="text-sm font-semibold">UI</span>
              </div>
              <div className="mb-1 text-base font-medium">Module {i}</div>
              <p className="mb-4 text-sm text-foreground/70">
                Short description text should be readable.
              </p>
              <div className="flex gap-3">
                <button className="rounded-md bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90">
                  Open
                </button>
                <button className="rounded-md border border-input bg-background px-3 py-2 text-foreground hover:bg-muted/10">
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
