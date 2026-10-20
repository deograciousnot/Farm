import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Smartphone, Wallet, XCircle } from "lucide-react";

import { api } from "../api";
import { formatNumber } from "../charts";
import { errorMessage } from "../components";
import type { Payment, PaymentPlans } from "../types";

const POLL_EVERY_MS = 3_000;
const STOP_POLLING_AFTER_MS = 200_000;

const kes = (amount: number) => `KES ${formatNumber(amount)}`;

/**
 * A company's sponsored-update balance, and buying more with M-Pesa. Each submitted update holds one
 * credit; FarmConnect returns it if the update is sent back or withdrawn.
 */
export function SponsoredCredits({ organizationId, credits, onChange }: { organizationId: string; credits: number; onChange: () => void }) {
  const [plans, setPlans] = useState<PaymentPlans | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [planId, setPlanId] = useState("sponsored-5");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const timer = useRef<number | null>(null);

  const stopPolling = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  };

  useEffect(() => stopPolling, []);

  useEffect(() => {
    if (isOpen && !plans) {
      api.getPaymentPlans().then(setPlans, (loadError) => setError(errorMessage(loadError)));
    }
  }, [isOpen, plans]);

  function poll(started: Payment) {
    const startedAt = Date.now();
    stopPolling();
    timer.current = window.setInterval(async () => {
      if (Date.now() - startedAt > STOP_POLLING_AFTER_MS) {
        stopPolling();
        setPayment({ ...started, status: "failed", message: "We didn't hear back from M-Pesa. If you paid, your credits will appear shortly." });
        return;
      }
      try {
        const { item } = await api.getPayment(started._id);
        if (item.status !== "pending") {
          stopPolling();
          setPayment(item);
          if (item.status === "paid") onChange();
        }
      } catch {
        // Keep waiting through a dropped connection.
      }
    }, POLL_EVERY_MS);
  }

  async function pay(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsStarting(true);
    try {
      const { item } = await api.partner.buyCredits({ organization: organizationId, plan: planId, phone });
      setPayment(item);
      poll(item);
    } catch (payError) {
      setError(errorMessage(payError));
    } finally {
      setIsStarting(false);
    }
  }

  function reset() {
    stopPolling();
    setPayment(null);
    setError("");
  }

  const packs = plans?.sponsoredPacks ?? [];
  const selected = packs.find((pack) => pack.id === planId);

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>
            {credits} sponsored {credits === 1 ? "update" : "updates"} left
          </h2>
          <p>Each update you submit uses one. If FarmConnect sends it back or you withdraw it, you get the credit back.</p>
        </div>
        {!isOpen ? (
          <button className="primary-button" onClick={() => setIsOpen(true)}>
            <Wallet size={16} />
            Buy more
          </button>
        ) : null}
      </div>

      {isOpen && !payment ? (
        <form className="stack" onSubmit={(event) => void pay(event)}>
          {!plans && !error ? <p className="muted">Loading prices…</p> : null}
          {plans && !plans.available ? <p className="notice">Payments aren&apos;t available right now. Please try again later.</p> : null}
          {plans?.available ? (
            <>
              <div className="segmented" role="radiogroup" aria-label="Pack">
                {packs.map((pack) => (
                  <button
                    type="button"
                    key={pack.id}
                    role="radio"
                    aria-checked={pack.id === planId}
                    className={pack.id === planId ? "active" : ""}
                    onClick={() => setPlanId(pack.id)}>
                    {pack.label} · {kes(pack.amount)}
                  </button>
                ))}
              </div>
              {selected && selected.credits > 1 ? (
                <small className="muted">
                  {kes(Math.round(selected.amount / selected.credits))} per update, saving {kes(packs[0].amount * selected.credits - selected.amount)}.
                </small>
              ) : null}
              <label className="field">
                <span>M-Pesa number</span>
                <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="0712 345 678" inputMode="tel" autoComplete="tel" required />
              </label>
              {plans.simulated ? <small className="muted">Test mode: no real money is charged. The payment confirms itself after a few seconds.</small> : null}
            </>
          ) : null}
          {error ? <p className="form-error">{error}</p> : null}
          <div className="actions">
            <button type="button" className="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </button>
            {plans?.available ? (
              <button type="submit" className="primary-button" disabled={isStarting || !selected || !phone.trim()}>
                <Smartphone size={16} />
                {isStarting ? "Sending prompt…" : `Pay ${selected ? kes(selected.amount) : ""} with M-Pesa`}
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {payment?.status === "pending" ? (
        <p className="notice">
          <strong>Check your phone.</strong> Enter your M-Pesa PIN to pay {kes(payment.amount)}. This updates by itself once you do.
        </p>
      ) : null}

      {payment && payment.status !== "pending" ? (
        <div className="stack">
          <p className={payment.status === "paid" ? "data-note" : "form-error"}>
            {payment.status === "paid" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}{" "}
            {payment.status === "paid"
              ? `Paid. Your credits are ready.${payment.receipt ? ` M-Pesa receipt ${payment.receipt}.` : ""}`
              : payment.message || "The payment didn't go through. Nothing was charged."}
          </p>
          <div className="actions">
            <button
              className="ghost"
              onClick={() => {
                reset();
                if (payment.status === "paid") setIsOpen(false);
              }}>
              {payment.status === "paid" ? "Done" : "Try again"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
