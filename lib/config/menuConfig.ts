export type NavSubItem = { key: string; name: string; path: string };

export type NavItemConfig = {
  key: string;
  name: string;
  path?: string;
  subItems?: NavSubItem[];
};

export const navItems: NavItemConfig[] = [
  {
    key: "dashboard",
    name: "Dashboard",
    path: "/",
  },
  {
    key: "monitor",
    name: "Device Monitor",
    path: "/monitor",
  },
];

export const othersItems: NavItemConfig[] = [];

export const ALL_MENUS = [...navItems, ...othersItems].flatMap((item) => {
  if (item.subItems) {
    return item.subItems.map((sub) => ({
      key: sub.key,
      name: sub.name,
      path: sub.path,
      groupKey: item.key,
      group: item.name,
    }));
  }
  return item.path
    ? [{ key: item.key, name: item.name, path: item.path, groupKey: item.key, group: item.name }]
    : [];
});
