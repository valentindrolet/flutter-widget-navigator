import * as vscode from 'vscode';
import { addPropertyToWidget } from './property-adder';
import { navigateWidget } from './widget-navigator';
import { selectCurrentWidget } from './widget-selector';

/**
 * Main extension activation function
 */
export function activate(context: vscode.ExtensionContext) {
  console.log("Flutter Parent Widget Navigation is now active");

  // Register commands
  const commands = [
    vscode.commands.registerCommand(
      "flutter.navigateToParentWidget",
      () => navigateWidget("parent")
    ),
    vscode.commands.registerCommand(
      "flutter.navigateToChildWidget",
      () => navigateWidget("child")
    ),
    vscode.commands.registerCommand(
      "flutter.navigateToPreviousSibling",
      () => navigateWidget("previousSibling")
    ),
    vscode.commands.registerCommand(
      "flutter.navigateToNextSibling",
      () => navigateWidget("nextSibling")
    ),
    vscode.commands.registerCommand(
      "flutter.navigateToFirstSibling",
      () => navigateWidget("firstSibling")
    ),
    vscode.commands.registerCommand(
      "flutter.navigateToLastSibling",
      () => navigateWidget("lastSibling")
    ),
    vscode.commands.registerCommand(
      "flutter.selectCurrentWidget",
      selectCurrentWidget
    ),
    vscode.commands.registerCommand(
      "flutter.addPropertyToWidget",
      addPropertyToWidget
    )
  ];

  // Add all commands to subscriptions
  commands.forEach(command => context.subscriptions.push(command));
}

/**
 * Deactivation function
 */
export function deactivate() {
  // Clean up resources if needed
}