import { readFileSync } from "fs";
import { join } from "path/posix";
import { jump_mark, split1br, temp_var } from "./helper";


const ops = [
    ["==", "equal"],
    ["!=", "not"],
    ["<", "lessThan"],
    [">", "greaterThan"],
    ["<=", "greaterEq"],
    [">=", "lessThanEq"],
    ["+", "add"],
    ["-", "sub"],
    ["*", "mul"],
    ["/", "div"],
    ["%", "mod"],
]
const ops_assign = [
    ["+", "add"],
    ["-", "sub"],
    ["*", "mul"],
    ["/", "div"],
    ["%", "mod"],
]


export interface TResult { code: string, result: string }

export function assign_target(value: string, target?: string): TResult {
    return target ? { code: `set ${target} ${value}\n`, result: target } : { code: "", result: value }
}

export function t_expr(expr: string, target?: string): TResult {
    if (target) target = target.trim()
    expr = expr.trim()
    const target_temp = target ?? temp_var()

    if (/^\d+$/.test(expr)) {
        const n = parseInt(expr)
        return assign_target(n.toString(), target)
    }

    for (const [op, mode] of ops) {
        let [l, r] = split1br(expr, op)
        if (r) {
            const lt = t_expr(l)
            const rt = t_expr(r)
            return { code: lt.code + rt.code + `op ${mode} ${target_temp} ${lt.result} ${rt.result}\n`, result: target_temp }
        }
    }

    if (expr.split(" ").length < 2) return assign_target(expr, target)

    throw new Error("invalid expression: " + expr);
}

export function t_line(line: string): string {
    line = line.trim()
    let vari, expr;


    for (const [op, mode] of ops_assign) {
        [vari, expr] = split1br(line, op + "=").map(s => s?.trim());
        if (expr) {
            const r = t_expr(expr)
            return r.code + `op ${mode} ${vari} ${vari} ${r.result}\n`
        }
    }

    [vari, expr] = split1br(line, "=");
    if (expr) return t_expr(expr, vari).code;

    throw new Error("aaaaaaaaaa: " + line);
}

export function t_compound(lines: string[]): string {
    let output = ""
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (!l.trim().length) continue
        const read_ident_stmt = () => {
            i++
            let sub = []
            while (lines[i]?.startsWith("    ")) sub.push(lines[i++].substr(4))
            i--
            return sub
        }

        if (l.startsWith("if")) {
            const condition = t_expr(l.substring(3, l.length - 1))
            const [mark_decl, mark_ref] = jump_mark()
            const [mark_decl_else, mark_ref_else] = jump_mark()
            const body = read_ident_stmt()
            const body_code = t_compound(body)
            const has_else = lines[i + 1]?.startsWith("else")
            output += condition.code + `jump ${mark_ref} notEqual ${condition.result} 1\n`
            output += body_code
            if (has_else) output += `jump ${mark_ref_else} always\n`
            output += mark_decl
            if (has_else) {
                i++; const else_body = read_ident_stmt()
                const else_body_code = t_compound(else_body)
                output += else_body_code + mark_decl_else
            }
            continue
        }

        if (l.startsWith("while")) {
            const condition = t_expr(l.substring("while ".length, l.length - 1))
            const [mark_start_decl, mark_start_ref] = jump_mark()
            const [mark_end_decl, mark_end_ref] = jump_mark()
            const body = read_ident_stmt()
            const body_code = t_compound(body)

            output += condition.code + mark_start_decl + `jump ${mark_end_ref} notEqual ${condition.result} 1\n`
            output += body_code + `jump ${mark_start_ref} always\n` + mark_end_decl
            continue
        }


        output += t_line(l)
    }
    return output
}

export function resolve_jump_marks(input: string): string {
    let k = input.split("\n")
    let decls: { [key: string]: number } = {}
    for (let i = 0; i < k.length; i++) {
        const line = k[i];
        if (line.startsWith("@")) {
            const mark = line.split(" ")[0].substr(1)
            decls[mark] = i
            k[i] = line.split(" ").slice(1).join(" ")
        }
    }
    for (let i = 0; i < k.length; i++) {
        k[i] = k[i].replace(/'\w+ /g, (match, index, orig) => {
            const decl = decls[match.trim().substr(1)]
            if (!decl) throw new Error("unknown jump mark reference: " + match);
            return decl.toString() + " "
        })

    }
    return k.join("\n") + "end\n"
}


const sourcce_lines = readFileSync(join(__dirname, "../a.py")).toString().split("\n")
let code = t_compound(sourcce_lines)
code = resolve_jump_marks(code)
console.log(code);

