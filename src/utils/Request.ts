
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/User' //用户状态  
import axios, { type AxiosRequestConfig, type AxiosInstance, type AxiosResponse } from 'axios'

// 基础配置
interface RequestConfig extends AxiosRequestConfig {
    /** 是否显示 loading（全局） */
    loading?: boolean
    /** 是否跳过错误提示（默认会提示） */
    silent?: boolean
    /** 是否跳过登录拦截 */
    noAuth?: boolean
}

class Request {
    private instance: AxiosInstance

    constructor() {
        this.instance = axios.create({
            baseURL: import.meta.env.VITE_API_BASE || '/api',
            timeout: 12000,
            headers: {
                'Content-Type': 'application/json',
            },
        })
        this.initInterceptors()
    }

    private initInterceptors() {
        // 请求拦截器
        this.instance.interceptors.request.use(
            (config) => {
                const userStore = useUserStore()
                const token = userStore.token
                //token
                if (token && !config.headers.Authorization) {
                    config.headers.Authorization = `Bearer ${token}`
                }
                return config
            },
            (error) => {
                return Promise.reject(error)
            },
        )

        // 响应拦截器
        this.instance.interceptors.response.use(
            (response: AxiosResponse) => {
                const { data, config } = response
                // 后端返回格式 { code: 200, data: any, msg: string }
                if (data.code === 200 || data.msg === "操作成功") {
                    return data.data ?? data
                }
                // 业务错误处理
                const msg = data.msg || '请求失败'
                if (!(config as RequestConfig).silent) {
                    ElMessage.error(msg)
                }
                return Promise.reject(new Error(msg))
            },
            (error) => {
                const config = error.config as RequestConfig
                // 网络错误 / 超时 / 500 等
                let message = '网络异常，请稍后重试'

                if (error.code === 'ECONNABORTED') message = '请求超时'
                if (!error.response) {
                    message = '网络连接失败'
                } else {
                    switch (error.response.status) {
                        case 401:
                            if (!config.noAuth) {
                                this.handleUnauthorized()
                            }
                            message = '登录已过期，请重新登录'
                            break
                        case 403:
                            message = '无权限访问'
                            break
                        case 404:
                            message = '接口不存在'
                            break
                        case 500:
                            message = '服务器错误'
                            break
                    }
                }
                if (!config.silent) {
                    ElMessage.error(message)
                }
                return Promise.reject(error)
            },
        )
    }

    // 401 处理：跳转登录
    private handleUnauthorized() {
        const userStore = useUserStore()
        userStore.logout()
        ElMessageBox.alert('登录状态已过期，请重新登录', '提示', {
            type: 'warning',
            callback: () => {
                // 跳转登录页
                window.location.href = '/login'
                // 或使用 router: router.push('/login')
            },
        })
    }

    // ==================== 常用方法 ====================
    get<T = any>(url: string, config?: RequestConfig): Promise<T> {
        return this.instance.get(url, config)
    }

    post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
        return this.instance.post(url, data, config)
    }

    put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
        return this.instance.put(url, data, config)
    }

    delete<T = any>(url: string, config?: RequestConfig): Promise<T> {
        return this.instance.delete(url, config)
    }

    // 文件上传
    upload(file: File, config?: RequestConfig) {
        const formData = new FormData()
        formData.append('file', file)
        return this.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            ...config,
        })
    }
}

// 单例导出
export const request = new Request()
