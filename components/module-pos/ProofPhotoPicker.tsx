"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ProofKind,
  ProofUploadError,
  proofUploadsUseStorage,
  shrinkImage,
  shrinkImageToBlob,
  uploadProofPhoto,
} from "./proofUpload";

export type ProofPhotoStatus = "empty" | "processing" | "uploading" | "ready" | "failed";

/** What the dialog sends with its save: one representation or none. */
export type ProofPayload = { proofReference: string } | { proofImage: string } | Record<string, never>;

export type ProofPhotoState = {
  status: ProofPhotoStatus;
  preview: string | null;
  error: string;
  /** The same photo can be uploaded again without choosing it again. */
  canRetry: boolean;
  /** Submitting is allowed: no photo, or a photo that is ready. */
  settled: boolean;
  hasPhoto: boolean;
  choose: (file: File | undefined) => void;
  retry: () => void;
  remove: () => void;
  /** After a save refused the reference (e.g. expired): ask for the photo again. */
  invalidate: (message: string) => void;
  payload: () => ProofPayload;
};

const EXPIRED = "The attached photo expired before it was saved. Attach it again.";

/**
 * Picks, shrinks, previews locally and uploads a proof photo for one order and purpose. Resets
 * whenever `active` turns on (the dialog opens) or the order changes.
 */
export function useProofPhoto(orderId: string | undefined, kind: ProofKind, active: boolean): ProofPhotoState {
  const [status, setStatus] = useState<ProofPhotoStatus>("empty");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const blobRef = useRef<Blob | null>(null);
  const resultRef = useRef<ProofPayload>({});
  const abortRef = useRef<AbortController | null>(null);
  const expiryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewRef = useRef<string | null>(null);

  // Drops the in-flight upload, timer, preview address and saved result. An unsaved upload is simply
  // abandoned; storage expires unattached temporary Files on its own.
  const release = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (expiryRef.current) clearTimeout(expiryRef.current);
    expiryRef.current = null;
    if (previewRef.current?.startsWith("blob:")) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    blobRef.current = null;
    resultRef.current = {};
  }, []);

  const resetState = () => {
    setPreview(null);
    setStatus("empty");
    setError("");
    setCanRetry(false);
  };

  const clear = useCallback(() => {
    release();
    setPreview(null);
    setStatus("empty");
    setError("");
    setCanRetry(false);
  }, [release]);

  // A fresh picker each time the dialog opens or switches order (state reset during render).
  const session = active ? orderId ?? "" : null;
  const [shownSession, setShownSession] = useState<string | null>(null);
  if (session !== shownSession) {
    setShownSession(session);
    resetState();
  }
  // ...and the matching cleanup of uploads, timers and preview addresses when it closes.
  useEffect(() => (session === null ? undefined : release), [session, release]);

  const upload = useCallback(async (blob: Blob) => {
    if (!orderId) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("uploading");
    setError("");
    setCanRetry(false);
    resultRef.current = {};
    try {
      const uploaded = await uploadProofPhoto(orderId, kind, blob, controller.signal);
      if (controller.signal.aborted) return;
      resultRef.current = { proofReference: uploaded.proofReference };
      setStatus("ready");
      // Leave a minute of slack for the save itself.
      const wait = Math.max(0, uploaded.expiresAt - Date.now() - 60_000);
      if (expiryRef.current) clearTimeout(expiryRef.current);
      expiryRef.current = setTimeout(() => {
        resultRef.current = {};
        setStatus("failed");
        setError(EXPIRED);
        setCanRetry(true);
      }, wait);
    } catch (err) {
      if (controller.signal.aborted) return;
      setStatus("failed");
      setError(err instanceof ProofUploadError || err instanceof Error ? err.message : "The photo didn't upload. Attach it again.");
      // Retrying starts a fresh upload of the same shrunk photo, so nothing has to be chosen again.
      setCanRetry(true);
    }
  }, [orderId, kind]);

  const choose = useCallback((file: File | undefined) => {
    if (!file) return;
    clear();
    if (!file.type.startsWith("image/")) {
      setStatus("failed");
      setError("Choose an image file (JPG, PNG or a screenshot).");
      return;
    }
    setStatus("processing");
    void (async () => {
      try {
        if (!proofUploadsUseStorage) {
          const dataUrl = await shrinkImage(file);
          previewRef.current = dataUrl;
          setPreview(dataUrl);
          resultRef.current = { proofImage: dataUrl };
          setStatus("ready");
          return;
        }
        const blob = await shrinkImageToBlob(file);
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        previewRef.current = url;
        setPreview(url);
        await upload(blob);
      } catch (err) {
        setStatus("failed");
        setError(err instanceof Error ? err.message : "Couldn't process the photo.");
      }
    })();
  }, [clear, upload]);

  const retry = useCallback(() => {
    if (blobRef.current) void upload(blobRef.current);
  }, [upload]);

  const invalidate = useCallback((message: string) => {
    if (expiryRef.current) clearTimeout(expiryRef.current);
    resultRef.current = {};
    setStatus("failed");
    setError(message);
    setCanRetry(!!blobRef.current);
  }, []);

  const hasPhoto = status !== "empty" && !(status === "failed" && !preview);
  return {
    status,
    preview,
    error,
    canRetry,
    settled: status === "empty" || status === "ready" || (status === "failed" && !preview),
    hasPhoto,
    choose,
    retry,
    remove: clear,
    invalidate,
    payload: () => resultRef.current,
  };
}

/** api-pos's message when a save refuses an upload reference. */
export function isProofReferenceRefusal(message: string | undefined) {
  return !!message && /photo upload is invalid or expired|photo uploads are not available/i.test(message);
}

interface ProofPhotoFieldProps {
  proof: ProofPhotoState;
  alt: string;
  hint?: string;
}

export function ProofPhotoField({ proof, alt, hint }: ProofPhotoFieldProps) {
  const busy = proof.status === "processing" || proof.status === "uploading";
  return (
    <div>
      {proof.preview ? (
        <div className="flex items-start gap-3">
          <img src={proof.preview} alt={alt} className="w-24 h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
          <div className="flex flex-col gap-1.5 min-w-0">
            <span
              className={`text-xs font-semibold ${
                proof.status === "ready" ? "text-green-600 dark:text-green-400"
                : proof.status === "failed" ? "text-red-600" : "text-gray-500 dark:text-gray-400"
              }`}
              role="status"
            >
              {proof.status === "uploading" ? "Uploading photo..." : proof.status === "ready" ? "Photo attached" : proof.status === "failed" ? "Not attached" : "Processing photo..."}
            </span>
            <div className="flex flex-wrap gap-3">
              {proof.status === "failed" && proof.canRetry && (
                <button type="button" onClick={proof.retry} className="text-xs font-semibold text-primary hover:underline">
                  Try again
                </button>
              )}
              <button type="button" onClick={proof.remove} disabled={busy && proof.status === "processing"} className="text-xs font-semibold text-red-600 hover:underline">
                Remove photo
              </button>
            </div>
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-1 px-4 py-5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {proof.status === "processing" ? "Processing photo..." : "Add a photo"}
          </span>
          {hint && <span className="text-xs text-gray-500 dark:text-gray-400">{hint}</span>}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={(e) => { proof.choose(e.target.files?.[0]); e.target.value = ""; }}
          />
        </label>
      )}
      {proof.error && <p className="text-xs text-red-500 mt-1 m-0">{proof.error}</p>}
    </div>
  );
}
