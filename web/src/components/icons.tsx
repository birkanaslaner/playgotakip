export type IconName =
  | "grid"
  | "clock"
  | "cart"
  | "mail"
  | "push"
  | "chart"
  | "users"
  | "list"
  | "store"
  | "info"
  | "gift"
  | "question"
  | "chevronDown"
  | "menu"
  | "search"
  | "help"
  | "moon"
  | "bell"
  | "feedback"
  | "eye"
  | "eyeOff"
  | "table"
  | "plus"
  | "chat"
  | "creditCard"
  | "box"
  | "globe"
  | "sliders"
  | "lock"
  | "doc"
  | "chevronRight"
  | "tag"
  | "trash"
  | "image"
  | "pencil"
  | "check"
  | "close"
  | "refresh"
  | "drag"
  | "tv"
  | "more"
  | "bolt"
  | "play"
  | "warn"
  | "coffee";

export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const p = {
    className: `${className} shrink-0`,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };
  switch (name) {
    case "grid":
      return (
        <svg {...p}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "clock":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "cart":
      return (
        <svg {...p}>
          <circle cx="9" cy="20" r="1.4" />
          <circle cx="18" cy="20" r="1.4" />
          <path d="M2 3h3l2.4 12.4a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L21 7H6" />
        </svg>
      );
    case "mail":
      return (
        <svg {...p}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      );
    case "push":
      return (
        <svg {...p}>
          <path d="M12 3a6 6 0 0 0-6 6c0 5-2 6-2 6h16s-2-1-2-6a6 6 0 0 0-6-6Z" />
          <path d="M10.5 20a1.8 1.8 0 0 0 3 0" />
        </svg>
      );
    case "chart":
      return (
        <svg {...p}>
          <path d="M4 20V4M4 20h16" />
          <path d="M8 16v-4M13 16V8M18 16v-6" />
        </svg>
      );
    case "users":
      return (
        <svg {...p}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
          <path d="M16 5.5a3 3 0 0 1 0 5.6M17 20a5.5 5.5 0 0 0-3-4.9" />
        </svg>
      );
    case "list":
      return (
        <svg {...p}>
          <path d="M8 6h13M8 12h13M8 18h13" />
          <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
        </svg>
      );
    case "store":
      return (
        <svg {...p}>
          <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
          <path d="M3 4h18l1 5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0l1-5Z" />
        </svg>
      );
    case "info":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
      );
    case "gift":
      return (
        <svg {...p}>
          <rect x="3" y="8" width="18" height="4" rx="1" />
          <path d="M5 12v8h14v-8M12 8v12" />
          <path d="M12 8S10.5 4 8.5 4 6 6.5 8 8h4Zm0 0s1.5-4 3.5-4S18 6.5 16 8h-4Z" />
        </svg>
      );
    case "question":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7M12 17h.01" />
        </svg>
      );
    case "chevronDown":
      return (
        <svg {...p}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "menu":
      return (
        <svg {...p}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
    case "search":
      return (
        <svg {...p}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" />
        </svg>
      );
    case "help":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7M12 17h.01" />
        </svg>
      );
    case "moon":
      return (
        <svg {...p}>
          <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z" />
        </svg>
      );
    case "bell":
      return (
        <svg {...p}>
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8Z" />
          <path d="M10.5 20a1.8 1.8 0 0 0 3 0" />
        </svg>
      );
    case "feedback":
      return (
        <svg {...p}>
          <path d="M7 10v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3Zm0 0 4-7a2 2 0 0 1 2 2v3h5.5a2 2 0 0 1 2 2.3l-1.3 7a2 2 0 0 1-2 1.7H7" />
        </svg>
      );
    case "eye":
      return (
        <svg {...p}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "eyeOff":
      return (
        <svg {...p}>
          <path d="M10.7 6.2A9.9 9.9 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3 3.6M6.5 6.5A17 17 0 0 0 2 12s3.5 6 10 6a9.6 9.6 0 0 0 4.5-1.1" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
        </svg>
      );
    case "table":
      return (
        <svg {...p}>
          <path d="M4 5h16v4H4z" />
          <path d="M3 9h18M5 9l1 10M19 9l-1 10M12 9v10" />
        </svg>
      );
    case "plus":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case "chat":
      return (
        <svg {...p}>
          <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2Z" />
        </svg>
      );
    case "creditCard":
      return (
        <svg {...p}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18M7 15h4" />
        </svg>
      );
    case "box":
      return (
        <svg {...p}>
          <path d="M12 3 3 7.5v9L12 21l9-4.5v-9Z" />
          <path d="M3 7.5 12 12l9-4.5M12 12v9" />
        </svg>
      );
    case "globe":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.5 3.8 5.8 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.8-3.8-9S9.5 5.5 12 3Z" />
        </svg>
      );
    case "sliders":
      return (
        <svg {...p}>
          <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M18 18h2" />
          <circle cx="16" cy="6" r="2" />
          <circle cx="10" cy="12" r="2" />
          <circle cx="16" cy="18" r="2" />
        </svg>
      );
    case "lock":
      return (
        <svg {...p}>
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case "doc":
      return (
        <svg {...p}>
          <path d="M6 2h8l4 4v16H6z" />
          <path d="M14 2v4h4M9 13h6M9 17h6" />
        </svg>
      );
    case "chevronRight":
      return (
        <svg {...p}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      );
    case "tag":
      return (
        <svg {...p}>
          <path d="M20.6 13.4 12 22l-9-9V4a1 1 0 0 1 1-1h9l7.6 7.6a2 2 0 0 1 0 2.8Z" />
          <circle cx="7.5" cy="7.5" r="1.3" />
        </svg>
      );
    case "trash":
      return (
        <svg {...p}>
          <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
        </svg>
      );
    case "image":
      return (
        <svg {...p}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9.5" r="1.5" />
          <path d="m4 18 5-5 4 4 3-3 4 4" />
        </svg>
      );
    case "pencil":
      return (
        <svg {...p}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case "check":
      return (
        <svg {...p}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case "close":
      return (
        <svg {...p}>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...p}>
          <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
      );
    case "drag":
      return (
        <svg {...p} fill="currentColor" stroke="none">
          <circle cx="9" cy="6" r="1.4" />
          <circle cx="15" cy="6" r="1.4" />
          <circle cx="9" cy="12" r="1.4" />
          <circle cx="15" cy="12" r="1.4" />
          <circle cx="9" cy="18" r="1.4" />
          <circle cx="15" cy="18" r="1.4" />
        </svg>
      );
    case "tv":
      return (
        <svg {...p}>
          <rect x="2" y="7" width="20" height="13" rx="2" />
          <path d="m7 4 5 3 5-3" />
        </svg>
      );
    case "more":
      return (
        <svg {...p} fill="currentColor" stroke="none">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...p}>
          <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
        </svg>
      );
    case "play":
      return (
        <svg {...p} fill="currentColor" stroke="none">
          <path d="M7 5v14l11-7z" />
        </svg>
      );
    case "warn":
      return (
        <svg {...p}>
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      );
    case "coffee":
      return (
        <svg {...p}>
          <path d="M6 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z" />
          <path d="M18 10h1a3 3 0 0 1 0 6h-1M6 4v2M10 4v2M14 4v2" />
        </svg>
      );
  }
}
