import { createFileRoute } from "@tanstack/react-router";
import { MvmShell } from "@/components/mvm/shell";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <MvmShell />;
}
