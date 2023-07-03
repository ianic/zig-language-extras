// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

import { Parser } from './parser';
import { File } from 'buffer';

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
	context.subscriptions.push(
		vscode.commands.registerCommand('zig-language-extras.debugBinary', debugBinary)
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

	const binPath = debugEnv.testBinaryPath;
	mkdirp(path.resolve(env.cwd, binPath)); // ensure that output directory exists

	const args: string[] = ["test", "--test-filter", env.testName, env.fileNameRelative, "-femit-bin=" + binPath];
	runZig(args, env.cwd, () => {
		output.appendLine("Debugging binary " + binPath);
		startDebugging(env.workspaceFolder, binPath);
	});
}

function debugBinary() {
	const env = getEnv(false);
	if (!env) { return; }

	const binPath = path.join("zig-out", "bin", env.binName);

	const args: string[] = ["build"];
	runZig(args, env.cwd, () => {
		output.appendLine("Debugging binary " + binPath);
		startDebugging(env.workspaceFolder, binPath);
	});
}


function startDebugging(wf: vscode.WorkspaceFolder, binPath: string) {
	const isDarwin = os.platform() === "darwin";
	let launchConfig = {
		"name": "ZigDebugBinary",
		"type": isDarwin ? "lldb" : "gdb",
		"request": "launch",
		"target": binPath,
		"program": binPath,
		"cwd": "${workspaceRoot}",
	};
	vscode.debug.startDebugging(wf, launchConfig);
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

function getDebugEnv() {
	const config = vscode.workspace.getConfiguration('zig-language-extras');
	return {
		testBinaryPath: config.get<string>("testBinaryPath") || defaultTestBinaryPath,
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

	// binary name from the current file
	let binName = path.parse(fileNameRelative).name;
	if (binName === "main.zig") {
		// for main.zig use name of the directory in the file path excluding src
		const dirs = path.dirname(fileName).split(path.sep);
		binName = dirs.reverse().find((dir) => {
			return ["src"].includes(dir) ? null : dir;
		}) || binName;
	}

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
		binName: binName,
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
			const parser = new Parser(cwd, stderr);
			if (parser.problemsCount() > 0) {
				// parser problems to vscode diagnostics
				const map = parser.groupByFile();
				for (let file in map) {
					let problems = map[file];
					const diagnostics = problems.map((problem) => {
						let range = new vscode.Range(problem.line, problem.column, problem.line, Infinity);
						return new vscode.Diagnostic(range, problem.message, problem.severity.valueOf());
					});
					diagnosticCollection.set(vscode.Uri.file(file), diagnostics);
				}
			}
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