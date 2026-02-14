import * as vscode from "vscode";
import { StatusBar } from "./status-bar.js";
import { FileWatcher } from "./file-watcher.js";
import { CopusDashboardPanel } from "./webview-panel.js";
import { parseUsageFile } from "./usage-parser.js";
import {
  ensureConfiguration,
  runConfigure,
  runSetApiKey,
  runInstallSkills,
} from "./auto-config.js";

let statusBar: StatusBar | undefined;
let fileWatcher: FileWatcher | undefined;
let dashboardPanel: CopusDashboardPanel | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel("Copus");
  outputChannel.appendLine("Copus activated");

  // Auto-configure MCP server, API key, and skills
  ensureConfiguration(context, outputChannel).catch((err) => {
    outputChannel.appendLine(`[Copus] Auto-config error: ${err}`);
  });

  // Status bar
  statusBar = new StatusBar();

  // File watcher with polling fallback
  fileWatcher = new FileWatcher(statusBar);
  fileWatcher.setDataUpdateCallback((data) => {
    dashboardPanel?.postData(data);
  });
  fileWatcher.start();

  // Command: open dashboard webview
  const openDashboard = vscode.commands.registerCommand(
    "copus.openDashboard",
    async () => {
      dashboardPanel = CopusDashboardPanel.createOrShow(context.extensionUri);

      // Send current data immediately on open
      const data = await parseUsageFile();
      if (data) {
        dashboardPanel.postData(data);
      }
    },
  );

  // Command: re-run auto-configuration
  const configure = vscode.commands.registerCommand(
    "copus.configure",
    () => runConfigure(context, outputChannel),
  );

  // Command: set MiniMax API key
  const setApiKey = vscode.commands.registerCommand(
    "copus.setApiKey",
    () => runSetApiKey(outputChannel),
  );

  // Command: reinstall/update skill files
  const installSkills = vscode.commands.registerCommand(
    "copus.installSkills",
    () => runInstallSkills(context, outputChannel),
  );

  context.subscriptions.push(
    outputChannel,
    statusBar,
    fileWatcher,
    openDashboard,
    configure,
    setApiKey,
    installSkills,
  );
}

export function deactivate(): void {
  dashboardPanel?.dispose();
  statusBar = undefined;
  fileWatcher = undefined;
  dashboardPanel = undefined;
}
