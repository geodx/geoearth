const SafeTool = {
    /**
     * 生成UUID v4
     * @returns {string}
     */
    uuid(): string {
        let t = Date.now()

        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const random = (t + Math.random() * 16) % 16 | 0

            t = Math.floor(t / 16)

            return (c === 'x' ? random : (random & 0x3) | 0x8).toString(16)
        })
    }
}
export { SafeTool }