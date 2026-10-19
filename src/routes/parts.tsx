import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/parts")({
  beforeLoad: () => {
    throw redirect({ to: "/pecas" });
  },
});
