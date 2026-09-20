import { Lamp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The Lampcode lamp mark.
 *
 * One component rather than the same classes copied into the sidebar and the
 * workspace header — those two drifted apart (a primary→accent gradient in one,
 * a tinted primary in the other) and read as two different brand colours, and
 * copying the classes across a second time only fixed it until the next edit.
 * Size is the only thing a caller chooses.
 */
export function BrandMark({ size = "md", className }: { size?: "sm" | "md"; className?: string }) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 shadow-[var(--shadow-glow)]",
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        className,
      )}
    >
      <Lamp className={cn("text-primary", size === "sm" ? "h-4 w-4" : "h-5 w-5")} />
    </div>
  );
}
