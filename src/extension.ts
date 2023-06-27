// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

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
	context.subscriptions.push(
		vscode.commands.registerCommand('zig-language-extras.debugTest', debugTest)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('zig-language-extras.buildWorkspace', buildWorkspace)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('zig-language-extras.testWorkspace', testWorkspace)
	);
}

function testWorkspace() {
	const env = getEnv(false);
	if (!env) { return; }

	const args: string[] = ["build", "test"];
	runZig(args, env.cwd);
}

function buildWorkspace() {
	const env = getEnv(false);
	if (!env) { return; }

	const args: string[] = ["build"];
	runZig(args, env.cwd);
}

function debugTest() {
	const env = getEnv();
	if (!env) { return; }
	if (!env || !env.testName) { return; }

	const debugEnv = getDebugEnv();

	mkdirp(path.resolve(env.cwd, debugEnv.testBinaryPath)); // ensure that output directory exists

	const args: string[] = ["test", "--test-filter", env.testName, env.fileNameRelative, "-femit-bin=" + debugEnv.testBinaryPath];
	runZig(args, env.cwd, () => {
		output.appendLine("Starting launch configuration '" + debugEnv.launchConfiguration + "'");
		vscode.debug.startDebugging(env.workspaceFolder, debugEnv.launchConfiguration);
	});
}

function runSingleTest() {
	const env = getEnv();
	if (!env || !env.testName) { return; }

	const args: string[] = ["test", "--test-filter", env.testName, env.fileNameRelative];
	runZig(args, env.cwd);
}

function runFileTests() {
	const env = getEnv(false);
	if (!env) { return; }

	const args: string[] = ["test", env.fileNameRelative];
	runZig(args, env.cwd);
}

// path for debug binary relative to the workspace root
const defaultTestBinaryPath = "./zig-out/debug/test";
const defaultDebugLaunchConfiguration = "ZigDebugTest";

function getDebugEnv() {
	const config = vscode.workspace.getConfiguration('zig-language-extras');
	return {
		testBinaryPath: config.get<string>("testBinaryPath") || defaultTestBinaryPath,
		launchConfiguration: config.get<string>("debugLaunchConfiguration") || defaultDebugLaunchConfiguration,
	};
}

function getEnv(findCurrentTest: boolean = true) {
	output.clear();
	output.show(true);

	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		output.appendLine("No active text editor found!");
		return undefined;
	}

	const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
	if (!workspaceFolder) {
		output.appendLine("No workspace folder found!");
		return undefined;
	}
	const cwd = workspaceFolder.uri.fsPath || "";
	const fileName = editor.document.fileName;
	const fileNameRelative = path.relative(cwd, fileName);
	const testName = findCurrentTest ? findTest(editor) : undefined;

	if (findCurrentTest && !testName) {
		output.appendLine("Current test not found!");
	}

	return {
		editor: editor,
		workspaceFolder: workspaceFolder,
		cwd: cwd,
		fileName: fileName,
		fileNameRelative: fileNameRelative,
		testName: testName,
	};
}

// run zig binary with args 
function runZig(args: string[], cwd: string, successCallback?: () => void) {
	diagnosticCollection.clear();

	// get zig binary from zig extension configuration
	const zigConfig = vscode.workspace.getConfiguration('zig');
	const zigPath = zigConfig.get<string>("zigPath") || "zig";

	// show running command in output (so can be analyzed or copied to terminal)
	output.appendLine("Running: zig " + quote(args).join(' '));

	cp.execFile(zigPath, args, { cwd }, (err, stdout, stderr) => {
		if (stderr.trim().length > 0) {
			output.appendLine(""); // empty line
			output.appendLine(stderr);
		} else {
			if (!err) { output.appendLine("OK"); }
		}
		if (err) {
			const diagnostic = new Diagnostic(cwd, stderr);
			diagnostic.createProblems(diagnosticCollection);
		} else {
			if (successCallback) {
				successCallback();
			}
		}
	});
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

// quote arg if it contains space
function quote(args: string[]) {
	return args.map((arg) => {
		return (arg.indexOf(' ') >= 0) ? '"' + arg + '"' : arg;
	});
}

function mkdirp(filePath: string) {
	console.log("mkdirp filePath", filePath);
	var dir = path.dirname(filePath);
	console.log("mkdirp dir", dir);

	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

// This method is called when your extension is deactivated
export function deactivate() { }