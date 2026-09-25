// In-app update check (Android APK only — every function is inert on web).
// No Capacitor imports anywhere: the runtime plugin registry keeps web and
// desktop builds compiling while the APK resolves natively at runtime.
const RELEASES_URL =
  "https://api.github.com/cyberbuddhy/ArchiveTunaApp/releases?per_page=5";
const dismissKey = (tag: string) => `archive_update_dismissed_${tag}`;

function getCapacitor(): any {
  try {
    return (window as unknown as { Capacitor?: any }).Capacitor ?? null;
  } catch {
    return null;
  }
}

export function isNativeApp(): boolean {
  try {
    return Boolean(getCapacitor()?.isNativePlatform?.());
  } catch {
    return false;
  }
}

// Compares "v0.2.0-beta.7" style tags. Returns 1 if a > b, -1 if a < b, 0 if equal.
// Stable beats prerelease on the same core; numeric suffixes compare numerically.
export function compareAppVersions(a: string, b: string): number {
  const norm = (v: string) => v.trim().replace(/^[vV]/, "");
  const splitNum = (s: string) => {
    const m = s.match(/^(.*?)(\d+)$/);
    return { head: m ? m[1] : s, num: m ? parseInt(m[2], 10) : 0 };
  };
  const parse = (v: string) => {
    const [core, ...preParts] = norm(v).split("-");
    return { nums: core.split(".").map((n) => parseInt(n, 10) || 0), pre: preParts.join("-") };
  };
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < Math.max(pa.nums.length, pb.nums.length); i++) {
    const d = (pa.nums[i] || 0) - (pb.nums[i] || 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  if (pa.pre === pb.pre) return 0;
  if (!pa.pre) return 1;
  if (!pb.pre) return -1;
  const na = splitNum(pa.pre);
  const nb = splitNum(pb.pre);
  if (na.head === nb.head) {
    if (na.num === nb.num) return 0;
    return na.num > nb.num ? 1 : -1;
  }
  return na.head > nb.head ? 1 : -1;
}

export interface UpdateInfo {
  tag: string;
  url: string;
  current: string;
}

// Latest non-draft GitHub release newer than the installed build, unless
// dismissed. Null everywhere except a native build with an update pending.
export async function checkForAppUpdate(): Promise<UpdateInfo | null> {
  if (!isNativeApp()) return null;
  let current = "";
  try {
    current = (await getCapacitor()?.Plugins?.App?.getInfo?.())?.version || "";
  } catch {
    return null;
  }
  if (!current) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(RELEASES_URL, {
      headers: { Accept: "application/vnd.github+json" },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const rels: any[] = await res.json();
    const latest = (rels || [])
      .filter((r) => r && !r.draft && r.tag_name)
      .sort(
        (x, y) => Date.parse(y.published_at || 0) - Date.parse(x.published_at || 0)
      )[0];
    if (!latest) return null;
    if (compareAppVersions(latest.tag_name, current) <= 0) return null;
    try {
      if (localStorage.getItem(dismissKey(latest.tag_name))) return null;
    } catch {
      return null;
    }
    return {
      tag: latest.tag_name,
      url:
        latest.html_url ||
        `https://github.com/cyberbuddhy/ArchiveTunaApp/releases/tag/${latest.tag_name}`,
      current,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function dismissUpdate(tag: string): void {
  try {
    localStorage.setItem(dismissKey(tag), "1");
  } catch {
    /* private mode — banner simply returns next launch */
  }
}

// System browser on native (Browser plugin), new tab on web.
export async function openRelease(url: string): Promise<void> {
  try {
    const cap = getCapacitor();
    const plugin = cap?.Plugins?.Browser;
    if (cap?.isNativePlatform?.() && plugin?.open) {
      await plugin.open({ url });
      return;
    }
  } catch {
    /* fall through to window.open */
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
