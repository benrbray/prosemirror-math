const warn = (...args: unknown[]) => {
	console.warn(...args);
};

export const debug = {
	warn,
}