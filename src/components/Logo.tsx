// Inline approximation of the Orca Coast Playgrounds wordmark: a black orca
// breaching a green oval, with the two-tone name. Kept as SVG so it scales
// crisply and needs no asset pipeline.
export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Orca Coast Playgrounds"
    >
      <defs>
        <radialGradient id="oc-green" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#5bc85f" />
          <stop offset="100%" stopColor="#1f7a34" />
        </radialGradient>
      </defs>
      {/* Green oval */}
      <ellipse cx="50" cy="52" rx="46" ry="34" fill="url(#oc-green)" stroke="#15692c" strokeWidth="2" />
      {/* Stylized breaching orca */}
      <path
        d="M22 64 C30 40 48 28 70 26 C60 34 58 42 60 50 C66 46 74 44 80 46 C70 52 64 60 58 70 C46 64 32 64 22 64 Z"
        fill="#0a1f2e"
      />
      {/* Orca eye patch + belly accent */}
      <circle cx="52" cy="42" r="3.4" fill="#ffffff" />
      <path d="M30 60 C40 56 50 56 56 60 C48 62 38 62 30 60 Z" fill="#d9edf8" opacity="0.85" />
    </svg>
  );
}
