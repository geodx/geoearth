import { Cartographic, Cartesian3, Matrix4, Transforms, Matrix3, defined, Cesium3DTileStyle, Color } from 'cesium';
import { Cesium3DTileset } from 'cesium';

// 对 3DTiles 添加偏移
function offSetTileSetByCartographic(tileSet: Cesium3DTileset, lon: number = 0, lat: number = 0, height: number = 0) {
    let cartographic = Cartographic.fromCartesian(tileSet.boundingSphere.center);
    let surface = Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height);
    let offset = Cartesian3.fromRadians(cartographic.longitude + lon, cartographic.latitude + lat, cartographic.height + height);
    let translation = Cartesian3.subtract(offset, surface, new Cartesian3());
    tileSet.modelMatrix = Matrix4.fromTranslation(translation);
}

function changeTileSetRootPosition(tileSet: Cesium3DTileset, lon: number, lat: number, height: number) {
    // 将3DTiles模型从某一个位置放到另一个位置
    if (!isNaN(lon) && !isNaN(lat) && !isNaN(height)) {
        let center = tileSet.boundingSphere.center; // 起始点
        let target = Cartesian3.fromDegrees(lon, lat, height); // 终点

        let modelMatrixStart = Transforms.eastNorthUpToFixedFrame(center);
        let remote = Matrix4.getMatrix3(modelMatrixStart, new Matrix3()); // 获取旋转矩阵
        let remoteInverse = Matrix3.inverse(remote, new Matrix3()); // 获取旋转矩阵的逆
        let translation = new Cartesian3(-center.x, -center.y, -center.z); // 平移量的相反

        let modelMatrixTarget = Transforms.eastNorthUpToFixedFrame(target);

        // 先旋转，在平移
        modelMatrixTarget = Matrix4.multiplyByMatrix3(modelMatrixTarget, remoteInverse, new Matrix4());
        modelMatrixTarget = Matrix4.multiplyByTranslation(modelMatrixTarget, translation, new Matrix4());

        tileSet.modelMatrix = modelMatrixTarget;
    }
}


// 设置 TileSet 的高度
function setTileSetHeight(tileSet: Cesium3DTileset, height: number) {
    let cartographic = Cartographic.fromCartesian(
        tileSet.boundingSphere.center
    );
    let surface = Cartesian3.fromRadians(
        cartographic.longitude,
        cartographic.latitude,
        cartographic.height
    );
    let offset = Cartesian3.fromRadians(
        cartographic.longitude,
        cartographic.latitude,
        height
    );
    let translation = Cartesian3.subtract(
        offset,
        surface,
        new Cartesian3()
    );
    tileSet.modelMatrix = Matrix4.fromTranslation(translation);
}

// 设置3DTiles的透明度
function setAlpha(tile: Cesium3DTileset, alpha: number) {
    if (defined(tile)) {
        tile.style = new Cesium3DTileStyle({
            color: {
                evaluateColor: function () {
                    return new Color(1, 1, 1, alpha);
                }
            }
        });
    }
}

// 获取透明度
function getAlpha(tile: Cesium3DTileset) {
    let alpha: number;
    if (defined(tile)) {
        // @ts-ignore
        if (!tile.alpha) {
            alpha = 1;
        } else {
            // @ts-ignore
            alpha = tile.alpha;
        }
    }
    // @ts-ignore
    return alpha;
}

export { offSetTileSetByCartographic, changeTileSetRootPosition, setTileSetHeight, setAlpha, getAlpha };
