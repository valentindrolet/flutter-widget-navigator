import * as vscode from 'vscode';
import { getCurrentWidgetBoundaries, getWidgetContent } from './utils/widget-detection';

/**
 * Selects the current widget
 */
export async function selectCurrentWidget(): Promise<void> {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showInformationMessage("No editor is active");
    return;
  }

  const document = editor.document;
  if (document.languageId !== "dart") {
    vscode.window.showInformationMessage("This command only works in Dart files");
    return;
  }

  const cursorPosition = editor.selection.active;

  try {
    // Find the current widget
    const currentWidget = getCurrentWidgetBoundaries(document, cursorPosition);
    if (!currentWidget) {
      vscode.window.showInformationMessage("Could not determine current widget");
      return;
    }

    // Find the boundaries of the widget
    const widgetBoundaries = getWidgetContent(document, currentWidget);
    if (!widgetBoundaries) {
      vscode.window.showInformationMessage("Could not determine widget boundaries");
      return;
    }

    // Select the widget
    const startPosition = new vscode.Position(
      currentWidget.line,
      currentWidget.character
    );
    const endPosition = new vscode.Position(
      widgetBoundaries.endLine,
      document.lineAt(widgetBoundaries.endLine).text.length
    );

    editor.selection = new vscode.Selection(startPosition, endPosition);
    editor.revealRange(new vscode.Range(startPosition, endPosition));

    vscode.window.setStatusBarMessage(`Selected widget: ${currentWidget.name}`, 3000);
  } catch (error) {
    vscode.window.showErrorMessage(`Error selecting widget: ${error}`);
  }
}