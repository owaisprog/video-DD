type Props = {
  className?: string;
};

export const EmptyIllustration = ({ className = "" }: Props) => {
  return (
    <svg
      className={className}
      viewBox="0 0 220 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* outline shadow */}
      <g opacity="0.35">
        <path
          d="M78 20c-18 0-32 14-32 32v58c0 18 14 32 32 32h23c8 0 14-6 14-14V70c0-28-17-50-37-50Z"
          fill="#0B1220"
        />
        <rect x="134" y="78" width="62" height="62" rx="6" fill="#0B1220" />
      </g>

      {/* character */}
      <path
        d="M82 18c-19 0-34 15-34 34v60c0 19 15 34 34 34h22c9 0 16-7 16-16V70c0-29-18-52-38-52Z"
        fill="#22D3EE"
        stroke="#0B1220"
        strokeWidth="6"
        strokeLinejoin="round"
      />

      {/* arm */}
      <path
        d="M110 62c-10 2-18 10-18 20 0 6 3 11 7 15l10 9c6 5 15 4 20-1l6-6"
        fill="#22D3EE"
        stroke="#0B1220"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* hand + pen */}
      <path
        d="M148 46c6 0 11 5 11 11s-5 11-11 11-11-5-11-11 5-11 11-11Z"
        fill="#22D3EE"
        stroke="#0B1220"
        strokeWidth="6"
      />
      <path
        d="M150 36l16 20"
        stroke="#F8FAFC"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M168 58l8-6"
        stroke="#F8FAFC"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* table */}
      <rect
        x="130"
        y="76"
        width="70"
        height="70"
        rx="6"
        fill="#22D3EE"
        stroke="#0B1220"
        strokeWidth="6"
      />
      <path
        d="M138 90h54"
        stroke="#0B1220"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M142 146V104M188 146V104"
        stroke="#0B1220"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* items on table */}
      <path
        d="M154 101c10-5 21 2 22 13"
        stroke="#0B1220"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <rect
        x="160"
        y="96"
        width="22"
        height="12"
        rx="6"
        fill="#F8FAFC"
        stroke="#0B1220"
        strokeWidth="4"
      />
      <rect
        x="140"
        y="108"
        width="24"
        height="10"
        rx="5"
        fill="#F8FAFC"
        stroke="#0B1220"
        strokeWidth="4"
      />
    </svg>
  );
};
