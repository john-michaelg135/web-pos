// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/module-pos/DeleteConfirmDialog";

afterEach(cleanup);

it("dismisses a shared dialog through its accessible close button", () => {
  const onOpenChange = vi.fn();
  render(
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Request details</DialogTitle>
        <DialogDescription>Stock request history</DialogDescription>
      </DialogContent>
    </Dialog>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

it("dismisses a custom confirmation without executing its primary action", () => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  render(<DeleteConfirmDialog isOpen onClose={onClose} onConfirm={onConfirm} title="Confirm arrival" message="Record this delivery?" />);
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(onClose).toHaveBeenCalledOnce();
  expect(onConfirm).not.toHaveBeenCalled();
});
