/**
 * React Router ile uyumlu: uygulama içi geçmiş veya tarayıcı geçmişinde geri var mı?
 * @returns {boolean}
 */
export function canBrowserGoBack() {
  const state = window.history.state;
  if (state && typeof state.idx === "number" && state.idx > 0) {
    return true;
  }
  return window.history.length > 1;
}
