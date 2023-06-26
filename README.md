# Zig Language Extras 

This extension is adding few commands for Zig development:
  * Zig extras: Run single test
  * Zig extras: Run file tests

The main reason I decided to make this is to create fine vscode problems from
zig command output. When running tests there can be few different versions of
the output. Build can fail, test can fail, assert can be risen while running the
test. All of those have different output and it is hard to make regexp which
will work for all. So I make it more procedural way by analyzing zig command
output line by line. 


Add to you keybindings.json something like:
  ```jsonc
    // Zig extras: Run file tests
    {
        "key": "ctrl+j t",
        "command": "zig-language-extras.runFileTests",
        "when": "editorLangId == 'zig'"
    },
    // Zig extras: Run single test
    {
        "key": "ctrl+j s",
        "command": "zig-language-extras.runSingleTest",
        "when": "editorLangId == 'zig'"
    },
  ```

  ### code

  Zig command output parser is in [src/diagnostic.ts](src/diagnostic.ts) and the
  corresponding tests in the [src/test/suite/extensions.test.ts](src/test/suite/extensions.test.ts#L102).

  ### Notes to myself
  [vscode extensions docs](https://code.visualstudio.com/api/get-started/extension-anatomy)   
  [extension samples](https://github.com/microsoft/vscode-extension-samples/tree/main)


