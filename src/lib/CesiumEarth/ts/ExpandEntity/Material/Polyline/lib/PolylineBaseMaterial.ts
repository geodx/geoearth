import { MaterialProperty, Event, JulianDate } from 'cesium';

/**
 * 线材质基类
 */
abstract class PolylineBaseMaterial implements MaterialProperty {
    protected _definitionChanged = new Event();

    get definitionChanged() {
        return this._definitionChanged;
    }

    get isConstant() {
        return false;
    }

    abstract getType(): string;

    abstract getValue(time: JulianDate, result: any): any;

    abstract equals(other: any): boolean;

    abstract init(): void;
}


export { PolylineBaseMaterial };