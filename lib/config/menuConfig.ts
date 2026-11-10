export type NavSubItem = { key: string; name: string; path: string };

export type NavItemConfig = {
  key: string;
  name: string;
  path?: string;
  subItems?: NavSubItem[];
};

export const navItems: NavItemConfig[] = [
  {
    key: "monitor",
    name: "Device Monitor",
    path: "/",
  },
  {
    key: "contacts",
    name: "Contacts",
    path: "/contacts",
  },
];

export const othersItems: NavItemConfig[] = [];
