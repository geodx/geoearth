
import { CesiumWidget, defined, DeveloperError, Viewer, Scene, Camera } from "cesium";

/**
 * 导航控件父类
 * 所有导航控件（放大、缩小、重置、罗盘等）直接继承这个类即可！
 */
abstract class NavigationControl {

  /** 控件名称  */
  public name: string = "Unnamed Control";

  /** 文本内容（如果有文本就不显示 SVG） */
  public text?: string;

  /** SVG 图标 */
  public svgIcon?: string;

  /** SVG 图标尺寸 */
  public svgWidth?: number;
  public svgHeight?: number;

  /** CSS 类名 */
  public cssClass?: string;

  /** 是否激活状态 */
  public isActive: boolean = false;

  public get hasText(): boolean {
    return defined(this.text) && typeof this.text === "string";
  }

  // ====================== Cesium 实例 ======================
  protected readonly viewer: Viewer | CesiumWidget;
  protected get scene(): Scene { return this.viewer.scene; }
  protected get camera(): Camera { return this.viewer.camera; }

  constructor(viewer: Viewer | CesiumWidget) {
    if (!defined(viewer)) {
      throw new DeveloperError("viewer is required");
    }
    this.viewer = viewer;

  }

  // ====================== 子类必须实现 ======================
  /** 点击时执行的逻辑 */
  public abstract activate(): void;
}

export default NavigationControl;