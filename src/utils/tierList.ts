import { TierRank, TierItem, TierList } from "../types";

export const TIER_RANKS: TierRank[] = ["S", "A", "B", "C", "D", "F"];

export interface TierStyleConfig {
  rank: TierRank;
  label: string;
  name: string;
  hex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  description: string;
}

export const TIER_CONFIG: Record<TierRank, TierStyleConfig> = {
  S: {
    rank: "S",
    label: "S",
    name: "S Tier",
    hex: "#ef4444",
    bgClass: "bg-red-500",
    textClass: "text-black",
    borderClass: "border-red-600",
    description: "Masterpiece / Essential",
  },
  A: {
    rank: "A",
    label: "A",
    name: "A Tier",
    hex: "#f97316",
    bgClass: "bg-orange-500",
    textClass: "text-black",
    borderClass: "border-orange-600",
    description: "Outstanding / Great",
  },
  B: {
    rank: "B",
    label: "B",
    name: "B Tier",
    hex: "#eab308",
    bgClass: "bg-yellow-400",
    textClass: "text-black",
    borderClass: "border-yellow-500",
    description: "Solid / Good",
  },
  C: {
    rank: "C",
    label: "C",
    name: "C Tier",
    hex: "#22c55e",
    bgClass: "bg-emerald-500",
    textClass: "text-black",
    borderClass: "border-emerald-600",
    description: "Average / Decent",
  },
  D: {
    rank: "D",
    label: "D",
    name: "D Tier",
    hex: "#3b82f6",
    bgClass: "bg-blue-500",
    textClass: "text-black",
    borderClass: "border-blue-600",
    description: "Mediocre / Flawed",
  },
  F: {
    rank: "F",
    label: "F",
    name: "F Tier",
    hex: "#a855f7",
    bgClass: "bg-purple-500",
    textClass: "text-black",
    borderClass: "border-purple-600",
    description: "Skip / Poor",
  },
};

/**
 * Generates formatted text/markdown for a Tier List
 */
export function formatTierListAsText(
  tierListName: string,
  items: TierItem[],
  format: "markdown" | "plain" = "markdown"
): string {
  const grouped: Record<TierRank, TierItem[]> = {
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
    F: [],
  };

  items.forEach((item) => {
    if (grouped[item.rank]) {
      grouped[item.rank].push(item);
    }
  });

  const now = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  if (format === "plain") {
    let out = `=== ${tierListName.toUpperCase()} ===\nGenerated via ArchiveTuna • ${now}\n\n`;
    TIER_RANKS.forEach((rank) => {
      const list = grouped[rank];
      out += `[${rank} TIER] (${list.length})\n`;
      if (list.length === 0) {
        out += `  (Empty)\n`;
      } else {
        list.forEach((item, idx) => {
          out += `  ${idx + 1}. ${item.albumTitle} - ${item.artist}${item.year ? ` (${item.year})` : ""}\n`;
        });
      }
      out += `\n`;
    });
    return out.trim();
  }

  // Markdown format
  let md = `# ${tierListName}\n*Generated via ArchiveTuna • ${now}*\n\n`;
  TIER_RANKS.forEach((rank) => {
    const list = grouped[rank];
    md += `## ${rank} Tier (${list.length})\n`;
    if (list.length === 0) {
      md += `*Empty*\n\n`;
    } else {
      list.forEach((item) => {
        md += `- **${item.albumTitle}** — ${item.artist}${item.year ? ` *(${item.year})*` : ""}\n`;
      });
      md += `\n`;
    }
  });
  return md.trim();
}

/**
 * Downloads a string content as a text or markdown file
 */
export function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports the Tier List as a high-resolution PNG image using HTML5 Canvas
 */
export async function exportTierListAsImage(
  tierListName: string,
  items: TierItem[]
): Promise<void> {
  const grouped: Record<TierRank, TierItem[]> = {
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
    F: [],
  };

  items.forEach((item) => {
    if (grouped[item.rank]) {
      grouped[item.rank].push(item);
    }
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = 1200;
  const headerHeight = 90;
  const rowHeight = 110;
  const labelWidth = 110;
  const totalHeight = headerHeight + rowHeight * TIER_RANKS.length + 30;

  canvas.width = width;
  canvas.height = totalHeight;

  // Background
  ctx.fillStyle = "#0c0a09"; // stone-950
  ctx.fillRect(0, 0, width, totalHeight);

  // Header Title
  ctx.fillStyle = "#f5f5f4";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText(tierListName, 25, 48);

  // Subtitle
  ctx.fillStyle = "#a8a29e";
  ctx.font = "14px sans-serif";
  ctx.fillText("ArchiveTuna • Tier List", 25, 74);

  const startY = headerHeight;

  // Render each row
  for (let rIdx = 0; rIdx < TIER_RANKS.length; rIdx++) {
    const rank = TIER_RANKS[rIdx];
    const cfg = TIER_CONFIG[rank];
    const rowY = startY + rIdx * rowHeight;
    const rowItems = grouped[rank];

    // Left label block
    ctx.fillStyle = cfg.hex;
    ctx.fillRect(20, rowY, labelWidth, rowHeight - 4);

    // Rank letter
    ctx.fillStyle = "#000000";
    ctx.font = "bold 44px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(rank, 20 + labelWidth / 2, rowY + (rowHeight - 4) / 2);

    // Reset alignment
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    // Items area background
    ctx.fillStyle = "#1c1917"; // stone-900
    ctx.fillRect(20 + labelWidth, rowY, width - 40 - labelWidth, rowHeight - 4);

    // Border line under row
    ctx.fillStyle = "#292524";
    ctx.fillRect(20, rowY + rowHeight - 4, width - 40, 2);

    // Render album thumbnails in the row
    const itemWidth = 100;
    const itemGap = 8;
    const startX = 20 + labelWidth + 12;

    if (rowItems.length > 0) {
      for (let i = 0; i < rowItems.length; i++) {
        const item = rowItems[i];
        const cardX = startX + i * (itemWidth + itemGap);
        if (cardX + itemWidth > width - 30) break; // Overflow protection

        const cardY = rowY + 6;
        const cardH = rowHeight - 16;

        // Card background
        ctx.fillStyle = "#292524";
        ctx.fillRect(cardX, cardY, itemWidth, cardH);

        // Try to draw cover image if possible, else fallback tile
        let imageDrawn = false;
        if (item.coverUrl) {
          try {
            const img = await loadImageAsync(item.coverUrl);
            ctx.drawImage(img, cardX, cardY, cardH, cardH);
            imageDrawn = true;
          } catch (e) {
            imageDrawn = false;
          }
        }

        if (!imageDrawn) {
          // Fallback album art box
          ctx.fillStyle = "#44403c";
          ctx.fillRect(cardX, cardY, cardH, cardH);
          ctx.fillStyle = cfg.hex;
          ctx.beginPath();
          ctx.arc(cardX + cardH / 2, cardY + cardH / 2, 16, 0, Math.PI * 2);
          ctx.fill();
        }

        // Overlay text at right of card or under
        // Card title & artist
        const textX = cardX + cardH + 6;
        const maxTextW = itemWidth - cardH - 8;
        if (maxTextW > 20) {
          ctx.fillStyle = "#f5f5f4";
          ctx.font = "bold 10px sans-serif";
          ctx.fillText(truncateText(ctx, item.albumTitle, maxTextW), textX, cardY + 24);

          ctx.fillStyle = "#a8a29e";
          ctx.font = "9px sans-serif";
          ctx.fillText(truncateText(ctx, item.artist, maxTextW), textX, cardY + 40);
        }
      }
    }
  }

  // Trigger download
  const sanitized = tierListName.replace(/[/\\?%*:|"<>]/g, "-").toLowerCase();
  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${sanitized}-tier-list.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let len = text.length;
  while (len > 0 && ctx.measureText(text.slice(0, len) + "…").width > maxWidth) {
    len--;
  }
  return text.slice(0, len) + "…";
}

function loadImageAsync(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}
