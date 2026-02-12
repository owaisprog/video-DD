import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Lock,
  Image as ImageIcon,
  UploadCloud,
  X,
  EyeOff,
  UserPlus,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { signupApi } from "../../lib/api/auth";
import toast, { Toaster } from "react-hot-toast";
import { extractMessageFromHtml } from "../../utils/extractMessageFromHtml";

type FormValues = {
  username: string;
  fullname: string;
  email: string;
  avatar: FileList;
  coverImage: FileList | null;
  password: string;
};

export const Signup = () => {
  const {
    register,
    handleSubmit,
    watch,
    resetField,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    mode: "onTouched",
  });

  const navigate = useNavigate();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const coverFiles = watch("coverImage");
  const coverFile = coverFiles?.[0];
  const avatarFiles = watch("avatar");
  const avatarFile = avatarFiles?.[0];

  useEffect(() => {
    if (avatarFile) {
      const url = URL.createObjectURL(avatarFile);
      setAvatarUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAvatarUrl(null);
    }
  }, [avatarFile]);

  useEffect(() => {
    if (coverFile) {
      const url = URL.createObjectURL(coverFile);
      setCoverUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCoverUrl(null);
    }
  }, [coverFile]);

  const onSubmit = async (data: FormValues) => {
    const formData = new FormData();
    formData.append("fullname", data.fullname);
    formData.append("username", data.username);
    formData.append("email", data.email);
    formData.append("password", data.password);

    // append the actual File object, not FileList
    formData.append("avatar", data.avatar[0]);
    if (data.coverImage?.[0]) formData.append("coverImage", data.coverImage[0]);

    try {
      const res = await signupApi(formData);

      if (res?.status === 200 || res?.status === 201) {
        navigate("/"); // or "/account"
      } else {
        toast.error("Unable to create account. Please try again.", {
          position: "bottom-right",
        });
      }
    } catch (err: any) {
      const html = err?.response?.data;

      if (typeof html === "string") {
        toast.error(extractMessageFromHtml(html), { position: "bottom-right" });
      } else {
        toast.error(err?.message || "Something went wrong. Please try again.", {
          position: "bottom-right",
        });
      }
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center w-full bg-light-background text-black dark:bg-dark-background dark:text-white">
      <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl rounded-3xl border border-black/10 bg-black/2 p-7 shadow-[0_0_0_1px_rgba(0,0,0,0.04)] dark:border-white/10 dark:bg-white/3 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:p-10">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Create account
              </h1>
              <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Join and personalize your profile.
              </p>
            </div>

            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-green-700 text-white">
              <UserPlus className="h-6 w-6" />
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
            {/* Basic info (2 columns) */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Full name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-black/80 dark:text-white/80">
                  Full name
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-light-background px-4 py-3 shadow-sm dark:border-white/10 dark:bg-dark-background">
                  <User className="h-5 w-5 text-black/50 dark:text-white/50" />
                  <input
                    {...register("fullname", {
                      required: "fullname is required",
                    })}
                    type="text"
                    placeholder="e.g. Muhammad Owais"
                    className="w-full bg-transparent text-base outline-none placeholder:text-black/40 dark:placeholder:text-white/40"
                  />
                </div>
                {errors.fullname?.message && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.fullname.message}
                  </p>
                )}
              </div>

              {/* Username */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-black/80 dark:text-white/80">
                  Username
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-light-background px-4 py-3 shadow-sm dark:border-white/10 dark:bg-dark-background">
                  <User className="h-5 w-5 text-black/50 dark:text-white/50" />
                  <input
                    {...register("username", {
                      required: "username is required",
                    })}
                    type="text"
                    placeholder="e.g. muhammadowais3499"
                    className="w-full bg-transparent text-base outline-none placeholder:text-black/40 dark:placeholder:text-white/40"
                  />
                </div>
                {errors.username?.message && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.username.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-black/80 dark:text-white/80">
                  Email
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-light-background px-4 py-3 shadow-sm dark:border-white/10 dark:bg-dark-background">
                  <Mail className="h-5 w-5 text-black/50 dark:text-white/50" />
                  <input
                    {...register("email", {
                      required: "fullname is email",
                    })}
                    type="email"
                    placeholder="you@email.com"
                    className="w-full bg-transparent text-base outline-none placeholder:text-black/40 dark:placeholder:text-white/40"
                  />
                </div>
                {errors.email?.message && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            {/* Avatar + Cover (2 columns) */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Avatar picker */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-black/80 dark:text-white/80">
                  Avatar{" "}
                  <span className="text-black/50 dark:text-white/50">
                    (required)
                  </span>
                </label>

                <div className="rounded-2xl border border-black/10 bg-light-background p-4 dark:border-white/10 dark:bg-dark-background">
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-full bg-black/5 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
                      <div className="grid h-full w-full place-items-center text-black/40 dark:text-white/40">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="avatar"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-7 w-7" />
                        )}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="text-sm font-semibold text-black/80 dark:text-white/80">
                        Upload avatar
                      </div>
                      <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                        PNG/JPG, square works best
                      </div>

                      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-black/5 px-4 py-2 text-sm font-semibold text-black/80 hover:bg-black/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10">
                        <UploadCloud className="h-4 w-4" />
                        Choose file
                        <input
                          {...register("avatar", {
                            required: "avatar is required",
                          })}
                          type="file"
                          accept="image/*"
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
                {errors.avatar?.message && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.avatar.message}
                  </p>
                )}
              </div>

              {/* Cover picker */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-black/80 dark:text-white/80">
                  Cover image{" "}
                  <span className="text-black/50 dark:text-white/50">
                    (optional)
                  </span>
                </label>

                <div className="rounded-2xl border border-black/10 bg-light-background p-4 dark:border-white/10 dark:bg-dark-background">
                  <div className="relative overflow-hidden rounded-2xl bg-black/5 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
                    <div className="aspect-16/7 w-full">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt="cover"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-black/40 dark:text-white/40">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-6 w-6" />
                            <span className="text-sm font-semibold">
                              Cover preview
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        resetField("coverImage");
                        setCoverUrl(null);
                      }}
                      className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/70 text-white hover:bg-black"
                      aria-label="Remove cover"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="text-xs text-black/50 dark:text-white/50">
                      Wide image recommended (16:7)
                    </div>

                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-black/5 px-4 py-2 text-sm font-semibold text-black/80 hover:bg-black/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10">
                      <UploadCloud className="h-4 w-4" />
                      Choose file
                      <input
                        {...register("coverImage")}
                        type="file"
                        accept="image/*"
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
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
                    required: "password is required",
                  })}
                  type={showPassword === false ? "password" : "text"}
                  placeholder="Create a strong password"
                  className="w-full bg-transparent text-base outline-none placeholder:text-black/40 dark:placeholder:text-white/40"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="rounded-full p-2 text-black/50 hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white cursor-pointer"
                  aria-label="Show password"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <EyeOff className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password?.message && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="mt-2 w-full rounded-2xl bg-green-700 px-5 py-3 text-base font-semibold text-white shadow-sm hover:bg-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/60"
            >
              {isSubmitting ? "Creating..." : " Create Account"}
            </button>

            {/* Footer */}
            <div className="pt-3 text-center text-sm text-black/60 dark:text-white/60">
              Already have an account?{" "}
              <Link to="/login">
                <button
                  type="button"
                  className="cursor-pointer font-semibold text-black hover:underline dark:text-white"
                >
                  Sign in
                </button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
