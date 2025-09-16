#!/usr/bin/env bun
/**
 * @license
 * Copyright 2025
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// project root = ../../.. from this script (same as original)
const projectRoot = path.resolve(path.join(__dirname, "..", "..", ".."));
const packagePath = path.join(projectRoot, "packages", "vscode-ide-companion");
const noticeFilePath = path.join(packagePath, "NOTICES.txt");

function normalizeRepo(repo) {
  if (!repo) return undefined;
  if (typeof repo === "string") return repo;
  return repo.url ?? undefined;
}

async function getDependencyLicense(depName, depVersion) {
  let depPackageJsonPath;
  let licenseContent = "License text not found.";
  let repositoryUrl = "No repository found";

  try {
    // Prefer root hoisted dependency
    depPackageJsonPath = path.join(projectRoot, "node_modules", depName, "package.json");
    if (!(await fs.stat(depPackageJsonPath).catch(() => false))) {
      // Fallback to package-local node_modules
      depPackageJsonPath = path.join(packagePath, "node_modules", depName, "package.json");
    }

    const depPackageJsonContent = await fs.readFile(depPackageJsonPath, "utf-8");
    const depPackageJson = JSON.parse(depPackageJsonContent);

    repositoryUrl = normalizeRepo(depPackageJson.repository) ?? repositoryUrl;

    const packageDir = path.dirname(depPackageJsonPath);
    const licenseFileCandidates = [
      depPackageJson.licenseFile,
      "LICENSE",
      "LICENSE.md",
      "LICENSE.txt",
      "LICENSE-MIT.txt",
    ].filter(Boolean);

    let licenseFile;
    for (const candidate of licenseFileCandidates) {
      const potentialFile = path.join(packageDir, candidate);
      if (await fs.stat(potentialFile).catch(() => false)) {
        licenseFile = potentialFile;
        break;
      }
    }

    if (licenseFile) {
      try {
        licenseContent = await fs.readFile(licenseFile, "utf-8");
      } catch (e) {
        console.warn(`Warning: Failed to read license file for ${depName}: ${e.message}`);
      }
    } else {
      console.warn(`Warning: Could not find license file for ${depName}`);
    }
  } catch (e) {
    console.warn(`Warning: Could not find package.json for ${depName}: ${e.message}`);
  }

  return {
    name: depName,
    version: depVersion,
    repository: repositoryUrl,
    license: licenseContent,
  };
}

function collectDependencies(packageName, packageLock, dependenciesMap) {
  if (dependenciesMap.has(packageName)) return;

  const key = `node_modules/${packageName}`;
  const packageInfo = packageLock.packages[key];
  if (!packageInfo) {
    console.warn(`Warning: Could not find package info for ${packageName} in package-lock.json.`);
    return;
  }

  dependenciesMap.set(packageName, packageInfo.version);

  if (packageInfo.dependencies) {
    for (const depName of Object.keys(packageInfo.dependencies)) {
      collectDependencies(depName, packageLock, dependenciesMap);
    }
  }
}

async function main() {
  try {
    const packageJsonPath = path.join(packagePath, "package.json");
    const packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);

    const packageLockJsonPath = path.join(projectRoot, "package-lock.json");
    const packageLockJsonContent = await fs.readFile(packageLockJsonPath, "utf-8");
    const packageLockJson = JSON.parse(packageLockJsonContent);

    const allDependencies = new Map();
    const directDependencies = Object.keys(packageJson.dependencies ?? {});

    for (const depName of directDependencies) {
      collectDependencies(depName, packageLockJson, allDependencies);
    }

    const dependencyEntries = Array.from(allDependencies.entries());

    const dependencyLicenses = await Promise.all(
      dependencyEntries.map(([depName, depVersion]) =>
        getDependencyLicense(depName, depVersion)
      )
    );

    let noticeText =
      "This file contains third-party software notices and license terms.\n\n";

    for (const dep of dependencyLicenses) {
      noticeText += "============================================================\n";
      noticeText += `${dep.name}@${dep.version}\n`;
      noticeText += `(${dep.repository})\n\n`;
      noticeText += `${dep.license}\n\n`;
    }

    await fs.writeFile(noticeFilePath, noticeText);
    console.log(`NOTICES.txt generated at ${noticeFilePath}`);
  } catch (error) {
    console.error("Error generating NOTICES.txt:", error);
    process.exit(1);
  }
}

await main();
