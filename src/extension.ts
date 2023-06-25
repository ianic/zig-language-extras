// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

let diagnosticCollection: vscode.DiagnosticCollection;
let output: vscode.OutputChannel;

const buildProblemsRegexp = /(\S.*):(\d*):(\d*): ([^:]*): (.*)/g;
const singleTestProblemRegexp = /\d+\/\d+\s(.*)\.\.\.\s+(.*[^/]*)(\S.*):(\d*):(\d*):/g;
const testOutputRegexp = /[.\s]*(\d+)\spassed;\s(\d+)\sskipped;\s(\d+)\sfailed./g;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	diagnosticCollection = vscode.languages.createDiagnosticCollection('Zig extras');
	output = vscode.window.createOutputChannel("Zig extras");

	context.subscriptions.push(
		vscode.commands.registerCommand('zig-language-extras.runSingleTest', runSingleTest)
	);
}

function runSingleTest() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) { return; }

	const cwd = vscode.workspace.getWorkspaceFolder(editor.document.uri)?.uri.fsPath || "";
	const config = vscode.workspace.getConfiguration('zig');
	const zigPath = config.get<string>("zigPath") || "zig";
	const fileName = editor.document.fileName;
	const fileNameRelative = path.relative(cwd, fileName);

	const testName = findTest(editor);
	if (!testName) {
		output.appendLine("Test not found.");
		output.show(true);
		return;
	}

	diagnosticCollection.clear();
	output.clear();

	const singleTestArgs: string[] = ["test", "--test-filter", testName, fileNameRelative];
	output.appendLine("Running: zig test --test-filter '" + testName + "' " + fileNameRelative);
	cp.execFile(zigPath, singleTestArgs, { cwd }, (err, stdout, stderr) => {
		output.appendLine(stderr);
		if (err) {
			let isTest = testOutputRegexp.exec(stderr);
			if (isTest) {
				createSingleTestProblems(stderr, cwd);
			} else {
				createBuildProblems(stderr, cwd);
			}
		}
	});
	output.show(true);
}

// Find test name to run. 
// Look up from the current line, if not found than
// look down from the current line.
function findTest(editor: vscode.TextEditor) {
	const activeLine = editor.selection.active.line;
	const lineCount = editor.document.lineCount;
	const re = /^test\s+"(.*)"\s+{/;

	// go up line by line
	for (var lineNo = activeLine; lineNo >= 0; lineNo--) {
		const line = editor.document.lineAt(lineNo).text;
		const m = line.match(re);
		if (m && m?.length === 2) {
			return m[1];
		}
	}

	// go down line by line
	for (var lineNo = activeLine; lineNo < lineCount; lineNo++) {
		const line = editor.document.lineAt(lineNo).text;
		const m = line.match(re);
		if (m && m?.length === 2) {
			return m[1];
		}
	}

	return undefined;
}

function createBuildProblems(stderr: string, cwd: string) {
	var diagnostics: { [id: string]: vscode.Diagnostic[]; } = {};
	let regex = buildProblemsRegexp;

	for (let match = regex.exec(stderr); match; match = regex.exec(stderr)) {
		let filePath = absolutePath(match[1].trim(), cwd);
		let line = parseInt(match[2]) - 1;
		let column = parseInt(match[3]) - 1;
		let type = match[4];
		let message = match[5];
		let severity = type.trim().toLowerCase() === "error" ?
			vscode.DiagnosticSeverity.Error :
			vscode.DiagnosticSeverity.Information;
		let range = new vscode.Range(line, column, line, Infinity);

		if (diagnostics[filePath] === undefined) { diagnostics[filePath] = []; };
		diagnostics[filePath].push(new vscode.Diagnostic(range, message, severity));
	}

	for (let filePath in diagnostics) {
		let diagnostic = diagnostics[filePath];
		diagnosticCollection.set(vscode.Uri.file(filePath), diagnostic);
	}
}

function absolutePath(filePath: string, cwd: string) {
	try {
		if (!filePath.includes(cwd)) {
			filePath = path.resolve(cwd, filePath);
		}
	} catch { }
	return filePath;
}

function createSingleTestProblems(stderr: string, cwd: string) {
	var diagnostics: { [id: string]: vscode.Diagnostic[]; } = {};
	let regex = singleTestProblemRegexp;

	for (let match = regex.exec(stderr); match; match = regex.exec(stderr)) {
		let filePath = absolutePath(match[3].trim(), cwd);
		let severity = vscode.DiagnosticSeverity.Error;
		let line = parseInt(match[4]) - 1;
		let column = parseInt(match[5]) - 1;
		let message = match[2].trim();
		let range = new vscode.Range(line, column, line, Infinity);

		if (diagnostics[filePath] === undefined) { diagnostics[filePath] = []; };
		diagnostics[filePath].push(new vscode.Diagnostic(range, message, severity));
	}

	for (let filePath in diagnostics) {
		let diagnostic = diagnostics[filePath];
		diagnosticCollection.set(vscode.Uri.file(filePath), diagnostic);
	}
}

// This method is called when your extension is deactivated
export function deactivate() { }