import { cn } from "@/lib/utils";
import type { LogLine } from "@/lib/mvm/types";
import { CommandIcon, isKnownCommandIcon } from "@/lib/mvm/command-icons";

function headToken(text: string): string {
  const match = text.trim().match(/^([a-zA-Z][a-zA-Z0-9_-]*)/);
  return match?.[1]?.toLowerCase() ?? "";
}

function resolveRowCommand(row: LogLine): string {
  if (row.command && isKnownCommandIcon(row.command)) return row.command;
  if (row.kind === "out" || row.kind === "sys") {
    const head = headToken(row.text);
    if (head && isKnownCommandIcon(head)) return head;
  }
  return "";
}

export function LogRow({
  row,
  index,
  onOpen,
}: {
  row: LogLine;
  index: number;
  onOpen: (id: string) => void;
}) {
  const color =
    row.kind === "ok"
      ? "text-ok"
      : row.kind === "warn"
        ? "text-warn"
        : row.kind === "in"
          ? "text-fg"
          : row.kind === "sys"
            ? "text-accent"
            : "text-muted";

  const command = resolveRowCommand(row);

  const body = (
    <>
      {row.kind === "in" && <span className="mr-2 text-accent">▸</span>}
      {command ? (
        <CommandIcon command={command} size={12} className="mr-1.5 inline-block align-[-2px] opacity-85" />
      ) : null}
      <span>{row.text}</span>
      {row.meta ? <span className="ml-3 text-faint">{row.meta}</span> : null}
    </>
  );

  if (row.appId && (row.kind === "match" || row.kind === "out")) {
    return (
      <button
        type="button"
        onClick={() => onOpen(row.appId!)}
        className={cn("mvm-motion-log-cascade block w-full text-left", color)}
        style={{ animationDelay: `${Math.min(index, 20) * 35}ms` }}
      >
        {body}
      </button>
    );
  }

  return (
    <p className={cn("mvm-motion-log-cascade", color)} style={{ animationDelay: `${Math.min(index, 20) * 35}ms` }}>
      {body}
    </p>
  );
}
