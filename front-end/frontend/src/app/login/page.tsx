"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShieldCheck, Smartphone, User2 } from "lucide-react";

import { getStoredSession, storeSession, type AuthUser } from "@/lib/auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

type OtpResponse = {
  phoneNumber: string;
  expiresAt: string;
  otp?: string;
};

type VerifyResponse = {
  token: string;
  user: AuthUser;
};

const formatPhoneInput = (value: string) => value.replace(/\D/g, "").slice(0, 10);
const formatOtpInput = (value: string) => value.replace(/\D/g, "").slice(0, 6);

export default function LoginPage() {
  const router = useRouter();
  const [returnTo, setReturnTo] = useState("/profile");

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [serverOtp, setServerOtp] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const rawReturnTo = params?.get("returnTo");
    const resolvedReturnTo = rawReturnTo && rawReturnTo.startsWith("/") ? rawReturnTo : "/profile";
    setReturnTo(resolvedReturnTo);

    const session = getStoredSession();
    if (session?.token) {
      router.replace(resolvedReturnTo);
    }
  }, [router]);

  const sanitizedPhone = useMemo(() => formatPhoneInput(phoneNumber), [phoneNumber]);

  const handleRequestOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/request-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          phoneNumber: sanitizedPhone,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Unable to request OTP");
      }

      const data = payload.data as OtpResponse;
      setStep("verify");
      setMessage(`OTP sent to ${data.phoneNumber}.`);
      setServerOtp(data.otp || "");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to request OTP"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          phoneNumber: sanitizedPhone,
          otp,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Unable to verify OTP");
      }

      const data = payload.data as VerifyResponse;
      storeSession({
        token: data.token,
        user: data.user,
      });
      router.push(returnTo);
    } catch (verifyError) {
      setError(
        verifyError instanceof Error ? verifyError.message : "Unable to verify OTP"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#fbf7f2_0%,_#f5eee6_100%)] px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-14">
      <div className="mx-auto grid max-w-6xl items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,480px)] lg:gap-10">
        <section className="relative overflow-hidden rounded-[2rem] border border-black/5 bg-[linear-gradient(145deg,_rgba(43,29,22,0.98),_rgba(83,58,42,0.96))] px-5 py-7 text-white shadow-[0_22px_60px_rgba(42,28,22,0.12)] sm:px-7 sm:py-9 md:px-10 md:py-10 lg:min-h-[640px] lg:rounded-[2.6rem] lg:px-12 lg:py-12">
          <div className="absolute inset-x-0 top-0 h-px bg-white/15" />
          <div className="absolute -right-10 top-10 h-32 w-32 rounded-full bg-[#d8b28d]/10 blur-3xl sm:h-44 sm:w-44" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-primary/18 blur-3xl sm:h-40 sm:w-40" />

          <div className="relative z-10 flex h-full flex-col">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.24em] text-white/72 sm:text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#dfbf9f]" />
              Secure account access
            </div>

            <div className="mt-6 max-w-2xl sm:mt-8">
              <h1 className="font-serif text-[2rem] font-semibold leading-[1.05] text-white sm:text-[2.6rem] md:text-[3.15rem] lg:text-[3.7rem]">
                Welcome back to Aura.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/72 sm:text-[15px] sm:leading-7">
                Sign in with your mobile number and we&apos;ll verify your account with a
                one-time code. New customers are created automatically during login.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3 sm:gap-4 lg:mt-auto">
              {[
                {
                  icon: User2,
                  label: "Profile synced",
                  text: "Your details stay attached to one account.",
                },
                {
                  icon: Smartphone,
                  label: "OTP verification",
                  text: "A 6-digit code is used for secure sign in.",
                },
                {
                  icon: CheckCircle2,
                  label: "Fast access",
                  text: "Verify once and continue into your profile.",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.35rem] border border-white/10 bg-white/6 p-4 backdrop-blur-sm sm:min-h-[150px] sm:p-5"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8">
                    <item.icon className="h-4 w-4 text-[#dfbf9f]" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-white">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-white/62">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="glass rounded-[2rem] border border-black/5 bg-white/88 p-5 shadow-[0_16px_40px_rgba(42,28,22,0.07)] sm:p-6 md:p-8 lg:sticky lg:top-28 lg:rounded-[2.25rem] lg:p-9">
          <div className="mb-6 border-b border-black/6 pb-5 sm:mb-7 sm:pb-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary sm:text-[11px]">
                {step === "request" ? "Step 1 of 2" : "Step 2 of 2"}
              </p>
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-7 rounded-full ${step === "request" ? "bg-primary" : "bg-primary/35"}`} />
                <span className="h-1.5 w-7 rounded-full bg-primary" />
              </div>
            </div>

            <h2 className="mt-4 font-serif text-[1.8rem] font-semibold leading-tight text-foreground sm:text-[2.1rem]">
              {step === "request" ? "Sign in to your account" : "Enter the verification code"}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted">
              {step === "request"
                ? "Use your full name and mobile number to receive a one-time password."
                : "Enter the 6-digit OTP sent to your mobile number to complete sign in."}
            </p>
          </div>

          <form className="space-y-4 sm:space-y-5" onSubmit={step === "request" ? handleRequestOtp : handleVerifyOtp}>
            <label className="block">
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-muted sm:text-[11px]">
                Full Name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-[1rem] border border-black/10 bg-[#fffdfa] px-4 py-3.5 text-sm text-foreground outline-none transition placeholder:text-muted/65 focus:border-primary focus:bg-white sm:rounded-[1.15rem] sm:px-5 sm:py-4"
                required
                minLength={2}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-muted sm:text-[11px]">
                Mobile Number
              </span>
              <input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(formatPhoneInput(event.target.value))}
                placeholder="Enter 10 digit mobile number"
                className="w-full rounded-[1rem] border border-black/10 bg-[#fffdfa] px-4 py-3.5 text-sm text-foreground outline-none transition placeholder:text-muted/65 focus:border-primary focus:bg-white sm:rounded-[1.15rem] sm:px-5 sm:py-4"
                required
                inputMode="numeric"
                pattern="[0-9]{10}"
              />
            </label>

            {step === "verify" && (
              <label className="block">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-muted sm:text-[11px]">
                  6 Digit OTP
                </span>
                <input
                  value={otp}
                  onChange={(event) => setOtp(formatOtpInput(event.target.value))}
                  placeholder="Enter OTP"
                  className="w-full rounded-[1rem] border border-black/10 bg-[#fffdfa] px-4 py-3.5 text-sm text-foreground outline-none transition placeholder:text-muted/65 focus:border-primary focus:bg-white sm:rounded-[1.15rem] sm:px-5 sm:py-4"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                />
              </label>
            )}

            {message && (
              <div className="rounded-[1rem] border border-green-500/20 bg-green-50 px-4 py-3 text-sm text-green-700 sm:rounded-[1.2rem]">
                {message}
              </div>
            )}

            {error && (
              <div className="rounded-[1rem] border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-600 sm:rounded-[1.2rem]">
                {error}
              </div>
            )}

            {serverOtp && step === "verify" && (
              <div className="rounded-[1.2rem] border border-primary/15 bg-[linear-gradient(180deg,_rgba(178,124,78,0.08),_rgba(178,124,78,0.04))] px-4 py-4 sm:rounded-[1.4rem] sm:px-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary sm:text-[11px]">
                  Development OTP
                </p>
                <p className="mt-2 break-all font-mono text-2xl font-semibold tracking-[0.25em] text-foreground sm:text-3xl sm:tracking-[0.35em]">
                  {serverOtp}
                </p>
              </div>
            )}

            <div className="rounded-[1rem] border border-black/6 bg-[#f8f2ea] px-4 py-3 text-sm text-muted sm:rounded-[1.15rem]">
              {step === "request"
                ? "We only use your mobile number for account verification and sign in."
                : "If the code is incorrect or expired, go back and request a new OTP."}
            </div>

            <div className={`grid gap-3 ${step === "verify" ? "sm:grid-cols-2" : ""}`}>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-[1rem] bg-primary px-5 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60 sm:rounded-[1.15rem] sm:py-4"
              >
                {isLoading
                  ? "Please wait..."
                  : step === "request"
                    ? "Send OTP"
                    : "Verify and Login"}
              </button>

              {step === "verify" && (
                <button
                  type="button"
                  onClick={() => {
                    setStep("request");
                    setOtp("");
                    setServerOtp("");
                    setMessage("");
                    setError("");
                  }}
                  className="w-full rounded-[1rem] border border-black/10 px-5 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-foreground transition hover:bg-black/5 sm:rounded-[1.15rem] sm:py-4"
                >
                  Edit Details
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
