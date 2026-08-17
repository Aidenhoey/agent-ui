/**
 * lib/icons.tsx —— 文档站壳层（DocsShell）用的图标集。
 *
 * portal 不直接依赖 lucide-react（复刻约束：不新增 npm 依赖；lucide-react 仅是
 * @diribo/agent-ui 的依赖，pnpm 隔离下应用层无法解析）。本文件的 SVG 节点数据
 * 提取自 workspace 内已安装的 lucide-react v1.31.0（ISC License），组件 API
 * 对齐 lucide-react 渲染输出（24×24 stroke 图标，className/aria 属性透传）。
 */

import { createElement, type SVGProps } from "react";

type IconNode = Array<[string, Record<string, string>]>;

export interface LucideIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

function createIcon(iconNode: IconNode) {
  return function LucideIcon({ size = 24, className, ...props }: LucideIconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
      >
        {iconNode.map(([tag, attrs], index) => createElement(tag, { ...attrs, key: index }))}
      </svg>
    );
  };
}

/* landing / docs 页面用图标（同源 lucide-react v1.31.0 节点数据）。 */
export const ArrowRight = createIcon([["path",{"d":"M5 12h14"}],["path",{"d":"m12 5 7 7-7 7"}]]);
export const Languages = createIcon([["path",{"d":"m5 8 6 6"}],["path",{"d":"m4 14 6-6 2-3"}],["path",{"d":"M2 5h12"}],["path",{"d":"M7 2h1"}],["path",{"d":"m22 22-5-10-5 10"}],["path",{"d":"M14 18h6"}]]);
export const Layers = createIcon([["path",{"d":"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"}],["path",{"d":"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"}],["path",{"d":"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"}]]);
export const Menu = createIcon([["line",{"x1":"4","x2":"20","y1":"6","y2":"6"}],["line",{"x1":"4","x2":"20","y1":"12","y2":"12"}],["line",{"x1":"4","x2":"20","y1":"18","y2":"18"}]]);
export const Monitor = createIcon([["rect",{"width":"20","height":"14","x":"2","y":"3","rx":"2"}],["line",{"x1":"8","x2":"16","y1":"21","y2":"21"}],["line",{"x1":"12","x2":"12","y1":"17","y2":"21"}]]);
export const Moon = createIcon([["path",{"d":"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"}]]);
export const RotateCcw = createIcon([["path",{"d":"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"}],["path",{"d":"M3 3v5h5"}]]);
export const Sun = createIcon([["circle",{"cx":"12","cy":"12","r":"4"}],["path",{"d":"M12 2v2"}],["path",{"d":"M12 20v2"}],["path",{"d":"m4.93 4.93 1.41 1.41"}],["path",{"d":"m17.66 17.66 1.41 1.41"}],["path",{"d":"M2 12h2"}],["path",{"d":"M20 12h2"}],["path",{"d":"m6.34 17.66-1.41 1.41"}],["path",{"d":"m19.07 4.93-1.41 1.41"}]]);
export const Workflow = createIcon([["rect",{"width":"8","height":"8","x":"3","y":"3","rx":"2"}],["path",{"d":"M7 11v4a2 2 0 0 0 2 2h4"}],["rect",{"width":"8","height":"8","x":"13","y":"13","rx":"2"}]]);
export const X = createIcon([["path",{"d":"M18 6 6 18"}],["path",{"d":"m6 6 12 12"}]]);
