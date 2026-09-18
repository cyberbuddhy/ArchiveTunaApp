import React, { useMemo, useRef, useEffect, useState } from "react";
export function VirtualList<T>({ items, rowH, height, render }: { items: T[]; rowH: number; height: number; render: (it: T, i: number) => React.ReactNode }) {
  const [scroll, setScroll] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const total = items.length * rowH;
  const start = Math.max(0, Math.floor(scroll / rowH) - 4);
  const count = Math.ceil(height / rowH) + 8;
  const slice = useMemo(() => items.slice(start, start + count), [items, start, count]);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const fn = () => setScroll(el.scrollTop);
    el.addEventListener("scroll", fn, { passive: true });
    return () => el.removeEventListener("scroll", fn);
  }, []);
  return (
    <div ref={ref} style={{ height, overflowY: "auto" }} className="w-full">
      <div style={{ height: total, position: "relative" }}>
        {slice.map((it, k) => (
          <div key={start + k} style={{ position: "absolute", top: (start + k) * rowH, height: rowH, left: 0, right: 0 }}>
            {render(it, start + k)}
          </div>
        ))}
      </div>
    </div>
  );
}
