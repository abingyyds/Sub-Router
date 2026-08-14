import{p as l,u as r,j as s,L as n}from"./index-hVLV_ZWo.js";/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c=[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]],i=l("rotate-ccw",c);function p({active:a}){const{t}=r(),o=[{key:"logs",to:"/logs",label:t("logs.callLogs")},{key:"tasks",to:"/tasks",label:t("tasks.title")}];return s.jsx("div",{className:"mb-6 flex justify-center",children:s.jsx("div",{className:"inline-flex rounded-full border border-page-divider bg-page-surface p-1 shadow-sm",children:o.map(e=>s.jsx(n,{to:e.to,className:`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${a===e.key?"bg-brand-600 text-white":"text-page-muted hover:bg-page-surface-hover hover:text-page"}`,children:e.label},e.key))})})}export{p as L,i as R};
