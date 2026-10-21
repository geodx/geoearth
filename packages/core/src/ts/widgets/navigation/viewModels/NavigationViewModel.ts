import * as Cesium from 'cesium'
import NavigationControl from '../controls/NavigationControl'
import ResetViewNavigationControl from '../controls/ResetViewNavigationControl'
import ZoomNavigationControl from '../controls/ZoomNavigationControl'
import Utils from '../core/Utils'
import svgCompassGyro from '../svgPaths/svgCompassGyro'
import svgCompassOuterRing from '../svgPaths/svgCompassOuterRing'
import svgCompassRotationMarker from '../svgPaths/svgCompassRotationMarker'
import type { NavigationContext } from '../types'



export class NavigationViewModel {
  private readonly context: NavigationContext

  private enableZoomControls: boolean
  private enableCompass: boolean
  private navigationLocked = false
  private controls: NavigationControl[]

  private root?: HTMLElement
  private readonly ownerDocument: Document
  private removeOrbitTick?: () => void
  private readonly handleWindowBlur = () => this.stopInteraction()

  private heading = 0
  // 交互状态
  private isOrbiting: boolean = false
  private orbitCursorAngle: number = 0
  private orbitCursorOpacity: number = 0
  private orbitLastTimestamp: number = 0
  private orbitFrame?: Cesium.Matrix4
  private orbitIsLook: boolean = false
  private orbitMouseMoveFunction?: (e: MouseEvent | TouchEvent) => void
  private orbitMouseUpFunction?: () => void
  private orbitTickFunction?: () => void

  private isRotating: boolean = false
  private rotateInitialCursorAngle?: number
  private rotateFrame?: Cesium.Matrix4
  private rotateIsLook: boolean = false
  private rotateInitialCameraAngle = 0
  private rotateMouseMoveFunction?: (e: MouseEvent | TouchEvent) => void
  private rotateMouseUpFunction?: () => void

  private compassEl?: HTMLElement
  private outerRingEl?: HTMLElement
  private gyroEl?: HTMLElement
  private rotationMarkerEl?: HTMLElement

  private unsubscribePostRender?: () => void

  private constructor(context: NavigationContext) {
    this.context = context
    this.ownerDocument = context.container.ownerDocument

    this.enableZoomControls = context.options.enableZoomControls ?? true
    this.enableCompass = context.options.enableCompass ?? true

    this.controls = context.controls ?? [
      new ZoomNavigationControl(this.context, true),
      new ResetViewNavigationControl(this.context),
      new ZoomNavigationControl(this.context, false),
    ]

    this.heading = this.enableCompass ? this.context.viewerWidget.camera.heading : 0.0

    if (this.enableCompass) {
      this.unsubscribePostRender = context.viewerWidget.scene.postRender.addEventListener(() => {
        const heading = context.viewerWidget.camera.heading
        if (this.heading === heading) return
        this.heading = heading
        this.updateCompassRotation()
      })
    }
    this.ownerDocument.defaultView?.addEventListener('blur', this.handleWindowBlur)

  }
  static create(options: NavigationContext): NavigationViewModel {
    const result = new NavigationViewModel(options)
    try { result.show(options.container) }
    catch (error) { result.destroy(); throw error }
    return result
  }

  public stopInteraction(): void {
    this.orbitMouseUpFunction?.()
    this.rotateMouseUpFunction?.()
    this.removeOrbitEventListener()
    this.removeRotateEventListener()
    this.removeOrbitTick?.()
    this.removeOrbitTick = undefined
  }
  public destroy(): void {
    this.stopInteraction()
    this.unsubscribePostRender?.()
    this.unsubscribePostRender = undefined
    this.ownerDocument.defaultView?.removeEventListener('blur', this.handleWindowBlur)
    this.root?.remove()
    this.root = undefined
  }
  public setNavigationLocked(locked: boolean): void {
    this.navigationLocked = locked
    this.context.navigationLocked = locked
    if (locked) this.stopInteraction()
    for (const control of this.controls) {
      if (control instanceof ResetViewNavigationControl) control.setNavigationLocked(locked)
    }
  }
  private updateCompassRotation(): void {
    const deg = -this.heading * (180 / Math.PI)
    if (this.outerRingEl) this.outerRingEl.style.transform = `rotate(${deg}deg)`
  }
  private show(container: HTMLElement): void {
    // 主容器
    const navDiv = this.ownerDocument.createElement('div')
    navDiv.className = 'cesium-navigation-compass'
    this.root = navDiv

    // 指南针主体
    this.compassEl = this.ownerDocument.createElement('div')
    this.compassEl.className = 'compass'
    this.compassEl.title = 'Drag the outer ring to rotate; drag the inner control to tilt/orbit; double-click to face north.'
    {
      this.compassEl.addEventListener('mousedown', (e) => {
        if (e.button === 0) this.handleMouseDown(e)
      })
      this.compassEl.addEventListener('touchstart', (e) => this.handleMouseDown(e))
      this.compassEl.addEventListener('dblclick', (e) => this.handleDoubleClick(e))
    }
    if (!this.enableCompass) this.compassEl.style.display = 'none'

    // 外环背景
    const outerRingBg = this.ownerDocument.createElement('div')
    outerRingBg.className = 'compass-outer-ring-background'

    // 旋转标记
    this.rotationMarkerEl = this.ownerDocument.createElement('div')
    this.rotationMarkerEl.className = 'compass-rotation-marker'
    this.rotationMarkerEl.innerHTML = this.context.options.compassRotationMarkerSvg || svgCompassRotationMarker
    this.rotationMarkerEl.style.opacity = '0'
    this.rotationMarkerEl.style.display = 'none'

    // 外环（随 heading 旋转）
    this.outerRingEl = this.ownerDocument.createElement('div')
    this.outerRingEl.className = 'compass-outer-ring'
    this.outerRingEl.innerHTML = this.context.options?.compassOuterRingSvg || svgCompassOuterRing
    this.outerRingEl.title = "Click and drag to rotate the camera"
    // 内盘背景 + 内盘
    const gyroBg = this.ownerDocument.createElement('div')
    gyroBg.className = 'compass-gyro-background'

    this.gyroEl = this.ownerDocument.createElement('div')
    this.gyroEl.className = 'compass-gyro'
    this.gyroEl.innerHTML = this.context.options?.compassGyroSvg || svgCompassGyro

    // 组装指南针
    this.compassEl.appendChild(outerRingBg)
    this.compassEl.appendChild(this.rotationMarkerEl)
    this.compassEl.appendChild(this.outerRingEl)
    this.compassEl.appendChild(gyroBg)
    this.compassEl.appendChild(this.gyroEl)

    navDiv.appendChild(this.compassEl)

    // 缩放按钮组
    if (this.enableZoomControls) {
      const zoomDiv = this.ownerDocument.createElement('div')
      zoomDiv.className = 'navigation-controls'

      this.controls.forEach((control, i) => {
        const btn = this.ownerDocument.createElement('button')
        btn.type = 'button'
        btn.classList.add('navigation-control')
        if (i === this.controls.length - 1) btn.classList.add('navigation-control-last')
        btn.title = control.name || ''
        btn.onclick = () => {
          if (this.navigationLocked) return
          try { control.activate() } catch (error) { this.context.reportError(error) }
        }
        if (control.hasText) {
          const textDiv = this.ownerDocument.createElement('div')
          textDiv.className = control.cssClass ?? ""
          if (control.text) textDiv.textContent = control.text
          if (control.isActive) textDiv.classList.add('navigation-control-icon-active')
          btn.appendChild(textDiv)
        } else if (control.svgIcon) {
          const svg = this.ownerDocument.createElement('div')
          svg.className = control.cssClass ?? ""
          svg.innerHTML = control.svgIcon ?? ""
          if (control.isActive) svg.classList.add('navigation-control-icon-active')
          btn.appendChild(svg)
        }
        zoomDiv.appendChild(btn)
      })

      navDiv.appendChild(zoomDiv)
    }

    container.appendChild(navDiv)
    this.updateCompassRotation()
  }

  // ==================== 鼠标交互 ====================
  private getClientPos(e: MouseEvent | TouchEvent): { clientX: number; clientY: number } {
    const touch = (e as TouchEvent).touches?.[0] || (e as MouseEvent)
    return { clientX: touch.clientX, clientY: touch.clientY }
  }
  private handleMouseDown(e: MouseEvent | TouchEvent): void {
    e.preventDefault()
    const scene = this.context.viewerWidget.scene
    if (scene.mode === Cesium.SceneMode.MORPHING) return
    if (this.navigationLocked) return
    if (!this.compassEl) return
    const rect = this.compassEl.getBoundingClientRect()
    const center = new Cesium.Cartesian2(rect.width / 2, rect.height / 2)
    const { clientX, clientY } = this.getClientPos(e)
    const clickPos = new Cesium.Cartesian2(clientX - rect.left, clientY - rect.top)
    const vector = Cesium.Cartesian2.subtract(clickPos, center, new Cesium.Cartesian2())
    const distance = Cesium.Cartesian2.magnitude(vector)
    const maxRadius = rect.width / 2
    const distanceFraction = distance / maxRadius
    if (distanceFraction < 50 / 145) {
      this.startOrbit(vector)
    } else if (distanceFraction < 1 && this.context.options.enableCompassOuterRing !== false) {
      this.startRotate(vector)
    } else {
      return
    }
  }

  private handleDoubleClick(e: MouseEvent): void {
    e.preventDefault()
    const scene = this.context.viewerWidget.scene
    const camera = scene.camera
    const sscc = scene.screenSpaceCameraController

    if (scene.mode === Cesium.SceneMode.MORPHING || !sscc.enableInputs) return
    if (this.navigationLocked) return
    if (scene.mode === Cesium.SceneMode.COLUMBUS_VIEW && !sscc.enableTranslate) return
    if (scene.mode === Cesium.SceneMode.SCENE3D || scene.mode === Cesium.SceneMode.COLUMBUS_VIEW) {
      if (!sscc.enableLook) return
      if (scene.mode === Cesium.SceneMode.SCENE3D) {
        if (!sscc.enableRotate) return
      }
    }


    this.context.beforeNavigate()
    const center = Utils.getCameraFocus(this.context, true)
    if (!center) {
      // 地球仪几乎看不见，所以重置为主视图。
      this.controls[1]?.activate() // 重置视角。
      return
    }

    const cameraPos = scene.globe.ellipsoid.cartographicToCartesian(camera.positionCartographic)
    const surfaceNormal = scene.globe.ellipsoid.geodeticSurfaceNormal(center)

    camera.flyToBoundingSphere(new Cesium.BoundingSphere(center, 0), {
      offset: new Cesium.HeadingPitchRange(
        0,
        // 使用相机相对于焦点的俯仰角，而非相机自身的俯仰角。
        Cesium.Math.PI_OVER_TWO - Cesium.Cartesian3.angleBetween(surfaceNormal, camera.directionWC),
        // 手动计算相机到焦点的距离，兼容二维和二维半模式。
        Cesium.Cartesian3.distance(cameraPos, center),
      ),
      duration: 1.5,
    })
  }

  private addOrbitEventListener() {
    if (this.orbitMouseMoveFunction && this.orbitMouseUpFunction) {
      this.ownerDocument.addEventListener('mousemove', this.orbitMouseMoveFunction, false)
      this.ownerDocument.addEventListener('touchmove', this.orbitMouseMoveFunction, false)
      this.ownerDocument.addEventListener('mouseup', this.orbitMouseUpFunction, false)
      this.ownerDocument.addEventListener('touchend', this.orbitMouseUpFunction, false)
      this.ownerDocument.addEventListener('touchcancel', this.orbitMouseUpFunction, false)
    }
  }
  private removeOrbitEventListener() {
    if (this.orbitMouseMoveFunction && this.orbitMouseUpFunction) {
      this.ownerDocument.removeEventListener('mousemove', this.orbitMouseMoveFunction, false)
      this.ownerDocument.removeEventListener('touchmove', this.orbitMouseMoveFunction, false)
      this.ownerDocument.removeEventListener('mouseup', this.orbitMouseUpFunction, false)
      this.ownerDocument.removeEventListener('touchend', this.orbitMouseUpFunction, false)
      this.ownerDocument.removeEventListener('touchcancel', this.orbitMouseUpFunction, false)
    }
  }
  private addRotateEventListener() {
    if (this.rotateMouseMoveFunction && this.rotateMouseUpFunction) {
      this.ownerDocument.addEventListener('mousemove', this.rotateMouseMoveFunction, false)
      this.ownerDocument.addEventListener('touchmove', this.rotateMouseMoveFunction, false)
      this.ownerDocument.addEventListener('mouseup', this.rotateMouseUpFunction, false)
      this.ownerDocument.addEventListener('touchend', this.rotateMouseUpFunction, false)
      this.ownerDocument.addEventListener('touchcancel', this.rotateMouseUpFunction, false)
    }
  }
  private removeRotateEventListener() {
    if (this.rotateMouseMoveFunction && this.rotateMouseUpFunction) {
      this.ownerDocument.removeEventListener('mousemove', this.rotateMouseMoveFunction, false)
      this.ownerDocument.removeEventListener('touchmove', this.rotateMouseMoveFunction, false)
      this.ownerDocument.removeEventListener('mouseup', this.rotateMouseUpFunction, false)
      this.ownerDocument.removeEventListener('touchend', this.rotateMouseUpFunction, false)
      this.ownerDocument.removeEventListener('touchcancel', this.rotateMouseUpFunction, false)
    }
  }
  private startOrbit(cursorVector: Cesium.Cartesian2): void {
    const scene = this.context.viewerWidget.scene
    const camera = scene.camera
    const sscc = scene.screenSpaceCameraController
    // 如果它被禁用，则不要绕轨道运行
    if (scene.mode === Cesium.SceneMode.MORPHING || !sscc.enableInputs) return
    if (this.navigationLocked) return
    if (scene.mode === Cesium.SceneMode.COLUMBUS_VIEW && (!sscc.enableTranslate || !sscc.enableTilt)) return
    if (scene.mode === Cesium.SceneMode.SCENE3D && (!sscc.enableTilt || !sscc.enableRotate)) return
    if (scene.mode === Cesium.SceneMode.SCENE2D && !sscc.enableTranslate) return

    this.context.beforeNavigate()
    this.stopInteraction()

    // 清理已有的交互事件监听。
    this.removeOrbitEventListener()
    if (this.orbitTickFunction) {
      this.removeOrbitTick?.()
      this.removeOrbitTick = undefined
    }
    this.orbitMouseMoveFunction = undefined
    this.orbitMouseUpFunction = undefined
    this.orbitTickFunction = undefined

    this.isOrbiting = true
    this.rotationMarkerEl!.style.display = 'block'
    this.gyroEl!.classList.toggle('compass-gyro-active', this.isOrbiting)

    this.orbitLastTimestamp = Cesium.getTimestamp()

    if (this.context.trackedEntity) {
      // 跟踪实体时直接使用当前参考系。
      this.orbitFrame = undefined
      this.orbitIsLook = false
    } else {
      // 设置参考系
      const center = Utils.getCameraFocus(this.context, true)
      if (!center) {
        this.orbitFrame = Cesium.Transforms.eastNorthUpToFixedFrame(camera.positionWC, scene.globe.ellipsoid)
        this.orbitIsLook = true
      } else {
        this.orbitFrame = Cesium.Transforms.eastNorthUpToFixedFrame(center, scene.globe.ellipsoid)
        this.orbitIsLook = false
      }
    }

    this.orbitTickFunction = () => {
      const timestamp = Cesium.getTimestamp()
      const deltaT = timestamp - this.orbitLastTimestamp
      const rate = ((this.orbitCursorOpacity - 0.5) * 2.5) / 1000
      const distance = deltaT * rate

      const angle = this.orbitCursorAngle + Cesium.Math.PI_OVER_TWO
      const x = Math.cos(angle) * distance
      const y = Math.sin(angle) * distance

      if (this.navigationLocked || !sscc.enableInputs) { this.stopInteraction(); return }

      let oldTransform: Cesium.Matrix4 | undefined
      if (this.orbitFrame) {
        oldTransform = Cesium.Matrix4.clone(camera.transform, new Cesium.Matrix4())
        camera.lookAtTransform(this.orbitFrame)
      }

      // 2D模式下只做平移
      if (scene.mode === Cesium.SceneMode.SCENE2D) {
        const direction = new Cesium.Cartesian3(Math.cos(angle), Math.sin(angle), 0)
        // 使用单位方向，避免重复乘入时间步长。
        const amount = Math.max(scene.canvas.clientWidth, scene.canvas.clientHeight) / 100 * camera.positionCartographic.height * distance
        camera.move(direction, amount)
      } else {
        if (this.orbitIsLook) {
          camera.look(Cesium.Cartesian3.UNIT_Z, -x)
          camera.look(camera.right, -y)
        } else {
          camera.rotateLeft(x)
          camera.rotateUp(y)
        }
      }
      if (this.orbitFrame && oldTransform) {
        camera.lookAtTransform(oldTransform)
      }
      scene.requestRender()
      this.orbitLastTimestamp = timestamp
    }


    const updateRotationMarker = (vector: Cesium.Cartesian2, compassWidth: number): void => {
      if (!this.rotationMarkerEl || !this.gyroEl) return

      const angle = Math.atan2(-vector.y, vector.x)
      this.orbitCursorAngle = Cesium.Math.zeroToTwoPi(angle - Cesium.Math.PI_OVER_TWO)
      this.rotationMarkerEl.style.transform = `rotate(${-this.orbitCursorAngle}rad)`

      const dist = Math.min(Cesium.Cartesian2.magnitude(vector) / (compassWidth / 2), 1)
      this.orbitCursorOpacity = 0.5 + 0.5 * dist * dist
      this.rotationMarkerEl.style.opacity = this.orbitCursorOpacity.toString()
    }

    this.orbitMouseMoveFunction = (e: MouseEvent | TouchEvent) => {
      const { clientX, clientY } = this.getClientPos(e)
      var rect = this.compassEl!.getBoundingClientRect()
      const vec = new Cesium.Cartesian2(
        clientX - rect.left - rect.width / 2,
        clientY - rect.top - rect.height / 2,
      )
      updateRotationMarker(vec, rect.width)
    }
    this.orbitMouseUpFunction = () => {
      // TODO：是否在未拖动时恢复为正北朝上的俯视视角，待确定交互规则。
      this.isOrbiting = false
      this.rotationMarkerEl!.style.display = 'none'
      this.gyroEl!.classList.toggle('compass-gyro-active', this.isOrbiting)
      this.removeOrbitEventListener()
      if (this.orbitTickFunction) {
        this.removeOrbitTick?.()
        this.removeOrbitTick = undefined
      }
      this.orbitMouseMoveFunction = undefined
      this.orbitMouseUpFunction = undefined
      this.orbitTickFunction = undefined
    }

    this.addOrbitEventListener()
    this.removeOrbitTick = this.context.viewerWidget.clock.onTick.addEventListener(this.orbitTickFunction, this)

    updateRotationMarker(cursorVector, this.compassEl!.getBoundingClientRect().width)
  }

  private startRotate(cursorVector: Cesium.Cartesian2): void {
    const scene = this.context.viewerWidget.scene
    const camera = scene.camera
    var sscc = scene.screenSpaceCameraController
    if (scene.mode === Cesium.SceneMode.MORPHING || scene.mode === Cesium.SceneMode.SCENE2D || !sscc.enableInputs) {
      return
    }
    if (this.navigationLocked) {
      return
    }
    if (scene.mode === Cesium.SceneMode.SCENE3D && !sscc.enableRotate) return
    if (scene.mode === Cesium.SceneMode.COLUMBUS_VIEW && !sscc.enableLook) return

    this.context.beforeNavigate()
    this.stopInteraction()
    this.removeRotateEventListener()
    this.rotateMouseMoveFunction = undefined
    this.rotateMouseUpFunction = undefined

    this.isRotating = true
    this.rotateInitialCursorAngle = Math.atan2(-cursorVector.y, cursorVector.x)
    if (this.context.trackedEntity) {
      // 在跟踪实体时，只需使用该参考系
      this.rotateFrame = undefined
      this.rotateIsLook = false
    } else {
      const center = Utils.getCameraFocus(this.context, true,)
      if (!center || (scene.mode === Cesium.SceneMode.COLUMBUS_VIEW && !sscc.enableLook && !sscc.enableTranslate)) {
        this.rotateFrame = Cesium.Transforms.eastNorthUpToFixedFrame(camera.positionWC, scene.globe.ellipsoid, new Cesium.Matrix4())
        this.rotateIsLook = true
      } else {
        this.rotateFrame = Cesium.Transforms.eastNorthUpToFixedFrame(center, scene.globe.ellipsoid, new Cesium.Matrix4())
        this.rotateIsLook = false
      }
    }

    let oldTransform
    if (this.rotateFrame) {
      oldTransform = Cesium.Matrix4.clone(camera.transform, new Cesium.Matrix4())
      camera.lookAtTransform(this.rotateFrame)
    }
    this.rotateInitialCameraAngle = -camera.heading
    if (this.rotateFrame) {
      if (oldTransform) camera.lookAtTransform(oldTransform)
    }

    this.rotateMouseMoveFunction = (e: MouseEvent | TouchEvent) => {
      const { clientX, clientY } = this.getClientPos(e)
      if (!this.compassEl) return
      const rect = this.compassEl.getBoundingClientRect()
      const vec = new Cesium.Cartesian2(
        clientX - rect.left - rect.width / 2,
        clientY - rect.top - rect.height / 2,
      )
      const angle = Math.atan2(-vec.y, vec.x)
      const diff = angle - this.rotateInitialCursorAngle!
      const targetHeading = Cesium.Math.zeroToTwoPi(this.rotateInitialCameraAngle - diff)

      if (this.navigationLocked || !sscc.enableInputs) { this.stopInteraction(); return }
      let oldTransform
      if (this.rotateFrame) {
        oldTransform = Cesium.Matrix4.clone(camera.transform, new Cesium.Matrix4())
        camera.lookAtTransform(this.rotateFrame)
      }
      const currentHeading = -camera.heading
      if (this.rotateIsLook) camera.look(Cesium.Cartesian3.UNIT_Z, targetHeading - currentHeading)
      else camera.rotateRight(targetHeading - currentHeading)
      if (this.rotateFrame) {
        if (oldTransform) camera.lookAtTransform(oldTransform)
      }
      scene.requestRender()
    }

    this.rotateMouseUpFunction = () => {
      this.isRotating = false
      this.removeRotateEventListener()
      this.rotateMouseMoveFunction = undefined
      this.rotateMouseUpFunction = undefined
    }

    this.addRotateEventListener()
  }




}

export default NavigationViewModel
