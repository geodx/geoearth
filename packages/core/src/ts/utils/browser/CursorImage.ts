/** 跟随鼠标的图标预览，不覆盖 document.onmousemove；适用于拖放或标记选择工具。 */
export class CursorImage {
    readonly element: HTMLImageElement
    private readonly move: (event: PointerEvent) => void
    private readonly leave: () => void

    constructor(private readonly container: HTMLElement, image: string) {
        this.element = container.ownerDocument.createElement('img')
        this.element.src = image
        this.element.alt = ''
        Object.assign(this.element.style, { position: 'fixed', display: 'none', pointerEvents: 'none', zIndex: '10000', transform: 'translate(-50%, -100%)' })
        container.ownerDocument.body.append(this.element)
        this.move = event => {
            this.element.style.display = 'block'
            this.element.style.left = `${event.clientX}px`
            this.element.style.top = `${event.clientY}px`
        }
        this.leave = () => { this.element.style.display = 'none' }
        container.addEventListener('pointermove', this.move)
        container.addEventListener('pointerleave', this.leave)
    }

    destroy(): void {
        this.container.removeEventListener('pointermove', this.move)
        this.container.removeEventListener('pointerleave', this.leave)
        this.element.remove()
    }
}
