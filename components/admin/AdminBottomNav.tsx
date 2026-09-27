"use client";

export type AdminTab = "schedule" | "summary" | "history" | "members" | "settings";

interface NavItem {
  tab: AdminTab;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

function iconProps(active: boolean) {
  return {
    viewBox: "0 0 24 24",
    className: "h-5 w-5",
    fill: "none",
    stroke: active ? "var(--brand-deep)" : "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

const ITEMS: NavItem[] = [
  {
    tab: "schedule",
    label: "Schedule",
    icon: (active) => (
      <svg {...iconProps(active)}>
        <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
        <path d="M3 9.5h18M8 3v3M16 3v3" />
      </svg>
    ),
  },
  {
    tab: "summary",
    label: "Summary",
    icon: (active) => (
      <svg {...iconProps(active)}>
        <path d="M4 20V10M12 20V4M20 20v-7" />
      </svg>
    ),
  },
  {
    tab: "history",
    label: "History",
    icon: (active) => (
      <svg {...iconProps(active)}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    ),
  },
  {
    tab: "members",
    label: "Members",
    icon: (active) => (
      <svg {...iconProps(active)}>
        <circle cx="9" cy="8.5" r="3" />
        <path d="M2.5 19c.8-3.3 3.3-5 6.5-5s5.7 1.7 6.5 5M16 8.5a3 3 0 1 1 3.6 2.94M18 14c2 .3 3.4 1.7 4 4" />
      </svg>
    ),
  },
  {
    tab: "settings",
    label: "Settings",
    icon: (active) => (
      <svg {...iconProps(active)}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 13a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V19a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.96 17.34a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 13 1.7 1.7 0 0 0 3 12h-.5a2 2 0 1 1 0-4H3a1.7 1.7 0 0 0 1.6-1c.24-.6.11-1.3-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06c.57.45 1.27.58 1.87.34H9c.6-.24 1-.86 1.04-1.56V.5a2 2 0 1 1 4 0v.09c.04.7.44 1.32 1.04 1.56.6.24 1.3.11 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.45.57-.58 1.27-.34 1.87V6c.24.6.86 1 1.56 1.04h.5a2 2 0 1 1 0 4h-.09c-.7.04-1.32.44-1.56 1.04Z" />
      </svg>
    ),
  },
];

interface AdminBottomNavProps {
  active: AdminTab;
  onSelect: (tab: AdminTab) => void;
  historyBadgeCount: number;
}

/** Fixed-to-viewport-bottom tab bar (§ design-system foundation) —
 * replaces the old top pill-row nav. Works at any width, not just
 * mobile; callers must leave bottom padding on scrollable content so
 * this bar never covers it (see AdminDashboard's page wrapper). */
export function AdminBottomNav({ active, onSelect, historyBadgeCount }: AdminBottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
      <div className="mx-auto flex max-w-5xl justify-around px-1 py-1.5">
        {ITEMS.map((item) => {
          const isActive = item.tab === active;
          return (
            <button
              key={item.tab}
              type="button"
              onClick={() => onSelect(item.tab)}
              className="relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium"
            >
              <span className={isActive ? "text-brand-deep" : "text-neutral-400 dark:text-neutral-500"}>
                {item.icon(isActive)}
              </span>
              <span className={isActive ? "text-brand-deep" : "text-neutral-500 dark:text-neutral-400"}>
                {item.label}
              </span>
              {item.tab === "history" && historyBadgeCount > 0 && (
                <span className="absolute right-3 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[9px] font-semibold text-white">
                  {historyBadgeCount > 9 ? "9+" : historyBadgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
