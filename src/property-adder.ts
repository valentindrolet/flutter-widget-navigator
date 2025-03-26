import * as vscode from 'vscode';
import { PropertyInsertionInfo, PropertySuggestion } from './types';
import {
  getIndentation,
  isChildProperty,
  isEmptyOrComment,
  isWidgetDeclaration
} from './utils/dart-parser';
import {
  getCurrentWidgetBoundaries,
  getWidgetContent
} from './utils/widget-detection';

/**
 * Adds a property to the current widget
 */
export async function addPropertyToWidget(): Promise<void> {
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
    const currentWidget = getCurrentWidgetBoundaries(document, cursorPosition);

    if (!currentWidget) {
      vscode.window.showInformationMessage("Could not determine current widget");
      return;
    }

    // Get the widget boundaries
    const widgetBoundaries = getWidgetContent(document, currentWidget);
    if (!widgetBoundaries) {
      vscode.window.showInformationMessage("Could not determine widget boundaries");
      return;
    }

    // Determine appropriate property based on widget type
    const suggestedProperty = getSuggestedProperty(
      document,
      currentWidget,
      widgetBoundaries
    );

    // Find the insertion point and indentation
    const insertInfo = findPropertyInsertionPoint(
      document,
      currentWidget,
      widgetBoundaries,
      suggestedProperty.name
    );
    if (!insertInfo) {
      vscode.window.showInformationMessage("Could not determine where to insert the property");
      return;
    }

    await insertProperty(editor, document, insertInfo, suggestedProperty);

    vscode.window.setStatusBarMessage(
      `Added ${suggestedProperty.name} property to ${currentWidget.name}`,
      3000
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Error adding property: ${error}`);
  }
}

/**
 * Inserts a property at the specified position
 */
async function insertProperty(
  editor: vscode.TextEditor,
  document: vscode.TextDocument,
  insertInfo: PropertyInsertionInfo,
  suggestedProperty: PropertySuggestion
): Promise<void> {
  // Add comma to previous property if needed
  if (insertInfo.needsComma) {
    await editor.edit((editBuilder) => {
      editBuilder.insert(
        new vscode.Position(
          insertInfo.previousPropertyLine,
          document.lineAt(insertInfo.previousPropertyLine).text.length
        ),
        ","
      );
    });
  }

  // Determine line start and end formatting
  let startOfLine = "", endOfLine = "";
  if (insertInfo.isCommaBefore) {
    startOfLine = ", ";
  } else {
    endOfLine = `,\${0}\n`;
  }

  // Insert the property with snippet support for tabbing between name and value
  await editor.insertSnippet(
    new vscode.SnippetString(
      `${startOfLine}\${1:${suggestedProperty.name}}: \${2:${suggestedProperty.defaultValue}}${endOfLine}`
    ),
    new vscode.Position(insertInfo.insertLine, insertInfo.insertIndent)
  );
}

/**
 * Find the best place to insert a new property
 */
function findPropertyInsertionPoint(
  document: vscode.TextDocument,
  widget: { name: string; line: number; character: number },
  boundaries: { startLine: number; endLine: number },
  propertyName: string
): PropertyInsertionInfo | null {
  const widgetLine = widget.line;
  const widgetIndent = getIndentation(document.lineAt(widgetLine).text);
  const expectedPropertyIndent = widgetIndent + 2; // Flutter typical indent is 2 spaces

  let lastPropertyLine = -1;
  let insertAfterLine = widgetLine;
  let needsComma = false;

  // Track special positions for certain properties
  const isTextWidget = widget.name === "Text" || widget.name.endsWith("Text");

  
  // First check if there's an opening parenthesis
  const widgetLineText = document.lineAt(widgetLine).text;
  const openParenIndex = widgetLineText.indexOf("(", widget.character);

  // If widget declaration is on a single line with no parameters
  if (
    openParenIndex !== -1 &&
    widgetLineText.indexOf(")", openParenIndex) !== -1
  ) {
    // For text widget, add the property after the text content
    if (isTextWidget) {
      // Find the text content
      const textMatch = widgetLineText.match(/Text\(['"](.*)['"]\)/);
      if (textMatch) {
        const textContent = textMatch[1];
        const textIndex = widgetLineText.indexOf(textContent);
        return {
          insertLine: widgetLine,
          insertIndent: textIndex + textContent.length + 1,
          needsComma: false,
          isCommaBefore: true,
          previousPropertyLine: -1,
        };
      }
    }

    // Single line widget, insert after the opening parenthesis and add newline
    return {
      insertLine: widgetLine,
      insertIndent: openParenIndex + 1, // After the opening parenthesis
      needsComma: false,
      previousPropertyLine: -1,
      isCommaBefore: false,
    };
  }

  // Collect information about all existing properties
  type PropertyInfo = {
    name: string;
    line: number;
    isTextContent?: boolean;
  };
  const properties: PropertyInfo[] = [];

  // Look for existing properties
  for (let i = widgetLine; i <= boundaries.endLine; i++) {
    const lineText = document.lineAt(i).text;
    const lineIndent = getIndentation(lineText);
    const trimmedText = lineText.trim();

    // Skip empty lines and comments
    if (isEmptyOrComment(trimmedText)) {
      continue;
    }

    // If this is the widget declaration line
    if (i === widgetLine) {
      // If the opening parenthesis is on this line, we need to add a new line after this
      if (openParenIndex !== -1) {
        insertAfterLine = i;
        continue;
      }
    }

    // If this is a property line (typically has the form "propertyName: value")
    if (
      lineIndent === expectedPropertyIndent &&
      !isWidgetDeclaration(trimmedText) &&
      trimmedText.indexOf(":") !== -1
    ) {
      // Extract property name
      const colonIndex = trimmedText.indexOf(":");
      const propName = trimmedText.substring(0, colonIndex).trim();

      // Store property info
      properties.push({
        name: propName,
        line: i,
        isTextContent: isTextWidget && propName === "", // No name means it's the text content
      });

      lastPropertyLine = i;
      insertAfterLine = i;
      needsComma = !trimmedText.endsWith(",");
    }

    // Special case for Text widget with text content directly after the opening parenthesis
    if (
      isTextWidget &&
      lineIndent === expectedPropertyIndent &&
      !trimmedText.includes(":") &&
      i === widgetLine + 1
    ) {
      // This might be the primary text content without a property name
      properties.push({
        name: "", // No property name for text content
        line: i,
        isTextContent: true,
      });
    }

    // If we've moved past the properties section
    if (
      i > widgetLine &&
      (lineIndent <= widgetIndent ||
        (lineIndent === widgetIndent + 2 && trimmedText === ")"))
    ) {
      break;
    }
  }

  // If no properties found, insert after the widget declaration line with proper indentation
  if (lastPropertyLine === -1) {
    return {
      insertLine: insertAfterLine + 1, // Insert on the next line
      insertIndent: expectedPropertyIndent,
      needsComma: false,
      previousPropertyLine: -1,
      isCommaBefore: false,
    };
  }

  // Special handling based on widget type and property
  if (isTextWidget) {
    // For Text widgets, style and other properties should go after the text content
    const textContentProp = properties.find((p) => p.isTextContent);
    if (textContentProp) {
      // Insert after the text content
      return {
        insertLine: textContentProp.line + 1,
        insertIndent: expectedPropertyIndent,
        needsComma: !document
          .lineAt(textContentProp.line)
          .text.trim()
          .endsWith(","),
        previousPropertyLine: textContentProp.line,
        isCommaBefore: false,
      };
    }
  }

  // For child property, make sure it's the last property (unless it already exists)
  if (
    isChildProperty(propertyName) &&
    !properties.some((p) => isChildProperty(p.name))
  ) {
    // Make child the last property
    return {
      insertLine: insertAfterLine + 1,
      insertIndent: expectedPropertyIndent,
      needsComma,
      previousPropertyLine: lastPropertyLine,
      isCommaBefore: false,
    };
  }

  // For other properties, insert them before the 'child' property if it exists
  const childProp = properties.find((p) => isChildProperty(p.name));
  if (propertyName !== "child" && childProp) {
    // Find the property just before 'child' to determine if we need a comma
    const prevChildIndex =
      properties.findIndex((p) => p.line === childProp.line) - 1;
    const prevChildLine =
      prevChildIndex >= 0 ? properties[prevChildIndex].line : -1;

    // Insert before the child property
    return {
      insertLine: childProp.line,
      insertIndent: expectedPropertyIndent,
      needsComma:false,
        // prevChildLine !== -1 &&
        // !document.lineAt(prevChildLine).text.trim().endsWith(","),
      previousPropertyLine: prevChildLine,
      isCommaBefore: false,
    };
  }

  // Default: Insert after the last property found
  return {
    insertLine: insertAfterLine + 1, // Insert on the next line
    insertIndent: expectedPropertyIndent,
    needsComma,
    previousPropertyLine: lastPropertyLine,
    isCommaBefore: false,
  };
}

/**
 * Get suggested property based on widget type
 */
function getSuggestedProperty(
  document: vscode.TextDocument,
  widget: { name: string; line: number; character: number },
  boundaries: { startLine: number; endLine: number }
): PropertySuggestion {
  const widgetName = widget.name;
  const widgetIndent = getIndentation(document.lineAt(widget.line).text);
  const expectedPropertyIndent = widgetIndent + 2;

  // Check existing properties to avoid duplicates
  const existingProperties = new Set<string>();

  for (let i = widget.line; i <= boundaries.endLine; i++) {
    const lineText = document.lineAt(i).text;
    const lineIndent = getIndentation(lineText);
    const trimmedText = lineText.trim();

    // Skip lines that aren't properties
    if (
      lineIndent !== expectedPropertyIndent ||
      isEmptyOrComment(trimmedText) ||
      isWidgetDeclaration(trimmedText)
    ) {
      continue;
    }

    // Extract property name from "propertyName: value,"
    const colonIndex = trimmedText.indexOf(":");
    if (colonIndex !== -1) {
      const propertyName = trimmedText.substring(0, colonIndex).trim();
      existingProperties.add(propertyName);
    }
  }

  // Define widget-specific property suggestions
  // First option is the default if available
  const widgetPropertyMap: Record<
    string,
    Array<{ name: string; defaultValue: string }>
  > = {
    Text: [
      { name: "style", defaultValue: "TextStyle()" },
      { name: "textAlign", defaultValue: "TextAlign.start" },
      { name: "overflow", defaultValue: "TextOverflow.clip" },
    ],
    Container: [
      { name: "decoration", defaultValue: "BoxDecoration()" },
      { name: "padding", defaultValue: "EdgeInsets.all(8.0)" },
      { name: "margin", defaultValue: "EdgeInsets.all(8.0)" },
      { name: "width", defaultValue: "double.infinity" },
    ],
    Row: [
      { name: "mainAxisAlignment", defaultValue: "MainAxisAlignment.start" },
      { name: "crossAxisAlignment", defaultValue: "CrossAxisAlignment.center" },
      { name: "children", defaultValue: "[]" },
    ],
    Column: [
      { name: "mainAxisAlignment", defaultValue: "MainAxisAlignment.start" },
      { name: "crossAxisAlignment", defaultValue: "CrossAxisAlignment.center" },
      { name: "children", defaultValue: "[]" },
    ],
    Padding: [
      { name: "padding", defaultValue: "EdgeInsets.all(8.0)" },
      { name: "child", defaultValue: "Container()" },
    ],
    Center: [{ name: "child", defaultValue: "Container()" }],
    SizedBox: [
      { name: "width", defaultValue: "100.0" },
      { name: "height", defaultValue: "100.0" },
      { name: "child", defaultValue: "Container()" },
    ],
    Scaffold: [
      { name: "appBar", defaultValue: "AppBar()" },
      { name: "body", defaultValue: "Container()" },
      { name: "floatingActionButton", defaultValue: "FloatingActionButton()" },
    ],
    AppBar: [
      { name: "title", defaultValue: "Text('Title')" },
      { name: "actions", defaultValue: "[]" },
    ],
    ListView: [
      { name: "children", defaultValue: "[]" },
      { name: "padding", defaultValue: "EdgeInsets.all(8.0)" },
    ],
    Icon: [
      { name: "color", defaultValue: "Colors.blue" },
      { name: "size", defaultValue: "24.0" },
    ],
    ElevatedButton: [
      { name: "onPressed", defaultValue: "() {}" },
      { name: "child", defaultValue: "Text('Button')" },
    ],
    TextButton: [
      { name: "onPressed", defaultValue: "() {}" },
      { name: "child", defaultValue: "Text('Button')" },
    ],
    IconButton: [
      { name: "onPressed", defaultValue: "() {}" },
      { name: "icon", defaultValue: "Icon(Icons.add)" },
    ],
    InkWell: [
      { name: "onTap", defaultValue: "() {}" },
      { name: "child", defaultValue: "Container()" },
    ],
    GestureDetector: [
      { name: "onTap", defaultValue: "() {}" },
      { name: "child", defaultValue: "Container()" },
    ],
    Stack: [
      { name: "children", defaultValue: "[]" },
      { name: "alignment", defaultValue: "Alignment.center" },
    ],
    Card: [
      { name: "elevation", defaultValue: "4.0" },
      { name: "child", defaultValue: "Container()" },
    ],
    Image: [
      { name: "fit", defaultValue: "BoxFit.cover" },
      { name: "width", defaultValue: "100.0" },
      { name: "height", defaultValue: "100.0" },
    ],
    TextField: [
      { name: "decoration", defaultValue: "InputDecoration()" },
      { name: "controller", defaultValue: "TextEditingController()" },
    ],
  };

  // Find properties for this widget type
  let widgetType = widgetName;

  // Handle widget names with generic type parameters (e.g., "Foo<Bar>")
  const genericIndex = widgetType.indexOf("<");
  if (genericIndex !== -1) {
    widgetType = widgetType.substring(0, genericIndex);
  }

  // Find base widget type if it ends with specific patterns
  for (const baseType of Object.keys(widgetPropertyMap)) {
    if (widgetType === baseType || widgetType.endsWith(baseType)) {
      widgetType = baseType;
      break;
    }
  }

  // Get suggested properties for this widget type
  const suggestedProperties = widgetPropertyMap[widgetType] || [
    { name: "key", defaultValue: "Key()" },
    { name: "child", defaultValue: "Container()" },
  ];

  // Find first property that doesn't already exist
  for (const prop of suggestedProperties) {
    if (!existingProperties.has(prop.name)) {
      return prop;
    }
  }

  // If all suggested properties already exist, provide a generic one
  return { name: "property", defaultValue: "value" };
}