import { NavLink } from "react-router-dom";

const REPORT_LINKS = [
  { label: "Builder", to: "/reports/builder" },
  { label: "History", to: "/reports/history" },
  { label: "Schedules", to: "/reports/schedules" },
];

export default function ReportsSubnav() {
  return (
    <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
      {REPORT_LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200"
          style={({ isActive }) => ({
            fontFamily: "var(--font-sans)",
            textDecoration: "none",
            border: isActive ? "1px solid var(--accent-edge)" : "1px solid #E5E7EB",
            background: isActive ? "var(--accent-grad)" : undefined,
            color: isActive ? "#FFFFFF" : undefined
          })}
        >
          {link.label}
        </NavLink>
      ))}
    </div>
  );
}
