import type { RouteItem } from "./dashboard.constants.route-groups";

/** Choose the most specific accessible route, including its detail pages. */
export function getActiveRoute(pathname: string, routes: RouteItem[]) {
  return routes.reduce<RouteItem | undefined>((active, route) => {
    const matches = pathname === route.href ||
      (route.href !== "/dashboard" && pathname.startsWith(`${route.href}/`));

    return matches && (!active || route.href.length > active.href.length)
      ? route
      : active;
  }, undefined);
}

/** Match Persian labels even when Arabic letters or different spacing are used. */
export function normalizeNavigationSearch(value: string) {
  return value
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[\s\u200C\u200D]+/g, "")
    .toLocaleLowerCase();
}
