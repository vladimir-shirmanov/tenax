import { ReactNode } from "react";

type PageScaffoldProps = {
  title: string;
  children: ReactNode;
  subtitle?: string;
};

export const PageScaffold = ({ title, subtitle, children }: PageScaffoldProps) => (
  <main className="page">
    <header className="page__header">
      <h1 className="page__title">{title}</h1>
      {subtitle ? <p className="page__subtitle">{subtitle}</p> : null}
    </header>
    <section className="page__surface">
      {children}
    </section>
  </main>
);
