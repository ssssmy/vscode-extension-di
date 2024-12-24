import * as vscode from 'vscode';
import { GitBookAPI } from '@gitbook/api';
import { createDecorator } from '../instantiation';

export const IConfigService = createDecorator<IConfigService>('ConfigService');

export interface IConfigService {
	context: vscode.ExtensionContext;
}

export class ConfigService implements IConfigService {
	context: vscode.ExtensionContext;
	constructor(context: vscode.ExtensionContext) {
		this.context = context;
	}
}