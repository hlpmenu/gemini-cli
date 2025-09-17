/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const myJson = `
{
  "lockfileVersion": 1,
  "workspaces": {
    "": {
      "name": "@hlmpn/gemini-cli",
      "dependencies": {
        "simple-git": "^3.2.0"
      }
}
}
}
`;
const parsed = JSON.parse(myJson);
console.log(parsed); // Outputs: { name: 'root-workspace' }
