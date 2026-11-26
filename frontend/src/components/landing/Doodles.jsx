function BottleDoodle({ className }) {
  return <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
      <path d="M20 4h8v5h-8z" />
      <path d="M20 9c0 3-6 5-6 11v18a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4V20c0-6-6-8-6-11" />
      <path d="M14 26h20M14 33h20" />
    </svg>;
}
export {
  BottleDoodle
};
