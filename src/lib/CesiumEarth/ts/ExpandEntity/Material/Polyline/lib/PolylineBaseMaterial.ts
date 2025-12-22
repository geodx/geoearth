import { Event, JulianDate, defined } from 'cesium';

/**
 * 线材质基类
 */
abstract class PolylineBaseMaterial {
    abstract isConstant: boolean;
    abstract definitionChanged: Event<(...args: any[]) => void>;


    abstract getType(): string;

    abstract getValue(time: JulianDate, result: any): any;

    abstract equals(other: any): boolean;

    abstract init(): void;

    getConstant(property: any) {
        return !defined(property) || property.isConstant;
    }
}


export { PolylineBaseMaterial };