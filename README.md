# Flutter Widget Navigator

[![Version](https://img.shields.io/visual-studio-marketplace/v/valentindrolet.flutter-widget-navigator)](https://marketplace.visualstudio.com/items?itemName=valentindrolet.flutter-widget-navigator)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/valentindrolet.flutter-widget-navigator)](https://marketplace.visualstudio.com/items?itemName=valentindrolet.flutter-widget-navigator)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/valentindrolet.flutter-widget-navigator)](https://marketplace.visualstudio.com/items?itemName=valentindrolet.flutter-widget-navigator)

Quickly and efficiently navigate Flutter widget trees directly from your keyboard.
Seamlessly move between parent, child and sibling widgets, add properties, and select entire widget trees without ever leaving your keyboard.

![Flutter Widget Navigator in action](https://github.com/valentindrolet/flutter-widget-navigator/blob/main/images/demo.gif)

## Features

🚀 **Widget Navigation**

- Jump to parent or child widget with a single keystroke
- Quickly move between sibling widgets
- Jump to the first or last sibling in a widget list

🔍 **Widget Selection**

- Instantly select an entire widget including all properties and children
- Perfect for quick copying, deleting, or refactoring operations

⚡ **Property Addition**

- Add widget properties with intelligent suggestions based on widget type
- Tab between property name and value for quick editing
- Properties are placed in logical positions with proper indentation

## Keyboard Shortcuts

| Command                      | Windows/Linux                                                | Mac                                                                         |
| ---------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Navigate to parent widget    | <kbd>Alt</kbd>+<kbd>Ctrl</kbd>+<kbd>↑</kbd>                  | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Cmd</kbd>+<kbd>↑</kbd>                  |
| Navigate to child widget     | <kbd>Alt</kbd>+<kbd>Ctrl</kbd>+<kbd>↓</kbd>                  | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Cmd</kbd>+<kbd>↓</kbd>                  |
| Navigate to previous sibling | <kbd>Alt</kbd>+<kbd>Ctrl</kbd>+<kbd>←</kbd>                  | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Cmd</kbd>+<kbd>←</kbd>                  |
| Navigate to next sibling     | <kbd>Alt</kbd>+<kbd>Ctrl</kbd>+<kbd>→</kbd>                  | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Cmd</kbd>+<kbd>→</kbd>                  |
| Navigate to first sibling    | <kbd>Alt</kbd>+<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>←</kbd> | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>←</kbd> |
| Navigate to last sibling     | <kbd>Alt</kbd>+<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>→</kbd> | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>→</kbd> |
| Select current widget        | <kbd>Alt</kbd>+<kbd>Ctrl</kbd>+<kbd>L</kbd>                  | <kbd>Cmd</kbd>+<kbd>Alt</kbd>+<kbd>L</kbd>                                  |
| Add property to widget       | <kbd>Alt</kbd>+<kbd>Ctrl</kbd>+<kbd>P</kbd>                  | <kbd>Alt</kbd>+<kbd>Cmd</kbd>+<kbd>P</kbd>                                  |

**Note**: You can customize these keyboard shortcuts in VS Code preferences.

## Smart Property Suggestions

When adding properties, Flutter Widget Navigator intelligently suggests properties based on the widget type:

- For `Container`: decoration, padding, margin, width
- For `Row`/`Column`: mainAxisAlignment, crossAxisAlignment, children
- For `Text`: style, textAlign, overflow
- For `ElevatedButton`/`TextButton`: onPressed, child
- ...and many more common widgets

## Usage Examples

### Navigating a Widget Tree

1. Place your cursor inside a widget
2. Press <kbd>Alt</kbd>+<kbd>Ctrl</kbd>+<kbd>↑</kbd> to jump to the parent
3. Press <kbd>Alt</kbd>+<kbd>Ctrl</kbd>+<kbd>↓</kbd> to navigate to a child
4. Use <kbd>Alt</kbd>+<kbd>Ctrl</kbd>+<kbd>←</kbd> and <kbd>Alt</kbd>+<kbd>Ctrl</kbd>+<kbd>→</kbd> to move between siblings

### Adding Properties

1. Navigate to a widget
2. Press <kbd>Alt</kbd>+<kbd>Ctrl</kbd>+<kbd>P</kbd>
3. A property suggestion appears based on widget type
4. Press <kbd>Tab</kbd> to move from property name to value
5. Press <kbd>Tab</kbd> again to complete and position cursor

### Selecting a Widget

1. Navigate to a widget
2. Press <kbd>Alt</kbd>+<kbd>Ctrl</kbd>+<kbd>L</kbd> to select the entire widget tree
3. Copy, delete, or refactor as needed

## Known Issues

- Widget detection may not work perfectly in certain edge cases with highly nested widgets

## Release Notes

### 1.0.0

- Initial release with widget navigation, selection, and property addition

## About

Created with ❤️ for Flutter developers to boost productivity. If you enjoy using **Flutter Widget Navigator**, please consider rating it in the marketplace!

## Contributing

Contributions are welcome! Check out the [GitHub repository](https://github.com/valentindrolet/flutter-widget-navigator) to contribute.
