// components/StatusBadge.tsx
import React from "react";
import type { MatchRecord } from "@/types";

type Props = { tier: MatchRecord["TIER"] };

export default function StatusBadge({ tier }: Props) {
  const style: React.CSSProperties = {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    ...styleByTier(tier),
  };
  return <span style={style}>{tier}</span>;
}

function styleByTier(tier: MatchRecord["TIER"]): React.CSSProperties {
  if (tier === "ALTA")    return { background: "#e8f5e9", color: "#2e7d32", border: "1px solid #c8e6c9" };
  if (tier === "REVISAR") return { background: "#fff8e1", color: "#f57f17", border: "1px solid #ffe082" };
  return { background: "#ffebee", color: "#c62828", border: "1px solid #ffcdd2" };
}
