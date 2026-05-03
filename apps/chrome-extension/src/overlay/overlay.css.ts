// All overlay styles, inlined into the shadow root. Kept in a .ts file so the
// build picks it up automatically without needing web_accessible_resources.
export const overlayCss = `
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

`;
