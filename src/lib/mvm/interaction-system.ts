type PhysicalTarget = HTMLElement & {
  __mvmPhysicalFrame?: number;
};

function resetPhysical(target: HTMLElement) {
  target.style.setProperty("--mvm-physical-rx", "0deg");
  target.style.setProperty("--mvm-physical-ry", "0deg");
  target.style.setProperty("--mvm-physical-z", "0px");
}

function schedulePhysical(target: PhysicalTarget, clientX: number, clientY: number) {
  if (target.__mvmPhysicalFrame) return;

  target.__mvmPhysicalFrame = window.requestAnimationFrame(() => {
    target.__mvmPhysicalFrame = undefined;
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = Math.max(-1, Math.min(1, ((clientX - rect.left) / rect.width) * 2 - 1));
    const y = Math.max(-1, Math.min(1, ((clientY - rect.top) / rect.height) * 2 - 1));
    target.style.setProperty("--mvm-physical-rx", `${(-y * 1.7).toFixed(2)}deg`);
    target.style.setProperty("--mvm-physical-ry", `${(x * 2.2).toFixed(2)}deg`);
    target.style.setProperty("--mvm-physical-z", "1px");
  });
}

export function installMvmInteractionLayer(root: HTMLElement): () => void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    const target = (event.target as Element | null)?.closest<PhysicalTarget>("[data-mvm-physical]");
    if (!target || !root.contains(target)) return;
    if (!reduced) schedulePhysical(target, event.clientX, event.clientY);
  };

  const onPointerOut = (event: PointerEvent) => {
    const target = (event.target as Element | null)?.closest<PhysicalTarget>("[data-mvm-physical]");
    if (!target || !root.contains(target)) return;
    if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
    resetPhysical(target);
    target.classList.remove("mvm-physical-press");
  };

  const onPointerDown = (event: PointerEvent) => {
    const target = (event.target as Element | null)?.closest<PhysicalTarget>("[data-mvm-physical]");
    if (!target || !root.contains(target)) return;
    target.classList.add("mvm-physical-press");
  };

  const onPointerUp = (event: PointerEvent) => {
    const target = (event.target as Element | null)?.closest<PhysicalTarget>("[data-mvm-physical]");
    if (!target || !root.contains(target)) return;
    target.classList.remove("mvm-physical-press");
  };

  const onClick = (event: MouseEvent) => {
    const target = (event.target as Element | null)?.closest<HTMLElement>("[data-mvm-action]");
    if (!target || !root.contains(target)) return;
    target.classList.remove("mvm-micro-flash");
    window.requestAnimationFrame(() => {
      target.classList.add("mvm-micro-flash");
      window.setTimeout(() => target.classList.remove("mvm-micro-flash"), reduced ? 80 : 360);
    });
  };

  root.addEventListener("pointermove", onPointerMove, { passive: true });
  root.addEventListener("pointerout", onPointerOut, { passive: true });
  root.addEventListener("pointerdown", onPointerDown, { passive: true });
  root.addEventListener("pointerup", onPointerUp, { passive: true });
  root.addEventListener("pointercancel", onPointerUp, { passive: true });
  root.addEventListener("click", onClick);

  return () => {
    root.removeEventListener("pointermove", onPointerMove);
    root.removeEventListener("pointerout", onPointerOut);
    root.removeEventListener("pointerdown", onPointerDown);
    root.removeEventListener("pointerup", onPointerUp);
    root.removeEventListener("pointercancel", onPointerUp);
    root.removeEventListener("click", onClick);
  };
}
