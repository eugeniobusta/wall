// The Wall mark: a lens throws a cone of light onto a board, and the light is a handwritten W.
export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" className="logo">
      <defs>
        <linearGradient id="lg-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1d1d24" /><stop offset="1" stopColor="#050506" /></linearGradient>
        <radialGradient id="lg-glow" cx="50%" cy="38%" r="55%"><stop offset="0" stopColor="#0a84ff" stopOpacity=".3" /><stop offset="1" stopColor="#0a84ff" stopOpacity="0" /></radialGradient>
        <linearGradient id="lg-beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#fff" stopOpacity=".85" /><stop offset="1" stopColor="#fff" stopOpacity=".1" /></linearGradient>
        <linearGradient id="lg-board" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#dfe9ff" /></linearGradient>
        <linearGradient id="lg-ink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0a84ff" /><stop offset="1" stopColor="#5e5ce6" /></linearGradient>
      </defs>
      <rect width="512" height="512" rx="114" fill="url(#lg-bg)" />
      <rect width="512" height="512" rx="114" fill="url(#lg-glow)" />
      <path d="M236 448 L150 330 H362 L276 448 Z" fill="url(#lg-beam)" />
      <rect x="140" y="62" width="232" height="286" rx="46" fill="url(#lg-board)" />
      <path d="M190 150 L221 262 L256 178 L291 262 L322 150" fill="none" stroke="url(#lg-ink)" strokeWidth="27" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="256" cy="450" r="21" fill="#fff" />
    </svg>
  );
}
