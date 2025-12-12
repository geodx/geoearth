/****************************************************************************
 名称：工具-场景特效模块类
 描述：写管理天气的函数
 最后修改日期：2022-04-12
 ****************************************************************************/

import CesiumEarth from "@/lib/CesiumEarth";
import { useEarthStore } from "@/stores/EarthStore";
import { Viewer, Cartesian3, Color, JulianDate, PostProcessStageLibrary, viewerCesiumInspectorMixin } from "cesium";
const earthStore = useEarthStore()

export default class SpecialEffect {
    private earth: CesiumEarth.Earth;
    private viewer: Viewer;
    private blackWhite: any
    private night: any;
    private bright: any;
    private lenFlares: any;
    private outLine: any;
    private depth: any;
    constructor() {
        // setTimeout(() => {
        //     this.earth = earthStore.getEarth()
        //     this.viewer = earthStore.viewer
        // }, 1000);
        this.earth = earthStore.getEarth()
        this.viewer = earthStore.viewer
    }

    setView() {
        const flyToOpts = {
            destination: Cartesian3.fromDegrees(121.53806, 29.87179, 220),
            // destination: {
            //     x: -2896888.0568035087, y: 4720239.53582123, z: 3159699.620720131
            // },
            orientation: {
                heading: 6.283185307179586,
                pitch: -1.569999385845113,
                roll: 0
            },
            duration: 1
        };
        this.viewer?.scene.camera.setView(flyToOpts);
    }

    openEffect(className: string) {
        switch (className) {
            case 'depthTestAgainstTerrain': {
                this.viewer.scene.globe.depthTestAgainstTerrain = true;

            }
                break;
            case 'FramesPerSecond': {
                this.earth.openDeBug();
            }
                break;
            case 'FrustumPlanes': {
                this.viewer.scene.debugShowFrustumPlanes = true;
            }
                break;
            case 'dbtm': {
                this.dbtmOpen();
            }
                break;
            case 'dxsjw': {
                this.dxsjwOpen();
            }
                break;
            case 'light': {
                this.lightOpen();
            }
                break;
            case 'shade': {
                this.shadeOpen();
            }
                break;
            case 'blackWhite': {
                this.blackWhiteOpen();
            }
                break;
            case 'nightVision': {
                this.nightVisionOpen();
            }
                break;
            case 'brightness': {
                this.brightnessOpen();
            }
                break;
            case 'forceLight': {
                this.forceLightOpen();
            }
                break;
            case 'lenFlare': {
                this.lenFlareOpen();
            }
                break;
            case 'ambientOcclusion': {
                this.ambientOcclusionOpen();
            }
                break;
            case 'outline': {
                this.outlineOpen();
            }
                break;
            case 'depthField': {
                this.depthFieldOpen();
            }
                break;
            case 'sun': {
                this.sunOpen();
            }
                break;
            case 'moon': {
                this.moonOpen();
            }
                break;
            case 'groundAir': {
                this.groundAirOpen();
            }
                break;
            case 'star': {
                this.starOpen();
            }
                break;
            case 'snow': {
                this.snowOpen();
            }
                break;
            case 'rain': {
                this.rainOpen();
            }
                break;
            case 'fog': {
                this.fogOpen();
            }
                break;
        }
    }

    endEffect(className: string) {
        switch (className) {
            case 'shadows': {
                this.viewer.scene.globe.depthTestAgainstTerrain = false;
            }
                break;
            case 'FramesPerSecond': {
                this.earth.closeDeBug();
            }
                break;
            case 'FrustumPlanes': {
                this.viewer.scene.debugShowFrustumPlanes = false;
            }
                break;
            case 'dbtm': {
                this.dbtmEnd();
            }
                break;
            case 'dxsjw': {
                this.dxsjwEnd();
            }
                break;
            case 'light': {
                this.lightEnd();
            }
                break;
            case 'shade': {
                this.shadeEnd();
            }
                break;
            case 'blackWhite': {
                this.blackWhiteEnd();
            }
                break;
            case 'nightVision': {
                this.nightVisionEnd();
            }
                break;
            case 'brightness': {
                this.brightnessEnd();
            }
                break;
            case 'forceLight': {
                this.forceLightEnd();
            }
                break;
            case 'lenFlare': {
                this.lenFlareEnd();
            }
                break;
            case 'ambientOcclusion': {
                this.ambientOcclusionEnd();
            }
                break;
            case 'outline': {
                this.outlineEnd();
            }
                break;
            case 'depthField': {
                this.depthFieldEnd();
            }
                break;
            case 'sun': {
                this.sunEnd();
            }
                break;
            case 'moon': {
                this.moonEnd();
            }
                break;
            case 'star': {
                this.starEnd();
            }
                break;
            case 'groundAir': {
                this.groundAirEnd();
            }
                break;
            case 'snow': {
                this.snowEnd();
            }
                break;
            case 'rain': {
                this.rainEnd();
            }
                break;
            case 'fog': {
                this.fogEnd();
            }
                break;
        }
    }

    //地形三角网
    dxsjwOpen() {
        if (!(this.earth.viewer3D as any).cesiumInspector) {
            this.viewer.extend(viewerCesiumInspectorMixin);
            (this.earth.viewer3D as any).cesiumInspector.container.style.display = 'none';
        }
        //
        (this.earth.viewer3D as any).cesiumInspector.viewModel.wireframe = true;
    }

    dxsjwEnd() {
        (this.earth.viewer3D as any).cesiumInspector.viewModel.wireframe = false;
    }

    //地表透明
    dbtmOpen() {
        this.viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
        this.viewer.scene.globe.translucency.enabled = true; //可用透明度
        this.viewer.scene.globe.translucency.frontFaceAlpha = 0.8; //默认设置为0.8
    }

    dbtmEnd() {
        this.viewer.scene.globe.translucency.frontFaceAlpha = 1;
        this.viewer.scene.screenSpaceCameraController.enableCollisionDetection = true;
        this.viewer.scene.globe.translucency.enabled = false; //可用透明度
    }

    //泛光
    lightOpen() {
        this.setView();
        let bloom = this.viewer.scene.postProcessStages.bloom;
        bloom.enabled = true;
        bloom.uniforms.glowOnly = false;
        bloom.uniforms.contrast = 128;
        bloom.uniforms.brightness = -0.3;
        bloom.uniforms.delta = 1;
        bloom.uniforms.sigma = 2;
        bloom.uniforms.stepSize = 1;
    };

    lightEnd() {
        this.viewer.scene.postProcessStages.bloom.enabled = false;
    };

    //黑白
    blackWhiteOpen() {
        let collection = this.viewer.scene.postProcessStages;
        this.blackWhite = PostProcessStageLibrary.createBlackAndWhiteStage();
        let silhouette = collection.add(this.blackWhite);
        silhouette.enabled = true;
        silhouette.uniforms.gradations = 15.0; //调节黑白程度（1-20）
    };

    blackWhiteEnd() {
        let collection = this.viewer.scene.postProcessStages;
        collection.remove(this.blackWhite);
    };

    //夜视
    nightVisionOpen() {
        let collection = this.viewer.scene.postProcessStages;
        this.night = PostProcessStageLibrary.createNightVisionStage();
        let silhouette = collection.add(this.night);
        silhouette.enabled = true;
    }

    nightVisionEnd() {
        this.viewer.scene.postProcessStages.remove(this.night);
        this.night = undefined;
    }

    //亮度
    brightnessOpen() {
        let collection = this.viewer.scene.postProcessStages;
        this.bright = PostProcessStageLibrary.createBrightnessStage();
        let silhouette = collection.add(this.bright);
        silhouette.enabled = true;
        silhouette.uniforms.brightness = 2; //（调节亮度0-3最佳）
    }

    brightnessEnd() {
        this.viewer.scene.postProcessStages.remove(this.bright);
        this.bright = undefined;
    }

    //镜头耀斑
    lenFlareOpen() {
        this.lenFlares = PostProcessStageLibrary.createLensFlareStage();
        let lensFlare = this.viewer.scene.postProcessStages.add(this.lenFlares);
        lensFlare.enabled = true;
        lensFlare.uniforms.intensity = 5;
        lensFlare.uniforms.distortion = 5;
        lensFlare.uniforms.ghostDispersal = 5;
        lensFlare.uniforms.haloWidth = 5;
        lensFlare.uniforms.dirtAmount = 5;
        lensFlare.uniforms.earthRadius = 5;

        let camera = this.viewer.scene.camera;
        camera.position = new Cartesian3(40010447.97500168, 56238683.46406788, 20776576.752223067);
        camera.direction = new Cartesian3(-0.5549701431494752, -0.7801872010801355, -0.2886452346452218);
        camera.up = new Cartesian3(-0.3016252360948521, -0.13464820558887716, 0.9438707950150912);
        camera.right = Cartesian3.cross(camera.direction, camera.up, new Cartesian3());
        this.viewer.clock.currentTime = new JulianDate(2458047, 27399.860215000022);
    }

    lenFlareEnd() {
        this.viewer.scene.postProcessStages.remove(this.lenFlares);
        this.lenFlares = undefined;
        this.viewer.clock.currentTime = new JulianDate();
    }

    //强制光照-开启和关闭光照
    forceLightOpen() {
        this.viewer.scene.globe.enableLighting = true;
    }

    forceLightEnd() {
        this.viewer.scene.globe.enableLighting = false;
    }

    //环境遮蔽
    ambientOcclusionOpen() {
        let ambientOcclusion = this.viewer.scene.postProcessStages.ambientOcclusion;
        ambientOcclusion.enabled = true;
        ambientOcclusion.uniforms.ambientOcclusionOnly = false;
        ambientOcclusion.uniforms.intensity = 3;
        ambientOcclusion.uniforms.bias = 0.1;
        ambientOcclusion.uniforms.lengthCap = 0.03;
        ambientOcclusion.uniforms.stepSize = 1;
        ambientOcclusion.uniforms.blurStepSize = 0.86;
    }

    ambientOcclusionEnd() {
        this.viewer.scene.postProcessStages.ambientOcclusion.enabled = false;
    }

    //轮廓
    outlineOpen() {
        let collection = this.viewer.scene.postProcessStages;
        this.outLine = PostProcessStageLibrary.createSilhouetteStage();
        let silhouette = collection.add(this.outLine);
        silhouette.enabled = true;
        silhouette.uniforms.color = Color.YELLOW;
    }

    outlineEnd() {
        this.viewer.scene.postProcessStages.remove(this.outLine);
        this.outLine = undefined;
    }

    //景深
    depthFieldOpen() {
        let collection = this.viewer.scene.postProcessStages;
        this.depth = PostProcessStageLibrary.createDepthOfFieldStage();
        let silhouette = collection.add(this.depth);
        silhouette.enabled = true;
        silhouette.uniforms.focalDistance = 1;  //（1000）
        silhouette.uniforms.delta = 1;   //（5）
        silhouette.uniforms.sigma = 1;   //（5）
        silhouette.uniforms.stepSize = 1;  //（10）
    }

    depthFieldEnd() {
        this.viewer.scene.postProcessStages.remove(this.depth);
        this.depth = undefined;
    }

    //阴影，日照阴影
    shadeOpen() {
        this.viewer.scene.shadowMap.enabled = true;
    };

    shadeEnd() {
        this.viewer.scene.shadowMap.enabled = false;
    };

    //太阳
    sunOpen() {
        this.viewer.scene.sun!.show = true;
    };

    sunEnd() {
        this.viewer.scene.sun!.show = false;
    }

    //月亮
    moonOpen() {
        this.viewer.scene.moon!.show = true;
    };

    moonEnd() {
        this.viewer.scene.moon!.show = false;
    }

    //星空
    starOpen() {
        this.viewer.scene.skyBox!.show = true;
    };

    starEnd() {
        this.viewer.scene.skyBox!.show = false;
    }

    //地面大气
    groundAirOpen() {
        this.viewer.scene.skyAtmosphere!.show = true;
    };

    groundAirEnd() {
        this.viewer.scene.skyAtmosphere!.show = false;
    }


    snowOpen() {
        this.setView();
        CesiumEarth.WeatherEffect.addSnowEffect(this.viewer);
    };

    rainOpen() {
        this.setView();
        CesiumEarth.WeatherEffect.addRainEffect(this.viewer);
    };

    fogOpen() {
        let flyToOpts = {
            destination: Cartesian3.fromDegrees(121.53806, 29.87179, 220),
            // destination: {
            //     x: -2894890.952233019, y: 4717882.878778957, z: 3159835.2187021286
            // },
            orientation: {
                heading: 2.89286059751638,
                pitch: -0.12778466261122756,
                roll: 6.283184259531674
            },
            duration: 1
        };
        this.viewer.scene.camera.setView(flyToOpts);
        CesiumEarth.WeatherEffect.addFogEffect(this.viewer);
    };

    snowEnd() {
        CesiumEarth.WeatherEffect.removeEffect(this.viewer);
    };

    rainEnd() {
        CesiumEarth.WeatherEffect.removeEffect(this.viewer);
    };

    fogEnd() {
        CesiumEarth.WeatherEffect.removeEffect(this.viewer);
    };
}

