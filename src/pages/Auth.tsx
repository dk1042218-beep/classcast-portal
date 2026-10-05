import logo from "@/assets/logo.svg";
import { useEnsureSeed } from "@/components/portal/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Loader2 } from "lucide-react";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const ready = useEnsureSeed();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate(redirect);
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = (await signIn("password", {
        identifier: identifier.trim(),
        password,
      })) as { signingIn?: boolean } | null;
      if (result?.signingIn) {
        navigate(redirect);
        return;
      }
      setError("Portal ID or password is incorrect.");
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Sign-in failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Masthead */}
      <div className="hidden flex-col justify-between border-r border-border bg-sidebar p-10 lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="ClassCast"
              className="size-10 border border-border bg-card p-1.5"
            />
            <div>
              <p className="label-caps text-foreground">
                Vidyanagar Institute of Computer Sciences
              </p>
              <p className="text-xs text-muted-foreground">
                Office of Academics · Department of Computer Science · Pune
              </p>
            </div>
          </div>

          <h1 className="font-editorial mt-12 text-5xl leading-none font-bold tracking-tight">
            ClassCast
          </h1>
          <p className="label-caps mt-3 text-muted-foreground">
            Academic Portal · Student Desk · Version 1
          </p>

          <div className="rule-double mt-6" />
          <p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground">
            Your working record for the term — kept the way the office keeps
            it: dated, signed and in one place.
          </p>
          <ul className="mt-4 max-w-md space-y-1.5 text-sm">
            {[
              "Today's timetable with rooms and faculty",
              "Attendance register, subject by subject",
              "Notes, handouts and downloads",
              "Assignments, deadlines and feedback",
              "Notices from the Office of Academics",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-primary">▪</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border border-border bg-card p-4">
          <p className="label-caps text-muted-foreground">Notice</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in with the portal ID issued to you. Faculty and office desks
            open in version 2 of ClassCast.
          </p>
        </div>
      </div>

      {/* Sign-in */}
      <div className="flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-sm">
          <div className="mb-5 flex items-center gap-2 lg:hidden">
            <img src={logo} alt="" className="size-8 border border-border bg-card p-1" />
            <span className="font-editorial text-lg font-bold">ClassCast</span>
          </div>

          <div className="border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="font-editorial text-xl font-bold tracking-tight">
                Student sign-in
              </h2>
              <span className="label-caps text-muted-foreground">Term I</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <div>
                <label
                  htmlFor="identifier"
                  className="label-caps text-muted-foreground"
                >
                  Portal ID or college email
                </label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="ST-101"
                  autoComplete="username"
                  className="mt-1.5 font-code"
                  disabled={isLoading}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="label-caps text-muted-foreground"
                >
                  Password
                </label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pr-16"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((show) => !show)}
                    className="label-caps absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !ready}
              >
                {!ready ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Preparing portal…
                  </>
                ) : isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="ml-2 size-4" />
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground">
                Your session stays active on this device until you sign out.
                Passwords are stored only as salted hashes.
              </p>
            </form>

            <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
              <Link
                to="/"
                className="underline hover:text-foreground"
              >
                Back to the institute page
              </Link>
              <span className="label-caps">ClassCast v1.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
