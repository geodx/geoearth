import { Viewer, Cartesian3, HeadingPitchRoll } from "cesium";
import { BOMTool, SafeTool, Utils } from "../Common";


export type CameraViewType = {
    destination: {
        x: number;
        y: number;
        z: number;
    };    // 位置
    orientation: {
        heading: number;
        pitch: number;
        roll: number;
    };  // 方向
};

export type BookmarkType = {
    id: string;
    img: string;
    name: string;
    cameraView: CameraViewType;
    description?: any;
};


export class BookmarkManager {
    #viewer: Viewer;
    /**
     * @description: 相机书签管理功能
     * @param {Viewer} viewer viewer
     */
    constructor(viewer: Viewer) {
        this.#viewer = viewer;
    }

    /**
     * 创建书签
     * @param {string} name 书签名称
     * @param {number} height 场景截图canvas高度
     * @param {number} width 场景截图canvas宽度
     * @returns {BookmarkType} 返回一个新的相机书签
     */
    createBookmark(name: string, height: number, width: number): Promise<BookmarkType> {
        let scene = this.#viewer.scene;
        return new Promise((resolve, reject) => {
            this.getSceneImage(height, width).then((res) => {
                resolve({
                    id: SafeTool.uuid(),
                    img: res,
                    name: name,
                    cameraView: {
                        destination: new Cartesian3(
                            scene.camera.position.x,
                            scene.camera.position.y,
                            scene.camera.position.z
                        ),
                        orientation: new HeadingPitchRoll(
                            scene.camera.heading,
                            scene.camera.pitch,
                            scene.camera.roll
                        ),
                    },
                });
            });
        });
    }

    /**
     * 存储json格式的视角书签
     * @param {string} filsName 保存的文件名
     * @param {BookmarkType[]} markList (可选)要保存的书签列表，默认全部保存
     * @returns {MarkJsonType} 待存储的书签json
     */
    saveMark(filsName: string, markList: BookmarkType[]) {
        BOMTool.saveShareContent(JSON.stringify(markList), `${filsName}.json`);
    }

    /**
     * 读取MarkJsonType格式加入书签列表中
     * @param {CallBackType} callback (可选)第一个参数为MarkJsonType类型的书签, 第二个参数为该书签在读取列表中的存储索引
     * @returns {*}
     */
    loadMark(callback: any) {
        Utils.readFile({
            errFunc: (msg: string, e: any) => {
                console.error(msg);
            },
            endFunc: ({ fileName, filePath, fileType, fileData }: any) => {
                typeof callback === "function" && callback(JSON.parse(fileData));
            },
        });
    }

    /**
     * 创建书签时当前场景截图
     * @param {number} height canvas高度
     * @param {number} width canvas宽度
     * @returns
     */
    private getSceneImage(height: number, width: number): Promise<string> {
        let canvas = this.#viewer.scene.canvas;
        let image = new Image();
        image.src = canvas.toDataURL("image/png");

        return new Promise((resolve, reject) => {
            image.onload = function () {
                canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                canvas
                    .getContext("2d")!
                    .drawImage(image, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg"));
            };
        });
    }
}
