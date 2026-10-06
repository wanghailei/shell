import { defineConfig } from "@playwright/test"

// The browser tests run in the Google Chrome installed on this machine, so no browser is downloaded.
export default defineConfig( {
	testDir: "test",
	testMatch: "*.spec.js",
	use: {
		channel: "chrome",
		viewport: { width: 1728, height: 1117 },      // a 16-inch MacBook Pro at its default resolution
	},
} )
