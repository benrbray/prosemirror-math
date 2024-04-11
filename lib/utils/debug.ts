const DEBUG = false;

const ifDebug = (logger: (...args: unknown[]) => void) => {
	return (...args: unknown[]): void => {
		if(DEBUG) { logger(...args); }
	}
}

export const debug = {
	warn:  ifDebug(console.warn),
	error: ifDebug(console.error),
}