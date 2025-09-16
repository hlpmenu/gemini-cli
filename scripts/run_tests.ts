#!/usr/bin/env bun

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { promises as fs } from "node:fs";
import { $ } from "bun";

// ---- Argument Parsing ----
const args = process.argv.slice(2);
const hasFlag = (flag: string) => args.includes(flag);
const getArgValue = (prefix: string): string | undefined => {
	const arg = args.find((a) => a.startsWith(`${prefix}=`));
	return arg ? arg.split("=")[1] : undefined;
};

const isCI = hasFlag("--ci");
const isE2E = hasFlag("--e2e");
const isScripts = hasFlag("--scripts");
const integrationMode = getArgValue("--integration");

// ---- Helpers ----
function fail(message: string, code = 1): never {
	console.error(`\n❌ ERROR: ${message}`);
	process.exit(code);
}

/**
 * Runs a command from the root using a shell to handle chains (`&&`).
 * Exits the entire process on failure.
 */
async function runRootCommand(command: string) {
	console.log(`\n🚀 Running from root: "${command}"`);
	try {
		// Use `bun -c` to execute the command string in a shell context.
		// This robustly handles complex commands with '&&', etc.
		const proc = await $`bun -c ${command}`;
		if (proc.exitCode !== 0) {
			fail(
				`Command "${command}" failed with exit code ${proc.exitCode}.\n\n${proc.stderr}\n${proc.stdout}`,
				proc.exitCode,
			);
		}
	} catch (e) {
		if (e instanceof $.ShellError) {
			fail(
				`Command "${command}" failed with exit code ${e.exitCode ?? 1}.\n\n${e.stderr}\n${e.stdout}`,
				e.exitCode ?? 1,
			);
		}
		throw e;
	}
}

/**
 * Runs a script within a specific package, skipping if it doesn't exist.
 */
async function runPackageScript(dir: string, scriptName: string) {
	try {
		// This is the ONLY place where "cd" is appropriate.
		const proc = await $`cd ${dir} && bun run ${scriptName}`;

		if (proc.exitCode !== 0) {
			fail(
				`Script "${scriptName}" in ${dir} failed.\n\n${proc.stderr}\n${proc.stdout}`,
				proc.exitCode,
			);
		}
		console.log(`✅ Passed: ${dir} > ${scriptName}`);
	} catch (e) {
		if (e instanceof $.ShellError) {
			const output = `${e.stderr} ${e.stdout}`;
			if (
				output.includes("Missing script") ||
				output.includes("Script not found")
			) {
				console.log(`⚪ Skipping: ${dir} (no "${scriptName}" script)`);
				return; // Successful skip
			}
			fail(`Error running script in ${dir}.\n\n${output}`, e.exitCode ?? 1);
		}
		throw e;
	}
}

// ---- Main Orchestrator ----
async function main() {
	// --- Branch 1: Handle root-only commands first and then exit. ---
	if (isScripts) {
		await runRootCommand(
			"bunx --bun vitest run --config ./scripts/tests/vitest.config.ts",
		);
		return;
	}
	if (isE2E) {
		await runRootCommand(
			"cross-env VERBOSE=true KEEP_OUTPUT=true bun run test:integration:sandbox:none",
		);
		return;
	}
	if (integrationMode) {
		const commands = {
			all: "bun run test:integration:sandbox:none && bun run test:integration:sandbox:docker && bun run test:integration:sandbox:podman",
			"sandbox:none":
				"cross-env GEMINI_SANDBOX=false bunx --bun vitest run --root ./integration-tests",
			"sandbox:docker":
				"cross-env GEMINI_SANDBOX=docker bun run build:sandbox && cross-env GEMINI_SANDBOX=docker bunx --bun vitest run --root ./integration-tests",
			"sandbox:podman":
				"cross-env GEMINI_SANDBOX=podman bunx --bun vitest run --root ./integration-tests",
		};

		const commandToRun = commands[integrationMode as keyof typeof commands];
		if (!commandToRun) {
			fail(`Invalid --integration value: "${integrationMode}"`, 2);
		}
		await runRootCommand(commandToRun);
		return;
	}

	// --- Branch 2: Handle per-package commands (the default and --ci cases). ---
	const pkgScriptName = isCI ? "test:ci" : "test";
	console.log(`🚀 Running "${pkgScriptName}" for each package...`);

	const entries = await fs.readdir("packages", { withFileTypes: true });
	for (const entry of entries) {
		if (entry.isDirectory()) {
			await runPackageScript(`packages/${entry.name}`, pkgScriptName);
		}
	}

	// AFTER the loop, if it's a CI run, execute test:scripts once from the root.
	if (isCI) {
		await runRootCommand("bun run test:scripts");
	}

	console.log(`\n✨ All applicable tests passed successfully!`);
}

await main();
