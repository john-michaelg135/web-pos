"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Eraser, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Before a report prints, the person printing reads its notes and signs. The signature
 * (a PNG data URL) goes onto the printed report's sign-off line; it isn't stored anywhere.
 */
export function PrintSignDialog({
  open,
  onOpenChange,
  title,
  notes,
  signerName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** e.g. "Sales Report" */
  title: string;
  notes: string[];
  signerName: string;
  onConfirm: (signature: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  // Size the canvas to its box at the screen's pixel density so strokes stay crisp.
  const setUpCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    // offsetWidth/Height ignore CSS transforms, so the dialog's zoom-in animation can't skew the size.
    canvas.width = Math.round(canvas.offsetWidth * ratio);
    canvas.height = Math.round(canvas.offsetHeight * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.2 * ratio;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#18181b";
  }, []);

  // A fresh, empty pad every time the dialog opens (after its open animation has laid it out).
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      setUpCanvas();
      setHasInk(false);
    }, 50);
    return () => window.clearTimeout(id);
  }, [open, setUpCanvas]);

  // Pointer position in the canvas's own pixels, so the ink lands under the pointer at any size.
  const point = (e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const start = (e: PointerEvent<HTMLCanvasElement>) => {
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    // Don't let the drag select text on the page behind.
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const { x, y } = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // A tap still leaves a dot.
    ctx.lineTo(x + 0.5, y + 0.5);
    ctx.stroke();
    setHasInk(true);
  };

  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const { x, y } = point(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  const confirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasInk) return;
    onConfirm(canvas.toDataURL("image/png"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Explicit width: this project's --spacing-xl token (32px) hijacks Tailwind's max-w-xl. */}
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[36rem] rounded-2xl print:hidden">
        <DialogHeader>
          <DialogTitle>Sign the {title}</DialogTitle>
          <DialogDescription>
            Read the notes that will print with the report, then sign below. Your signature is added to this printout only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/30 p-4 max-h-56 overflow-y-auto">
            <p className="text-sm font-semibold text-foreground m-0 mb-2">Notes to the report</p>
            <ol className="list-decimal pl-5 space-y-1.5 text-sm text-muted-foreground m-0">
              {notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ol>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground m-0">
                Signature of {signerName || "the person printing"}
              </p>
              <Button type="button" variant="ghost" size="sm" className="gap-1.5 h-8" onClick={clear} disabled={!hasInk}>
                <Eraser className="h-3.5 w-3.5" />
                Clear
              </Button>
            </div>
            <div className="relative rounded-xl border border-dashed border-border bg-card select-none">
              <canvas
                ref={canvasRef}
                className="block h-40 w-full touch-none cursor-crosshair rounded-xl"
                onPointerDown={start}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
                onPointerLeave={end}
                aria-label="Signature pad"
              />
              {!hasInk && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                  Sign here with your mouse, finger or pen
                </span>
              )}
              <div className="pointer-events-none absolute left-6 right-6 bottom-8 border-b border-foreground/30" />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" className="gap-2" onClick={confirm} disabled={!hasInk}>
            <Printer className="h-4 w-4" />
            Confirm &amp; print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
