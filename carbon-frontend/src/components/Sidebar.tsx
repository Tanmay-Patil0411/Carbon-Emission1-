import { NavLink } from "react-router-dom";
import {
  HomeIcon,
  TableCellsIcon,
  ChartBarIcon,
  CheckCircleIcon,
  DocumentArrowUpIcon,
  ChatBubbleLeftRightIcon,
  LightBulbIcon,
  ArrowTrendingDownIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";

interface SidebarProps {
  isOpen: boolean;
}

const navigation = [
  {
    name: "Dashboard",
    icon: HomeIcon,
    path: "/",
  },
  {
    name: "Activities",
    icon: TableCellsIcon,
    path: "/activities",
  },
  {
    name: "Carbon Footprint",
    icon: ChartBarIcon,
    path: "/emissions",
  },
  {
    name: "Environmental Audit",
    icon: CheckCircleIcon,
    path: "/validation",
  },
  {
    name: "Upload Data",
    icon: DocumentArrowUpIcon,
    path: "/upload",
  },
  {
    name: "Analytics & Hotspots",
    icon: ArrowTrendingDownIcon,
    path: "/analytics",
  },
  {
    name: "AI Assistant",
    icon: ChatBubbleLeftRightIcon,
    path: "/assistant",
  },
  {
    name: "Recommendations",
    icon: LightBulbIcon,
    path: "/recommendations",
  },
  {
    name: "What-if Simulator",
    icon: ArrowTrendingDownIcon,
    path: "/simulator",
  },
  {
    name: "Reports",
    icon: DocumentTextIcon,
    path: "/reports",
  },
  {
    name: "Settings",
    icon: Cog6ToothIcon,
    path: "/settings",
  },
];

import { useAuth } from "../context/AuthContext";

export default function Sidebar({ isOpen }: SidebarProps) {
  const { user } = useAuth();

  const fullName = user?.full_name || user?.fullName || "Authenticated User";
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2) || "AU";

  const rawRole = user?.role || "admin";
  const roleLabel = rawRole === "admin" ? "Administrator" : (rawRole.charAt(0).toUpperCase() + rawRole.slice(1));

  return (
    <aside
      className={`bg-slate-950 text-white flex flex-col transition-all duration-300 ${
        isOpen ? "w-72" : "w-20"
      }`}
    >
      {/* Logo */}
      <div className="h-20 px-5 flex items-center border-b border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
          <GlobeAltIcon className="w-6 h-6 text-white" />
        </div>

        {isOpen && (
          <div className="ml-3">
            <h1 className="font-bold text-lg leading-none">
              CarbonTrack
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Environmental ESG
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                } ${!isOpen ? "justify-center" : ""}`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />

              {isOpen && (
                <span className="truncate">
                  {item.name}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-800 p-4">
        <div
          className={`flex items-center ${
            isOpen ? "gap-3" : "justify-center"
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
            <span>{initials}</span>
          </div>

          {isOpen && (
            <div className="min-w-0">
              <p className="text-sm font-medium truncate text-white">
                {fullName}
              </p>
              <p className="text-xs text-slate-400">
                {roleLabel}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}