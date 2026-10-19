export class ExprError extends Error {
  constructor() {
    super("Expressão recusada.");
    this.name = "ExprError";
  }
}

export type ExprVars = {
  cash: number;
  rep: number;
  week: number;
  debt: (template: string) => number;
};

/** Gramática fechada: números, + − * /, parênteses, min, max, round, debt(modelo) e cash|caixa|rep|week. */
export function evalExpr(raw: string, vars: ExprVars): number {
  const source = raw.trim().replace(/−/g, "-");
  if (!source) throw new ExprError();
  let index = 0;
  if (source[0] === "=") index = 1;

  const value = parseExpr();
  skip();
  if (index !== source.length || !Number.isFinite(value)) throw new ExprError();
  return value;

  function skip(): void {
    while (source[index] === " " || source[index] === "\t") index += 1;
  }

  function parseExpr(): number {
    let left = parseTerm();
    for (;;) {
      skip();
      const op = source[index];
      if (op !== "+" && op !== "-") break;
      index += 1;
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parseUnary();
    for (;;) {
      skip();
      const op = source[index];
      if (op !== "*" && op !== "/") break;
      index += 1;
      const right = parseUnary();
      if (op === "/" && right === 0) throw new ExprError();
      left = op === "*" ? left * right : left / right;
    }
    return left;
  }

  function parseUnary(): number {
    skip();
    if (source[index] === "+") {
      index += 1;
      return parseUnary();
    }
    if (source[index] === "-") {
      index += 1;
      return -parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    skip();
    const ch = source[index];
    if (ch === "(") {
      index += 1;
      const inner = parseExpr();
      skip();
      if (source[index] !== ")") throw new ExprError();
      index += 1;
      return inner;
    }
    if (ch && /[0-9.]/.test(ch)) return parseNumber();
    if (ch === "{") {
      index += 1;
      const name = readIdent();
      if (source[index] !== "}") throw new ExprError();
      index += 1;
      return variable(name);
    }
    if (ch && /[A-Za-z_]/.test(ch)) return parseName();
    throw new ExprError();
  }

  function parseNumber(): number {
    const start = index;
    if (source[index] === ".") throw new ExprError();
    while (/[0-9]/.test(source[index] ?? "")) index += 1;
    if (source[index] === ".") {
      index += 1;
      if (!/[0-9]/.test(source[index] ?? "")) throw new ExprError();
      while (/[0-9]/.test(source[index] ?? "")) index += 1;
    }
    const text = source.slice(start, index);
    if (!/^\d+(\.\d+)?$/.test(text)) throw new ExprError();
    return Number(text);
  }

  function readIdent(): string {
    if (!/[A-Za-z_]/.test(source[index] ?? "")) throw new ExprError();
    const start = index;
    index += 1;
    while (/[A-Za-z0-9_]/.test(source[index] ?? "")) index += 1;
    return source.slice(start, index);
  }

  function parseName(): number {
    const name = readIdent();
    skip();
    if (source[index] === "(") {
      index += 1;
      if (name === "debt") {
        skip();
        const id = readIdent();
        skip();
        if (source[index] !== ")") throw new ExprError();
        index += 1;
        return vars.debt(id);
      }
      if (name === "min" || name === "max" || name === "round") {
        const args: number[] = [];
        skip();
        if (source[index] !== ")") {
          args.push(parseExpr());
          skip();
          while (source[index] === ",") {
            index += 1;
            args.push(parseExpr());
            skip();
          }
        }
        if (source[index] !== ")") throw new ExprError();
        index += 1;
        if (name === "round") {
          if (args.length !== 1) throw new ExprError();
          return Math.round(args[0] ?? Number.NaN);
        }
        if (args.length < 2) throw new ExprError();
        return name === "min" ? Math.min(...args) : Math.max(...args);
      }
      throw new ExprError();
    }
    if (name === "cash" || name === "caixa") return vars.cash;
    if (name === "rep") return vars.rep;
    if (name === "week") return vars.week;
    throw new ExprError();
  }

  function variable(name: string): number {
    if (name === "cash" || name === "caixa") return vars.cash;
    if (name === "rep") return vars.rep;
    if (name === "week") return vars.week;
    throw new ExprError();
  }
}
