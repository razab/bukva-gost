// Build and audit must agree on the exact offline-only additions.
export function offlineHTML(html) {
  return html.replace('<meta name="app-build"', '<meta name="offline-bundle" content="true"><link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="assets/icons/icon-180.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="app-build"');
}
