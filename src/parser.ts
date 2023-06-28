const testHeaderRegexp = /^\d+\/\d+\s+test\.([^\.]*)\.\.\.\s+(.*)$/; // matches '1/5 test.simple test... OK'
const testFileRegexp = /^([^:]*):(\d+):(\d+):\s+[\dxabcdef]*\s+in\s+test\.(.*)\s+\(test\)$/; // matches '/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig:29:5: 0x102044ec3 in test.add 2 (test)'
const otherFileRegexp = /^([^:]*):(\d+):(\d+):\s+[\dxabcdef]*\s+in\s+(.*)\s+\(test\)$/; // matches '/Users/ianic/code/vscode/zig_extras/test_project/src/main.zig:46:10: 0x104c90fe7 in second (test)'
const buildRegexp = /^(\S.*):(\d*):(\d*): ([^:]*): (.*)$/; // matches 'src/main.zig:33:19: error: error is ignored'
const allTestsPassedRegexp = /^All\s+\d+\s+tests\s+passed.$/; // matches 'All 5 tests passed.'

const buildRunTestHeaderRegexp = /^run test:\s+error:\s+(.*)$/;

export enum Severity {
    error = 0,
    warning = 1,
    information = 2,
    hint = 3
}

class Problem {
    constructor(
        public file: string,
        public line: number,
        public column: number,
        public message: string,
        public severity: Severity,
    ) { }
}

export class Parser {
    problems: Problem[];
    cwd: string;
    lines: string[];

    constructor(cwd: string, stderr: string) {
        this.cwd = cwd;
        this.lines = stderr.split("\n");
        this.problems = [];
        this.parse();
    }

    length() {
        return this.problems.length;
        // const keys = Object.keys(this.map);
        // if (keys.length === 0) {
        //     return 0;
        // }
        // return keys.map((key) => { return this.map[key].length; }).reduce((val, cur) => { return val + cur; });
    }

    push(file: string, line: number, column: number, message: string, severity: Severity = Severity.error) {
        file = this.absolutePath(file);
        this.problems.push(new Problem(file, line, column, message, severity));
        // filePath = this.absolutePath(filePath);
        // let range = new vscode.Range(line, column, line, Infinity);

        // if (this.map[filePath] === undefined) { this.map[filePath] = []; };
        // this.map[filePath].push(new vscode.Diagnostic(range, this.removeThreadId(message), severity));
    }

    // createProblems(diagnosticCollection: vscode.DiagnosticCollection) {
    //     for (let filePath in this.map) {
    //         let fileDiagnostics = this.map[filePath];
    //         diagnosticCollection.set(vscode.Uri.file(filePath), fileDiagnostics);
    //     }
    // }

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
        if (this.length() === 0) {
            this.parseBuildTest();
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
                    Severity.error :
                    Severity.hint;
                this.push(path, line, column, message, severity);
            }
        }
    }

    parseBuildTest() {
        let match = this.lines[0].match(buildRunTestHeaderRegexp);
        if (match) {
            const message = match[1];
            this.matchOtherFileLines(1, this.lines.length, message);
        }
    }

    matchOtherFileLines(startIndex: number, endIndex: number, message: string) {
        for (let i = startIndex; i < endIndex; i++) {
            const line = this.lines[i];
            let match = line.match(otherFileRegexp);
            if (match) {
                const filePath = match[1];
                const line = parseInt(match[2]) - 1;
                const column = parseInt(match[3]) - 1;
                //const functionName = match[4];
                this.push(filePath, line, column, message);
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
                                this.matchOtherFileLines(i, j, message);
                                i = j;
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    // remove thread id from error message
    // 'thread 46176743 panic: reached unreachable code' => 'panic: reached unreachable code'
    removeThreadId(message: string) {
        const match = message.match(/^thread\s+\d+\s+(.*)$/);
        return match ? match[1] : message;
    }
};

