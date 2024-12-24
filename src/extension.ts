'use strict';

import 'reflect-metadata';
import * as vscode from 'vscode';
import { CodeMain } from './main';


export async function activate(context: vscode.ExtensionContext) {
	// Main Startup
	const code = new CodeMain(context);
	code.main();
}