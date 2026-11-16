import type { Router, RouteRecordRaw } from 'vue-router';

/** Also remove saved root children, which generateAccess re-registers on refresh. */
export function removeAccessRoutes(router: Router, routes: RouteRecordRaw[]) {
  const names = new Set(routes.map((route) => route.name).filter(Boolean));
  const root = router.getRoutes().find((route) => route.path === '/');
  if (root) {
    root.children = root.children.filter((route) => !names.has(route.name));
  }
  for (const name of names) {
    if (name && router.hasRoute(name)) router.removeRoute(name);
  }
}
