import { createBrowserCore } from '../index.js';

const mount = ({
  windowRef = globalThis.window,
  documentRef = windowRef?.document ?? globalThis.document,
  URLImpl = windowRef?.URL ?? globalThis.URL,
  AbortControllerImpl = windowRef?.AbortController ?? globalThis.AbortController,
  setTimeoutImpl = windowRef?.setTimeout ?? globalThis.setTimeout,
  clearTimeoutImpl = windowRef?.clearTimeout ?? globalThis.clearTimeout,
  fetchImpl = windowRef?.fetch ?? globalThis.fetch
} = {}) => createBrowserCore({
  windowRef,
  documentRef,
  URLImpl,
  AbortControllerImpl,
  setTimeoutImpl,
  clearTimeoutImpl,
  fetchImpl,
  exposeConversionGlobals: true,
  exposeDownloadGlobals: true
});

export { mount };
export default mount;
