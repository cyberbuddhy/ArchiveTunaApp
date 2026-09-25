import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import {
  checkForAppUpdate,
  dismissUpdate,
  isNativeApp,
  openRelease,
  UpdateInfo,
} from "../services/appUpdate";

// In-app update banner (Android APK only — renders nothing on web).
// Shows once per new release: version jump, download pill, dismiss.
export const UpdateBanner: React.FC = () => {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    if (!isNativeApp()) return;
    if (sessionStorage.getItem("archive_update_checked")) return;
    sessionStorage.setItem("archive_update_checked", "1");
    let cancelled = false;
    checkForAppUpdate().then((info) => {
      if (!cancelled) setUpdate(info);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!update) return null;

  return (
    <div
      role="status"
      className="mb-3 flex items-center gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30"
    >
      <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
        <Download className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-stone-100 truncate">
          New version {update.tag} available
        </p>
        <p className="text-[11px] text-stone-400 truncate">
          You're on {update.current} — grab the latest APK from GitHub
        </p>
      </div>
      <button
        type="button"
        onClick={() => openRelease(update.url)}
        className="h-9 px-4 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors cursor-pointer shrink-0"
      >
        Download
      </button>
      <button
        type="button"
        onClick={() => {
          dismissUpdate(update.tag);
          setUpdate(null);
        }}
        className="p-1.5 rounded-full text-stone-500 hover:text-stone-100 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        title="Dismiss until next version"
        aria-label="Dismiss update notice"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
