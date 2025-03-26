import * as vscode from 'vscode';
import { NavigationType, SiblingDirection, WidgetInfo } from './types';
import {
    findFirstChildWidget,
    findParentWidget,
    findSiblingWidget,
    getCurrentWidgetBoundaries,
} from './utils/widget-detection';

/**
 * Navigates to a widget based on the specified navigation type
 */
export async function navigateWidget(navigationType: NavigationType): Promise<void> {
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
    let targetInfo: WidgetInfo | null = null;

    // Find the target based on navigation type
    if (navigationType === "parent") {
      targetInfo = findParentWidget(document, cursorPosition);
      if (!targetInfo) {
        vscode.window.showInformationMessage("No parent widget found");
        return;
      }
    } else if (navigationType === "child") {
      // Get current widget info
      const currentWidget = getCurrentWidgetBoundaries(document, cursorPosition);
      if (currentWidget) {
        // Try to find children of the current widget
        targetInfo = findFirstChildWidget(document, currentWidget);
        if (!targetInfo) {
          vscode.window.showInformationMessage("No child widget found");
          return;
        }
      } else {
        vscode.window.showInformationMessage("Could not determine current widget");
        return;
      }
    } else {
      // For sibling navigation
      let direction: SiblingDirection = "previous";
      switch (navigationType) {
        case "previousSibling":
          direction = "previous";
          break;
        case "nextSibling":
          direction = "next";
          break;
        case "firstSibling":
          direction = "first";
          break;
        case "lastSibling":
          direction = "last";
          break;
      }

      // Try to find a sibling at the current level
      targetInfo = findSiblingWidget(document, cursorPosition, direction);

      // If no sibling found at current level, try parent's siblings
      if (!targetInfo) {
        // Find the parent widget
        const parentInfo = findParentWidget(document, cursorPosition);
        if (parentInfo) {
          // Try to find a sibling of the parent
          targetInfo = findSiblingWidget(
            document,
            new vscode.Position(parentInfo.line, parentInfo.character),
            direction
          );
          if (targetInfo) {
            vscode.window.setStatusBarMessage(
              `Navigated to ${direction} sibling of parent widget`,
              3000
            );
          }
        }

        if (!targetInfo) {
          // When no sibling is found, try to find a child widget
          if (direction === "next") {
            // Get current widget info
            const currentWidget = getCurrentWidgetBoundaries(document, cursorPosition);
            if (currentWidget) {
              // Try to find children of the current widget
              const childWidget = findFirstChildWidget(document, currentWidget);
              if (childWidget) {
                targetInfo = childWidget;
                vscode.window.setStatusBarMessage(
                  `Navigated to first child of current widget`,
                  3000
                );
              }
            }
          }

          // If still no target, show message
          if (!targetInfo) {
            vscode.window.showInformationMessage(`No ${direction} sibling widget found`);
            return;
          }
        }
      }
    }

    // Navigate to the target widget
    if (targetInfo) {
      navigateToTarget(editor, document, targetInfo, navigationType);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error navigating to ${navigationType}: ${error}`);
  }
}

/**
 * Navigates to the target widget and positions the cursor
 */
function navigateToTarget(
  editor: vscode.TextEditor,
  document: vscode.TextDocument,
  targetInfo: WidgetInfo,
  navigationType: NavigationType
): void {
  // Find the opening parenthesis position
  const targetLine = document.lineAt(targetInfo.line).text;
  const parenIndex = targetLine.indexOf("(", targetInfo.character);

  // If found, position cursor after the opening parenthesis, otherwise at the widget name
  const charPosition = parenIndex !== -1 ? parenIndex + 1 : targetInfo.character;
  const newPosition = new vscode.Position(targetInfo.line, charPosition);

  // Set cursor position
  editor.selection = new vscode.Selection(newPosition, newPosition);

  // Reveal the new position in the editor
  editor.revealRange(new vscode.Range(newPosition, newPosition));

  // Show status message
  if (navigationType === "parent") {
    vscode.window.setStatusBarMessage(`Navigated to parent: ${targetInfo.name}`, 3000);
  } else if (navigationType === "firstSibling") {
    vscode.window.setStatusBarMessage(`Navigated to first child widget`, 3000);
  } else if (navigationType === "lastSibling") {
    vscode.window.setStatusBarMessage(`Navigated to last child widget`, 3000);
  } else if (navigationType === "child") {
    vscode.window.setStatusBarMessage(`Navigated to child widget: ${targetInfo.name}`, 3000);
  }
}