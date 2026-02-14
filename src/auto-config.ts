/**
 * Auto-Configuration Engine for Copus.
 *
 * On activation: ensures mcp.json points to bundled MCP server,
 * prompts for API key if missing, and installs bundled skill files.
 */

import * as vscode from "vscode";
import { readFile, writeFile, mkdir, cp, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";

interface McpServerEntry {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  disabled?: boolean;
}

interface McpConfig {
  mcpServers?: Record<string, McpServerEntry>;
}

const MCP_CONFIG_PATH = join(homedir(), ".claude", "mcp.json");
const SKILLS_DIR = join(homedir(), ".claude", "skills");
const MCP_SERVER_NAME = "llm-swarm";

function getMcpServerJsPath(context: vscode.ExtensionContext): string {
  return join(context.extensionPath, "dist", "mcp-server.js");
}

function getBundledSkillsDir(context: vscode.ExtensionContext): string {
  return join(context.extensionPath, "skills");
}

// ── mcp.json management ──────────────────────────────────────────

async function loadMcpConfig(): Promise<McpConfig> {
  try {
    const raw = await readFile(MCP_CONFIG_PATH, "utf-8");
    return JSON.parse(raw) as McpConfig;
  } catch {
    return {};
  }
}

async function saveMcpConfig(config: McpConfig): Promise<void> {
  await mkdir(join(homedir(), ".claude"), { recursive: true });
  await writeFile(MCP_CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

async function ensureMcpServer(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): Promise<boolean> {
  const config = await loadMcpConfig();
  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  const mcpServerPath = getMcpServerJsPath(context);
  const existing = config.mcpServers[MCP_SERVER_NAME];

  // Check if already configured with correct path
  if (existing) {
    const existingArgs = existing.args ?? [];
    const currentPath = existingArgs[0] ?? "";
    if (currentPath === mcpServerPath && !existing.disabled) {
      outputChannel.appendLine("[Copus] MCP server already configured correctly");
      return true;
    }
  }

  // Preserve existing env vars (especially API key)
  const existingEnv = existing?.env ?? {};

  config.mcpServers[MCP_SERVER_NAME] = {
    command: "node",
    args: [mcpServerPath],
    env: {
      ...existingEnv,
    },
  };

  await saveMcpConfig(config);
  outputChannel.appendLine(`[Copus] MCP server registered: ${mcpServerPath}`);
  return true;
}

// ── API key management ───────────────────────────────────────────

async function hasApiKey(): Promise<boolean> {
  const config = await loadMcpConfig();
  const entry = config.mcpServers?.[MCP_SERVER_NAME];
  return Boolean(entry?.env?.MINIMAX_API_KEY);
}

async function promptForApiKey(outputChannel: vscode.OutputChannel): Promise<boolean> {
  const key = await vscode.window.showInputBox({
    title: "Copus: MiniMax API Key",
    prompt: "Enter your MiniMax API key for M2.5 access. Get one at minimax.io",
    password: true,
    placeHolder: "eyJhbGciOiJS...",
    ignoreFocusOut: true,
  });

  if (!key) {
    outputChannel.appendLine("[Copus] API key prompt dismissed — MiniMax features disabled (graceful degradation)");
    return false;
  }

  const config = await loadMcpConfig();
  if (!config.mcpServers?.[MCP_SERVER_NAME]) {
    outputChannel.appendLine("[Copus] MCP server not configured yet — run configure first");
    return false;
  }

  if (!config.mcpServers[MCP_SERVER_NAME].env) {
    config.mcpServers[MCP_SERVER_NAME].env = {};
  }
  config.mcpServers[MCP_SERVER_NAME].env.MINIMAX_API_KEY = key;

  await saveMcpConfig(config);
  outputChannel.appendLine("[Copus] API key saved to mcp.json");
  return true;
}

// ── Skill installation ───────────────────────────────────────────

async function installSkills(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
  force = false
): Promise<number> {
  const bundledDir = getBundledSkillsDir(context);

  if (!existsSync(bundledDir)) {
    outputChannel.appendLine("[Copus] No bundled skills found — skipping skill installation");
    return 0;
  }

  await mkdir(SKILLS_DIR, { recursive: true });

  let installed = 0;
  const entries = await readdir(bundledDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith("copus-")) {
      continue;
    }

    const srcDir = join(bundledDir, entry.name);
    const destDir = join(SKILLS_DIR, entry.name);

    // Skip if destination exists and force is false
    if (!force && existsSync(destDir)) {
      // Check version — only overwrite if bundled is newer
      const shouldUpdate = await isNewerVersion(srcDir, destDir);
      if (!shouldUpdate) {
        continue;
      }
    }

    await mkdir(destDir, { recursive: true });
    await cp(srcDir, destDir, { recursive: true, force: true });
    installed++;
    outputChannel.appendLine(`[Copus] Installed skill: ${entry.name}`);
  }

  return installed;
}

async function isNewerVersion(srcDir: string, destDir: string): Promise<boolean> {
  try {
    const srcSkill = join(srcDir, "SKILL.md");
    const destSkill = join(destDir, "SKILL.md");
    const [srcStat, destStat] = await Promise.all([stat(srcSkill), stat(destSkill)]);
    return srcStat.mtimeMs > destStat.mtimeMs;
  } catch {
    return true; // If we can't compare, install anyway
  }
}

// ── Public API ───────────────────────────────────────────────────

export async function ensureConfiguration(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  const autoConfig = vscode.workspace
    .getConfiguration("copus")
    .get<boolean>("autoConfigureOnActivation", true);

  if (!autoConfig) {
    outputChannel.appendLine("[Copus] Auto-configuration disabled by setting");
    return;
  }

  // 1. Ensure MCP server is registered
  await ensureMcpServer(context, outputChannel);

  // 2. Check API key — prompt on first run only
  const keyExists = await hasApiKey();
  if (!keyExists) {
    const firstRunKey = `copus.firstRunApiKeyPrompted`;
    const prompted = context.globalState.get<boolean>(firstRunKey, false);
    if (!prompted) {
      await promptForApiKey(outputChannel);
      await context.globalState.update(firstRunKey, true);
    }
  }

  // 3. Install bundled skills
  const installed = await installSkills(context, outputChannel);
  if (installed > 0) {
    outputChannel.appendLine(`[Copus] Installed ${installed} skill(s)`);
  }
}

export async function runConfigure(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  await ensureMcpServer(context, outputChannel);
  const installed = await installSkills(context, outputChannel, true);
  vscode.window.showInformationMessage(
    `Copus configured: MCP server registered, ${installed} skill(s) installed.`
  );
}

export async function runSetApiKey(
  outputChannel: vscode.OutputChannel
): Promise<void> {
  const saved = await promptForApiKey(outputChannel);
  if (saved) {
    vscode.window.showInformationMessage(
      "Copus: API key saved. Reload Claude Code for changes to take effect."
    );
  }
}

export async function runInstallSkills(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  const installed = await installSkills(context, outputChannel, true);
  vscode.window.showInformationMessage(
    `Copus: ${installed} skill(s) installed/updated.`
  );
}
