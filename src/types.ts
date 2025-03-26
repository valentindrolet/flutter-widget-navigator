// Shared interfaces and types

/**
 * Information about a widget
 */
export interface WidgetInfo {
    name: string;
    line: number;
    character: number;
    startLine?: number;
    endLine?: number;
  }
  
  /**
   * Information about a widget's boundaries
   */
  export interface WidgetBoundaries {
    startLine: number;
    endLine: number;
  }
  
  /**
   * Information about a parent array (children, items, etc.)
   */
  export interface ParentArray extends WidgetBoundaries {
    arrayName: string;
  }
  
  /**
   * Navigation type for widget navigation
   */
  export type NavigationType = 
    | "parent" 
    | "child" 
    | "previousSibling" 
    | "nextSibling" 
    | "firstSibling" 
    | "lastSibling";
  
  /**
   * Direction for sibling navigation
   */
  export type SiblingDirection = "previous" | "next" | "first" | "last";
  
  /**
   * Property insertion information
   */
  export interface PropertyInsertionInfo {
    insertLine: number;
    insertIndent: number;
    needsComma: boolean;
    previousPropertyLine: number;
    isCommaBefore: boolean;
    onSameLine: boolean;
  }
  
  /**
   * Property suggestion
   */
  export interface PropertySuggestion {
    name: string;
    defaultValue: string;
  }