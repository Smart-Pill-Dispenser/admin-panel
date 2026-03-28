import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { AdminApiError } from "@/api/client";
import { adminApi } from "@/api/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill, Eye, EyeOff, ArrowLeft } from "lucide-react";

type Step = "login" | "forgot-request";

const Login: React.FC = () => {
  const { t } = useTranslation();
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
        setError(t("login.errBothRequired"));
        return;
      }
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        const ok = await login(email, password);
        if (!ok) setError(t("login.errInvalid"));
      } catch (e) {
        setError(e instanceof AdminApiError ? e.message : t("login.errLoginFailed"));
      } finally {
        setLoading(false);
      }
      return;
    }
    if (step === "forgot-request") {
      if (!email?.trim()) {
        setError(t("login.errEmailRequired"));
        return;
      }
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        await adminApi.forgotPassword(email.trim());
        setSuccess(t("login.resetSent"));
      } catch (e) {
        setError(e instanceof AdminApiError ? e.message : t("login.errResetSend"));
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
            {t("app.brand")}
          </h1>
          <p className="text-lg text-sidebar-fg/70">
            {t("login.heroSubtitle")}
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
            <span className="text-xl font-bold text-foreground">{t("app.brand")}</span>
          </div>

          <h2 className="mb-2 text-2xl font-bold text-foreground">
            {step === "login" && t("login.welcomeBack")}
            {step === "forgot-request" && t("login.resetPasswordHeading")}
          </h2>
          <p className="mb-8 text-muted-foreground">
            {step === "login" && t("login.signInToNavos")}
            {step === "forgot-request" && t("login.enterEmailReset")}
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
              {t("login.backToSignIn")}
            </Button>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">{t("common.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("login.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                disabled={false}
              />
            </div>

            {step === "login" && (
              <div className="space-y-2">
                <Label htmlFor="password">{t("common.password")}</Label>
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
                    aria-label={showPassword ? t("common.hidePassword") : t("common.showPassword")}
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
                  {loading ? t("login.signingIn") : t("login.signIn")}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-muted-foreground h-11"
                  onClick={goToForgot}
                >
                  {t("login.forgotPassword")}
                </Button>
              </div>
            )}
            {step === "forgot-request" && (
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? t("login.sending") : t("login.sendResetLink")}
              </Button>
            )}
          </form>

         
        </div>
      </div>
    </div>
  );
};

export default Login;
