/****************************************************************************
 名称：获取主视图 viewer 球对象

 最后修改日期：2022-03-25
 ****************************************************************************/

import { useEarthStore } from './EarthStore';

function getMainViewer() {
  const earthStore = useEarthStore()
  return earthStore.getEarth().viewer3D;
}
export { getMainViewer };
