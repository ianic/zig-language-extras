import * as vscode from 'vscode';
import Severity = vscode.DiagnosticSeverity;

type DiagnosticsMap = { [id: string]: vscode.Diagnostic[]; };

const testHeaderRegexp = /^\d+\/\d+\s+test\.([^\.]*)\.\.\.\s+(.*)$/; // matches '1/5 test.simple test... OK'
const testFileRegexp = /^([^:]*):(\d+):(\d+):\s+[\dxabcdef]*\s+in\s+test\.(.*)\s+\(test\)$/; // matches '/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig:29:5: 0x102044ec3 in test.add 2 (test)'
const additionalFileRegexp = /^([^:]*):(\d+):(\d+):\s+[\dxabcdef]*\s+in\s+(.*)\s+\(test\)$/; // matches '/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig:46:10: 0x104c90fe7 in second (test)'
const buildRegexp = /^(\S.*):(\d*):(\d*): ([^:]*): (.*)$/; // matches 'src/main.zig:33:19: error: error is ignored'
const allTestsPassedRegexp = /^All\s+\d+\s+tests\s+passed.$/; // matches 'All 5 tests passed.'

export class Diagnostic {
    map: DiagnosticsMap = {};
    cwd: string;
    lines: string[];

    constructor(cwd: string, stderr: string) {
        this.cwd = cwd;
        this.lines = stderr.split("\n");
        this.parse();
    }

    length() {
        const keys = Object.keys(this.map);
        if (keys.length === 0) {
            return 0;
        }
        return keys.map((key) => { return this.map[key].length; }).reduce((val, cur) => { return val + cur; });
    }

    push(filePath: string, line: number, column: number, message: string, severity: Severity = Severity.Error) {
        filePath = this.absolutePath(filePath);
        let range = new vscode.Range(line, column, line, Infinity);



        if (this.map[filePath] === undefined) { this.map[filePath] = []; };
        this.map[filePath].push(new vscode.Diagnostic(range, message, severity));
    }

    createProblems(diagnosticCollection: vscode.DiagnosticCollection) {
        for (let filePath in this.map) {
            let fileDiagnostics = this.map[filePath];
            diagnosticCollection.set(vscode.Uri.file(filePath), fileDiagnostics);
        }
    }

    absolutePath(filePath: string) {
        if (!filePath.includes(this.cwd)) {
            return require("path").resolve(this.cwd, filePath);
        }
        return filePath;
    }

    parse() {
        if (this.lines.length === 0) { return; }
        if (this.testsPassed()) { return; }

        this.parseTest();
        if (this.length() === 0) {
            this.parseBuild();
        }
    }

    testsPassed() {
        const line = this.lines[this.lines.length - 1];
        return !!line.match(allTestsPassedRegexp);
    }

    parseBuild() {
        for (let i = 0; i < this.lines.length; i++) {
            const line = this.lines[i];
            let match = line.match(buildRegexp);
            if (match) {
                let path = match[1].trim();
                let line = parseInt(match[2]) - 1;
                let column = parseInt(match[3]) - 1;
                let type = match[4];
                let message = match[5];
                let severity = (!type || type.trim().toLowerCase() === "error") ?
                    Severity.Error :
                    Severity.Hint;
                this.push(path, line, column, message, severity);
            }
        }
    }

    parseTest() {
        const linesCount = this.lines.length;

        for (let i = 0; i < linesCount; i++) {
            const line = this.lines[i];
            let match = line.match(testHeaderRegexp);
            if (match) {
                const testName = match[1];
                const message = match[2];
                if (message !== "OK") {
                    for (let j = i + 1; j < linesCount; j++) {
                        const fileLine = this.lines[j];
                        let fileLineMatch = fileLine.match(testFileRegexp);
                        if (fileLineMatch) {
                            const filePath = fileLineMatch[1];
                            const line = parseInt(fileLineMatch[2]) - 1;
                            const column = parseInt(fileLineMatch[3]) - 1;
                            const fileTestName = fileLineMatch[4];
                            if (fileTestName === testName) {
                                //console.log("diagnostic.push", testName, message, filePath, line, column);
                                this.push(filePath, line, column, message);

                                for (let k = i + 1; k < j; k++) {
                                    const additionalFileLine = this.lines[k];
                                    //if (additionalFileLine.startsWith(filePath)) {
                                    let additionalLineMatch = additionalFileLine.match(additionalFileRegexp);
                                    if (additionalLineMatch) {
                                        const additionalFilePath = additionalLineMatch[1];
                                        const line = parseInt(additionalLineMatch[2]) - 1;
                                        const column = parseInt(additionalLineMatch[3]) - 1;
                                        const functionName = additionalLineMatch[4];
                                        this.push(additionalFilePath, line, column, message);
                                    }
                                    //}
                                }
                                i = j;
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
};

