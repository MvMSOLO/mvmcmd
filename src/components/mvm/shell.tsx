import { useEffect, useMemo, useRef, useState } from "react";
// RESTORE_NEEDED — full file too large for single tool payload in this session.
// Run: git checkout 86dfdc66fd1e2c469d09b9657805c61a0a556ad2 -- src/components/mvm/shell.tsx
// Then re-apply CommandIcon import + quick-action icon span from command-icons.
export function MvmShell() {
  return (
    <div className="p-6 font-mono text-sm text-fg">
      MVMCMD shell temporarily needs restore from commit 86dfdc66. See RESTORE note in repo history.
    </div>
  );
}
