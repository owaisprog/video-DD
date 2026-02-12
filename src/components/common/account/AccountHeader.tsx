export const AccountHeader = (userData: any) => {
  return (
    <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-10 bg-light-background text-black dark:bg-dark-background dark:text-white">
      {/* Avatar */}
      <div className="shrink-0">
        <div className="grid h-40 w-40 place-items-center rounded-full bg-green-700 text-white md:h-64 md:w-64">
          {/* <span className="select-none text-7xl font-semibold tracking-tight md:text-9xl">
            M
          </span> */}
          <img
            src={userData.data.avatar}
            alt="avatar"
            className="w-full h-full object-cover object-center rounded-full"
          />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl text-black dark:text-white">
          {userData.data.fullname}
        </h1>

        <p className="mt-4 text-xl font-semibold text-black/70 dark:text-white/80 md:text-2xl">
          {userData.data.email}
        </p>
      </div>
    </div>
  );
};
