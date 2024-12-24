import ServiceCollection from '../serviceCollection';
import { DI_DEPENDENCIES, DI_TARGET, serviceIds } from './utils';
import { SyncDescriptor } from '..';
// 服务标识, 有两个作用
// 1. 服务的 id
// 2. 参数装饰器
export interface ServiceIdentifier<T> {
    (...args: any[]): void;
    type: T;
}
// 为服务创建对应的 标识
export function createDecorator<T>(serviceId: string): ServiceIdentifier<T> {
    if (serviceIds.has(serviceId)) {
        return serviceIds.get(serviceId)!;
    }
    // 参数装饰器
    // eslint-disable-next-line @typescript-eslint/ban-types
    const id = function (target: Function, key: string, index: number): any {
        if (arguments.length !== 3) {
            throw new Error('@IServiceName-decorator can only be used to decorate a parameter');
        }
        storeServiceDependency(id, target, index, false);
    } as any;
    id.toString = () => serviceId;
    serviceIds.set(serviceId, id);
    return id;
}
/**
 * 存储依赖信息
 * @param id 服务标识
 * @param target 参数装饰器修饰的类
 * @param index 参数装饰器对应的参数，在构造器参数列表中的索引
 * @param optional 参数装饰器对应的参数， 是否为可选参数
 */
// eslint-disable-next-line @typescript-eslint/ban-types
function storeServiceDependency(id: Function, target: Function, index: number, optional: boolean): void {
    if ((target as any)[DI_TARGET] === target) {
        // 被装饰过，则直接添加信息
        (target as any)[DI_DEPENDENCIES].push({ id, index, optional });
        return;
    }
    // 被装饰的类记录下 服务标识 等信息
    (target as any)[DI_DEPENDENCIES] = [{ id, index, optional }];
    (target as any)[DI_TARGET] = target;
}
export function getServiceDependencies(ctor: any): { id: ServiceIdentifier<any>; index: number; optional: boolean }[] {
    return ctor[DI_DEPENDENCIES] || [];
}
export function printServiceDependencies(ctor: any, services: ServiceCollection) {
    function printChild(n: number, ctor: any) {
        const deps = getServiceDependencies(ctor);
        const res: string[] = [];
        const prefix = new Array(n + 1).join('\t');
        deps.forEach(dep => {
            const { id } = dep;
            const childCtorOrDesc = services.get(id);
            if (!childCtorOrDesc) {
                res.push(`${prefix}-> can't find ${id}`);
                return;
            }
            let childCtor = childCtorOrDesc;
            if (childCtorOrDesc instanceof SyncDescriptor) {
                childCtor = childCtorOrDesc.ctor;
            }
            res.push(`${prefix}-> child: ${id}`);
            const nested = printChild(n + 1, childCtor);
            if (nested) {
                res.push(nested);
            }
        });
        return res.join('\n');
    }
    const lines = [
        `${ctor.name}`,
        `${printChild(1, ctor)}`,
    ];
    console.log(lines.join('\n'));
}