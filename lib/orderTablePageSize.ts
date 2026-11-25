export function orderTablePageSize(row: Element, footer: HTMLElement) {
  const main = row.closest("main");
  const bottom = Math.min(window.innerHeight, main?.getBoundingClientRect().bottom ?? window.innerHeight);
  const rowTop = row.getBoundingClientRect().top + (main?.scrollTop ?? 0);
  const scroller = row.closest("table")?.parentElement;
  const scrollbar = scroller ? scroller.offsetHeight - scroller.clientHeight : 0;
  const available = bottom - rowTop - footer.offsetHeight - scrollbar - 16;
  return Math.max(1, Math.floor(available / Math.max(1, row.getBoundingClientRect().height)));
}
