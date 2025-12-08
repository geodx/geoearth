import { defined, DeveloperError } from "cesium";

/**
 * 所有 UI 控件（按钮、导航、重置、放大缩小等）的抽象基类
 * 替代原始 Knockout 实现，支持现代响应式框架
 */
abstract class UserInterfaceControl {
  // ====================== 响应式属性 ======================
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

  // ====================== 只读属性 ======================
  /** 是否有文本（用于模板判断） */
  public get hasText(): boolean {
    return defined(this.text) && typeof this.text === "string";
  }

  /** 获取 Terria 实例 */
  public get terria(): any {
    return this._terria;
  }

  // ====================== 私有字段 ======================
  private readonly _terria: any;
  private readonly _listeners = new Map<string, Set<() => void>>();

  // ====================== 构造函数 ======================
  constructor(terria: any) {
    if (!defined(terria)) {
      throw new DeveloperError("terria is required");
    }
    this._terria = terria;
  }


  // ====================== 子类必须实现 ======================
  /**
   * 点击控件时执行的逻辑
   */
  public abstract activate(): void;
}

export default UserInterfaceControl;