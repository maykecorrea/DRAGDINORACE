export function FossilWord({ children = "fóssil", lime = false }: { children?: string; lime?: boolean }) {
  return <span className={lime ? "fossil-token-lime" : "fossil-token"}>{children}</span>;
}
