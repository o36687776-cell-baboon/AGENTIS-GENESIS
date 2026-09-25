import { Icon } from "@/design-system/icons";

interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav
      aria-label="breadcrumb"
      className="flex items-center gap-1.5 text-sm"
    >
      {items.map((item, idx) => (
        <span key={idx} className="flex items-center gap-1.5">
          {idx > 0 && (
            <Icon
              name="chevron-right"
              size={12}
              className="text-[var(--color-mid-grey)]"
            />
          )}
          <span
            className={
              item.active
                ? "font-medium text-[var(--color-off-white)]"
                : "text-[var(--color-soft-grey)]"
            }
          >
            {item.label}
          </span>
        </span>
      ))}
    </nav>
  );
}
