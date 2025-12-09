import * as Cesium from 'cesium'
import Utils from '../core/Utils'
import ZoomNavigationControl from './ZoomNavigationControl'
import ResetViewNavigationControl from './ResetViewNavigationControl'
import type { Terria } from '..'
import svgCompassRotationMarker from '../svgPaths/svgCompassRotationMarker'
import svgCompassOuterRing from '../svgPaths/svgCompassOuterRing'
import svgCompassGyro from '../svgPaths/svgCompassGyro'
interface NavigationOptions {
  terria: Terria
  container: HTMLElement
  enableZoomControls?: boolean
  enableCompass?: boolean
  controls?: NavControl[]
}

interface NavControl {
  activate(): void
  name?: string
  text?: string
  hasText?: boolean
  isActive?: boolean
  cssClass?: string
  svgIcon?: any
  svgWidth?: number
  svgHeight?: number
}

export class NavigationViewModel {
  private terria: Terria
  private container: HTMLElement
  private eventHelper = new Cesium.EventHelper()

  private enableZoomControls: boolean
  private enableCompass: boolean
  private controls: NavControl[]

  private heading = 0
  private showCompass = true

  // 交互状态
  private isOrbiting = false
  private orbitCursorAngle = 0
  private orbitCursorOpacity = 0
  private orbitLastTimestamp = 0
  private orbitFrame?: Cesium.Matrix4
  private orbitIsLook = false

  private isRotating = false
  private rotateInitialCursorAngle?: number
  private rotateFrame?: Cesium.Matrix4
  private rotateInitialCameraAngle = 0


  private compassEl!: HTMLElement
  private outerRingEl!: HTMLElement
  private gyroEl!: HTMLElement
  private rotationMarkerEl!: HTMLElement

  private unsubscribePostRender?: () => void

  private constructor(options: NavigationOptions) {
    this.terria = options.terria
    this.container = options.container

    this.enableZoomControls = options.enableZoomControls ?? true
    this.enableCompass = options.enableCompass ?? true

    this.controls = options.controls ?? [
      new ZoomNavigationControl(this.terria, true),
      new ResetViewNavigationControl(this.terria),
      new ZoomNavigationControl(this.terria, false),
    ]

    this.showCompass = this.enableCompass && Cesium.defined(this.terria.viewerWidget.scene)

    this.startHeadingUpdate()
  }

  static create(options: NavigationOptions): NavigationViewModel {
    const result = new NavigationViewModel(options)
    result.show()
    return result
  }
  private show(): void {
    const enableOuterRing = this.terria.options?.enableCompassOuterRing ?? true
    // 主容器
    const navDiv = document.createElement('div')
    navDiv.className = 'cesium-navigation-compass'

    // 指南针主体
    this.compassEl = document.createElement('div')
    this.compassEl.className = 'compass'
    this.compassEl.addEventListener('mousedown', (e) => this.handleMouseDown(e))
    this.compassEl.addEventListener('touchstart', (e) => this.handleMouseDown(e))
    this.compassEl.addEventListener('dblclick', (e) => this.handleDoubleClick(e))

    if (!this.showCompass) this.compassEl.style.display = 'none'

    // 外环背景
    const outerRingBg = document.createElement('div')
    outerRingBg.className = 'compass-outer-ring-background'

    // 旋转标记
    this.rotationMarkerEl = document.createElement('div')
    this.rotationMarkerEl.className = 'compass-rotation-marker'
    this.rotationMarkerEl.innerHTML = svgCompassRotationMarker
    this.rotationMarkerEl.style.opacity = '0'

    // 外环（随 heading 旋转）
    this.outerRingEl = document.createElement('div')
    this.outerRingEl.className = 'compass-outer-ring'
    this.outerRingEl.innerHTML = this.terria.options?.compassOuterRingSvg || svgCompassOuterRing
    // 内盘背景 + 内盘
    const gyroBg = document.createElement('div')
    gyroBg.className = 'compass-gyro-background'

    this.gyroEl = document.createElement('div')
    this.gyroEl.className = 'compass-gyro'
    this.gyroEl.innerHTML = this.terria.options?.compassGyroSvg || svgCompassGyro

    // 组装指南针
    this.compassEl.appendChild(outerRingBg)
    this.compassEl.appendChild(this.rotationMarkerEl)
    this.compassEl.appendChild(this.outerRingEl)
    this.compassEl.appendChild(gyroBg)
    this.compassEl.appendChild(this.gyroEl)

    navDiv.appendChild(this.compassEl)

    // 缩放按钮组
    if (this.enableZoomControls) {
      const zoomDiv = document.createElement('div')
      zoomDiv.className = 'navigation-controls'

      this.controls.forEach((control, i) => {
        const btn = document.createElement('div')
        btn.classList.add('navigation-control')
        if (i === this.controls.length - 1) btn.classList.add('navigation-control-last')
        btn.title = control.name || ''
        btn.onclick = () => control.activate()
        if (control.hasText) {
          const textDiv = document.createElement('div')
          textDiv.className = control.cssClass ?? ""
          if (control.text) textDiv.textContent = control.text
          if (control.isActive) textDiv.classList.add('navigation-control-icon-active')
          btn.appendChild(textDiv)
        } else if (control.svgIcon) {
          const svg = document.createElement('div')
          svg.className = control.cssClass ?? ""
          svg.innerHTML = control.svgIcon ?? ""
          if (control.isActive) svg.classList.add('navigation-control-icon-active')
          btn.appendChild(svg)
        }
        zoomDiv.appendChild(btn)
      })

      navDiv.appendChild(zoomDiv)
    }

    this.container.appendChild(navDiv)
  }

  private startHeadingUpdate(): void {
    this.unsubscribePostRender = this.terria.viewerWidget.camera.changed.addEventListener(() => {
      this.heading = this.terria.viewerWidget.scene.camera.heading
      this.updateCompassRotation()
    })
  }

  private updateCompassRotation(): void {
    const deg = -this.heading * (180 / Math.PI)
    this.outerRingEl.style.transform = `rotate(${deg}deg)`
  }
  private orbitTickFunction(): void {
    console.log("orbitTickFunction");

    const timestamp = Cesium.getTimestamp()
    const deltaT = timestamp - this.orbitLastTimestamp
    // (orbitCursorOpacity - 0.5) * 2.5 / 1000 这段逻辑保持不变
    const rate = ((this.orbitCursorOpacity - 0.5) * 2.5) / 1000
    const distance = deltaT * rate

    const angle = this.orbitCursorAngle + Cesium.Math.PI_OVER_TWO
    const x = Math.cos(angle) * distance
    const y = Math.sin(angle) * distance

    let oldTransform: Cesium.Matrix4 | undefined
    if (this.orbitFrame) {
      oldTransform = Cesium.Matrix4.clone(this.terria.viewerWidget.camera.transform, new Cesium.Matrix4())
      this.terria.viewerWidget.camera.lookAtTransform(this.orbitFrame)
    }

    // 2D模式下只做平移
    if (this.terria.viewerWidget.scene.mode === Cesium.SceneMode.SCENE2D) {
      const direction = new Cesium.Cartesian3(x, y, 0)

      const amount =
        (Math.max(
          this.terria.viewerWidget.scene.canvas.clientWidth,
          this.terria.viewerWidget.scene.canvas.clientHeight,
        ) / 100) * this.terria.viewerWidget.camera.positionCartographic.height * distance

      this.terria.viewerWidget.camera.move(direction, amount)
    } else {
      if (this.orbitIsLook) {
        this.terria.viewerWidget.camera.look(Cesium.Cartesian3.UNIT_Z, -x)
        this.terria.viewerWidget.camera.look(this.terria.viewerWidget.camera.right, -y)
      } else {
        this.terria.viewerWidget.camera.rotateLeft(x)
        this.terria.viewerWidget.camera.rotateUp(y)
      }
    }

    if (this.orbitFrame && oldTransform) {
      this.terria.viewerWidget.camera.lookAtTransform(oldTransform)
    }

    // viewModel.terria.cesium.notifyRepaintRequired();

    this.orbitLastTimestamp = timestamp
  }
  // ==================== 鼠标交互 ====================
  private handleMouseDown(e: MouseEvent | TouchEvent): void {
    console.log(e);
    if (this.terria.viewerWidget.scene.mode === Cesium.SceneMode.MORPHING) return

    const rect = this.compassEl.getBoundingClientRect()
    const center = new Cesium.Cartesian2(rect.width / 2, rect.height / 2)
    const pos = this.getClientPos(e)
    const clickPos = new Cesium.Cartesian2(pos.clientX - rect.left, pos.clientY - rect.top)
    const vector = Cesium.Cartesian2.subtract(clickPos, center, new Cesium.Cartesian2())
    const distance = Cesium.Cartesian2.magnitude(vector)
    const maxRadius = rect.width / 2
    const distanceFraction = distance / maxRadius
    if (distanceFraction < 50 / 145) {
      console.log("startOrbit", distanceFraction);
      this.startOrbit(vector)
    } else if (distanceFraction < 1) {
      console.log("startRotate", distanceFraction);
      this.startRotate(vector)
    }
  }

  private handleDoubleClick(e: MouseEvent): void {
    e.preventDefault()
    const scene = this.terria.viewerWidget.scene
    const camera = scene.camera
    const sscc = scene.screenSpaceCameraController

    if (!sscc.enableInputs || scene.mode === Cesium.SceneMode.MORPHING) return

    const center = Utils.getCameraFocus(this.terria, true, new Cesium.Cartesian3())
    if (!Cesium.defined(center)) {
      this.controls[1]?.activate() // reset view
      return
    }

    const cameraPos = scene.globe.ellipsoid.cartographicToCartesian(camera.positionCartographic)
    const surfaceNormal = scene.globe.ellipsoid.geodeticSurfaceNormal(center)

    camera.flyToBoundingSphere(new Cesium.BoundingSphere(center, 0), {
      offset: new Cesium.HeadingPitchRange(
        0,
        Cesium.Math.PI_OVER_TWO - Cesium.Cartesian3.angleBetween(surfaceNormal, camera.directionWC),
        Cesium.Cartesian3.distance(cameraPos, center),
      ),
      duration: 1.5,
    })
  }

  private getClientPos(e: MouseEvent | TouchEvent): { clientX: number; clientY: number } {
    const touch = (e as TouchEvent).touches?.[0] || (e as MouseEvent)
    return { clientX: touch.clientX, clientY: touch.clientY }
  }

  private startOrbit(cursorVector: Cesium.Cartesian2): void {
    this.isOrbiting = true

    const scene = this.terria.viewerWidget.scene
    const camera = scene.camera

    // 设置参考系
    const center = Utils.getCameraFocus(this.terria, true, new Cesium.Cartesian3())
    if (!Cesium.defined(center)) {
      this.orbitFrame = Cesium.Transforms.eastNorthUpToFixedFrame(camera.positionWC, scene.globe.ellipsoid)
      this.orbitIsLook = true
    } else {
      this.orbitFrame = Cesium.Transforms.eastNorthUpToFixedFrame(center, scene.globe.ellipsoid)
      this.orbitIsLook = false
    }
    const updateRotationMarker = (angle: number, opacity: number): void => {
      this.rotationMarkerEl.style.transform = `rotate(${-angle * (180 / Math.PI)}deg)`
      this.rotationMarkerEl.style.opacity = opacity.toString()
      this.gyroEl.classList.toggle('compass-gyro-active', this.isOrbiting)
    }

    const moveHandler = (e: MouseEvent | TouchEvent) => {
      const pos = this.getClientPos(e)
      const rect = this.compassEl.getBoundingClientRect()
      const vec = new Cesium.Cartesian2(
        pos.clientX - rect.left - rect.width / 2,
        pos.clientY - rect.top - rect.height / 2,
      )
      const angle = Math.atan2(-vec.y, vec.x)
      this.orbitCursorAngle = Cesium.Math.zeroToTwoPi(angle - Cesium.Math.PI_OVER_TWO)
      const dist = Math.min(Cesium.Cartesian2.magnitude(vec) / (rect.width / 2), 1)
      this.orbitCursorOpacity = 0.5 + 0.5 * dist * dist
      updateRotationMarker(this.orbitCursorAngle, this.orbitCursorOpacity)
    }

    const upHandler = () => {
      this.isOrbiting = false
      console.log("upHandler");

      updateRotationMarker(0, 0)
      document.removeEventListener('mousemove', moveHandler)
      document.removeEventListener('touchmove', moveHandler)
      document.removeEventListener('mouseup', upHandler)
      document.removeEventListener('touchend', upHandler)
    }
    // orbitMouseMoveFunction orbitMouseUpFunction
    document.addEventListener('mousemove', moveHandler)
    document.addEventListener('touchmove', moveHandler)
    document.addEventListener('mouseup', upHandler)
    document.addEventListener('touchend', upHandler)

    // this.terria.viewerWidget.clock.onTick.addEventListener(this.orbitTickFunction, this)
    // this.terria.viewerWidget.clock.onTick.removeEventListener(this.orbitTickFunction)

    updateRotationMarker(this.orbitCursorAngle, 0.8)
  }

  private startRotate(cursorVector: Cesium.Cartesian2): void {
    this.isRotating = true
    this.rotateInitialCursorAngle = Math.atan2(-cursorVector.y, cursorVector.x)

    const scene = this.terria.viewerWidget.scene
    const camera = scene.camera

    const center = Utils.getCameraFocus(this.terria, true, new Cesium.Cartesian3())
    if (Cesium.defined(center)) {
      this.rotateFrame = Cesium.Transforms.eastNorthUpToFixedFrame(center, scene.globe.ellipsoid)
    } else {
      this.rotateFrame = Cesium.Transforms.eastNorthUpToFixedFrame(camera.positionWC, scene.globe.ellipsoid)
    }

    this.rotateInitialCameraAngle = -camera.heading
    if (this.rotateFrame) {
      camera.lookAtTransform(this.rotateFrame)
    }
    const moveHandler = (e: MouseEvent | TouchEvent) => {
      const pos = this.getClientPos(e)
      const rect = this.compassEl.getBoundingClientRect()
      const vec = new Cesium.Cartesian2(
        pos.clientX - rect.left - rect.width / 2,
        pos.clientY - rect.top - rect.height / 2,
      )
      const angle = Math.atan2(-vec.y, vec.x)
      const diff = angle - this.rotateInitialCursorAngle!
      const targetHeading = Cesium.Math.zeroToTwoPi(this.rotateInitialCameraAngle - diff)
      const currentHeading = -camera.heading
      camera.rotateRight(targetHeading - currentHeading)
    }

    const upHandler = () => {
      this.isRotating = false
      document.removeEventListener('mousemove', moveHandler)
      document.removeEventListener('touchmove', moveHandler)
      document.removeEventListener('mouseup', upHandler)
      document.removeEventListener('touchend', upHandler)
    }

    document.addEventListener('mousemove', moveHandler)
    document.addEventListener('touchmove', moveHandler)
    document.addEventListener('mouseup', upHandler)
    document.addEventListener('touchend', upHandler)
  }

  public destroy(): void {
    this.unsubscribePostRender?.()
    this.eventHelper.removeAll()
    this.container.innerHTML = ''
  }


}

export default NavigationViewModel
