import { createDecorator, getServiceDependencies, ServiceIdentifier } from '../instantiation';
import ServiceCollection from '../serviceCollection';
import { SyncDescriptor, SyncDescriptor0 } from '../descriptors';
import { GetLeadingNonServiceArgs, IInstantiationService, ServicesAccessor } from './interface';
import Graph from './graph';
import Trace from './trace';
export function illegalState(name?: string): Error {
	if (name) {
		return new Error(`Illegal state: ${name}`);
	} else {
		return new Error('Illegal state');
	}
}
// TRACING
const _enableAllTracing = false
	// || "TRUE" // DO NOT CHECK IN!
	;
class CyclicDependencyError extends Error {
    constructor(graph: Graph<any>) {
        super('cyclic dependency between services');
        this.message = graph.toString();
    }
}
export const IInstantiationServiceId = createDecorator<IInstantiationService>('instantiationService');
export class InstantiationService implements IInstantiationService {
    readonly serviceBrand: undefined;
    constructor(
		private readonly services: ServiceCollection = new ServiceCollection(), 
		private readonly _strict: boolean = false,
		private readonly parent?: InstantiationService,
		private readonly _enableTracing: boolean = _enableAllTracing
	) {
        this.services = services;
        this.parent = parent;
        this.services.set(IInstantiationServiceId, this);
    }
    createChild(services: ServiceCollection): IInstantiationService {
        return new InstantiationService(services, this._strict, this, this._enableTracing);
    }
	invokeFunction<R, TS extends any[] = []>(fn: (accessor: ServicesAccessor, ...args: TS) => R, ...args: TS): R {
		const _trace = Trace.traceInvocation(this._enableTracing, fn);
		let _done = false;
		try {
			const accessor: ServicesAccessor = {
				get: <T>(id: ServiceIdentifier<T>) => {
					if (_done) {
						throw illegalState('service accessor is only valid during the invocation of its target method');
					}
					const result = this._getOrCreateServiceInstance(id, _trace);
					if (!result) {
						throw new Error(`[invokeFunction] unknown service '${id}'`);
					}
					return result;
				}
			};
			return fn(accessor, ...args);
		} finally {
			_done = true;
			_trace.stop();
		}
	}
	createInstance(ctorOrDescriptor: any | SyncDescriptor<any>, ...rest: any[]): any {
		let _trace: Trace;
		let result: any;
		if (ctorOrDescriptor instanceof SyncDescriptor) {
			_trace = Trace.traceCreation(this._enableTracing, ctorOrDescriptor.ctor);
			result = this._createInstance(ctorOrDescriptor.ctor, ctorOrDescriptor.staticArguments.concat(rest), _trace);
		} else {
			_trace = Trace.traceCreation(this._enableTracing, ctorOrDescriptor);
			result = this._createInstance(ctorOrDescriptor, rest, _trace);
		}
		_trace.stop();
		return result;
	}
    private _createInstance<T>(ctor: any, args: any[] = [], trace: Trace): T {
        const serviceDependencies = getServiceDependencies(ctor).sort((a, b) => a.index - b.index);
        const serviceArgs: any[] = [];
        for (const dependency of serviceDependencies) {
            // dependency.id 为 装饰器
            const service = this._getOrCreateServiceInstance(dependency.id, trace);
            if (!service) {
                throw new Error(`[createInstance] ${ctor.name} depends on UNKNOWN service ${dependency.id}.`);
            }
            serviceArgs.push(service);
        }
        const firstServiceArgPos = serviceDependencies.length > 0 ? serviceDependencies[0].index : args.length;
        // check for argument mismatches, adjust static args if needed
        if (args.length !== firstServiceArgPos) {
            console.warn(
                `[createInstance] First service dependency of ${ctor.name} at position ${
                    firstServiceArgPos + 1
                } conflicts with ${args.length} static arguments`,
            );
            const delta = firstServiceArgPos - args.length;
            if (delta > 0) {
                args = args.concat(new Array(delta));
            } else {
                args = args.slice(0, firstServiceArgPos);
            }
        }
        // now create the instance
        return new ctor(...[...args, ...serviceArgs]) as T;
    }
    private _setServiceInstance<T>(id: ServiceIdentifier<T>, instance: T): void {
        if (this.services.get(id) instanceof SyncDescriptor) {
            this.services.set(id, instance);
        } else if (this.parent) {
			this.parent._setServiceInstance(id, instance);
		} else {
			throw new Error('illegalState - setting UNKNOWN service instance');
		}
    }
    private _getServiceInstanceOrDescriptor<T>(id: ServiceIdentifier<T>): T | SyncDescriptor<T> {
        const instanceOrDesc = this.services.get(id);
        if (!instanceOrDesc && this.parent) {
            return this.parent._getServiceInstanceOrDescriptor(id);
        }
        return instanceOrDesc;
    }
    /**
     * 通过服务 id, 返回服务实例
     * 1. 通过 id，在 services 中查 实例 或 desc
     *  1.1 若为 desc，则说明还未实例化，执行创建逻辑
     *  1.2 若不为 desc, 则说明已实例化，返回 实例
     *    
     * @param id 服务id（装饰器）
     */
    private _getOrCreateServiceInstance<T>(id: ServiceIdentifier<T>, trace: Trace): T {
        const thing = this._getServiceInstanceOrDescriptor(id);
        if (thing instanceof SyncDescriptor) {
            return this._createAndCacheServiceInstance(id, thing, trace.branch(id, true));
        }
        trace.branch(id, false);
        return thing;
    }
    /**
     * 核心：根据 依赖关系 创建 并 缓存 服务
     * @param id 要创建的服务
     * @param desc 要创建的服务的描述符
     */
    private _createAndCacheServiceInstance<T>(id: ServiceIdentifier<T>, desc: SyncDescriptor<T>, trace: Trace): T {
        type TDependency = {
            id: ServiceIdentifier<any>;
            desc: SyncDescriptor<any>;
            trace: Trace;
        };
        const graph = new Graph<TDependency>((data) => data.id.toString());
        let cycleCount = 0;
        const root: TDependency = {
            id,
            desc,
            trace
        };
        const stack = [root];
        // 构造依赖关系
        while (stack.length) {
            const item = stack.pop()!;
            graph.lookupOrInsertNode(item);
            // 简单的循环次数检测
            // 正常来说不应该循环这么多次
            if (cycleCount++ > 1000) {
                throw new CyclicDependencyError(graph);
            }
            // 根据构造器，返回其依赖的服务列表
            const dependencyList = getServiceDependencies(item.desc.ctor);
            // 检查依赖的服务列表是否存在，若不存在则需要创建
            for (const dependency of dependencyList) {
                const instanceOrDesc = this._getServiceInstanceOrDescriptor(dependency.id);
                if (instanceOrDesc instanceof SyncDescriptor) {
                    const depNode = {
                        id: dependency.id,
                        desc: instanceOrDesc,
                        trace: item.trace.branch(dependency.id, true),
                    };
                    // 若为服务实例，不用加入 graph 吗？
                    // A：不用，加入 graph 的是需要实例化 的
                    graph.insertEdge(item, depNode);
                    stack.push(depNode);
                }
            }
        }
        // 根据依赖关系实例化
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const roots = graph.roots();
            // 如果没有 root ，判断是否存在 node 没被创建
            // 不存在 node，则证明流程完成
            // 存在 node, 则证明存在 循环依赖
            if (roots.length === 0) {
                if (!graph.isEmpty()) {
                    throw new CyclicDependencyError(graph);
                }
                // 正常结束
                break;
            }
            for (const { data } of roots) {
                const instanceOrDesc = this._getServiceInstanceOrDescriptor(data.id);
                if (instanceOrDesc instanceof SyncDescriptor) {
                    const instance = this._createServiceInstanceWithOwner(
                        data.id,
                        data.desc.ctor,
                        data.desc.staticArguments,
                        data.desc.supportsDelayedInstantiation,
                        data.trace,
                    );
                    this._setServiceInstance(data.id, instance);
                }
                graph.removeNode(data);
            }
        }
        return this._getServiceInstanceOrDescriptor(id) as T;
    }
    private _createServiceInstanceWithOwner<T>(
        id: ServiceIdentifier<T>,
        ctor: any,
        args: any[] = [],
        supportsDelayedInstantiation: boolean,
        trace: Trace,
    ): T {
        if (this.services.get(id) instanceof SyncDescriptor) {
            return this._createServiceInstance(ctor, args, supportsDelayedInstantiation, trace);
        }
        if (this.parent) {
            this.parent._createServiceInstanceWithOwner(id, ctor, args, supportsDelayedInstantiation, trace);
        }
        throw new Error(`illegalState - creating UNKNOWN service instance ${ctor.name}`);
    }
    // 核心：创建目标服务实例(含 proxy)
    // 此时目标服务 所需要的 依赖已创建完毕
    private _createServiceInstance<T>(ctor: any, args: any[], supportsDelayedInstantiation: boolean, trace: Trace): T {
        if (!supportsDelayedInstantiation) {
            return this._createInstance(ctor, args, trace);
        }
        // TODO: 返回 proxy
        return this._createInstance(ctor, args, trace);
    }
}
