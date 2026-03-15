import { ReactNode } from "react";

type PageScaffoldProps = {
  title: string;
  children: ReactNode;
  subtitle?: string;
};

export const PageScaffold = ({ title, subtitle, children }: PageScaffoldProps) => (
  <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
    <header className="mb-6">
      <h1 className="font-display text-3xl font-bold text-ink md:text-4xl">{title}</h1>
      {subtitle ? <p className="mt-2 text-sm text-stone-700">{subtitle}</p> : null}
    </header>
    <section className="rounded-xl border border-stone-300/80 bg-white/85 p-4 shadow-sm md:p-6">
      {children}
    </section>
  </main>
);
