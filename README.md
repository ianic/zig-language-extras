# Zig Language Extras 

This extension adds few commands for Zig development:
  * Zig extras: Run single test
  * Zig extras: Run file tests
  * Zig extras: Debug test
  * Zig extras: Build workspace
  * Zig extras: Test workspace

Assumes that you are already using
[vscode-zig](https://github.com/ziglang/vscode-zig) extension. Extras extension uses
configuration in vscode-zig to found Zig binary location if configured there.

The main reason I decided to make this is to create fine vscode problems from
zig command output. When running tests there can be few different versions of
the output. Build can fail, test can fail, assert can be risen while running the
test. All of those have different output and it is hard to make regexp which
will work for all. So I make it more procedural way by analyzing zig command
output line by line. 


When adding keybinding you can restrict usage on Zig language files:
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

### Debug test

This command runs single Zig test and outputs test binary to configured location
(default zig-out/debug/test). You should use that binary as a target for
debugger launch configuration. Command will run configured launch configuration
(default ZigDebugTest).

On mac I have installed [CodeLLDB](https://marketplace.visualstudio.com/items?itemName=vadimcn.vscode-lldb)
extension with launch.json:
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "ZigDebugTest",
            "type": "lldb",
            "request": "launch",
            "program": "./zig-out/debug/test",
            "cwd": "${workspaceFolder}",
        }
    ]
}
```
On Linux I'm using [Native Debug](https://marketplace.visualstudio.com/items?itemName=webfreak.debug) extension with launch.json:
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "ZigDebugTest",
            "type": "gdb",
            "request": "launch",
            "target": "./zig-out/debug/test",
            "cwd": "${workspaceFolder}",
        }
    ]
}
```


With that I position myself into Zig test and run 'Debug test' command. That
builds binary and starts debug launch configuration.


### code


Zig command output parser is in [src/parser.ts](src/parser.ts) and the
corresponding tests in the [src/test/suite/parser.test.ts](src/test/suite/parser.test.ts).

Parser test cases are in files located in
src/test/suite/testdata. Each case in .txt file has
corresponding expected parser output in _expected.json file. Parser test loads
all txt files and expects to get parsing result as in expected file.

Parser has no dependency on vscode so it is possible to test without running vscode:
```sh
mocha -ui tdd out/test/suite/parser.test.js
```

<!--
  ### Notes to myself
  [vscode extensions docs](https://code.visualstudio.com/api/get-started/extension-anatomy)   
  [extension samples](https://github.com/microsoft/vscode-extension-samples/tree/main)  
  [publishing extension](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)  
-->