import * as vscode from 'vscode';
import { CodeApplication } from "./app";
import { SyncDescriptor } from "./service/instantiation";
import { InstantiationService } from "./service/instantiation/instantiation-service";
import ServiceCollection from "./service/instantiation/serviceCollection";
import { IConfigService, ConfigService } from "./service/config/config";

export class CodeMain {

	constructor(
		private readonly context: vscode.ExtensionContext
	) {}

	main(): void {
		try {
			this.startup();
		} catch (err) {
			console.error(err);
		}
	}

	private async startup() {
		// create services
		const instantiationService = this.createServices();
		
		// init services
		// await this.initServices();

		return instantiationService.createInstance(CodeApplication).startup();
	}

	private createServices(): InstantiationService {
		const services = new ServiceCollection();

		// config
		const configService = new SyncDescriptor(ConfigService, [ this.context ]);
		services.set<IConfigService>(IConfigService, configService);

		return new InstantiationService(services, true);
	}

	// private async initServices() {
	// 	await Promise.allSettled<unknown>([
	// 		// async task ...
	// 	]);
	// }
}