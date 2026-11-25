"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { orderTablePageSize } from "@/lib/orderTablePageSize";
import { SkeletonTable, type SkeletonColumn } from "./PageSkeleton";

export function OrderTablePlaceholder({ columns }: { columns: SkeletonColumn[] }) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(5);

  useLayoutEffect(() => {
    const table = tableRef.current;
    const row = table?.querySelector("tbody tr");
    const footer = table?.nextElementSibling;
    if (!table || !row || !(footer instanceof HTMLElement)) return;

    const measure = () => {
      if (row.getBoundingClientRect().height > 0) setRows(orderTablePageSize(row, footer));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(table);
    observer.observe(footer);
    const main = table.closest("main");
    if (main) observer.observe(main);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div ref={tableRef}>
      <SkeletonTable
        frameClassName="[&_table]:table-fixed"
        minWidth={800}
        thClassName="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        cellClassName="h-[3.9rem] px-3 py-1"
        rows={rows}
        columns={columns}
      />
    </div>
  );
}
