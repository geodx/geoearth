import * as Cesium from 'cesium'
import Utils from '../core/Utils'
import NavigationControl from '../controls/NavigationControl'
import ZoomNavigationControl from '../controls/ZoomNavigationControl'
import ResetViewNavigationControl from '../controls/ResetViewNavigationControl'
import type { Terria } from '..'
import svgCompassRotationMarker from '../svgPaths/svgCompassRotationMarker'
import svgCompassOuterRing from '../svgPaths/svgCompassOuterRing'
import svgCompassGyro from '../svgPaths/svgCompassGyro'



export class NavigationViewModel {
  private terria: Terria
  private eventHelper = new Cesium.EventHelper()

  private enableZoomControls: boolean
  private enableCompass: boolean
  private navigationLocked = false
  private controls: NavigationControl[]

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

  private constructor(terria: Terria) {
    this.terria = terria

    this.enableZoomControls = terria.options.enableZoomControls ?? true
    this.enableCompass = terria.options.enableCompass ?? true

    this.controls = terria.controls ?? [
      new ZoomNavigationControl(this.terria, true),
      new ResetViewNavigationControl(this.terria),
      new ZoomNavigationControl(this.terria, false),
    ]

    this.heading = this.enableCompass ? this.terria.viewerWidget.camera.heading : 0.0

    const widgetChange = () => {
      if (this.unsubscribePostRender) {
        this.unsubscribePostRender()
        this.unsubscribePostRender = undefined
      }
      this.unsubscribePostRender = this.terria.viewerWidget.camera.changed.addEventListener(() => {
        this.heading = this.terria.viewerWidget.scene.camera.heading
        this.updateCompassRotation()
      })
    }

    this.eventHelper.add(this.terria.afterWidgetChanged, widgetChange, this)
    widgetChange()
  }
  static create(options: Terria): NavigationViewModel {
    const result = new NavigationViewModel(options)
    result.show(options.container!)
    return result
  }

  public destroy(): void {
    this.eventHelper.removeAll()
  }
  private setNavigationLocked(locked: boolean): void {
    this.navigationLocked = locked
    if (this.controls && this.controls.length > 1) {
      const resetViewNavigationControl = this.controls[1] as ResetViewNavigationControl
      resetViewNavigationControl.setNavigationLocked(this.navigationLocked)
    }
  }
  private updateCompassRotation(): void {
    const deg = -this.heading * (180 / Math.PI)
    if (this.outerRingEl) this.outerRingEl.style.transform = `rotate(${deg}deg)`
  }
  private show(container: HTMLElement): void {
    const enableOuterRing = this.terria.options?.enableCompassOuterRing ?? true
    // 主容器
    const navDiv = document.createElement('div')
    navDiv.className = 'cesium-navigation-compass'

    // 指南针主体
    this.compassEl = document.createElement('div')
    this.compassEl.className = 'compass'
    this.compassEl.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.handleMouseDown(e)
    })
    this.compassEl.addEventListener('touchstart', (e) => this.handleMouseDown(e))
    this.compassEl.addEventListener('dblclick', (e) => this.handleDoubleClick(e))

    if (!this.enableCompass) this.compassEl.style.display = 'none'

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

    container.appendChild(navDiv)
  }

  // ==================== 鼠标交互 ====================
  private getClientPos(e: MouseEvent | TouchEvent): { clientX: number; clientY: number } {
    const touch = (e as TouchEvent).touches?.[0] || (e as MouseEvent)
    return { clientX: touch.clientX, clientY: touch.clientY }
  }
  private handleMouseDown(e: MouseEvent | TouchEvent): void {
    e.preventDefault()
    const scene = this.terria.viewerWidget.scene
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
      console.log("startOrbit", distanceFraction);
      this.startOrbit(vector)
    } else if (distanceFraction < 1) {
      console.log("startRotate", distanceFraction);
      this.startRotate(vector)
    } else {
      return
    }
  }

  private handleDoubleClick(e: MouseEvent): void {
    e.preventDefault()
    const scene = this.terria.viewerWidget.scene
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


    const center = Utils.getCameraFocus(this.terria, true)
    if (!center) {
      // 地球仪几乎看不见，所以重置为主视图。
      this.controls[1]?.activate() // reset view
      return
    }

    const cameraPos = scene.globe.ellipsoid.cartographicToCartesian(camera.positionCartographic)
    const surfaceNormal = scene.globe.ellipsoid.geodeticSurfaceNormal(center)

    camera.flyToBoundingSphere(new Cesium.BoundingSphere(center, 0), {
      offset: new Cesium.HeadingPitchRange(
        0,
        //不要使用camera.pitch，因为需要中心/目标的俯仰角
        Cesium.Math.PI_OVER_TWO - Cesium.Cartesian3.angleBetween(surfaceNormal, camera.directionWC),
        // distanceToBoundingSphere在2D或Columbus视图中返回错误的值，因此不要使用相机。
        // distanceToBoundingSphere（focusBoundingSpheres）应手动计算距离
        Cesium.Cartesian3.distance(cameraPos, center),
      ),
      duration: 1.5,
    })
  }

  private addOrbitEventListener() {
    if (this.orbitMouseMoveFunction && this.orbitMouseUpFunction) {
      document.addEventListener('mousemove', this.orbitMouseMoveFunction, false)
      document.addEventListener('touchmove', this.orbitMouseMoveFunction, false)
      document.addEventListener('mouseup', this.orbitMouseUpFunction, false)
      document.addEventListener('touchend', this.orbitMouseUpFunction, false)
    }
  }
  private removeOrbitEventListener() {
    if (this.orbitMouseMoveFunction && this.orbitMouseUpFunction) {
      document.removeEventListener('mousemove', this.orbitMouseMoveFunction, false)
      document.removeEventListener('touchmove', this.orbitMouseMoveFunction, false)
      document.removeEventListener('mouseup', this.orbitMouseUpFunction, false)
      document.removeEventListener('touchend', this.orbitMouseUpFunction, false)
    }
  }
  private addRotateEventListener() {
    if (this.rotateMouseMoveFunction && this.rotateMouseUpFunction) {
      document.addEventListener('mousemove', this.rotateMouseMoveFunction, false)
      document.addEventListener('touchmove', this.rotateMouseMoveFunction, false)
      document.addEventListener('mouseup', this.rotateMouseUpFunction, false)
      document.addEventListener('touchend', this.rotateMouseUpFunction, false)
    }
  }
  private removeRotateEventListener() {
    if (this.rotateMouseMoveFunction && this.rotateMouseUpFunction) {
      document.removeEventListener('mousemove', this.rotateMouseMoveFunction, false)
      document.removeEventListener('touchmove', this.rotateMouseMoveFunction, false)
      document.removeEventListener('mouseup', this.rotateMouseUpFunction, false)
      document.removeEventListener('touchend', this.rotateMouseUpFunction, false)
    }
  }
  private startOrbit(cursorVector: Cesium.Cartesian2): void {
    const scene = this.terria.viewerWidget.scene
    const camera = scene.camera
    const sscc = scene.screenSpaceCameraController
    // 如果它被禁用，则不要绕轨道运行
    if (scene.mode === Cesium.SceneMode.MORPHING || !sscc.enableInputs) return
    if (this.navigationLocked) return
    if (scene.mode === Cesium.SceneMode.COLUMBUS_VIEW && (!sscc.enableTranslate || !sscc.enableTilt)) return
    if (scene.mode === Cesium.SceneMode.SCENE3D && (!sscc.enableTilt || !sscc.enableRotate)) return
    if (scene.mode === Cesium.SceneMode.SCENE2D && !sscc.enableTranslate) return

    // Remove existing event handlers, if any.
    this.removeOrbitEventListener()
    if (this.orbitTickFunction) {
      this.terria.viewerWidget.clock.onTick.removeEventListener(this.orbitTickFunction)
    }
    this.orbitMouseMoveFunction = undefined
    this.orbitMouseUpFunction = undefined
    this.orbitTickFunction = undefined

    this.isOrbiting = true
    this.orbitLastTimestamp = Cesium.getTimestamp()

    if (this.terria.trackedEntity) {
      // when tracking an entity simply use that reference frame
      this.orbitFrame = undefined
      this.orbitIsLook = false
    } else {
      // 设置参考系
      const center = Utils.getCameraFocus(this.terria, true)
      if (!center) {
        this.orbitFrame = Cesium.Transforms.eastNorthUpToFixedFrame(camera.positionWC, scene.globe.ellipsoid)
        this.orbitIsLook = true
      } else {
        this.orbitFrame = Cesium.Transforms.eastNorthUpToFixedFrame(center, scene.globe.ellipsoid)
        this.orbitIsLook = false
      }
    }

    this.orbitTickFunction = () => {
      console.log("orbitTickFunction");

      const timestamp = Cesium.getTimestamp()
      const deltaT = timestamp - this.orbitLastTimestamp
      const rate = ((this.orbitCursorOpacity - 0.5) * 2.5) / 1000
      const distance = deltaT * rate

      const angle = this.orbitCursorAngle + Cesium.Math.PI_OVER_TWO
      const x = Math.cos(angle) * distance
      const y = Math.sin(angle) * distance

      if (this.navigationLocked) return

      let oldTransform: Cesium.Matrix4 | undefined
      if (this.orbitFrame) {
        oldTransform = Cesium.Matrix4.clone(camera.transform, new Cesium.Matrix4())
        camera.lookAtTransform(this.orbitFrame)
      }

      // 2D模式下只做平移
      if (scene.mode === Cesium.SceneMode.SCENE2D) {
        const direction = new Cesium.Cartesian3(x, y, 0)
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
      this.orbitLastTimestamp = timestamp
    }


    const updateRotationMarker = (angle: number, opacity: number): void => {
      this.rotationMarkerEl.style.transform = `rotate(${-angle * (180 / Math.PI)}deg)`
      this.rotationMarkerEl.style.opacity = opacity.toString()
      this.gyroEl.classList.toggle('compass-gyro-active', this.isOrbiting)
    }

    this.orbitMouseMoveFunction = (e: MouseEvent | TouchEvent) => {
      const { clientX, clientY } = this.getClientPos(e)
      if (!this.compassEl) return
      const rect = this.compassEl.getBoundingClientRect()
      const vec = new Cesium.Cartesian2(
        clientX - rect.left - rect.width / 2,
        clientY - rect.top - rect.height / 2,
      )
      const angle = Math.atan2(-vec.y, vec.x)
      this.orbitCursorAngle = Cesium.Math.zeroToTwoPi(angle - Cesium.Math.PI_OVER_TWO)
      const dist = Math.min(Cesium.Cartesian2.magnitude(vec) / (rect.width / 2), 1)
      this.orbitCursorOpacity = 0.5 + 0.5 * dist * dist
      updateRotationMarker(this.orbitCursorAngle, this.orbitCursorOpacity)
    }

    this.orbitMouseUpFunction = () => {
      // TODO: if mouse didn't move, reset view to looking down, north is up?
      this.isOrbiting = false
      console.log("upHandler:", this.orbitTickFunction);
      this.removeOrbitEventListener()
      if (this.orbitTickFunction) {
        this.terria.viewerWidget.clock.onTick.removeEventListener(this.orbitTickFunction)
      }
      this.orbitMouseMoveFunction = undefined
      this.orbitMouseUpFunction = undefined
      this.orbitTickFunction = undefined
    }
    this.addOrbitEventListener()
    this.terria.viewerWidget.clock.onTick.addEventListener(this.orbitTickFunction, this)

    updateRotationMarker(this.orbitCursorAngle, 0.8)
  }

  private startRotate(cursorVector: Cesium.Cartesian2): void {
    const scene = this.terria.viewerWidget.scene
    const camera = scene.camera
    var sscc = scene.screenSpaceCameraController
    if (scene.mode === Cesium.SceneMode.MORPHING || scene.mode === Cesium.SceneMode.SCENE2D || !sscc.enableInputs) {
      return
    }
    if (this.navigationLocked) {
      return
    }
    if (!sscc.enableLook && (scene.mode === Cesium.SceneMode.COLUMBUS_VIEW || (scene.mode === Cesium.SceneMode.SCENE3D && !sscc.enableRotate))) {
      return
    }

    this.removeRotateEventListener()
    this.rotateMouseMoveFunction = undefined
    this.rotateMouseUpFunction = undefined

    this.isRotating = true
    this.rotateInitialCursorAngle = Math.atan2(-cursorVector.y, cursorVector.x)
    if (this.terria.trackedEntity) {
      // 在跟踪实体时，只需使用该参考系
      this.rotateFrame = undefined
      this.rotateIsLook = false
    } else {
      const center = Utils.getCameraFocus(this.terria, true,)
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

      let oldTransform
      if (this.rotateFrame) {
        oldTransform = Cesium.Matrix4.clone(camera.transform, new Cesium.Matrix4())
        camera.lookAtTransform(this.rotateFrame)
      }
      const currentHeading = -camera.heading
      camera.rotateRight(targetHeading - currentHeading)
      if (this.rotateFrame) {
        if (oldTransform) camera.lookAtTransform(oldTransform)
      }
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
