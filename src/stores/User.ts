import { ref } from 'vue'
import { defineStore } from 'pinia'
import { request } from '@/utils/Request';
interface LoginRes {
    token: string
    refreshToken?: string
    user: UserInfo
    expiresIn?: number // 秒
}
interface UserInfo {
    id: number
    name: string
    avatar?: string
    roles: string[]
}
export const useUserStore = defineStore('User', () => {
    const token = ref<string>()
    const refreshToken = ref<string>('')
    const userInfo = ref<UserInfo | null>(null)
    function logout() {
        console.log("logout");
    }
    const login = async (username: string, password: string) => {
        try {
            const res = await request.post<LoginRes>('/auth/login', {
                username,
                password,
            })
            token.value = res.token
            userInfo.value = res.user
            persist() // 保存到本地
            return true
        } catch (err) {
            return false
        }
    }
    // ==================== 持久化 ====================
    const persist = () => {
        localStorage.setItem('user-store', JSON.stringify({
            token: token.value,
            refreshToken: refreshToken.value,
            userInfo: userInfo.value,
        }))
    }
    const clear = () => {
        localStorage.removeItem('user-store')
    }
    return { token, login, logout }
})
