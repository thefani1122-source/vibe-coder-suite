import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Safe renderer for the agent's chat prose.
 *
 * The agent is instructed to write conversational sentences with occasional
 * dash bullets, **bold** names and `inline code`. Some providers still emit
 * markdown tables and fenced code blocks, which render as raw pipes and
 * backticks in the chat — so those are NORMALIZED instead: a table becomes a
 * compact bullet row per line, a fence becomes a monospace block. Headings
 * become bold paragraphs.
 *
 * Elements are built, never injected as HTML: no text from the model can
 * carry markup into the page. This is deliberately not a full markdown
 * implementation — anything unrecognized renders as the plain text it is.
 */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  // Split on bold, inline code and links in one pass so they cannot nest.
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g).filter(Boolean);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={key} className="font-semibold text-white/95">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={key}
          className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[12px] text-orange-200/90"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      return (
        <a
          key={key}
          href={link[2]}
          target="_blank"
          rel="noreferrer noopener"
          className="underline underline-offset-2 text-orange-300/90 hover:text-orange-200"
        >
          {link[1]}
        </a>
      );
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

/** Table lines become one readable row per line: `a — b — c`. */
function normalizeTableLine(line: string): string | null {
  if (!line.includes("|")) return null;
  if (/^[\s|:-]+$/.test(line)) return ""; // separator row — drop it
  const cells = line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => c.trim())
    .filter(Boolean);
  if (cells.length === 0) return null;
  return cells.join(" — ");
}

export function AgentMarkdown({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  // Held in a holder so TS keeps the union across the forEach below.
  const codeHolder: { lines: string[] | null } = { lines: null };

  const flushBullets = () => {
    if (bullets.length === 0) return;
    const items = bullets;
    bullets = [];
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="ml-1 flex flex-col gap-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden="true" className="select-none text-white/30">
              •
            </span>
            <span className="min-w-0 flex-1">{renderInline(item, `b-${blocks.length}-${i}`)}</span>
          </li>
        ))}
      </ul>,
    );
  };

  lines.forEach((raw, li) => {
    const code = codeHolder.lines;
    if (code !== null) {
      if (/^\s*```/.test(raw)) {
        // Closing fence — emit the collected lines as a monospace block.
        const body = code.join("\n");
        codeHolder.lines = null;
        blocks.push(
          <pre
            key={`code-${blocks.length}`}
            className="overflow-x-auto rounded-md bg-white/[0.05] px-3 py-2 font-mono text-[12px] leading-relaxed text-white/80"
          >
            {body}
          </pre>,
        );
      } else {
        code.push(raw);
      }
      return;
    }
    if (/^\s*```/.test(raw)) {
      codeHolder.lines = [];
      return;
    }

    const tableRow = normalizeTableLine(raw.trim());
    const line =
      tableRow !== null && tableRow !== "" ? tableRow : tableRow === "" ? "" : raw.trim();

    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    if (bullet?.[1]) {
      bullets.push(bullet[1]);
      return;
    }
    const numbered = /^(\d+)[.)]\s+(.*)$/.exec(line);
    if (numbered?.[2]) {
      bullets.push(`${numbered[1]}. ${numbered[2]}`);
      return;
    }
    flushBullets();
    if (!line) return;
    const heading = /^#{1,4}\s+(.*)$/.exec(line);
    blocks.push(
      <p
        key={`p-${blocks.length}-${li}`}
        className={cn("break-words", heading && "font-semibold text-white/95")}
      >
        {renderInline(heading?.[1] ?? line, `p-${blocks.length}-${li}`)}
      </p>,
    );
  });
  if (codeHolder.lines !== null && codeHolder.lines.length > 0) {
    blocks.push(
      <pre
        key={`code-${blocks.length}`}
        className="overflow-x-auto rounded-md bg-white/[0.05] px-3 py-2 font-mono text-[12px] leading-relaxed text-white/80"
      >
        {codeHolder.lines.join("\n")}
      </pre>,
    );
  }
  flushBullets();

  return (
    <div className={cn("flex flex-col gap-2 text-sm leading-relaxed text-white/80", className)}>
      {blocks}
    </div>
  );
}
