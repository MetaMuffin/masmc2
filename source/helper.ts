
export const MASM_PC = "counter"
export const MASM_TICK = "tick"

export function jump_mark_decl(n: string) {
    return "@" + n + " "
}
export function jump_mark_ref(n: string) {
    return "'" + n
}

let temp_var_counter = 0
export function temp_var(): string {
    return `__temp${temp_var_counter++}`
}
let jump_mark_counter = 0
export function jump_mark(): [string, string] {
    return [jump_mark_decl(`mark${jump_mark_counter}`), jump_mark_ref(`mark${jump_mark_counter++}`)]
}

export function func_return(f: string): string {
    return `__func_return_${f}`
}
export function func_jump_mark(f: string): { ref: string, decl: string } {
    return { ref: jump_mark_ref(`func_${f}`), decl: jump_mark_decl(`func_${f}`) }
}
export function func_return_value(f: string): string {
    return `__return`
}

export function split1(s: string, sep: string): [string, string | undefined] {
    const f = s.split(sep)
    const r = f.slice(1).join(sep)
    return [f[0], r.length == 0 ? undefined : r]
}
export function split1br(s: string, sep: string): [string, string | undefined] {
    const f = splitbr(s, sep)
    const r = f.slice(1).join(sep)
    return [f[0], r.length == 0 ? undefined : r]
}
export function splitbr(s: string, sep: string): string[] {
    let f = []
    let b = ""
    let br = 0
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c == "(") br++
        if (c == ")") br--
        if (br == 0 && s.substr(i).startsWith(sep)) {
            f.push(b)
            b = ""
            i += sep.length
        } else b += c
    }
    if (b.length > 0) f.push(b)
    return f
}

export function snake_to_camel(a: string): string {
    let b = "", u = false
    for (let c of a) {
        if (c == "_") u = true
        else {
            if (u) b += c.toUpperCase()
            else b += c.toLowerCase()
            u = false
        }
    }
    return b
}