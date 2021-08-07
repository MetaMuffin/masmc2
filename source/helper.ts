
let temp_var_counter = 0
export function temp_var(): string {
    return `__temp${temp_var_counter++}`
}
let jump_mark_counter = 0
export function jump_mark(): [string, string] {
    return [`@mark${jump_mark_counter} `, `'mark${jump_mark_counter++}`]
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