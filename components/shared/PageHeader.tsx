import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  /** A small pill beside the title, such as a status. */
  badge?: ReactNode;
  subtitle?: ReactNode;
  /** Buttons on the right, such as "New order". */
  actions?: ReactNode;
}

/** The title block at the top of a page, as in the Figma: title and badge over a grey subtitle, actions on the right. */
export function PageHeader({ title, badge, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <h1 className="truncate text-2xl font-semibold leading-[normal] text-[#1f1a2e]">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-sm leading-[normal] text-[#6e6680]">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
