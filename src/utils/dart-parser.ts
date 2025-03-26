/**
 * Utility functions for parsing Dart code
 */

// Regular expression to match widget names
export const widgetNameRegex = /\b((const )?[A-Z][a-zA-Z0-9_]*)\(/;

/**
 * Gets the indentation level of a line
 */
export function getIndentation(line: string): number {
  const match = line.match(/^\s*/);
  return match ? match[0].length : 0;
}

/**
 * Checks if a line is empty or a comment
 */
export function isEmptyOrComment(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === "" || trimmed.startsWith("//") || trimmed.startsWith("/*");
}

/**
 * Checks if a line contains a widget declaration
 */
export function isWidgetDeclaration(line: string): boolean {
  // Trim the line to remove leading/trailing whitespace
  const trimmed = line.trim();
  
  // Skip lines that are clearly property assignments
  if (/^\w+\s*:/.test(trimmed) && !/^\s*(child|children)\s*:/.test(trimmed)) {
    return false;
  }
  
  // Check for common patterns that indicate a widget declaration
  // 1. Widget declaration typically starts at beginning of line or after '='
  // 2. Followed by capitalized word (widget name)
  // 3. Followed by opening parenthesis
  const widgetPattern = /(^|\s*=\s*|^\s*|const |child: |return\s+)([A-Z][a-zA-Z0-9_]*)/;
  return widgetPattern.test(trimmed);
}

/**
 * Checks if a property is a child property
 */
export function isChildProperty(propertyName: string): boolean {
  return propertyName === "child" || propertyName === "children";
}