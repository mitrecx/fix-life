import { NavLink, useLocation } from "react-router-dom";
import { type LucideIcon } from "lucide-react";

export type MobileBottomNavItem =
  | {
      type: "link";
      path: string;
      label: string;
      icon: LucideIcon;
    }
  | {
      type: "menu";
      label: string;
      icon: LucideIcon;
      active: boolean;
      onClick: () => void;
    };

interface MobileBottomNavProps {
  items: MobileBottomNavItem[];
}

function isPathActive(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function MobileBottomNav({ items }: MobileBottomNavProps) {
  const location = useLocation();

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
      aria-label="主导航"
    >
      <div className="grid h-14" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = item.icon;

          if (item.type === "menu") {
            return (
              <button
                key="menu"
                type="button"
                onClick={item.onClick}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  item.active ? "text-indigo-600" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Icon size={20} strokeWidth={item.active ? 2.25 : 2} />
                <span>{item.label}</span>
              </button>
            );
          }

          const active = isPathActive(location.pathname, item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                active ? "text-indigo-600" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.25 : 2} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
