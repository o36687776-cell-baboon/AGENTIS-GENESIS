import { cn } from "@/design-system/utils";
import { NodeIndicator } from "@/design-system/components/NodeIndicator";
import type { StateConfig } from "@/design-system/lib/state-colors";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowKey?: (row: T) => string;
  getRowState?: (row: T) => StateConfig["color"];
  className?: string;
  empty?: string;
}

export function Table<T>({
  data,
  columns,
  rowKey = (row: T) => String((row as any).id ?? ""),
  getRowState,
  className,
  empty = "No data.",
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-[var(--color-soft-grey)]">
        {empty}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full overflow-x-auto",
        className
      )}
    >
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-3 py-2.5 text-left font-mono text-xs uppercase tracking-[0.075em] text-[var(--color-soft-grey)]",
                  col.align === "center" && "text-center",
                  col.align === "right" && "text-right",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b border-[var(--border-subtle)]"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-3 py-2",
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right",
                    col.className
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
