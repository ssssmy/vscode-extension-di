import * as vscode from 'vscode';
import { IConfigService } from "./service/config/config";

export class CodeApplication {
	constructor(
		@IConfigService private readonly configService: IConfigService
	) {}

	async startup() {
		console.log('Congratulations, your extension "vscode-extension-di" is now active!');
		const disposable = vscode.commands.registerCommand('vscode-extension-di.helloWorld', () => {
			vscode.window.showInformationMessage('Hello World from !');
		});
		this.configService.context.subscriptions.push(disposable);
	}
}