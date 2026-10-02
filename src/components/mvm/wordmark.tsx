import { cn } from "@/lib/utils";

type MvmWordmarkProps = {
  mode?: "gate" | "boot" | "live";
  className?: string;
};

export function MvmWordmark({ mode = "live", className }: MvmWordmarkProps) {
  return (
    <div
      className={cn("mvm-wordmark", `mvm-wordmark--${mode}`, className)}
      role="img"
      aria-label="MVMCMD"
    >
      <span className="mvm-wordmark__depth" aria-hidden="true">
        MVM
      </span>
      <span className="mvm-wordmark__face" aria-hidden="true">
        MVM
      </span>
      <span className="mvm-wordmark__cmd" aria-hidden="true">
        CMD
      </span>
      <span className="mvm-wordmark__rule" aria-hidden="true" />
      {mode !== "live" && (
        <span className="mvm-wordmark__meta" aria-hidden="true">
          MACHINE VECTOR MODULE
        </span>
      )}
    </div>
  );
}
