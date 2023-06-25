// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cp from 'child_process';

let diagnosticCollection: vscode.DiagnosticCollection;

const buildProblemsRegexp = /(\S.*):(\d*):(\d*): ([^:]*): (.*)/g;
const singleTestProblemRegexp = /\d+\/\d+\s(.*)\.\.\.\s+(.*[^/]*)(\S.*):(\d*):(\d*):/g;
const testOutputRegexp = /[.\s]*(\d+)\spassed;\s(\d+)\sskipped;\s(\d+)\sfailed./g;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	diagnosticCollection = vscode.languages.createDiagnosticCollection('Zig extras');
	let output = vscode.window.createOutputChannel("Zig extras");

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "zig-language-extras" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('zig-language-extras.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Zig language extras!');
	});

	let runSingleTest = vscode.commands.registerCommand('zig-language-extras.runSingleTest', () => {
		var path = require("path");
		const editor = vscode.window.activeTextEditor;
		if (!editor) { return; }
		var fileName = editor.document.fileName;

		//output.appendLine("Running test in file " + fileName);
		const testName = findTest(editor);
		if (!testName) {
			output.appendLine("test not found");
			return;
		}

		const cwd = vscode.workspace.getWorkspaceFolder(editor.document.uri)?.uri.fsPath || "";
		const config = vscode.workspace.getConfiguration('zig');
		const zigPath = config.get<string>("zigPath") || "zig";
		let singleTestArgs: string[] = ["test", "--test-filter", testName, fileName];
		let buildArgs: string[] = ["test", "--test-no-exec", fileName];

		diagnosticCollection.clear();
		output.clear();

		output.appendLine("Running: " + zigPath + " " + singleTestArgs.join(" "));
		let testProcess = cp.execFile(zigPath, singleTestArgs, { cwd }, (err, stdout, stderr) => {
			if (err) {
				output.clear();
				output.appendLine(err?.message);
				let isTest = testOutputRegexp.exec(stderr);
				if (isTest) {
					createSingleTestProblems(stderr, cwd);
				} else {
					createBuildProblems(stderr, cwd);
				}
			} else {
				output.appendLine(stderr);
			}
		});

		// let buildProcess = cp.execFile(zigPath, buildArgs, { cwd }, (err, stdout, stderr) => {
		// 	if (err) {
		// 		output.appendLine(err?.message);
		// 		createBuildProblems(stderr, cwd);
		// 		return;
		// 	}
		// 	let testProcess = cp.execFile(zigPath, singleTestArgs, { cwd }, (err, stdout, stderr) => {
		// 		if (err) {
		// 			output.appendLine(err?.message);
		// 		} else {
		// 			output.appendLine("Running: " + zigPath + " " + singleTestArgs.join(" "));
		// 			output.appendLine(stderr);
		// 		}
		// 		createSingleTestProblems(stderr, cwd);
		// 	});
		// });

		output.show(true);
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(runSingleTest);
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
	let regex = /(\S.*):(\d*):(\d*): ([^:]*): (.*)/g;

	for (let match = regex.exec(stderr); match; match = regex.exec(stderr)) {
		let path = match[1].trim();
		try {
			if (!path.includes(cwd)) {
				path = require("path").resolve(cwd, path);
			}
		} catch {

		}
		let line = parseInt(match[2]) - 1;
		let column = parseInt(match[3]) - 1;
		let type = match[4];
		let message = match[5];

		let severity = type.trim().toLowerCase() === "error" ?
			vscode.DiagnosticSeverity.Error :
			vscode.DiagnosticSeverity.Information;

		let range = new vscode.Range(line, column, line, Infinity);

		if (diagnostics[path] === undefined) { diagnostics[path] = []; };
		diagnostics[path].push(new vscode.Diagnostic(range, message, severity));
	}

	for (let path in diagnostics) {
		let diagnostic = diagnostics[path];
		diagnosticCollection.set(vscode.Uri.file(path), diagnostic);
	}
}

function createSingleTestProblems(stderr: string, cwd: string) {
	var diagnostics: { [id: string]: vscode.Diagnostic[]; } = {};
	let regex = singleTestProblemRegexp;

	for (let match = regex.exec(stderr); match; match = regex.exec(stderr)) {
		let path = match[3].trim();
		try {
			if (!path.includes(cwd)) {
				path = require("path").resolve(cwd, path);
			}
		} catch {

		}
		let severity = vscode.DiagnosticSeverity.Error;
		let line = parseInt(match[4]) - 1;
		let column = parseInt(match[5]) - 1;
		let message = match[2].trim();

		let range = new vscode.Range(line, column, line, Infinity);

		if (diagnostics[path] === undefined) { diagnostics[path] = []; };
		diagnostics[path].push(new vscode.Diagnostic(range, message, severity));
	}

	for (let path in diagnostics) {
		let diagnostic = diagnostics[path];
		diagnosticCollection.set(vscode.Uri.file(path), diagnostic);
	}
}

// This method is called when your extension is deactivated
export function deactivate() { }