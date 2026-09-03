var L="https://vayo.me/api",V="https://vayo.me";var K=`
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

`;var A="vayo-overlay-root",W="lastFolder",Z=0;function w(i){return i!==Z||!t}var s=null,Q=null,t=null,g=null,$=!1,T=window;if(T.__vayoOverlayLoaded);else T.__vayoOverlayLoaded=!0,chrome.runtime.onMessage.addListener((i,x,a)=>{if(i?.type==="VAYO_OVERLAY_PING"){a({type:"VAYO_OVERLAY_PONG"});return}if(i?.type==="VAYO_OVERLAY_SHOW"){_(i.mode,!0);return}if(i?.type==="VAYO_OVERLAY_UPDATE"){_(i.mode,!1);return}});function I(i){if(!s)return;if(s.contains(i.target))return;h()}function O(i){if(i.key==="Escape"&&s)i.stopPropagation(),h()}function q(){if($&&s&&Q&&t)return;let i=document.getElementById(A);if(i)i.remove();s=document.createElement("div"),s.id=A,Q=s.attachShadow({mode:"closed"});let x=document.createElement("style");x.textContent=K,Q.appendChild(x),t=document.createElement("div"),t.className="shell",Q.appendChild(t),document.documentElement.appendChild(s),$=!0,document.addEventListener("pointerdown",I,!0),document.addEventListener("keydown",O,!0)}function h(){if(!s){$=!1;return}document.removeEventListener("pointerdown",I,!0),document.removeEventListener("keydown",O,!0),t?.classList.add("closing");let i=s;setTimeout(()=>{i.remove()},140),s=null,Q=null,t=null,$=!1}async function N(i){try{return await chrome.runtime.sendMessage({type:"VAYO_API",...i})??{success:!1,error:"no response"}}catch(x){return{success:!1,error:x instanceof Error?x.message:String(x)}}}function n(i,x){let a=document.createElement(i);if(x?.className)a.className=x.className;if(x?.text!=null)a.textContent=x.text;if(x?.attrs)for(let[p,y]of Object.entries(x.attrs))a.setAttribute(p,y);if(x?.children)for(let p of x.children)a.append(typeof p==="string"?document.createTextNode(p):p);return a}function j(){if(!t)return;t.innerHTML="",t.classList.remove("closing")}function D(){let i=n("button",{className:"close-btn",text:"×",attrs:{type:"button","aria-label":"Close"}});return i.addEventListener("click",()=>h()),i}function X(){if(!t)return;j();let i=n("div",{className:"spinner"});t.appendChild(i)}function B(){if(!t)return;j();let i=n("div",{className:"auth"});i.appendChild(n("h2",{text:"VAYØ"})),i.appendChild(n("p",{className:"text-muted",text:"Sign in to save bookmarks and assets."}));let x=n("button",{className:"btn-primary",text:"Sign in to VAYØ"});x.addEventListener("click",()=>{window.open(V,"_blank"),h()}),i.appendChild(x),t.appendChild(i)}function v(i){if(!t)return;j();let x=n("div",{className:"error"});x.appendChild(n("p",{className:"text-destructive",text:i}));let a=n("button",{className:"btn-secondary",text:"Close"});a.addEventListener("click",()=>h()),x.appendChild(a),t.appendChild(x)}function G(i,x){if(!t||!i)return;let a=t,p=a.offsetHeight;if(!p||i===p)return;if(a.style.height=`${i}px`,a.style.overflow="hidden",a.style.transition="height 280ms ease",x?.fadeContent)a.classList.add("shell-content-in");requestAnimationFrame(()=>{a.style.height=`${p}px`});let y=(b)=>{if(b.propertyName!=="height")return;a.style.transition="",a.style.height="",a.style.overflow="",a.classList.remove("shell-content-in"),a.removeEventListener("transitionend",y)};a.addEventListener("transitionend",y)}function P(){if(!t)return;let i=t.offsetHeight;j();let x=n("div",{className:"success"}),a=document.createElementNS("http://www.w3.org/2000/svg","svg");a.setAttribute("class","checkmark"),a.setAttribute("viewBox","0 0 24 24"),a.setAttribute("fill","none"),a.setAttribute("stroke","currentColor"),a.setAttribute("stroke-width","2.5"),a.setAttribute("stroke-linecap","round"),a.setAttribute("stroke-linejoin","round");let p=document.createElementNS("http://www.w3.org/2000/svg","polyline");p.setAttribute("points","4 12 9 17 20 6"),a.appendChild(p),x.appendChild(a),x.appendChild(n("p",{className:"success-text",text:"Saved!"})),t.appendChild(x),G(i),setTimeout(()=>h(),1200)}function M(i){let x=document.createElement("div");x.className="folder-select";let a=document.createElement("button");a.type="button",a.className="folder-select-trigger",a.setAttribute("aria-haspopup","listbox"),a.setAttribute("aria-expanded","false");let p=document.createElement("span");p.className="folder-select-label",a.appendChild(p);let y=document.createElement("span");y.className="folder-select-chevron",y.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>',a.appendChild(y),x.appendChild(a);let b=document.createElement("div");b.className="folder-select-dropdown",b.setAttribute("role","listbox"),x.appendChild(b);let m=i[0]?.id??"",r=!1,f=null;function u(o,c){if(o.replaceChildren(),!c)return;if(c.icon){let Y=document.createElement("span");Y.className="folder-select-icon",Y.textContent=c.icon,o.appendChild(Y)}let k=document.createElement("span");k.className="folder-select-name",k.textContent=c.name,o.appendChild(k)}function d(){let o=i.find((c)=>c.id===m);u(p,o);for(let c of b.children){let k=c,Y=k.dataset.value===m;k.setAttribute("aria-selected",Y?"true":"false")}}function U(){if(r)return;r=!0,a.setAttribute("aria-expanded","true"),b.classList.add("open"),f=new AbortController;let o=x.getRootNode();(o instanceof ShadowRoot?o:document).addEventListener("pointerdown",J,{capture:!0,signal:f.signal})}function z(){if(!r)return;r=!1,a.setAttribute("aria-expanded","false"),b.classList.remove("open"),f?.abort(),f=null}function J(o){let c=o.target;if(!c||!x.contains(c))z()}a.addEventListener("click",(o)=>{if(o.stopPropagation(),r)z();else U()});for(let o of i){let c=document.createElement("button");c.type="button",c.className="folder-select-item",c.setAttribute("role","option"),c.dataset.value=o.id;let k=document.createElement("span");k.className="folder-select-label",c.appendChild(k),u(k,o),c.addEventListener("click",(Y)=>{Y.stopPropagation(),m=o.id,d(),z()}),b.appendChild(c)}return Object.defineProperty(x,"value",{get(){return m},set(o){m=o,d()},configurable:!0}),d(),x}function R(){return new Promise((i)=>{chrome.storage.local.get(W,(x)=>{let a=x?.[W];i(typeof a==="string"?a:null)})})}async function F(i){if(!t)return;let x=Z,a=t.offsetHeight;if(j(),!g){X();let u=await N({action:"getFolders"});if(w(x))return;if(!u.success){v("Failed to load folders.");return}g=u.data,j()}if(g.length===0){v("No folders found. Create one in VAYØ first.");return}let p=n("div",{className:"page-info"});if(i.favIconUrl){let u=n("img",{className:"favicon",attrs:{src:i.favIconUrl,alt:""}});p.appendChild(u)}let y=n("div",{className:"page-meta"});y.appendChild(n("div",{className:"page-title",text:i.pageTitle||"Untitled"})),y.appendChild(n("div",{className:"page-url",text:i.pageUrl})),p.appendChild(y),t.appendChild(p);let b=n("div",{className:"field"}),m=M(g);m.id="vayo-folder",b.appendChild(m),t.appendChild(b);let r=await R();if(w(x))return;if(r&&g.some((u)=>u.id===r))m.value=r;let f=n("button",{className:"btn-primary",text:"Save"});f.addEventListener("click",async()=>{f.disabled=!0,f.textContent="Saving...";let u=m.value;if(!(await N({action:"createBookmark",url:i.pageUrl,folderId:u})).success){f.disabled=!1,f.textContent="Save",v("Failed to save bookmark.");return}chrome.storage.local.set({[W]:u}),P()}),t.appendChild(f),G(a,{fadeContent:!0})}async function H(i){if(!t)return;let x=Z,a=t.offsetHeight;if(j(),!g){X();let f=await N({action:"getFolders"});if(w(x))return;if(!f.success){v("Failed to load folders.");return}g=f.data,j()}if(g.length===0){v("No folders found. Create one in VAYØ first.");return}let p=n("div",{className:"asset-preview"});if(p.appendChild(D()),i.assetType==="video"){let f=n("video",{attrs:{src:i.url,autoplay:"",loop:"",muted:"",playsinline:""}});f.muted=!0,p.appendChild(f)}else p.appendChild(n("img",{attrs:{src:i.url,alt:"Preview"}}));t.appendChild(p);let y=n("div",{className:"field"}),b=M(g);b.id="vayo-folder",y.appendChild(b),t.appendChild(y);let m=await R();if(w(x))return;if(m&&g.some((f)=>f.id===m))b.value=m;let r=n("button",{className:"btn-primary",text:"Save"});r.addEventListener("click",async()=>{r.disabled=!0,r.textContent="Saving...";let f=b.value;if(!(await N({action:"createAsset",url:i.url,folderId:f,assetType:i.assetType})).success){r.disabled=!1,r.textContent="Save",v("Failed to save asset.");return}chrome.storage.local.set({[W]:f}),P()}),t.appendChild(r),G(a,{fadeContent:!0})}async function C(i){if(!t)return;if(i.state.status==="loading"){X();return}if(i.state.status==="error"){v(i.state.message);return}let x=Z,a=t.offsetHeight;if(j(),!g){X();let d=await N({action:"getFolders"});if(w(x))return;if(!d.success){v("Failed to load folders.");return}g=d.data,j()}if(g.length===0){v("No folders found. Create one in VAYØ first.");return}let p=i.state.assets.slice(),y=n("div",{className:"tweet-assets-grid"});t.appendChild(y);function b(){y.innerHTML="",p.forEach((d,U)=>{let z=n("div",{className:"asset-thumb-wrapper"}),J=n("button",{className:"asset-thumb-remove",text:"×",attrs:{type:"button","aria-label":"Remove asset"}});if(J.addEventListener("click",(o)=>{if(o.stopPropagation(),p=p.filter((c,k)=>k!==U),p.length===0){h();return}b()}),z.appendChild(J),d.assetType==="video"){let o=n("video",{className:"asset-thumb",attrs:{src:d.url,muted:"",preload:"metadata"}});o.muted=!0,z.appendChild(o),z.appendChild(n("span",{className:"video-badge",text:"▶"}))}else z.appendChild(n("img",{className:"asset-thumb",attrs:{src:d.url}}));y.appendChild(z)})}b();let m=n("div",{className:"field"}),r=M(g);r.id="vayo-folder",m.appendChild(r),t.appendChild(m);let f=await R();if(w(x))return;if(f&&g.some((d)=>d.id===f))r.value=f;let u=n("button",{className:"btn-primary",text:"Save All"});t.appendChild(u),u.addEventListener("click",async()=>{if(p.length===0)return;u.disabled=!0,u.textContent="Saving...";let d=r.value,U=p.length;try{let z=0,J=async()=>{while(z<U){let c=z++,k=await chrome.runtime.sendMessage({type:"SAVE_ASSET",url:p[c].url,folderId:d,assetType:p[c].assetType,reupload:!0});if(!k?.success)throw new Error(k?.error??"save failed")}},o=Math.min(4,U);await Promise.all(Array.from({length:o},J)),chrome.storage.local.set({[W]:d}),P()}catch{u.disabled=!1,u.textContent="Save All",v("Failed to save assets.")}}),G(a,{fadeContent:!0})}async function _(i,x){let a=++Z;if(q(),x){X();let p=await N({action:"getSession"});if(w(a))return;if(!p.success){v("Could not check sign-in status.");return}if(!p.data){B();return}}switch(i.kind){case"bookmark":await F(i);return;case"asset":await H(i);return;case"tweet-assets":await C(i);return}}
