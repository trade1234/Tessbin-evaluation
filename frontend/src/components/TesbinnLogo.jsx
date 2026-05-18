export default function TesbinnLogo({ className = "", title = "Tesbinn" }) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      <circle cx="32" cy="32" r="30" fill="#ffffff" stroke="#1e3a5f" strokeWidth="2.5" />
      <path
        d="M21 17 10 23l22 8 22-8-11-6v6.5h-3V15H24v8.3l-3-.9V17Z"
        fill="#1e3a5f"
      />
      <path
        d="M25.2 24.8v7.4c0 2.8 3.7 5.2 8.8 5.2s8.8-2.4 8.8-5.2v-7.4L34 28.1l-8.8-3.3Z"
        fill="#1e3a5f"
      />
      <path
        d="M33.4 20.5c-7.3 0-13.1 5.9-13.1 13.2 0 4.6 2.3 8.8 6.2 11.3v4.5h16.1V45c3.7-2.4 6-6.5 6-11 0-7.4-6-13.5-13.2-13.5Zm-1.3 10.1c1.2-1.4 3-2.2 5.2-2.2 1.1 0 2.1.2 2.9.6l-.9 3.5c-.7-.3-1.3-.5-2.2-.5-1.1 0-2 .3-2.7 1-.9.8-1.3 2.1-1.3 3.9v6.8h-3.9v-6.9c0-2.6.9-4.7 2.9-6.2Z"
        fill="#1e3a5f"
      />
      <path d="M42.6 49.5H26.5" stroke="#e05d06" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
