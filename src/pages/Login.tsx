import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AdminApiError } from "@/api/client";
import { adminApi } from "@/api/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill, Eye, EyeOff, ArrowLeft } from "lucide-react";

type Step = "login" | "forgot-request";

const Login: React.FC = () => {
  const { login } = useAuth();
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === "login") {
      if (!email || !password) {
        setError("Please enter both email and password");
        return;
      }
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        const ok = await login(email, password);
        if (!ok) setError("Invalid email or password.");
      } catch (e) {
        setError(e instanceof AdminApiError ? e.message : "Login failed. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }
    if (step === "forgot-request") {
      if (!email?.trim()) {
        setError("Please enter your email");
        return;
      }
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        await adminApi.forgotPassword(email.trim());
        setSuccess("If an account exists for this email, you will receive a reset link. Check your inbox and spam.");
      } catch (e) {
        setError(e instanceof AdminApiError ? e.message : "Failed to send reset link.");
      } finally {
        setLoading(false);
      }
    }
  };

  const goToForgot = () => {
    setStep("forgot-request");
    setError("");
    setSuccess("");
  };
  const backToLogin = () => {
    setStep("login");
    setError("");
    setSuccess("");
  };
  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary">
            <Pill className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="mb-4 text-4xl font-bold text-primary-foreground tracking-tight">
            Navos ZET
          </h1>
          <p className="text-lg text-sidebar-fg/70">
            Admin Panel — Oversee devices, caregivers, and system configuration across the Navos ZET platform.
          </p>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-3 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Pill className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Navos ZET</span>
          </div>

          <h2 className="mb-2 text-2xl font-bold text-foreground">
            {step === "login" && "Welcome back"}
            {step === "forgot-request" && "Reset password"}
          </h2>
          <p className="mb-8 text-muted-foreground">
            {step === "login" && "Sign in to Navos ZET"}
            {step === "forgot-request" && "Enter your email to receive a reset link."}
          </p>

          {step === "forgot-request" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
              onClick={backToLogin}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </Button>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                disabled={false}
              />
            </div>

            {step === "login" && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-11 w-10 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}

            {step === "login" && (
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-muted-foreground h-11"
                  onClick={goToForgot}
                >
                  Forgot password?
                </Button>
              </div>
            )}
            {step === "forgot-request" && (
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            )}
          </form>

         
        </div>
      </div>
    </div>
  );
};

export default Login;
