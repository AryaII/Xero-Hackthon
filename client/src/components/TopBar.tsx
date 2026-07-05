import { Bell, Building2, Settings } from "lucide-react";

export function TopBar({ orgName, demoMode }: { orgName: string | null; demoMode: boolean }) {
  return (
    <header className="sticky top-0 z-10 h-16 border-b border-xero-line bg-white">
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-xero-blue text-[13px] font-bold text-white">
            X
          </span>
          <div className="flex flex-col leading-none">
            <span className="text-[16px] font-semibold text-xero-ink">CashFlow Growth Agent</span>
            <span className="text-[10px] text-xero-grey">Works with Xero</span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-xero-line bg-xero-bg px-3 py-1.5 text-[13px] text-xero-ink">
          <Building2 size={14} className="text-xero-grey" />
          {orgName ?? "Not connected"}
          {demoMode && (
            <span className="rounded-full bg-warn-bg px-1.5 py-0.5 text-[10px] font-medium uppercase text-warn">
              Demo
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button aria-label="Notifications" className="relative text-xero-grey hover:text-xero-ink">
            <Bell size={18} />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-risk" />
          </button>
          <button aria-label="Settings" className="text-xero-grey hover:text-xero-ink">
            <Settings size={18} />
          </button>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-xero-navy text-[11px] font-medium text-white">
            SC
          </span>
        </div>
      </div>
    </header>
  );
}
