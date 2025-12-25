
import CesiumEarth from '@/lib/CesiumEarth';
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
interface ComAction {
  id: string;
  comName: string;
  open: boolean;
  show: boolean;
  role: string;
  url: string;
  name: string;
  type: string;
  config: any
}
interface Legend {
  title: string
  img: string
  list: any[],
}
export const useCesiumEarthStore = defineStore('CesiumEarth', () => {
  // state
  const useName = ref('')
  // 判断当时组件的状态，是用于 Demo 演示，还是用在真正的生产环境下。
  const demoModel = ref(true)
  // 判断组件的样式
  const themeColor = ref('green')
  // 头部菜单栏
  const titleHeader = ref({
    left: [] as ComAction[],
    right: [] as ComAction[],
  })
  // 当前所显示的图例
  const legendCurrent = ref<Legend>({
    title: '',
    img: '',
    list: [],
  })
  // 全部的图例数据
  const legendCollection = ref([])
  // 所有已注册的 UI 组件
  const comActions = ref<ComAction[]>([])

  // getters
  // 获取组件开关状态
  const comStatus = computed(() => (comName: string) => {
    let com = comActions.value.find((item) => item.comName === comName)
    return com && com.open
  })
  // 获取当前菜单状态
  const titleHeaderCurrent = computed(() => () => {
    const titles = [...titleHeader.value.right, ...titleHeader.value.left]
    return titles.find((item) => item?.open)
  })

  // actions 
  function loadUIConfig(UIConfig: any) {
    demoModel.value = UIConfig.demoModel
    themeColor.value = UIConfig.themeColor
    titleHeader.value = UIConfig.titleHeader
    const userInfo = localStorage.getItem("userInfo")
    if (userInfo) {
      const userInfoJson = JSON.parse(userInfo) || {}
      comActions.value = UIConfig.comActions.filter(
        (item: any) => item.role === userInfoJson.useName || item.role === "all"
      )
    } else {
      comActions.value = UIConfig.comActions.filter((item: any) => item.role === "all")
    }
  }

  function setUserName(name: string) {
    useName.value = name
  }

  function setThemeColor(color: string) {
    themeColor.value = color
  }

  function setTitleHeaderCurrent(titleId: string) {
    titleHeader.value.left.find((item) => {
      item.open = item.id === titleId
    })
    titleHeader.value.right.find((item) => {
      item.open = item.id === titleId
    })
  }

  function setLegendCurrent(legend: any) {
    legendCurrent.value = {
      title: legend?.title,
      img: legend?.img,
      list: legend?.list,
    }
  }

  function resetLegend() {
    legendCurrent.value = {
      title: '',
      list: [],
      img: '',
    }
  }

  function setCesiumEarthComAction(name: any, on_off: any) {
    let effective = false
    if (typeof name === "string" && typeof on_off === "number") {
      for (let i = 0; i < comActions.value.length; i++) {
        if (comActions.value[i]?.comName === name) {
          comActions.value[i]!.open = on_off === 1 ? true : on_off === 2 ? false : !comActions.value[i]?.open
          effective = true
          break
        }
      }
    }
    comActions.value = JSON.parse(JSON.stringify(comActions.value))
    if (!effective) console.log("无法识别的组件：", name)
  }

  function setItemInTool({ comName, show }: { comName: string; show: boolean }) {
    for (let i = 0; i < comActions.value.length; i++) {
      if (comActions.value[i]?.comName === comName) {
        comActions.value[i]!.show = show
        saveComStatus(comActions.value)
        break
      }
    }
  }

  function saveComStatus(state: any) {
    let cloneComActions = JSON.parse(JSON.stringify(state))
    cloneComActions.map((e: any) => {
      e.open = false
      return e
    })
    localStorage.setItem(
      "CesiumConfig",
      JSON.stringify({
        Version: CesiumEarth.ConfigTool.config.Version,
        comActions: cloneComActions,
      })
    )
  }

  return {
    useName,
    demoModel,
    themeColor,
    titleHeader,
    legendCurrent,
    legendCollection,
    comActions,
    comStatus,
    titleHeaderCurrent,
    loadUIConfig,
    setUserName,
    setThemeColor,
    setTitleHeaderCurrent,
    setLegendCurrent,
    resetLegend,
    setCesiumEarthComAction,
    setItemInTool,
  }
})
