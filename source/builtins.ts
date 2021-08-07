import { TResult } from ".";


export const BUILTIN_FUNCTIONS: { [key: string]: (...args: string[]) => TResult } = {
    print: (mesg) => ({result: "0", code: `print ${mesg}\n`}),
    print_flush: (block) => ({result: "0", code: `printFlush ${block}\n`}),
}

