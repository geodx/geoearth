import { BaseEvent } from '../base/BaseEvent'
import { InteractionEventType, type InteractionEventPayload } from '../../interaction/types'

export class InteractionEvent extends BaseEvent<InteractionEventType, InteractionEventPayload> {
    destroy(): void { this.removeAllEventListeners() }
}
