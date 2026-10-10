import { CommandIcon } from "@/lib/mvm/command-icons";

export function QuickActionChip({
  command,
  label,
  onClick,
}: {
  command: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-mvm-action="quick-action"
      data-mvm-physical
      onClick={onClick}
      className="mvm-quick-action mvm-neumorphic-control inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 py-1.5 font-mono text-micro text-muted transition-colors hover:border-line-strong hover:bg-raised hover:text-fg"
    >
      <CommandIcon command={command} size={13} className="opacity-90" />
      <span>{label}</span>
    </button>
  );
}
