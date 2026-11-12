"use client";

import { useEffect, useRef } from "react";
import { Crown, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { jsonRequest } from "@/lib/brokenrepo-api";
import { trackProductEvent } from "@/components/track-visit";

type RazorpayResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayFailure = { error?: { description?: string } };
type RazorpayInstance = { open(): void; on(event: "payment.failed", handler: (response: RazorpayFailure) => void): void };
type RazorpayOptions = { key: string; amount: number; currency: string; name: string; description: string; order_id: string; handler(result: RazorpayResult): void; modal: { ondismiss(): void } };
declare global { interface Window { Razorpay?: new (options: RazorpayOptions) => RazorpayInstance } }

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout="true"]');
    if (existing) { existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)), { once: true }); existing.addEventListener("error", () => resolve(false), { once: true }); return; }
    const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.async = true; script.dataset.razorpayCheckout = "true";
    script.onload = () => resolve(Boolean(window.Razorpay)); script.onerror = () => resolve(false); document.body.appendChild(script);
  });
}

export function UpgradeModal({ open, onOpenChange, exerciseId }: { open: boolean; onOpenChange: (open: boolean) => void; exerciseId?: string }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    trackProductEvent("machine_coding_paywall_open", exerciseId);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange, exerciseId]);

  async function checkout() {
    setBusy(true); setError("");
    try {
      const order = await jsonRequest<{ keyId: string; orderId: string; amount: number; currency: string; name: string; description: string }>("/machine-coding/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      if (!await loadRazorpay() || !window.Razorpay) throw new Error("Secure checkout couldn’t load. Check your connection and try again.");
      const checkoutWindow = new window.Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency, name: order.name, description: order.description, order_id: order.orderId,
        handler: (payment) => {
          void jsonRequest("/machine-coding/verify-payment", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: payment.razorpay_order_id, paymentId: payment.razorpay_payment_id, signature: payment.razorpay_signature }) })
            .then(() => { onOpenChange(false); window.location.reload(); })
            .catch((verifyError) => { setBusy(false); setError(verifyError instanceof Error ? verifyError.message : "Payment verification failed. Contact support before retrying."); });
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      checkoutWindow.on("payment.failed", (response) => {
        setBusy(false);
        const description = response.error?.description?.trim().slice(0, 240);
        setError(description || "Payment failed. Please try again or contact support if you were charged.");
      });
      checkoutWindow.open();
    } catch (checkoutError) {
      setBusy(false);
      setError(checkoutError instanceof Error ? checkoutError.message : "Couldn’t start checkout. Please try again.");
    }
  }

  if (!open) return null;

  return <div className="mc-modal-layer">
    <button className="mc-modal-overlay" type="button" aria-label="Close upgrade dialog" onClick={() => onOpenChange(false)}/>
    <section className="mc-upgrade-dialog" role="dialog" aria-modal="true" aria-labelledby="mc-upgrade-title" aria-describedby="mc-upgrade-description">
      <button ref={closeButtonRef} className="mc-dialog-close" type="button" aria-label="Close" onClick={() => onOpenChange(false)}><X size={18}/></button>
      <header className="mc-dialog-header">
        <span className="mc-dialog-icon" aria-hidden="true"><Crown size={22}/></span>
        <h2 id="mc-upgrade-title">Unlock the complete practice track</h2>
        <p id="mc-upgrade-description" className="mc-upgrade-description">One payment. Twelve months of premium Machine Coding and advanced debugging practice.</p>
      </header>
      <div className="mc-price"><strong>₹299</strong><span>/ 12 months</span></div>
      <ul className="mc-upgrade-list">
        <li><ShieldCheck size={17}/>Advanced premium debugging challenges</li>
        <li><ShieldCheck size={17}/>Access to any upcoming premium machine coding problems</li>
      </ul>
      <button className="button" type="button" disabled={busy} onClick={checkout}>{busy ? <><LoaderCircle className="mc-spin" size={16}/>Opening secure checkout…</> : "Continue to secure checkout"}</button>
      {error && <p className="mc-checkout-error" role="alert">{error}{error.includes("Log in") && <> <Link href={`/login?next=${encodeURIComponent("/machine-coding/movie-ticket-booking")}`}>Log in here</Link>.</>}</p>}
    </section>
  </div>;
}

