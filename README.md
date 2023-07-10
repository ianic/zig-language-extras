# Zig Language Extras 

This extension adds few
[commands](https://github.com/ianic/zig-language-extras/blob/de59f5422a73d976fa47961fb2cb0974037687b4/package.json#L34)
for Zig development:
  * Zig extras: Run single test
  * Zig extras: Run file tests
  * Zig extras: Test workspace
  * Zig extras: Build workspace
  * Zig extras: Debug test
  * Zig extras: Debug binary

It also displays code lenses above tests to run or debug single test, and code
lens at the first line of the file to run all tests.

It
[depends](https://github.com/ianic/zig-language-extras/blob/de59f5422a73d976fa47961fb2cb0974037687b4/package.json#L8)
on three other extensions.
[Zig Language](https://marketplace.visualstudio.com/items?itemName=ziglang.vscode-zig)
for location of Zig binary. [Native
Debug](https://marketplace.visualstudio.com/items?itemName=webfreak.debug) for
launching debugger on Linux and
[CodeLLDB](https://marketplace.visualstudio.com/items?itemName=vadimcn.vscode-lldb)
for debugging on MacOS.


The main reason I decided to make this is to create fine vscode problems
description from zig command output. When running tests there can be few
different versions of the output. Build can fail, test can fail, assert can be
risen while running the test. All of those have different output and it is hard
to make single regexp which will work for all. So I make it more procedural way
by analyzing zig command output line by line. 

Most of the commands are expecting folder structure built with 'zig init-exe' or
'zig init-lib'. With build.zig in the root and files under src. Folder with the
build.zig is expected to be root of the vscode workspace.

## Testing

'Test workspace' runs `zig build test` in the root of the workspace so depends
on tests definition in your build.zig

'Run file tests' runs all tests in the current file `zig test {file_name}`.

'Run single tests' tries to find test name from the current position. It first
searches up from the current position to find name of the test. If not found
then it searches down. If you are positioned in the test, that will run that
test. If you are in the code and the tests are below you code this will find
first test. 
## Building

'Build workspace' command runs `zig build` in the root of the workspace. 

## Debugging

There are two debugging commands. 

'Debug test' builds binary for the test (binary location: zig-out/debug/test)
and starts debugger on that binary. Put a breakpoint in you test before running
command.

'Debug binary' first builds workspace and then starts binary zig-out/bin/{name}.
If current file is in src folder name is set to the folder name above src folder
which is expected to be root of your workspace. If the current file is in some
other folder then the name of the current file is used as name of the binary
except if that file is named main.zig then folder name of that file is used as
expected binary name.

## Keybinding tip

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

## Extension development

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

## Credits 

Code lenses implementation is taken from Jarred-Sumner's [pull
request](https://github.com/ziglang/vscode-zig/pull/57/files) to original
vscode-zig extension.

<!--
  ### Notes to myself
  [vscode extensions docs](https://code.visualstudio.com/api/get-started/extension-anatomy)   
  [extension samples](https://github.com/microsoft/vscode-extension-samples/tree/main)  
  [publishing extension](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)  
-->