<template>
    <div>
        <div class="entity_arr">
            <div>
                <div v-for="item in TableData">
                    {{ item }}
                </div>
            </div>
            <ul id="GeoJsonTree" class="ztree"></ul>
        </div>
        <div style="text-align: center;padding: 10px">
            <el-button :size="'small'" :type="'success'" @click="flyToEntity">
                飞向实体
            </el-button>
            <el-button v-if="false" :size="'small'" :type="'primary'">
                编辑属性
            </el-button>
            <el-button v-if="false" :size="'small'" :type="'warning'">
                删除实体
            </el-button>
        </div>
        <div v-if="false" style="height:300px;overflow: auto; border: black 1px dashed">
            <table class="table table-bordered table-hover">
                <thead>
                    <th>属性</th>
                    <th>值</th>
                    <th></th>
                </thead>
                <tbody>
                    <tr v-for="row in TableData">
                        <td onclick="children[1].style.display='inline';children[1].focus(); " style="max-width: 75px">
                            <div>{{ row.key }}</div>
                            <input v-model="row.key" class="form-control" onfocusout="style.display='none'"
                                style="margin-top: 5px;display: none" type="text" />
                        </td>
                        <td onclick="children[1].style.display='inline';children[1].focus(); "
                            style="text-align: center;max-width: 200px">
                            <div>{{ row.value }}</div>
                            <input v-model="row.value" class="form-control" onfocusout="style.display='none'"
                                style="margin-top: 5px;display: none" type="text" />
                        </td>
                        <td style="width: 25px">
                            <button @click="delPro(row.key)">
                                <span class="glyphicon glyphicon-floppy-remove"></span>
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
            <div style="text-align: center;padding-bottom: 10px">
                <button class="btn btn-info" @click="addPro">
                    <span class="glyphicon glyphicon-plus"></span>
                </button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import type CesiumEarth from '@/lib/CesiumEarth';
import { useEarthStore } from '@/stores/EarthStore';
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';


let timer: number = 0;
const entityLength = ref(0)
const TreeData = ref([])
const TreeNode = ref()
const TableData = ref<any[]>([])
const earthStore = useEarthStore()
let earth: CesiumEarth.Earth
onMounted(async () => {
    initGeoJsonTree();
    window.clearInterval(timer);
    timer = setInterval(() => {
        refreshStatus();
    }, 100);
    earth = await earthStore.getEarth()
})
onUnmounted(() => {
    window.clearInterval(timer);
})

// 监听 Table 中的数据有没有变化
watch(() => TableDataStr, (newValue) => {
    return;
    // 从内存地址中更新  GeoJson，以便触发 Vue
    // earth.plotTool.GeoJson = JSON.parse(JSON.stringify(earth.plotTool.GeoJson));
})
const TableDataStr = computed(() => {
    return JSON.stringify(TableData).length
})

function refreshStatus() {
    let geoJson = earth.plotTool.GeoJson;
    if (entityLength.value === geoJson.features.length) {
        return;
    } else {
        entityLength.value = geoJson.features.length;
    }

    let TreeData: any[] = [];

    geoJson.features.forEach((feature: any) => {
        TreeData.push({
            id: feature.properties.id,
            name: feature.properties.name
        });
    });

    TreeData = TreeData;
    initGeoJsonTree();
    console.log('刷新状态');
}
function initGeoJsonTree() {
    let zTreeObj;
    // zTree 的参数配置，深入使用请参考 API 文档（setting 配置详解）
    let setting = {
        callback: {
            onClick: (e: any, treeId: any, treeNode: any) => {
                earth.plotTool.GeoJson.features.forEach((feature: any) => {
                    if (feature.properties.id === treeNode.id) {
                        let newTable = [];
                        for (const key in feature) {
                            newTable.push({
                                key,
                                value: feature.properties[key]
                            });
                        }
                        TableData.value = newTable;
                        TreeNode.value = treeNode;
                    }
                });
            }
        }
    };
    // zTree 的数据属性，深入使用请参考 API 文档（zTreeNode 节点数据详解）
    let zNodes = TreeData;

    // zTreeObj = $.fn.zTree.init($('#GeoJsonTree'), setting, zNodes);
    // $('.ztree li a').css('color', 'white');
}

function flyToEntity() {
    if (TreeNode) {
        let entity = earth.plotTool.dataSourceToo._entityCollection.getById(TreeNode.value.id);
        console.log(entity);
        earth.viewer3D.flyTo(entity);

    }
}
function delPro(key: any) {
    // 删除树节点上的数据
    delete TreeNode.value.properties[key];
    // 把节点上的数据
    // that.TableData = [];
    // for (let key in TreeNode.properties) {
    //     let value = TreeNode.properties[key];
    //     that.TableData.push({
    //         key: key,
    //         value: value
    //     });
    // }
    // TreeNode.properties = newProps;
}
function addPro() {

    // 删除树节点上的数据
    TreeNode.value.properties['new'] = '';
    // 把节点上的数据
    // that.TableData = [];
    // for (let key in TreeNode.properties) {
    //     let value = TreeNode.properties[key];
    //     that.TableData.push({
    //         key: key,
    //         value: value
    //     });
    // }

    // TreeNode.properties = newProps;
} 
</script>

<style lang="scss" scoped>
.entity_arr {
    padding: 15px;
    height: 350px;
    overflow: auto;
    border: #949393 1px dashed
}
</style>
