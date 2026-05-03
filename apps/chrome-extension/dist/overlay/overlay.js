var H="https://vayo.me/api",M="https://vayo.me";var P=`
:host {
  all: initial;
  display: block;
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  color-scheme: light dark;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.shell {
  width: 360px;
  background: var(--bg);
  color: var(--fg);
  border-radius: 18px;
  box-shadow: var(--custom-shadow);
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  animation: overlay-in 200ms ease-out both;

  --bg: #ffffff;
  --fg: #1a1a1a;
  --muted: #666;
  --muted-bg: #f3f3f3;
  --primary: #1a1a1a;
  --primary-fg: #ffffff;
  --destructive: #d4183d;
  --custom-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.03),
    inset 0 0 0 1px rgba(255, 255, 255, 0.03),
    0 0 0 1px rgba(0, 0, 0, 0.1), 0 2px 2px 0 rgba(0, 0, 0, 0.1),
    0 4px 4px 0 rgba(0, 0, 0, 0.1);
}

@media (prefers-color-scheme: dark) {
  .shell {
    --bg: #1a1a1a;
    --fg: #f5f5f5;
    --muted: #a3a3a3;
    --muted-bg: rgba(255, 255, 255, 0.06);
    --primary: #f5f5f5;
    --primary-fg: #1a1a1a;
    --destructive: #f87171;
    --custom-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.05),
      inset 0 0 0 1px rgba(255, 255, 255, 0.05),
      0 0 0 1px rgba(0, 0, 0, 0.4), 0 2px 2px 0 rgba(0, 0, 0, 0.3),
      0 4px 4px 0 rgba(0, 0, 0, 0.3);
  }
}

.shell.closing {
  animation: overlay-out 140ms ease-in both;
}

.shell.shell-content-in > * {
  animation: shell-content-in 220ms ease-out 100ms both;
}

@keyframes shell-content-in {
  from {
    opacity: 0;
    transform: translateY(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes overlay-in {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes overlay-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
}

.hidden {
  display: none !important;
}

.screen {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.spinner {
  width: 22px;
  height: 22px;
  border: 2.4px solid rgba(128, 128, 128, 0.2);
  border-top-color: var(--fg);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin: 28px auto;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.auth {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 22px 0 6px;
  text-align: center;
}

.auth h2 {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.page-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: var(--muted-bg);
  box-shadow: var(--custom-shadow);
  border-radius: 8px;
}

.favicon {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  flex-shrink: 0;
}

.page-meta {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.page-title {
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.page-url {
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.asset-preview {
  position: relative;
  display: flex;
  justify-content: center;
  padding: 8px;
  background: var(--muted-bg);
  box-shadow: var(--custom-shadow);
  border-radius: 8px;
  overflow: hidden;
}

.asset-preview img,
.asset-preview video {
  display: block;
  max-width: 100%;
  max-height: 160px;
  border-radius: 6px;
  object-fit: contain;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 12.5px;
  font-weight: 500;
}

.folder-select {
  position: relative;
  width: 100%;
}

.folder-select-trigger {
  appearance: none;
  background: var(--muted-bg);
  border: none;
  box-shadow: var(--custom-shadow);
  border-radius: 8px;
  height: 36px;
  width: 100%;
  padding: 0 12px;
  font-family: inherit;
  font-size: 13px;
  color: var(--fg);
  cursor: pointer;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.folder-select-label {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-select-icon {
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1;
}

.folder-select-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-select-chevron {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  color: var(--muted);
  transition: transform 0.15s ease;
}

.folder-select-trigger[aria-expanded="true"] .folder-select-chevron {
  transform: rotate(180deg);
}

.folder-select-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--bg);
  box-shadow: var(--custom-shadow);
  border-radius: 10px;
  padding: 4px;
  z-index: 10;
  max-height: 240px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1px;
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
  transform-origin: top center;
  pointer-events: none;
  transition: opacity 120ms ease-out, transform 120ms ease-out;
}

.folder-select-dropdown.open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.folder-select-item {
  appearance: none;
  background: transparent;
  border: none;
  border-radius: 6px;
  padding: 8px 10px;
  font-family: inherit;
  font-size: 13px;
  color: var(--fg);
  cursor: pointer;
  text-align: left;
  width: 100%;
  display: flex;
  align-items: center;
}

.folder-select-item:hover {
  background: var(--muted-bg);
}

.folder-select-item[aria-selected="true"] {
  background: var(--muted-bg);
}

.btn-primary,
.btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 14px;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  width: 100%;
  transition: opacity 0.15s, transform 0.1s;
}

.btn-primary {
  background: var(--primary);
  color: var(--primary-fg);
}

.btn-secondary {
  background: var(--muted-bg);
  color: var(--fg);
  box-shadow: var(--custom-shadow);
}

.btn-primary:hover,
.btn-secondary:hover {
  opacity: 0.9;
}

.btn-primary:active,
.btn-secondary:active {
  transform: scale(0.98);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  color: white;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.7);
}

.success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 0 12px;
  animation: success-in 240ms ease-out both;
}

@keyframes success-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.checkmark {
  width: 32px;
  height: 32px;
  color: var(--fg);
  animation: checkmark-pop 320ms cubic-bezier(0.34, 1.56, 0.64, 1) 60ms both;
}

@keyframes checkmark-pop {
  from {
    opacity: 0;
    transform: scale(0.4);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.checkmark polyline {
  stroke-dasharray: 32;
  stroke-dashoffset: 32;
  animation: checkmark-draw 280ms ease-out 200ms forwards;
}

@keyframes checkmark-draw {
  to {
    stroke-dashoffset: 0;
  }
}

.success-text {
  font-size: 14px;
  font-weight: 500;
  animation: success-text-in 240ms ease-out 280ms both;
}

@keyframes success-text-in {
  from {
    opacity: 0;
    transform: translateY(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.text-muted {
  font-size: 12.5px;
  color: var(--muted);
}

.text-destructive {
  font-size: 13px;
  color: var(--destructive);
  text-align: center;
}

.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 18px 0 8px;
}

.tweet-assets-grid {
  display: flex;
  flex-direction: row;
  padding-bottom: 4px;
  overflow-x: auto;
}

.asset-thumb-wrapper {
  position: relative;
  flex-shrink: 0;
  width: 72px;
}

.asset-thumb-wrapper + .asset-thumb-wrapper {
  margin-left: 6px;
}

.asset-thumb {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 6px;
  box-shadow: var(--custom-shadow);
  display: block;
}

.asset-thumb-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  color: white;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.asset-thumb-remove:hover {
  background: rgba(0, 0, 0, 0.7);
}

.video-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 9px;
  line-height: 1;
  padding: 2px 4px;
  border-radius: 3px;
  pointer-events: none;
}

`;var R="vayo-overlay-root",Q="lastFolder",k=null,N=null,x=null,d=null,X=!1,V=window;if(V.__vayoOverlayLoaded);else V.__vayoOverlayLoaded=!0,chrome.runtime.onMessage.addListener((a,t,i)=>{if(a?.type==="VAYO_OVERLAY_PING"){i({type:"VAYO_OVERLAY_PONG"});return}if(a?.type==="VAYO_OVERLAY_SHOW"){K(a.mode,!0);return}if(a?.type==="VAYO_OVERLAY_UPDATE"){K(a.mode,!1);return}});function A(a){if(!k)return;if(k.contains(a.target))return;q()}function T(a){if(a.key==="Escape"&&k)a.stopPropagation(),q()}function _(){if(X&&k&&N&&x)return;let a=document.getElementById(R);if(a)a.remove();k=document.createElement("div"),k.id=R,N=k.attachShadow({mode:"closed"});let t=document.createElement("style");t.textContent=P,N.appendChild(t),x=document.createElement("div"),x.className="shell",N.appendChild(x),document.documentElement.appendChild(k),X=!0,document.addEventListener("pointerdown",A,!0),document.addEventListener("keydown",T,!0)}function q(){if(!k){X=!1;return}document.removeEventListener("pointerdown",A,!0),document.removeEventListener("keydown",T,!0),x?.classList.add("closing");let a=k;setTimeout(()=>{a.remove()},140),k=null,N=null,x=null,X=!1}async function J(a){try{return await chrome.runtime.sendMessage({type:"VAYO_API",...a})??{success:!1,error:"no response"}}catch(t){return{success:!1,error:t instanceof Error?t.message:String(t)}}}function p(a,t){let i=document.createElement(a);if(t?.className)i.className=t.className;if(t?.text!=null)i.textContent=t.text;if(t?.attrs)for(let[n,u]of Object.entries(t.attrs))i.setAttribute(n,u);if(t?.children)for(let n of t.children)i.append(typeof n==="string"?document.createTextNode(n):n);return i}function v(){if(!x)return;x.innerHTML="",x.classList.remove("closing")}function I(){let a=p("button",{className:"close-btn",text:"×",attrs:{type:"button","aria-label":"Close"}});return a.addEventListener("click",()=>q()),a}function W(){if(!x)return;v();let a=p("div",{className:"spinner"});x.appendChild(a)}function O(){if(!x)return;v();let a=p("div",{className:"auth"});a.appendChild(p("h2",{text:"VAYØ"})),a.appendChild(p("p",{className:"text-muted",text:"Sign in to save bookmarks and assets."}));let t=p("button",{className:"btn-primary",text:"Sign in to VAYØ"});t.addEventListener("click",()=>{window.open(M,"_blank"),q()}),a.appendChild(t),x.appendChild(a)}function g(a){if(!x)return;v();let t=p("div",{className:"error"});t.appendChild(p("p",{className:"text-destructive",text:a}));let i=p("button",{className:"btn-secondary",text:"Close"});i.addEventListener("click",()=>q()),t.appendChild(i),x.appendChild(t)}function Z(a,t){if(!x||!a)return;let i=x,n=i.offsetHeight;if(!n||a===n)return;if(i.style.height=`${a}px`,i.style.overflow="hidden",i.style.transition="height 280ms ease",t?.fadeContent)i.classList.add("shell-content-in");requestAnimationFrame(()=>{i.style.height=`${n}px`});let u=(b)=>{if(b.propertyName!=="height")return;i.style.transition="",i.style.height="",i.style.overflow="",i.classList.remove("shell-content-in"),i.removeEventListener("transitionend",u)};i.addEventListener("transitionend",u)}function $(){if(!x)return;let a=x.offsetHeight;v();let t=p("div",{className:"success"}),i=document.createElementNS("http://www.w3.org/2000/svg","svg");i.setAttribute("class","checkmark"),i.setAttribute("viewBox","0 0 24 24"),i.setAttribute("fill","none"),i.setAttribute("stroke","currentColor"),i.setAttribute("stroke-width","2.5"),i.setAttribute("stroke-linecap","round"),i.setAttribute("stroke-linejoin","round");let n=document.createElementNS("http://www.w3.org/2000/svg","polyline");n.setAttribute("points","4 12 9 17 20 6"),i.appendChild(n),t.appendChild(i),t.appendChild(p("p",{className:"success-text",text:"Saved!"})),x.appendChild(t),Z(a),setTimeout(()=>q(),1200)}function G(a){let t=document.createElement("div");t.className="folder-select";let i=document.createElement("button");i.type="button",i.className="folder-select-trigger",i.setAttribute("aria-haspopup","listbox"),i.setAttribute("aria-expanded","false");let n=document.createElement("span");n.className="folder-select-label",i.appendChild(n);let u=document.createElement("span");u.className="folder-select-chevron",u.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>',i.appendChild(u),t.appendChild(i);let b=document.createElement("div");b.className="folder-select-dropdown",b.setAttribute("role","listbox"),t.appendChild(b);let y=a[0]?.id??"",r=!1,o=null;function m(c,f){if(c.replaceChildren(),!f)return;if(f.icon){let U=document.createElement("span");U.className="folder-select-icon",U.textContent=f.icon,c.appendChild(U)}let z=document.createElement("span");z.className="folder-select-name",z.textContent=f.name,c.appendChild(z)}function j(){let c=a.find((f)=>f.id===y);m(n,c);for(let f of b.children){let z=f,U=z.dataset.value===y;z.setAttribute("aria-selected",U?"true":"false")}}function s(){if(r)return;r=!0,i.setAttribute("aria-expanded","true"),b.classList.add("open"),o=new AbortController;let c=t.getRootNode();(c instanceof ShadowRoot?c:document).addEventListener("pointerdown",w,{capture:!0,signal:o.signal})}function Y(){if(!r)return;r=!1,i.setAttribute("aria-expanded","false"),b.classList.remove("open"),o?.abort(),o=null}function w(c){let f=c.target;if(!f||!t.contains(f))Y()}i.addEventListener("click",(c)=>{if(c.stopPropagation(),r)Y();else s()});for(let c of a){let f=document.createElement("button");f.type="button",f.className="folder-select-item",f.setAttribute("role","option"),f.dataset.value=c.id;let z=document.createElement("span");z.className="folder-select-label",f.appendChild(z),m(z,c),f.addEventListener("click",(U)=>{U.stopPropagation(),y=c.id,j(),Y()}),b.appendChild(f)}return Object.defineProperty(t,"value",{get(){return y},set(c){y=c,j()},configurable:!0}),j(),t}function h(){return new Promise((a)=>{chrome.storage.local.get(Q,(t)=>{let i=t?.[Q];a(typeof i==="string"?i:null)})})}async function D(a){if(!x)return;let t=x.offsetHeight;if(v(),!d){W();let o=await J({action:"getFolders"});if(!o.success){g("Failed to load folders.");return}if(d=o.data,!x)return;v()}if(d.length===0){g("No folders found. Create one in VAYØ first.");return}let i=p("div",{className:"page-info"});if(a.favIconUrl){let o=p("img",{className:"favicon",attrs:{src:a.favIconUrl,alt:""}});i.appendChild(o)}let n=p("div",{className:"page-meta"});n.appendChild(p("div",{className:"page-title",text:a.pageTitle||"Untitled"})),n.appendChild(p("div",{className:"page-url",text:a.pageUrl})),i.appendChild(n),x.appendChild(i);let u=p("div",{className:"field"}),b=G(d);b.id="vayo-folder",u.appendChild(b),x.appendChild(u);let y=await h();if(y&&d.some((o)=>o.id===y))b.value=y;let r=p("button",{className:"btn-primary",text:"Save"});r.addEventListener("click",async()=>{r.disabled=!0,r.textContent="Saving...";let o=b.value;if(!(await J({action:"createBookmark",url:a.pageUrl,folderId:o})).success){r.disabled=!1,r.textContent="Save",g("Failed to save bookmark.");return}chrome.storage.local.set({[Q]:o}),$()}),x.appendChild(r),Z(t,{fadeContent:!0})}async function B(a){if(!x)return;let t=x.offsetHeight;if(v(),!d){W();let r=await J({action:"getFolders"});if(!r.success){g("Failed to load folders.");return}if(d=r.data,!x)return;v()}if(d.length===0){g("No folders found. Create one in VAYØ first.");return}let i=p("div",{className:"asset-preview"});if(i.appendChild(I()),a.assetType==="video"){let r=p("video",{attrs:{src:a.url,autoplay:"",loop:"",muted:"",playsinline:""}});r.muted=!0,i.appendChild(r)}else i.appendChild(p("img",{attrs:{src:a.url,alt:"Preview"}}));x.appendChild(i);let n=p("div",{className:"field"}),u=G(d);u.id="vayo-folder",n.appendChild(u),x.appendChild(n);let b=await h();if(b&&d.some((r)=>r.id===b))u.value=b;let y=p("button",{className:"btn-primary",text:"Save"});y.addEventListener("click",async()=>{y.disabled=!0,y.textContent="Saving...";let r=u.value;if(!(await J({action:"createAsset",url:a.url,folderId:r,assetType:a.assetType})).success){y.disabled=!1,y.textContent="Save",g("Failed to save asset.");return}chrome.storage.local.set({[Q]:r}),$()}),x.appendChild(y),Z(t,{fadeContent:!0})}async function F(a){if(!x)return;if(a.state.status==="loading"){W();return}if(a.state.status==="error"){g(a.state.message);return}let t=x.offsetHeight;if(v(),!d){W();let m=await J({action:"getFolders"});if(!m.success){g("Failed to load folders.");return}if(d=m.data,!x)return;v()}if(d.length===0){g("No folders found. Create one in VAYØ first.");return}let i=a.state.assets.slice(),n=p("div",{className:"tweet-assets-grid"});x.appendChild(n);function u(){n.innerHTML="",i.forEach((m,j)=>{let s=p("div",{className:"asset-thumb-wrapper"}),Y=p("button",{className:"asset-thumb-remove",text:"×",attrs:{type:"button","aria-label":"Remove asset"}});if(Y.addEventListener("click",(w)=>{if(w.stopPropagation(),i=i.filter((c,f)=>f!==j),i.length===0){q();return}u()}),s.appendChild(Y),m.assetType==="video"){let w=p("video",{className:"asset-thumb",attrs:{src:m.url,muted:"",preload:"metadata"}});w.muted=!0,s.appendChild(w),s.appendChild(p("span",{className:"video-badge",text:"▶"}))}else s.appendChild(p("img",{className:"asset-thumb",attrs:{src:m.url}}));n.appendChild(s)})}u();let b=p("div",{className:"field"}),y=G(d);y.id="vayo-folder",b.appendChild(y),x.appendChild(b);let r=await h();if(r&&d.some((m)=>m.id===r))y.value=r;let o=p("button",{className:"btn-primary",text:"Save All"});x.appendChild(o),o.addEventListener("click",async()=>{if(i.length===0)return;o.disabled=!0,o.textContent="Saving...";let m=y.value,j=i.length;try{let s=0,Y=async()=>{while(s<j){let c=s++,f=await chrome.runtime.sendMessage({type:"SAVE_ASSET",url:i[c].url,folderId:m,assetType:i[c].assetType,reupload:!0});if(!f?.success)throw new Error(f?.error??"save failed")}},w=Math.min(4,j);await Promise.all(Array.from({length:w},Y)),chrome.storage.local.set({[Q]:m}),$()}catch{o.disabled=!1,o.textContent="Save All",g("Failed to save assets.")}}),Z(t,{fadeContent:!0})}async function K(a,t){if(_(),t){W();let i=await J({action:"getSession"});if(!i.success){g("Could not check sign-in status.");return}if(!i.data){O();return}}switch(a.kind){case"bookmark":await D(a);return;case"asset":await B(a);return;case"tweet-assets":await F(a);return}}
