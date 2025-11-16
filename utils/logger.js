/**
 * Minimal Logger utility
 * - Provides consistent logging API across modules
 * - Can be expanded later for levels, sinks, and silencing in production
 */
export class Logger {
    constructor(scope = 'App') {
        this.scope = scope;
    }

    format(args) {
        try {
            return [`[${this.scope}]`, ...args];
        } catch {
            return args;
        }
    }

    info(...args) {
        try { console.info(...this.format(args)); } catch {}
    }

    warn(...args) {
        try { console.warn(...this.format(args)); } catch {}
    }

    error(...args) {
        try { console.error(...this.format(args)); } catch {}
    }

    debug(...args) {
        try { console.debug(...this.format(args)); } catch {}
    }
}

