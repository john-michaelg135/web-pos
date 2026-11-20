// Proof photos (delivery and refund) go straight from the browser to the shared file-storage
// service. api-pos decides the policy and signs references; only JSON metadata goes through the
// /api/pos proxy, and the image bytes travel only on the signed PUT.

export type ProofKind = "delivery" | "refund";

/** Same budget api-pos enforces (its old 3,000,000-character JPEG data-URL limit). */
export const PROOF_MAX_BYTES = 2_249_982;

// Proof photos are shrunk in the browser so a phone photo (several MB) is stored as ~100–300 KB.
export const PROOF_MAX_SIDE = 1280;
export const PROOF_JPEG_QUALITY = 0.75;

/**
 * Rollback switch: NEXT_PUBLIC_POS_PROOF_UPLOADS=legacy sends the photo inside the order JSON as a
 * data URL again (api-pos still accepts and reads both). Anything else uses file storage.
 */
export const proofUploadsUseStorage = process.env.NEXT_PUBLIC_POS_PROOF_UPLOADS !== "legacy";

export class ProofUploadError extends Error {
  /** The photo has to be attached again (expired, rejected, or failed upload). */
  readonly reattach: boolean;
  constructor(message: string, reattach = true) {
    super(message);
    this.name = "ProofUploadError";
    this.reattach = reattach;
  }
}

async function drawShrunk(file: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That file isn't an image we can read."));
      el.src = url;
    });
    const scale = Math.min(1, PROOF_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Couldn't process the photo.");
    // JPEG has no transparency; paint white so transparent screenshots don't turn black.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Shrinks to a JPEG Blob (the bytes that are uploaded). */
export async function shrinkImageToBlob(file: Blob): Promise<Blob> {
  const canvas = await drawShrunk(file);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", PROOF_JPEG_QUALITY));
  if (!blob) throw new Error("Couldn't process the photo.");
  if (blob.size > PROOF_MAX_BYTES) throw new Error("That photo is too large even after shrinking. Try a smaller one.");
  return blob;
}

/** Legacy form (data URL inside the order JSON), kept for the rollback switch. */
export async function shrinkImage(file: Blob): Promise<string> {
  const canvas = await drawShrunk(file);
  return canvas.toDataURL("image/jpeg", PROOF_JPEG_QUALITY);
}

type Started = { uploadUrl: string; uploadUrlExpiresInSeconds: number; pendingReference: string };
type Ready = { proofReference: string; proofReferenceExpiresInSeconds: number };

export type UploadedProof = {
  proofReference: string;
  /** Epoch ms after which the save will refuse the reference. */
  expiresAt: number;
};

async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/pos/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      credentials: "same-origin",
      signal,
    });
  } catch {
    throw new ProofUploadError("Couldn't reach the POS. Check the connection and try again.", false);
  }
  const text = await response.text();
  let data: { message?: string } | null = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) {
    const message = typeof data?.message === "string" ? data.message : `Photo upload failed (${response.status}).`;
    // 503/504 and 429 are worth retrying with the same photo; the rest need it attached again.
    throw new ProofUploadError(message, !(response.status >= 500 || response.status === 429));
  }
  return data as T;
}

/**
 * Request an upload, PUT the JPEG to the signed address, confirm. Returns the ready reference to
 * send as `proofReference` with the delivery confirmation or refund request.
 */
export async function uploadProofPhoto(orderId: string, kind: ProofKind, photo: Blob, signal?: AbortSignal): Promise<UploadedProof> {
  const base = `order-management/orders/${encodeURIComponent(orderId)}/proof-uploads/${kind}`;
  const started = await postJson<Started>(base, { filename: `${kind}-proof.jpg`, contentType: "image/jpeg", size: photo.size }, signal);

  let put: Response;
  try {
    // Straight to storage: no cookies or POS credentials go with the bytes.
    put = await fetch(started.uploadUrl, {
      method: "PUT",
      headers: { "content-type": "image/jpeg" },
      body: photo,
      credentials: "omit",
      cache: "no-store",
      signal,
    });
  } catch {
    throw new ProofUploadError("The photo didn't upload. Check the connection and attach it again.");
  }
  if (!put.ok) throw new ProofUploadError("The photo didn't upload. Attach it again.");

  const ready = await postJson<Ready>(`${base}/confirm`, { pendingReference: started.pendingReference }, signal);
  return {
    proofReference: ready.proofReference,
    expiresAt: Date.now() + ready.proofReferenceExpiresInSeconds * 1000,
  };
}
