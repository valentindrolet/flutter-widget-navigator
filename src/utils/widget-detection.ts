import * as vscode from 'vscode';
import { ParentArray, SiblingDirection, WidgetBoundaries, WidgetInfo } from '../types';
import { getIndentation, isEmptyOrComment, isWidgetDeclaration, widgetNameRegex } from './dart-parser';

/**
 * Gets the boundaries of the current widget
 */
export function getCurrentWidgetBoundaries(
  document: vscode.TextDocument,
  position: vscode.Position
): WidgetInfo | null {
  const lineText = document.lineAt(position.line).text;
  const currentIndent = getIndentation(lineText);
  
  // Check if cursor is actually inside a widget declaration on the current line
  let widgetMatch = lineText.match(widgetNameRegex);
  if (widgetMatch) {
    const widgetName = widgetMatch[1];
    const widgetPosition = lineText.indexOf(widgetName);
    
    // Only consider this widget if the cursor is before its declaration
    // or if the cursor is after the opening parenthesis of the widget
    if (position.character < widgetPosition || 
        position.character > lineText.indexOf('(', widgetPosition)) {
      return {
        name: widgetName,
        line: position.line,
        character: widgetPosition,
      };
    }
  }

  // If we're here, we need to find the parent widget by scanning upwards
  // Track a stack of widgets to handle nested structures
  const widgetStack: Array<WidgetInfo & { indent: number }> = [];
  
  for (let i = position.line; i >= 0; i--) {
    const scanLine = document.lineAt(i).text;
    const scanIndent = getIndentation(scanLine);
    
    // If we find a widget declaration
    if (isWidgetDeclaration(scanLine)) {
      const match = scanLine.match(widgetNameRegex);
      if (match) {
        const widgetName = match[1];
        
        // If this is our first widget or it's at a lower indent level than our previous candidate,
        // it's potentially our parent widget
        if (widgetStack.length === 0 || scanIndent < widgetStack[widgetStack.length - 1].indent) {
          widgetStack.push({
            name: widgetName,
            line: i,
            character: scanLine.indexOf(widgetName),
            indent: scanIndent
          });
          
          // If we've reached a very low indent level (like class or method declaration),
          // we can stop scanning
          if (scanIndent === 0) {
            break;
          }
        }
      }
    }
  }
  
  // Return the closest parent widget (first one in our stack)
  if (widgetStack.length > 0) {
    const closestWidget = widgetStack[0];
    return {
      name: closestWidget.name,
      line: closestWidget.line,
      character: closestWidget.character
    };
  }

  return null;
}

/**
 * Gets a widget's content boundaries (from declaration to closing parenthesis)
 */
export function getWidgetContent(
  document: vscode.TextDocument,
  widget: WidgetInfo
): WidgetBoundaries | null {
  const startLine = widget.line;
  let endLine = startLine;
  let openParens = 0;
  let foundFirstParen = false;

  // Scan from the widget declaration line to find the closing parenthesis
  for (let i = startLine; i < document.lineCount; i++) {
    const lineText = document.lineAt(i).text;

    for (let j = 0; j < lineText.length; j++) {
      const char = lineText[j];

      // Only start counting after we find the first opening parenthesis of our widget
      if (i === startLine && !foundFirstParen) {
        const widgetNameIndex = lineText.indexOf(widget.name);
        if (widgetNameIndex !== -1 && j > widgetNameIndex && char === "(") {
          foundFirstParen = true;
          openParens = 1;
          continue;
        }
      }

      // Count parentheses once we've found our widget's opening parenthesis
      if (foundFirstParen) {
        if (char === "(") {
          openParens++;
        }
        if (char === ")") {
          openParens--;
        }

        // When we reach zero, we've found the end of our widget
        if (openParens === 0) {
          endLine = i;
          return { startLine, endLine };
        }
      }
    }
  }

  // If we couldn't find a proper closing, just return the start line
  return { startLine, endLine: startLine };
}

/**
 * Finds the parent widget of the current position
 */
export function findParentWidget(
  document: vscode.TextDocument,
  position: vscode.Position
): WidgetInfo | null {
  // Get the current line and indentation level
  const currentLine = position.line;
  const currentIndent = getIndentation(document.lineAt(currentLine).text);

  // Scan the document upwards from current position
  for (let i = currentLine; i >= 0; i--) {
    const lineText = document.lineAt(i).text;
    const lineIndent = getIndentation(lineText);

    // Skip empty lines or comments
    if (isEmptyOrComment(lineText)) {
      continue;
    }

    // If this line has a widget declaration with less indentation than current
    if (lineIndent < currentIndent && isWidgetDeclaration(lineText)) {
      const widgetMatch = lineText.match(widgetNameRegex);
      if (widgetMatch) {
        const widgetName = widgetMatch[1];
        const widgetPosition = lineText.indexOf(widgetName);

        return {
          name: widgetName,
          line: i,
          character: widgetPosition,
        };
      }
    }

    // Check for array fields like 'children:'
    if (
      lineIndent < currentIndent &&
      (lineText.trim().startsWith("children:") ||
        lineText.trim().match(/\b(items|actions|widgets):/))
    ) {
      // Find the parent widget (owner of this children array)
      for (let j = i - 1; j >= 0; j--) {
        const parentLineText = document.lineAt(j).text;
        const parentIndent = getIndentation(parentLineText);

        if (parentIndent < lineIndent && isWidgetDeclaration(parentLineText)) {
          const widgetMatch = parentLineText.match(widgetNameRegex);
          if (widgetMatch) {
            const widgetName = widgetMatch[1];
            const widgetPosition = parentLineText.indexOf(widgetName);

            return {
              name: widgetName,
              line: j,
              character: widgetPosition,
            };
          }
        }
      }
    }
  }

  return null;
}

/**
 * Finds the first child widget of a given widget
 */
export function findFirstChildWidget(
  document: vscode.TextDocument,
  widget: WidgetInfo
): WidgetInfo | null {
  // Get the widget boundaries
  const boundaries = getWidgetContent(document, widget);
  if (!boundaries) {
    return null;
  }

  // Track the indent level of the widget to ensure we only find direct children
  const widgetLine = document.lineAt(widget.line).text;
  const widgetIndent = getIndentation(widgetLine);
  const expectedChildIndent = widgetIndent + 2; // Flutter typical indent is 2 spaces

  // First, look for a single child: property at the expected indent level
  for (let i = widget.line; i <= boundaries.endLine; i++) {
    const line = document.lineAt(i);
    const lineText = line.text;
    const lineIndent = getIndentation(lineText);
    const trimmedText = lineText.trim();

    // Only consider lines at the correct indent level (direct children of the widget)
    if (
      lineIndent === expectedChildIndent &&
      trimmedText.startsWith("child:")
    ) {
      // Check if the widget is on the same line
      const widgetMatch = lineText.match(widgetNameRegex);
      if (widgetMatch) {
        const widgetName = widgetMatch[1];
        const widgetPosition = lineText.indexOf(widgetName);

        return {
          name: widgetName,
          line: i,
          character: widgetPosition,
        };
      }

      // Otherwise, check the next line(s) for the widget
      for (let j = i + 1; j <= boundaries.endLine; j++) {
        const nextLine = document.lineAt(j);
        const nextLineText = nextLine.text;
        const nextLineIndent = getIndentation(nextLineText);
        const nextTrimmedText = nextLineText.trim();

        // Skip empty lines and comments
        if (isEmptyOrComment(nextTrimmedText)) {
          continue;
        }

        // Only consider lines that are indented more than the child: property
        // This ensures we find the widget that belongs to this child property
        if (nextLineIndent > lineIndent) {
          // Check if this line contains a widget
          const childWidgetMatch = nextLineText.match(widgetNameRegex);
          if (childWidgetMatch) {
            const childWidgetName = childWidgetMatch[1];
            const widgetPosition = nextLineText.indexOf(childWidgetName);

            return {
              name: childWidgetName,
              line: j,
              character: widgetPosition,
            };
          }
        }

        // If we found a line at same or less indentation, we've moved past this child's content
        if (
          nextLineIndent <= lineIndent &&
          !isEmptyOrComment(nextTrimmedText)
        ) {
          break;
        }
      }
    }
  }

  // If no single child found, look for array declarations like children:, items:, etc.
  for (let i = widget.line; i <= boundaries.endLine; i++) {
    const line = document.lineAt(i);
    const lineText = line.text;
    const lineIndent = getIndentation(lineText);
    const trimmedText = lineText.trim();

    // Only consider lines at the correct indent level (direct children of the widget)
    if (
      lineIndent === expectedChildIndent &&
      trimmedText.match(/\b(children|items|actions|widgets):\s*\[/)
    ) {
      const arrayMatch = trimmedText.match(
        /\b(children|items|actions|widgets):/
      );
      if (arrayMatch) {
        const arrayName = arrayMatch[1];

        // Find the first widget within this array
        const childrenArray = {
          startLine: i,
          endLine: boundaries.endLine,
          arrayName: arrayName,
        };

        const children = findAllSiblingsInArray(document, childrenArray);
        if (children.length > 0) {
          return children[0]; // Return the first child
        }
      }
    }
  }

  return null;
}

/**
 * Finds the parent array containing the current widget
 */
export function findSiblingWidget(
  document: vscode.TextDocument,
  position: vscode.Position,
  direction: SiblingDirection
): WidgetInfo | null {
  // Get the current widget's boundaries
  const currentWidget = getCurrentWidgetBoundaries(document, position);
  if (!currentWidget) {
    return null;
  }

  // Find the parent array (children, items, etc.)
  const parentArray = findParentArray(document, position);
  if (!parentArray) {
    return null;
  }

  // Find all siblings within the parent array
  const siblings = findAllSiblingsInArray(document, parentArray);
  if (siblings.length <= 1) {
    return null; // No siblings to navigate to
  }

  let targetIndex = 0;
  if (direction === "previous" || direction === "next") {
    // Find the index of the current widget in the siblings array
    let currentIndex = -1;
    for (let i = 0; i < siblings.length; i++) {
      if (siblings[i].line === currentWidget.line) {
        currentIndex = i;
        break;
      }
    }

    if (currentIndex === -1) {
      return null; // Current widget not found in siblings
    }

    // Determine target sibling based on direction
    targetIndex =
      direction === "previous" ? currentIndex - 1 : currentIndex + 1;
  } else if (direction === "first") {
    targetIndex = 0;
  } else if (direction === "last") {
    targetIndex = siblings.length - 1;
  }

  // Handle wrap-around (optional)
  if (targetIndex < 0) {
    targetIndex = siblings.length - 1; // Wrap to last sibling
  } else if (targetIndex >= siblings.length) {
    targetIndex = 0; // Wrap to first sibling
  }

  return siblings[targetIndex];
}
export function findParentArray(
  document: vscode.TextDocument,
  position: vscode.Position
): ParentArray | null {
  // First, get the current widget
  const currentWidget = getCurrentWidgetBoundaries(document, position);
  if (!currentWidget) {
    return null;
  }

  // Then, find the parent widget
  const parentWidget = findParentWidget(document, position);
  if (!parentWidget) {
    return null;
  }

  // Find the parent widget's boundaries
  const parentWidgetBoundaries = getWidgetContent(document, parentWidget);
  if (!parentWidgetBoundaries) {
    return null;
  }

  // Look for array declarations within the parent widget
  for (let i = parentWidget.line; i <= parentWidgetBoundaries.endLine; i++) {
    const lineText = document.lineAt(i).text.trim();

    // Check if this line is an array declaration
    if (lineText.match(/\b(children|items|actions|widgets):\s*\[/)) {
      const arrayMatch = lineText.match(/\b(children|items|actions|widgets):/);
      if (arrayMatch) {
        const arrayName = arrayMatch[1];

        // Find the end of the array (matching closing bracket)
        let openBrackets = 0;
        let arrayStartFound = false;
        let endLine = i;

        // Count brackets starting from this line
        for (let j = i; j <= parentWidgetBoundaries.endLine; j++) {
          const checkLine = document.lineAt(j).text;

          // Go through each character in this line
          for (let k = 0; k < checkLine.length; k++) {
            // If we find the array start marker, start counting brackets
            if (!arrayStartFound && j === i) {
              const arrayIndex = checkLine.indexOf(arrayName + ":");
              if (arrayIndex !== -1 && k >= arrayIndex) {
                const bracketIndex = checkLine.indexOf("[", arrayIndex);
                if (bracketIndex !== -1 && k >= bracketIndex) {
                  arrayStartFound = true;
                  openBrackets = 1; // Start with one open bracket
                  continue;
                }
              }
            }

            // Once we've found the array start, count brackets
            if (arrayStartFound) {
              if (checkLine[k] === "[") {
                openBrackets++;
              }
              if (checkLine[k] === "]") {
                openBrackets--;
              }

              // When we reach zero, we've found the end of the array
              if (openBrackets === 0) {
                endLine = j;

                // Check if the current widget is a direct child in this array
                const siblings = findAllSiblingsInArray(document, {
                  startLine: i,
                  endLine: endLine,
                  arrayName: arrayName,
                });

                for (const sibling of siblings) {
                  // If we find our current widget in the siblings list, this is the correct parent array
                  if (sibling.line === currentWidget.line) {
                    return {
                      startLine: i,
                      endLine: endLine,
                      arrayName: arrayName,
                    };
                  }
                }

                // If we didn't find our widget in this array, keep looking
                break;
              }
            }
          }

          // If we've found the end of the array, but it's not the right one, break and continue to the next array
          if (arrayStartFound && openBrackets === 0) {
            break;
          }
        }
      }
    }
  }

  return null;
}

/**
 * Finds all sibling widgets within an array
 */
export function findAllSiblingsInArray(
  document: vscode.TextDocument,
  parentArray: ParentArray
): WidgetInfo[] {
  const siblings: WidgetInfo[] = [];
  const arrayStartLine = parentArray.startLine;
  const arrayEndLine = parentArray.endLine;

  // Get the indentation level of the array items
  let itemIndentLevel = -1;

  // Find the indentation level of the first item
  for (let i = arrayStartLine + 1; i < arrayEndLine; i++) {
    const lineText = document.lineAt(i).text.trim();
    if (lineText !== "" && !isEmptyOrComment(lineText)) {
      itemIndentLevel = getIndentation(document.lineAt(i).text);
      break;
    }
  }

  if (itemIndentLevel === -1) {
    return []; // No items found in array
  }

  // Scan through the array to find all widget declarations at the correct indentation level
  for (let i = arrayStartLine + 1; i < arrayEndLine; i++) {
    const lineText = document.lineAt(i).text;
    const indent = getIndentation(lineText);

    // Skip empty lines, comments, or lines with wrong indentation
    if (isEmptyOrComment(lineText) || indent !== itemIndentLevel) {
      continue;
    }

    // Check if this line has a widget declaration
    const widgetMatch = lineText.match(widgetNameRegex);
    if (widgetMatch) {
      const widgetName = widgetMatch[1];
      const widgetPosition = lineText.indexOf(widgetName);

      siblings.push({
        name: widgetName,
        line: i,
        character: widgetPosition,
      });
    }
  }

  return siblings;
}