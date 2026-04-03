import "@testing-library/jest-dom";
import "whatwg-fetch";
import { webcrypto } from "node:crypto";

if (!globalThis.crypto || !globalThis.crypto.subtle) {
	Object.defineProperty(globalThis, "crypto", {
		value: webcrypto,
		configurable: true,
	});
}

const originalWarn = console.warn.bind(console);

console.warn = (...args: unknown[]) => {
	const [firstArg] = args;
	if (
		typeof firstArg === "string" &&
		firstArg.includes("React Router Future Flag Warning") &&
		firstArg.includes("v7_startTransition")
	) {
		return;
	}

	originalWarn(...args);
};
