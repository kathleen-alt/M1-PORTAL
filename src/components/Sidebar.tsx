"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

const NAV = [
  { href: "/", label: "Who to Contact", icon: "🎯" },
  { href: "/territory", label: "Territory Manager", icon: "🗺️" },
  { href: "/leads", label: "Lead Discovery", icon: "🔍" },
  { href: "/pipeline", label: "CRM Pipeline", icon: "📊" },
  { href: "/campaigns", label: "Campaigns", icon: "✉️" },
  { href: "/sequences", label: "Email Sequences", icon: "📧" },
  { href: "/market", label: "Market Expansion", icon: "📈" },
  { href: "/heatmap", label: "Opportunity Heat Map", icon: "🔥" },
  { href: "/analytics", label: "Analytics", icon: "📉" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-64 flex-shrink-0 flex-col border-r border-orca-800 bg-orca-900/80">
      <div className="px-5 py-6">
        <div className="flex items-center gap-2.5">
          <Logo size={40} />
          <div>
            <div className="text-sm font-bold leading-tight">
              <span className="text-orca-200">Orca</span>{" "}
              <span className="text-kelp-400">Coast</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-orca-300">
              Growth Engine
            </div>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-kelp-600 font-medium text-white"
                  : "text-orca-200 hover:bg-orca-800"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-orca-800 px-5 py-4 text-xs text-orca-400">
        Demo mode · seeded data
      </div>
    </aside>
  );
}
