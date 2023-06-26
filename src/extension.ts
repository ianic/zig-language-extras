// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

import { Diagnostic } from './diagnostic';


// globals, set in activate used in other functions
let diagnosticCollection: vscode.DiagnosticCollection;
let output: vscode.OutputChannel;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	diagnosticCollection = vscode.languages.createDiagnosticCollection('Zig extras');
	output = vscode.window.createOutputChannel("Zig extras");

	context.subscriptions.push(
		vscode.commands.registerCommand('zig-language-extras.runSingleTest', runSingleTest)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('zig-language-extras.runFileTests', runFileTests)
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
			const diagnostic = new Diagnostic(cwd, stderr);
			diagnostic.createProblems(diagnosticCollection);
		}
	});
	output.show(true);
}

function runFileTests() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) { return; }

	const cwd = vscode.workspace.getWorkspaceFolder(editor.document.uri)?.uri.fsPath || "";
	const config = vscode.workspace.getConfiguration('zig');
	const zigPath = config.get<string>("zigPath") || "zig";
	const fileName = editor.document.fileName;
	const fileNameRelative = path.relative(cwd, fileName);

	diagnosticCollection.clear();
	output.clear();

	const singleTestArgs: string[] = ["test", fileNameRelative];
	output.appendLine("Running: zig test " + fileNameRelative);
	cp.execFile(zigPath, singleTestArgs, { cwd }, (err, stdout, stderr) => {
		output.appendLine(stderr);
		if (err) {
			const diagnostic = new Diagnostic(cwd, stderr);
			diagnostic.createProblems(diagnosticCollection);
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

// This method is called when your extension is deactivated
export function deactivate() { }