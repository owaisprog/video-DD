import { Search, X } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";

type SearchFormValues = {
  query: string;
};

export const SearchBar = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { register, handleSubmit, setValue, watch } = useForm<SearchFormValues>(
    {
      defaultValues: {
        query: searchParams.get("q") ?? "",
      },
    },
  );

  const queryValue = watch("query");

  useEffect(() => {
    setValue("query", searchParams.get("q") ?? "", {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [searchParams, setValue]);

  const onSubmit = ({ query }: SearchFormValues) => {
    const q = query.trim();

    if (!q) {
      navigate("/");
      return;
    }

    navigate(`/results?q=${encodeURIComponent(q)}&page=1`);
  };

  const clearQuery = () => {
    setValue("query", "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex min-w-0 flex-1 justify-center"
    >
      <div className="flex w-full max-w-3xl items-center gap-2 sm:gap-3">
        <div className="flex h-11 min-w-0 flex-1 items-center rounded-full bg-black/5 pl-4 pr-2 ring-1 ring-black/10 focus-within:ring-2 focus-within:ring-black/20 dark:bg-white/5 dark:ring-white/10 dark:focus-within:ring-white/20">
          <input
            type="text"
            autoComplete="off"
            placeholder="Search videos"
            className="search-input h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/45 dark:placeholder:text-white/45"
            {...register("query")}
          />

          {queryValue?.trim() ? (
            <button
              type="button"
              onClick={clearQuery}
              className="grid h-8 w-8 place-items-center rounded-full text-black/60 hover:bg-black/5 hover:text-black dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <button
          type="submit"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
};
