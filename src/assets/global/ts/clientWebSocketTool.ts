

export type WSRole = string;
export type WSInstruct = string;

export interface WSMessage<T = unknown> {
  role: WSRole;
  token: string;
  instruct: WSInstruct;
  data: T;
}

// 服务器推送回来的 JSON 结构不确定，所以先 unknown，交给业务侧自己断言
export interface WSListenPayload {
  key: string;
  data: unknown;
}

export type WSListener = (payload: WSListenPayload) => void;

export interface ClientWebSocketTool {
  ws: WebSocket | null;
  listenMap: Map<string, WSListener>;

  connect(url: string): void;
  addListen(mark: string, func: WSListener): void;
  send(json: unknown): Promise<void>;
  close(): void;
}

const clientWebSocketTool: ClientWebSocketTool = {
  ws: null, // 只允许一个客户端连接
  listenMap: new Map<string, WSListener>(),

  connect(url: string) {
    if (!url) {
      console.log("url未配置，无法建立WebSocket连接");
      return;
    }

    this.ws = new WebSocket(`ws://${url}`);

    this.ws.onopen = (e: Event) => {
      console.log("服务器连接成功");
      const message: WSMessage = {
        role: "客户端",
        token: "64bfc9fcd702c537841292a41b2789f2",
        instruct: "连接申请",
        data: {},
      };
      // this.send(message);
    };

    this.ws.onclose = (e: CloseEvent) => console.log("服务器连接断开", e);
    this.ws.onerror = (e: Event) => console.log("连接出错", e);

    this.ws.onmessage = (e: MessageEvent) => {
      console.log("服务器推送消息：", e.data);

      // 这里 e.data 可能是 string / Blob / ArrayBuffer
      // 你原代码默认 string，这里做个更稳的处理
      const text =
        typeof e.data === "string"
          ? e.data
          : e.data instanceof Blob
            ? undefined
            : e.data instanceof ArrayBuffer
              ? new TextDecoder().decode(e.data)
              : undefined;

      if (!text) {
        console.log("收到非文本消息，已忽略：", e.data);
        return;
      }

      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch (err) {
        console.log("消息JSON解析失败：", err, text);
        return;
      }

      let hasListener = false;
      for (const [key, func] of this.listenMap) {
        if (typeof func === "function") {
          hasListener = true;
          func({ key, data: json });
        }
      }

      if (!hasListener) console.log("服务器推送消息：", json);
    };
  },

  // 添加监听，监听后台传给客户端的数据
  addListen(mark, func) {
    this.listenMap.set(mark, func);
  },

  // 发送消息
  async send(json) {
    if (!this.ws) throw new Error("WebSocket未连接，无法发送");
    if (this.ws.readyState !== WebSocket.OPEN) {
      throw new Error(`WebSocket未处于OPEN状态，readyState=${this.ws.readyState}`);
    }
    this.ws.send(JSON.stringify(json));
  },

  close() {
    if (!this.ws) return;
    this.ws.close();
    this.ws = null;
  },
};

export default clientWebSocketTool;
