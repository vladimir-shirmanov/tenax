import { ReactNode } from "react";

type PageScaffoldProps = {
  title: string;
  subtitle?: string;
  breadcrumb?: ReactNode;
  children: ReactNode;
};

export const PageScaffold = ({ title, subtitle, breadcrumb, children }: PageScaffoldProps) => (
  <main className="page">
    {breadcrumb ? <div className="page__breadcrumb">{breadcrumb}</div> : null}
    <header className="page__header">
      <h1 className="page__title">{title}</h1>
      {subtitle ? <p className="page__subtitle">{subtitle}</p> : null}
    </header>
    <section className="page__surface">
      {children}
    </section>
  </main>
);
