import { Link } from "react-router-dom";

export type BreadcrumbItem = { label: string; href?: string };

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb = ({ items }: BreadcrumbProps) => {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="breadcrumb">
      <ol className="breadcrumb__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="breadcrumb__item">
              {isLast || !item.href ? (
                <span aria-current={isLast ? "page" : undefined} className="breadcrumb__current">
                  {item.label}
                </span>
              ) : (
                <Link to={item.href} className="breadcrumb__link">{item.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
