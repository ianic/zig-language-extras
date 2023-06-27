import * as assert from 'assert';
import * as vscode from 'vscode';
import { Diagnostic } from '../../diagnostic';
import Severity = vscode.DiagnosticSeverity;

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Zig single test', () => {
        const tc = testCases[4];
        const filePath = tc.file;
        const diagnostic = new Diagnostic(tc.cwd, tc.stderr);

        let map = diagnostic.map;
        assert.equal(diagnostic.length(), 1);

        let d = map[filePath][0];
        assert.equal(d.message, "expected 2, found 3");
        assert.equal(d.range.start.line, 28);
    });

    test('Zig test output with failed assert', () => {
        const tc = testCases[3];
        const filePath = tc.file;
        const diagnostic = new Diagnostic(tc.cwd, tc.stderr);

        let map = diagnostic.map;
        assert.equal(diagnostic.length(), 5);
        assert.equal(Object.keys(map).length, 3);
        assert.equal(map[filePath].length, 3);

        let d = map[filePath][0];
        assert.equal(d.message, "expected 4, found 5");
        assert.equal(d.range.start.line, 28);

        d = map[filePath][1];
        assert.equal(d.message, "FAIL (TestUnexpectedResult)");
        assert.equal(d.range.start.line, 32);

        d = map[filePath][2];
        assert.equal(d.message, "panic: reached unreachable code");
        assert.equal(d.range.start.line, 37);
    });

    test('Zig test output with deep assert', () => {
        const tc = testCases[2];
        const filePath = tc.file;
        const diagnostic = new Diagnostic(tc.cwd, tc.stderr);

        assert.equal(diagnostic.length(), 8);

        let map = diagnostic.map;
        let d = map[filePath][0];
        assert.equal(d.message, "expected 4, found 5");
        assert.equal(d.range.start.line, 28);

        d = map[filePath][1];
        assert.equal(d.message, "FAIL (TestUnexpectedResult)");
        assert.equal(d.range.start.line, 32);

        d = map[filePath][2];
        assert.equal(d.message, "panic: reached unreachable code");
        assert.equal(d.range.start.line, 37);

        d = map[filePath][3];
        assert.equal(d.message, "panic: reached unreachable code");
        assert.equal(d.range.start.line, 49);
        d = map[filePath][4];
        assert.equal(d.message, "panic: reached unreachable code");
        assert.equal(d.range.start.line, 45);
        d = map[filePath][5];
        assert.equal(d.message, "panic: reached unreachable code");
        assert.equal(d.range.start.line, 41);
    });

    test('Zig build error', () => {
        const tc = testCases[1];
        const filePath = tc.file;
        const diagnostic = new Diagnostic(tc.cwd, tc.stderr);

        assert.equal(diagnostic.length(), 2);

        var d = diagnostic.map[filePath][0];
        assert.equal(d.message, "error is ignored");
        assert.equal(d.range.start.line, 32);
        assert.equal(d.severity, Severity.Error);

        d = diagnostic.map[filePath][1];
        assert.equal(d.message, "consider using 'try', 'catch', or 'if'");
        assert.equal(d.range.start.line, 32);
        assert.equal(d.severity, Severity.Hint);
    });

    test('Zig success test', () => {
        const tc = testCases[0];
        const diagnostic = new Diagnostic(tc.cwd, tc.stderr);
        assert.equal(diagnostic.length(), 0);
        assert.equal(diagnostic.testsPassed(), true);
    });

    test('Zig build test with assert failed', () => {
        const tc = testCases[5];
        const diagnostic = new Diagnostic(tc.cwd, tc.stderr);
        assert.equal(diagnostic.length(), 8);

        var fd = diagnostic.map[tc.file];
        assert.equal(fd.length, 4);
        fd.forEach((d) => {
            assert.equal(d.message, "panic: reached unreachable code");
            assert.equal(d.severity, Severity.Error);
        });
    });
});

const testCases = [
    // passing test
    {
        "stderr": `1/5 test.simple test... OK
2/5 test.add 2... OK
3/5 test.add 3... OK
4/5 test.deep assert... OK
5/5 test.simple assert... OK
All 5 tests passed.`,

        "cwd": "",
        "file": "",
    },
    // build failed
    {
        "stderr": `src/main.zig:33:19: error: error is ignored
src/main.zig:33:19: note: consider using 'try', 'catch', or 'if'`,

        "cwd": "/Users/ianic/code/vscode/zig_extras/test_project",
        "file": "/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig",
    },
    // assert failed
    {
        "stderr": `1/5 test.simple test... OK
2/5 test.add 2... expected 4, found 5
FAIL (TestExpectedEqual)
/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig:29:5: 0x104c84ec3 in test.add 2 (test)
    try testing.expectEqual(4, 2 + 3);
    ^
3/5 test.add 3... FAIL (TestUnexpectedResult)
/usr/local/zig/zig-macos-aarch64-0.11.0-dev.2939+289234744/lib/std/testing.zig:509:14: 0x104c85017 in expect (test)
    if (!ok) return error.TestUnexpectedResult;
             ^
/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig:33:5: 0x104c85073 in test.add 3 (test)
    try testing.expect(4 == 3 + 3);
    ^
4/5 test.deep assert... thread 46317125 panic: reached unreachable code
/usr/local/zig/zig-macos-aarch64-0.11.0-dev.2939+289234744/lib/std/debug.zig:286:14: 0x104c85167 in assert (test)
    if (!ok) unreachable; // assertion failure
             ^
/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig:50:21: 0x104cc528b in third (test)
    std.debug.assert(false);
                    ^
/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig:46:10: 0x104c90fe7 in second (test)
    third();
         ^
/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig:42:11: 0x104c850f3 in first (test)
    second();
          ^
/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig:38:10: 0x104c850db in test.deep assert (test)
    first();
         ^
/usr/local/zig/zig-macos-aarch64-0.11.0-dev.2939+289234744/lib/test_runner.zig:178:28: 0x104c8c4e3 in mainTerminal (test)
        } else test_fn.func();
                           ^
/usr/local/zig/zig-macos-aarch64-0.11.0-dev.2939+289234744/lib/test_runner.zig:38:28: 0x104c8bfe7 in main (test)
        return mainTerminal();
                           ^
/usr/local/zig/zig-macos-aarch64-0.11.0-dev.2939+289234744/lib/std/start.zig:599:22: 0x104c8cc6f in main (test)
            root.main();
                     ^
???:?:?: 0x18ad1bf27 in ??? (???)
???:?:?: 0x4f6dffffffffffff in ??? (???)
error: the following test command crashed:
/Users/ianic/code/vscode/zig_extras/test_project/zig-cache/o/baa7aa3e051aa3fed1e3255db2b1f03a/test`,

        "cwd": "/Users/ianic/code/vscode/zig_extras/test_project",
        "file": "/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig",
    },
    // simple assert failed
    {
        "stderr": `1/5 test.simple test... OK
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
/Users/ianic/code/vscode/zig_extras/test_project/zig-cache/o/baa7aa3e051aa3fed1e3255db2b1f03a/testT`,

        "cwd": "/Users/ianic/code/vscode/zig_extras/test_project",
        "file": "/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig",
    },
    // single test
    {
        "stderr": `1/1 test.add 2... expected 2, found 3
FAIL (TestExpectedEqual)
/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig:29:5: 0x1009406e3 in test.add 2 (test)
    try testing.expectEqual(2, 2 + 3);
    ^
0 passed; 0 skipped; 1 failed.
error: the following test command failed with exit code 1:
/Users/ianic/code/vscode/zig_extras/test_project/zig-cache/o/5e395467506bfb2f4e55a73f4998ccea/test`,

        "cwd": "/Users/ianic/code/vscode/zig_extras/test_project",
        "file": "/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig",
    },
    // zig build test
    {
        stderr: `run test: error: thread 48065683 panic: reached unreachable code
/usr/local/zig/zig-macos-aarch64-0.11.0-dev.2939+289234744/lib/std/debug.zig:286:14: 0x104ff0f8f in assert (test)
    if (!ok) unreachable; // assertion failure
             ^
/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig:51:21: 0x10502d2e3 in third (test)
    std.debug.assert(false);
                    ^
/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig:46:10: 0x104ff9127 in second (test)
    third();
         ^
/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig:42:11: 0x104fed0ef in first (test)
    second();
          ^
/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig:38:10: 0x104fed0d7 in test.deep assert (test)
    first();
         ^
/usr/local/zig/zig-macos-aarch64-0.11.0-dev.2939+289234744/lib/test_runner.zig:102:29: 0x104ff2d1b in mainServer (test)
                test_fn.func() catch |err| switch (err) {
                            ^
/usr/local/zig/zig-macos-aarch64-0.11.0-dev.2939+289234744/lib/test_runner.zig:36:26: 0x104ff3f1f in main (test)
        return mainServer() catch @panic("internal test runner failure");
                         ^
/usr/local/zig/zig-macos-aarch64-0.11.0-dev.2939+289234744/lib/std/start.zig:599:22: 0x104ff4bbb in main (test)
            root.main();
                     ^
???:?:?: 0x18ad1bf27 in ??? (???)
???:?:?: 0xbf597fffffffffff in ??? (???)
run test: error: while executing test 'test.deep assert', the following command terminated with signal 6 (expected exited with code 0):
/Users/ianic/code/vscode/zig_extras/test_project/zig-cache/o/c1a4dbaec5e49f22f351b2537eac8d89/test --listen=- 
Build Summary: 1/3 steps succeeded; 1 failed; 5/5 tests passed (disable with -fno-summary)
test transitive failure
+- run test failure
   +- zig test Debug native success 592ms MaxRSS:152M
error: the following build command failed with exit code 1:
/Users/ianic/code/vscode/zig_extras/test_project/zig-cache/o/e14ec7ddb426b4447b67446ba65e7dab/build /usr/local/zig/zig-macos-aarch64-0.11.0-dev.2939+289234744/zig /Users/ianic/code/vscode/zig_extras/test_project /Users/ianic/code/vscode/zig_extras/test_project/zig-cache /Users/ianic/.cache/zig test
`,
        "cwd": "/Users/ianic/code/vscode/zig_extras/test_project",
        "file": "/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig",
    },

];
