export interface DemoItem {
  id: string;
  title: string;
  path: string;
  description?: string;
}

export interface DemoGroup {
  id: string;
  title: string;
  children: DemoNode[];
}

export type DemoNode = DemoItem | DemoGroup;

export const demoTree: DemoNode[] = [
  {
    id: "group-basics",
    title: "groups.basics",
    children: [
      {
        id: "basic",
        title: "demos.basic",
        description: "demos.basicDescription",
        path: "demos/basic/basic.html",
      },
      {
        id: "interaction",
        title: "demos.interaction",
        description: "demos.interactionDescription",
        path: "demos/basic/interaction.html",
      },
    ],
  },
];

// 目录使用树，按路由查找示例使用 Map
export const demoMap = new Map<string, DemoItem>();

function collectDemos(nodes: DemoNode[]) {
  for (const node of nodes) {
    if ("children" in node) {
      collectDemos(node.children);
    } else {
      demoMap.set(node.id, node);
    }
  }
}

collectDemos(demoTree);