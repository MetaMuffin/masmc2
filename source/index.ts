import { readFileSync } from "fs";
import { join } from "path/posix";
import { builtin_constant, BUILTIN_FUNCTIONS } from "./builtins";
import { func_jump_mark, func_return, func_return_value, jump_mark, MASM_PC, split1, split1br, splitbr, temp_var } from "./helper";

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

export interface FunctionDecl {
    name: string,
    args: string[],
}

export const functions: Map<string, FunctionDecl> = new Map()

export interface TResult { code: string, result: string }

export interface TContext {
    function?: string
    loop_break?: string
}

export function assign_target(value: string, target?: string, extra_code?: string): TResult {
    return target ? { code: (extra_code ?? "") + `set ${target} ${value}\n`, result: target } : { code: "", result: value }
}

export function t_expr(ctx: TContext, expr: string, target?: string): TResult {
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
            const lt = t_expr(ctx, l)
            const rt = t_expr(ctx, r)
            return { code: lt.code + rt.code + `op ${mode} ${target_temp} ${lt.result} ${rt.result}\n`, result: target_temp }
        }
    }

    if (/^\w+\(.+\)$/.test(expr)) {
        const func_name = split1(expr, "(")[0]
        let args_raw = split1(expr, "(")[1]
        if (!args_raw) throw new Error("aaaaaaaa " + expr);
        args_raw = args_raw.substring(0, args_raw.length - 1)
        const args = splitbr(args_raw, ",")

        const builtin = BUILTIN_FUNCTIONS[func_name]
        if (builtin) {
            let args_v = [], output = ""
            for (const a of args) {
                const av = t_expr(ctx, a)
                args_v.push(av.result)
                output += av.code
            }
            const r = builtin(...args_v)
            return {
                result: target_temp,
                code: output + r.code + `set ${target_temp} ${r.result}\n`
            }
        }

        const func = functions.get(func_name)
        if (!func) throw new Error(`unknown function "${func_name}" in expression "${expr}"`);
        if (args.length != func.args.length) console.warn("argument count mismatch in call to " + func_name)

        let output = ""
        for (let i = 0; i < args.length; i++) {
            const value = args[i];
            const name = func.args[i];
            output += t_expr(ctx, value, name).code
        }
        output += `op add ${func_return(func_name)} ${MASM_PC} 2\n`
        output += `jump ${func_jump_mark(func_name).ref} always\n`
        return {
            result: target_temp,
            code: output + `set ${target_temp} ${func_return_value(func_name)}\n`
        }
    }

    if (splitbr(expr, " ").length < 2) {
        const builtin_const = builtin_constant(expr)
        if (builtin_const) expr = builtin_const
        return assign_target(expr, target)
    }
    throw new Error("invalid expression: " + expr);
}

export function t_line(ctx: TContext, line: string): string {
    line = line.trim()
    let vari, expr;


    for (const [op, mode] of ops_assign) {
        [vari, expr] = split1br(line, op + "=").map(s => s?.trim());
        if (expr) {
            const r = t_expr(ctx, expr)
            return r.code + `op ${mode} ${vari} ${vari} ${r.result}\n`
        }
    }

    [vari, expr] = split1br(line, "=");
    if (expr) return t_expr(ctx, expr, vari).code;

    if (line == "return") {
        if (!ctx.function) throw new Error("return outside of function");
        return `set ${MASM_PC} ${func_return(ctx.function)}\n`
    }

    if (line.startsWith("return ")) {
        if (!ctx.function) throw new Error("return outside of function");
        const value = t_expr(ctx, line.substr("return ".length))
        return value.code + `set ${func_return_value(ctx.function)} ${value.result}\n` + `set ${MASM_PC} ${func_return(ctx.function)}`
    }

    return t_expr(ctx, line).code
}

export function t_compound(ctx: TContext, lines: string[]): string {
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

        if (l.startsWith("import ")) continue
        if (l.startsWith("from ")) continue

        if (l.startsWith("if ")) {
            const condition = t_expr(ctx, l.substring(3, l.length - 1))
            const [mark_decl, mark_ref] = jump_mark()
            const [mark_decl_else, mark_ref_else] = jump_mark()
            const body = read_ident_stmt()
            const body_code = t_compound(ctx, body)
            const has_else = lines[i + 1]?.startsWith("else")
            output += condition.code + `jump ${mark_ref} notEqual ${condition.result} 1\n`
            output += body_code
            if (has_else) output += `jump ${mark_ref_else} always\n`
            output += mark_decl
            if (has_else) {
                i++; const else_body = read_ident_stmt()
                const else_body_code = t_compound(ctx, else_body)
                output += else_body_code + mark_decl_else
            }
            continue
        }

        if (l.startsWith("while ")) {
            const condition = t_expr(ctx, l.substring("while ".length, l.length - 1))
            const [mark_start_decl, mark_start_ref] = jump_mark()
            const [mark_end_decl, mark_end_ref] = jump_mark()
            const body = read_ident_stmt()
            const body_code = t_compound({ ...ctx, loop_break: mark_end_ref }, body)

            output += mark_start_decl + condition.code + `jump ${mark_end_ref} notEqual ${condition.result} 1\n`
            output += body_code + `jump ${mark_start_ref} always\n` + mark_end_decl
            continue
        }

        if (l.startsWith("for ")) {
            const [vari, iterator] = l.substring("for ".length, l.length - 1).split(" in ").map(s => s.trim())
            if (iterator.startsWith("range(")) {
                let [start, stop, step] = splitbr(iterator.substring("range(".length, iterator.length - ")".length), ",").map(s => s.trim())
                step ??= "1"
                if (!stop) stop = start, start = "0"
                const [start_r, stop_r, step_r] = [start, stop, step].map(s => t_expr(ctx, s))
                output += start_r.code + stop_r.code + step_r.code;

                output += `set ${vari} ${start_r.result}\n`
                const condition = t_expr(ctx, `${vari} < ${stop_r.result}`)
                const [mark_start_decl, mark_start_ref] = jump_mark()
                const [mark_end_decl, mark_end_ref] = jump_mark()
                const body = read_ident_stmt()
                const body_code = t_compound({ ...ctx, loop_break: mark_end_ref }, body) + t_line(ctx, `${vari} += ${step_r.result}`)

                output += mark_start_decl + condition.code + `jump ${mark_end_ref} notEqual ${condition.result} 1\n`
                output += body_code + `jump ${mark_start_ref} always\n` + mark_end_decl
                continue
            }
        }

        if (l.startsWith("def ")) {
            const func_decl_raw = l.substring("def ".length, l.length - ":".length)
            const func_name = split1(func_decl_raw, "(")[0]
            const args_raw = split1(func_decl_raw, "(")[1]?.split(")").join("")
            if (!args_raw) throw new Error("aaaaaaaa " + func_decl_raw);
            const args = splitbr(args_raw, ",")
            const [mark_skip_decl, mark_skip_ref] = jump_mark()
            const body = [...read_ident_stmt(), "return"]
            const body_code = t_compound({ ...ctx, function: func_name }, body)

            output += `jump ${mark_skip_ref} always\n` + func_jump_mark(func_name).decl + body_code + mark_skip_decl
            functions.set(func_name, { name: func_name, args: args })
            continue
        }

        output += t_line(ctx, l)
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
        k[i] = k[i].replace(/'[_\w]+($| )/g, (match, index, orig) => {
            const decl = decls[match.trim().substr(1)]
            if (!decl) throw new Error("unknown jump mark reference: " + match);
            return decl.toString() + " "
        })
    }
    return k.join("\n") + "end\n"
}


const source_lines = readFileSync(process.argv[2]).toString().split("\n")
let code = t_compound({}, source_lines)
code = resolve_jump_marks(code)
console.log(code);

