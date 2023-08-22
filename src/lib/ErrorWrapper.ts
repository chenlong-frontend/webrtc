export class ErrorWrapper { 
    name = "RTCException";
    code: string
    message: string
    data: any
    constructor(code: string, message="", data?: any) {
        this.code = code;
        this.message = `"RTCError ${this.code} : ${message}"`
        this.data = data
    }
    toString() {
        return this.data ? `data: ${JSON.stringify(this.data)}` : this.message
    }
    print(msg = "error") {
        "error" === msg && console.error(this.toString())
        "warning" === msg && console.warn(this.toString())
        return this
    }
    throw() {
        throw this.print()
    }
}