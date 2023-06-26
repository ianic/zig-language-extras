import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Sample test', () => {
        assert.strictEqual(-1, [1, 2, 3].indexOf(5));
        assert.strictEqual(-1, [1, 2, 3].indexOf(0));
    });

    test('Zig test output with failed assert', () => {
        const stderr = `1/5 test.simple test... OK
2/5 test.add 2... expected 4, found 5
FAIL (TestExpectedEqual)
/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig:29:5: 0x102044ec3 in test.add 2 (test)
    try testing.expectEqual(4, 2 + 3);
    ^
3/5 test.add 3... FAIL (TestUnexpectedResult)
/usr/local/zig/zig-macos-aarch64-0.11.0-dev.2939+289234744/lib/std/testing.zig:509:14: 0x102045017 in expect (test)
    if (!ok) return error.TestUnexpectedResult;
             ^
/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig:33:5: 0x102045073 in test.add 3 (test)
    try testing.expect(4 == 3 + 3);
    ^
4/5 test.simple assert... thread 46176743 panic: reached unreachable code
/usr/local/zig/zig-macos-aarch64-0.11.0-dev.2939+289234744/lib/std/debug.zig:286:14: 0x10204513b in assert (test)
    if (!ok) unreachable; // assertion failure
             ^
/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig:38:21: 0x1020450eb in test.simple assert (test)
    std.debug.assert(false);
                    ^
/usr/local/zig/zig-macos-aarch64-0.11.0-dev.2939+289234744/lib/test_runner.zig:178:28: 0x10204c4e3 in mainTerminal (test)
        } else test_fn.func();
                           ^
/usr/local/zig/zig-macos-aarch64-0.11.0-dev.2939+289234744/lib/test_runner.zig:38:28: 0x10204bfe7 in main (test)
        return mainTerminal();
                           ^
/usr/local/zig/zig-macos-aarch64-0.11.0-dev.2939+289234744/lib/std/start.zig:599:22: 0x10204cc6f in main (test)
            root.main();
                     ^
???:?:?: 0x18ad1bf27 in ??? (???)
???:?:?: 0x6060ffffffffffff in ??? (???)
error: the following test command crashed:
/Users/ianic/code/vscode/zig_extras/test_project/zig-cache/o/baa7aa3e051aa3fed1e3255db2b1f03a/testT`;
        const diagnostics = parse(stderr);
        const filePath = "/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig";

        //console.log(diagnostics);

        let map = diagnostics.map;
        assert.equal(diagnostics.length(), 1);
        assert.equal(Object.keys(map).length, 1);
        assert.equal(map[filePath].length, 3);

        let d = map[filePath][0];
        assert.equal(d.message, "expected 4, found 5");
        assert.equal(d.range.start.line, 28);

        d = map[filePath][1];
        assert.equal(d.message, "FAIL (TestUnexpectedResult)");
        assert.equal(d.range.start.line, 32);

        d = map[filePath][2];
        assert.equal(d.message, "thread 46176743 panic: reached unreachable code");
        assert.equal(d.range.start.line, 37);
    });
});

const testHeader = /^\d+\/\d+\s+test\.([^\.]*)\.\.\.\s+(.*)$/;
const fileLocation = /^([^:]*):(\d+):(\d+):\s+[\dxabcdef]*\s+in\s+test\.(.*)\s+\(test\)$/;


type DiagnosticsMap = { [id: string]: vscode.Diagnostic[]; };
class Diagnostics {
    map: DiagnosticsMap = {};

    length() {
        return Object.keys(this.map).length;
    }

    push(filePath: string, line: number, column: number, message: string) {
        let diagnostics = this.map;
        if (diagnostics[filePath] === undefined) { diagnostics[filePath] = []; };
        let range = new vscode.Range(line, column, line, Infinity);
        let severity = vscode.DiagnosticSeverity.Error;
        diagnostics[filePath].push(new vscode.Diagnostic(range, message, severity));
    }
};

function parse(stderr: string) {
    const lines = stderr.split("\n");
    const linesCount = lines.length;
    //var diagnostics: Diagnostics = {};
    const diagnostics = new Diagnostics();

    for (let i = 0; i < linesCount; i++) {
        const line = lines[i];
        let match = line.match(testHeader);
        if (match) {
            const testName = match[1];
            const message = match[2];
            if (message !== "OK") {
                for (let j = i + 1; j < linesCount; j++) {
                    const fileLine = lines[j];
                    let fileLineMatch = fileLine.match(fileLocation);
                    if (fileLineMatch) {
                        const filePath = fileLineMatch[1];
                        const fileLine = parseInt(fileLineMatch[2]) - 1;
                        const fileColumn = parseInt(fileLineMatch[3]) - 1;
                        const fileTestName = fileLineMatch[4];
                        if (fileTestName === testName) {
                            console.log("diagnostic.push", testName, message, filePath, fileLine, fileColumn);
                            diagnostics.push(filePath, fileLine, fileColumn, message);

                            i = j;
                            break;
                        }
                    }
                }
            }
        }
    }
    return diagnostics;
}
