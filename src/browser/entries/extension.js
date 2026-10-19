import { createBrowserCore } from '../index.js';

function bootstrapExtensionContent({
  windowRef = globalThis.window,
  documentRef = windowRef?.document ?? globalThis.document,
  URLImpl = windowRef?.URL ?? globalThis.URL,
  AbortControllerImpl = windowRef?.AbortController ?? globalThis.AbortController,
  setTimeoutImpl = windowRef?.setTimeout ?? globalThis.setTimeout,
  clearTimeoutImpl = windowRef?.clearTimeout ?? globalThis.clearTimeout,
  fetchImpl = windowRef?.fetch ?? globalThis.fetch
} = {}) {
  return createBrowserCore({
    windowRef,
    documentRef,
    URLImpl,
    AbortControllerImpl,
    setTimeoutImpl,
    clearTimeoutImpl,
    fetchImpl,
    exposeConversionGlobals: false,
    exposeDownloadGlobals: false
  });
}

function mount(options = {}) {
  return bootstrapExtensionContent(options);
}

export { bootstrapExtensionContent, mount };
export default mount;
