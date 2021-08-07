import { TResult } from ".";
import { snake_to_camel } from "./helper";

export function builtin_default(command: string): (...args: string[]) => TResult {
    return (...args) => {
        return {
            code: command + " " + args.join(" ") + "\n",
            result: command.search("__return") != -1 ? "__return" : "0"
        }
    }
}

export function builtin_constant(name: string): string | undefined {
    if (name == "None") return "null"
    if (name == "True") return "1"
    if (name == "False") return "0"
    if (name.toUpperCase() != name) return
    if (!"UPFI".split("").includes(name[0])) return
    if (name[1] != "_") return
    return "@" + snake_to_camel(name.substr(2))
}

export const BUILTIN_FUNCTIONS: { [key: string]: (...args: string[]) => TResult } = {
    sensor: builtin_default("sensor __return"),

    control_enabled: builtin_default("control enabled"),
    control_shoot: builtin_default("control shoot"),
    control_color: builtin_default("control color"),
    control_shootp: builtin_default("control shootp"),

    draw_clear: builtin_default("draw clear"),
    draw_color: builtin_default("draw color"),
    draw_stroke: builtin_default("draw stroke"),
    draw_line_rect: builtin_default("draw lineRect"),
    draw_poly: builtin_default("draw poly"),
    draw_line_poly: builtin_default("draw linePoly"),
    draw_triange: builtin_default("draw triangle"),
    draw_image: builtin_default("draw image"),

    print: builtin_default("print"),
    print_flush: builtin_default("print"),

    get_link: builtin_default("getlink __return"),

}

