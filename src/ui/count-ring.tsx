import type { CSSProperties } from "react";

// Progress as a unitless 0-100 integer; the stylesheet turns it into the arc's percentage.
export function CountRing({ count, limit }: { count: number; limit: number }) {
  const progress = Math.min(100, Math.round((count / limit) * 100));
  return (
    <div
      className="count-ring"
      style={{ "--progress": progress } as CSSProperties}
    >
      <b>
        {count}/{limit}
      </b>
    </div>
  );
}
