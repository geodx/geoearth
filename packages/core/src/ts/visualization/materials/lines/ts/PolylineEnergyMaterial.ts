import { PolylineTextureMaterial, type PolylineTextureMaterialOptions } from './PolylineTextureMaterial'

export class PolylineEnergyMaterial extends PolylineTextureMaterial {

    constructor(options: Omit<PolylineTextureMaterialOptions, 'effect'> = {}) {
        super({ ...options, effect: 'energy' })
    }
}
