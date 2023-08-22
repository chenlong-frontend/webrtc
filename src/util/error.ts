// TODO 需要删除
export class ErrorThrow {
    name = "QSRTCException"
    code
    message
    data
    constructor(a: any, b="", c?: any) {
        this.code = a;
        this.message = `QSRTCError ${this.code}: ${b}`
        this.data = c
    }
    toString() {
        return this.data ? `${this.message} data: ${JSON.stringify(this.data)}` : this.message
    }
    print(a="error") {
        return "error" === a && console.error(this.toString()),
        "warning" === a && console.warn(this.toString()),
        this
    }
    throw() {
        throw this.print(),
        this;
    }
}