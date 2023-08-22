const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARNING: 2,
    ERROR: 3,
    NONE: 4
}
class Logger {
    logLevel = LogLevel.DEBUG
    uploadState = "collecting"
    debug(...a: any[]) {
        console.log(...a)
    }
    info(...a: any[]) {
        console.log(...a)
    }
    warning(...a: any[]) {
        console.log(...a)
    }
    error(...a: any[]) {
        console.log(...a)
    }
    setLogLevel(level: number) {
        this.logLevel = level = Math.min(Math.max(0, level), 4)
    }
}

export const logger = new Logger()