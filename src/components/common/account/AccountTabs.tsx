type PropsType = {
  tabs: string[];
  activeTab: string;
  onChange: (tab: string) => void;
};

export const AccountTabs = ({ tabs, activeTab, onChange }: PropsType) => {
  return (
    <div className="bg-light-background mb-4 text-black dark:bg-dark-background dark:text-white mt-10 flex items-center gap-10 border-b border-black/15 pb-4 dark:border-white/15">
      {tabs.map((item) => {
        const isActive = item === activeTab;

        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={[
              "relative text-2xl font-semibold cursor-pointer transition-colors",
              isActive
                ? "text-black dark:text-white"
                : "text-black/55 hover:text-black/80 dark:text-white/55 dark:hover:text-white/80",
            ].join(" ")}
          >
            {item}

            {isActive && (
              <span className="absolute -bottom-4 left-0 h-1 w-full rounded-full bg-black dark:bg-white" />
            )}
          </button>
        );
      })}
    </div>
  );
};
