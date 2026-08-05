"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Smartphone } from "lucide-react";
import { requestAdminOtp, verifyAdminOtp } from "@/lib/admin-auth";

const normalizePhoneInput = (value: string) =>
  value.replace(/\D/g, "").slice(0, 10);
const normalizeOtpInput = (value: string) =>
  value.replace(/\D/g, "").slice(0, 6);

export default function LoginPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRequestOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await requestAdminOtp(
        phoneNumber,
        name.trim() || undefined,
      );
      setGeneratedOtp(response.otp || "");
      setOtpRequested(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to request admin OTP",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await verifyAdminOtp(phoneNumber, otp);
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || "/";

      router.replace(next);
      router.refresh();
      // router.refresh();
      // window.location.assign("/");
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Unable to verify admin OTP",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-[2.5rem] border border-black/8 bg-[linear-gradient(180deg,_rgba(42,28,22,0.98)_0%,_rgba(79,49,33,0.98)_100%)] p-8 text-white shadow-[0_28px_80px_rgba(42,28,22,0.22)] sm:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-white/80">
          <ShieldCheck className="h-4 w-4" />
          Admin access only
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-[-0.05em] text-white sm:text-5xl">
          Secure the control room before anything else.
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-white/72 sm:text-base">
          Every admin page now requires verified sign-in. The token is stored in
          an HTTP-only server cookie so it stays out of browser storage and is
          sent securely with admin requests.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.8rem] border border-white/10 bg-white/8 p-5">
            <p className="text-sm font-semibold text-white">Protected routes</p>
            <p className="mt-2 text-sm leading-6 text-white/68">
              Dashboard, products, categories, orders, customers, and settings
              all redirect here until login succeeds.
            </p>
          </div>
          <div className="rounded-[1.8rem] border border-white/10 bg-white/8 p-5">
            <p className="text-sm font-semibold text-white">Server cookie</p>
            <p className="mt-2 text-sm leading-6 text-white/68">
              Admin auth is now carried in a secure HTTP-only cookie instead of
              exposing the token to client-side storage.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[2.5rem] border border-black/8 bg-white/95 p-8 shadow-[0_24px_60px_rgba(42,28,22,0.10)] sm:p-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/14 text-primary">
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              OTP login
            </p>
            <p className="text-sm text-slate-500">
              Use an admin-approved phone number
            </p>
          </div>
        </div>

        {!otpRequested ? (
          <form onSubmit={handleRequestOtp} className="mt-8 space-y-5">
            <label className="block space-y-2 text-sm">
              <span className="font-medium text-slate-800">Admin name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Optional"
                className="w-full rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span className="font-medium text-slate-800">Phone number</span>
              <input
                value={phoneNumber}
                onChange={(event) =>
                  setPhoneNumber(normalizePhoneInput(event.target.value))
                }
                inputMode="numeric"
                placeholder="10-digit admin phone"
                className="w-full rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                required
              />
            </label>
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
            <button
              type="submit"
              disabled={loading || phoneNumber.length !== 10}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-coffee-dark px-6 text-sm font-semibold text-white transition hover:bg-coffee-dark/92 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="mt-8 space-y-5">
            <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              OTP sent to {phoneNumber}.
              {generatedOtp ? ` Dev OTP: ${generatedOtp}` : ""}
            </div>
            <label className="block space-y-2 text-sm">
              <span className="font-medium text-slate-800">Enter OTP</span>
              <input
                value={otp}
                onChange={(event) =>
                  setOtp(normalizeOtpInput(event.target.value))
                }
                inputMode="numeric"
                placeholder="6-digit OTP"
                className="w-full rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                required
              />
            </label>
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-coffee-dark px-6 text-sm font-semibold text-white transition hover:bg-coffee-dark/92 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? "Verifying..." : "Verify and enter"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setOtpRequested(false);
                  setOtp("");
                  setGeneratedOtp("");
                  setError("");
                }}
                className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                Change number
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
