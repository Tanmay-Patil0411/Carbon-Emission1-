import {
  Bars3Icon,
  BellIcon,
  MagnifyingGlassIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({
  onMenuClick,
}: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const fullName = user?.full_name || user?.fullName || "Authenticated User";
  const rawRole = user?.role || "admin";
  const roleLabel = rawRole === "admin" ? "Administrator" : (rawRole.charAt(0).toUpperCase() + rawRole.slice(1));

  const handleLogout = () => {
    logout();
    navigate("/signin", { replace: true });
  };

  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      {/* Left */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-slate-100 transition"
        >
          <Bars3Icon className="w-6 h-6 text-slate-600" />
        </button>

        <div className="hidden md:flex items-center relative">
          <MagnifyingGlassIcon className="absolute left-3 w-4 h-4 text-slate-400" />

          <input
            type="text"
            placeholder="Search activities, facilities, records..."
            className="w-72 pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg hover:bg-slate-100 transition">
          <BellIcon className="w-5 h-5 text-slate-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
        </button>

        {/* User Profile Badge */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900 leading-tight">{fullName}</p>
            <p className="text-[10px] font-semibold text-emerald-600 tracking-wide uppercase">{roleLabel}</p>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}