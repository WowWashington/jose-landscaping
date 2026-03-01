"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { FolderKanban, Loader2 } from "lucide-react";

type ResetResult =
  | { method: "sms"; maskedPhone: string }
  | { method: "direct"; pin: string; smsUri?: string }
  | null;

export function LoginScreen() {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [businessName, setBusinessName] = useState("Landscaping and Services");
  const [resetMode, setResetMode] = useState(false);
  const [resetResult, setResetResult] = useState<ResetResult>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setLoading(true);

    const result = await login(name.trim(), pin);
    if (!result.ok) {
      setError(result.error ?? "Login failed");
    }
    setLoading(false);
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !pin.trim()) return;
    setError("");
    setLoading(true);

    // Create the first user as owner
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), pin, role: "owner" }),
    });

    if (res.ok) {
      // Now log in
      const result = await login(name.trim(), pin);
      if (!result.ok) {
        setError("Account created but login failed. Try again.");
      }
    } else {
      setError("Failed to create account");
    }
    setLoading(false);
  }

  async function handleResetPin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setResetResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to reset PIN");
      } else if (data.method === "sms") {
        setResetResult({ method: "sms", maskedPhone: data.maskedPhone });
      } else if (data.method === "direct") {
        setResetResult({
          method: "direct",
          pin: data.pin,
          smsUri: data.smsUri,
        });
      } else {
        // Generic "sent" response (user not found — no enumeration)
        setResetResult({ method: "sms", maskedPhone: "" });
      }
    } catch {
      setError("Network error. Try again.");
    }
    setLoading(false);
  }

  // Check if any users exist
  const [checked, setChecked] = useState(false);
  const [hasUsers, setHasUsers] = useState(true);

  if (!checked) {
    Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()).catch(() => ({})),
    ])
      .then(([users, settings]) => {
        setHasUsers(users.length > 0);
        if (users.length === 0) setSetupMode(true);
        if (settings.businessName) setBusinessName(settings.businessName);
        setChecked(true);
      })
      .catch(() => setChecked(true));

    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-green-50 to-white dark:from-green-950/20 dark:to-background">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <FolderKanban className="h-10 w-10 text-green-700 mx-auto mb-2" />
            <h1 className="text-xl font-semibold">{businessName}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {setupMode
                ? "Create your owner account"
                : resetMode
                  ? "Reset your PIN"
                  : "Sign in to continue"}
            </p>
          </div>

          {/* ── Reset PIN mode ── */}
          {resetMode ? (
            resetResult ? (
              <div className="space-y-3">
                {resetResult.method === "sms" && resetResult.maskedPhone ? (
                  <p className="text-sm text-center">
                    New PIN sent to{" "}
                    <span className="font-mono font-medium">
                      {resetResult.maskedPhone}
                    </span>
                  </p>
                ) : resetResult.method === "direct" ? (
                  <div className="text-center space-y-2">
                    <p className="text-sm">Your new PIN is:</p>
                    <p className="text-2xl font-mono font-bold tracking-widest">
                      {resetResult.pin}
                    </p>
                    {resetResult.smsUri && (
                      <a
                        href={resetResult.smsUri}
                        className="text-xs text-green-700 underline"
                      >
                        Send via text message
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-center text-muted-foreground">
                    If an account with that name exists, a new PIN has been issued.
                  </p>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setResetMode(false);
                    setResetResult(null);
                    setError("");
                    setPin("");
                  }}
                >
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetPin}>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="reset-name">Name</Label>
                    <Input
                      id="reset-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      autoComplete="username"
                      autoFocus
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-green-700 hover:bg-green-800"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Reset PIN"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="w-full text-xs"
                    onClick={() => {
                      setResetMode(false);
                      setError("");
                    }}
                  >
                    Back to Sign In
                  </Button>
                </div>
              </form>
            )
          ) : (
            /* ── Normal login / setup mode ── */
            <>
              <form onSubmit={setupMode ? handleSetup : handleLogin}>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="login-name">Name</Label>
                    <Input
                      id="login-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      autoComplete="username"
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label htmlFor="login-pin">PIN</Label>
                    <Input
                      id="login-pin"
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder={setupMode ? "Choose a 4-digit PIN" : "Enter your PIN"}
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="current-password"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-green-700 hover:bg-green-800"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : setupMode ? (
                      "Create Account & Sign In"
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </div>
              </form>

              {hasUsers && !setupMode && (
                <Button
                  variant="link"
                  className="w-full mt-2 text-xs"
                  onClick={() => {
                    setResetMode(true);
                    setError("");
                    setPin("");
                  }}
                >
                  Forgot PIN?
                </Button>
              )}

              {!setupMode && !hasUsers && (
                <Button
                  variant="link"
                  className="w-full mt-2 text-xs"
                  onClick={() => setSetupMode(true)}
                >
                  First time? Set up owner account
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
