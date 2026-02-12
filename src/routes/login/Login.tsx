import { useState } from "react";
import { Mail, Lock, User, Eye, EyeOff, LogIn } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { loginApi } from "../../lib/api/auth";
import toast, { Toaster } from "react-hot-toast";

type FormValues = {
  identifier: string; // email OR username
  password: string;
  rememberMe?: boolean;
};

export const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ mode: "onTouched" });

  const onSubmit = async (data: FormValues) => {
    const isEmail = data.identifier.includes("@");

    const payload: { email?: string; username?: string; password: string } = {
      password: data.password,
      ...(isEmail ? { email: data.identifier } : { username: data.identifier }),
    };

    try {
      const res = await loginApi(payload);

      if (res?.status === 200) {
        navigate("/");
      } else {
        toast.error("Unable to sign in. Please try again.", {
          position: "bottom-right",
        });
      }
    } catch (err: any) {
      console.log(err);

      toast.error(err?.message || "Some thing went wrong");
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center w-full bg-light-background text-black dark:bg-dark-background dark:text-white">
      <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-12">
        <div className="rounded-3xl border border-black/10 bg-black/2 p-7 shadow-[0_0_0_1px_rgba(0,0,0,0.04)] dark:border-white/10 dark:bg-white/3 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:p-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
              <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Use your email/username and password.
              </p>
            </div>

            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-green-700 text-white">
              <LogIn className="h-6 w-6" />
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            {/* Email or username */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-black/80 dark:text-white/80">
                Email or Username
              </label>

              <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-light-background px-4 py-3 shadow-sm dark:border-white/10 dark:bg-dark-background">
                <User className="h-5 w-5 text-black/50 dark:text-white/50" />
                <input
                  {...register("identifier", {
                    required: "Email or username is required",
                    minLength: { value: 3, message: "Too short" },
                  })}
                  type="text"
                  placeholder="e.g. muhammadowais3499 or you@email.com"
                  className="w-full bg-transparent text-base outline-none placeholder:text-black/40 dark:placeholder:text-white/40"
                />
                <Mail className="h-5 w-5 text-black/35 dark:text-white/35" />
              </div>

              {errors.identifier?.message && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.identifier.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-black/80 dark:text-white/80">
                Password
              </label>

              <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-light-background px-4 py-3 shadow-sm dark:border-white/10 dark:bg-dark-background">
                <Lock className="h-5 w-5 text-black/50 dark:text-white/50" />
                <input
                  {...register("password", {
                    required: "Password is required",
                    minLength: { value: 6, message: "Min 6 characters" },
                  })}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-base outline-none placeholder:text-black/40 dark:placeholder:text-white/40"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="rounded-full p-2 text-black/50 hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {errors.password?.message && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Row: remember + forgot */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="inline-flex items-center gap-2 text-sm text-black/70 dark:text-white/70">
                <input
                  {...register("rememberMe")}
                  type="checkbox"
                  className="h-4 w-4 rounded border-black/20 bg-transparent accent-green-700 dark:border-white/20"
                />
                Remember me
              </label>

              <button
                type="button"
                className="text-sm font-semibold text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-2xl bg-green-700 px-5 py-3 text-base font-semibold text-white shadow-sm hover:bg-green-800 disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/60"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 py-2">
              <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
              <span className="text-xs text-black/50 dark:text-white/50">
                OR
              </span>
              <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
            </div>

            {/* Secondary actions */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-2xl border border-black/10 bg-light-background px-4 py-3 text-sm font-semibold text-black/80 hover:bg-black/5 dark:border-white/10 dark:bg-dark-background dark:text-white/80 dark:hover:bg-white/5"
              >
                Continue with Google
              </button>

              <button
                type="button"
                className="rounded-2xl border border-black/10 bg-light-background px-4 py-3 text-sm font-semibold text-black/80 hover:bg-black/5 dark:border-white/10 dark:bg-dark-background dark:text-white/80 dark:hover:bg-white/5"
              >
                Continue with GitHub
              </button>
            </div>

            {/* Footer */}
            <div className="pt-3 text-center text-sm text-black/60 dark:text-white/60">
              Don&apos;t have an account?{" "}
              <Link to="/signup">
                <button
                  type="button"
                  className="cursor-pointer font-semibold text-black hover:underline dark:text-white"
                >
                  Create one
                </button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
