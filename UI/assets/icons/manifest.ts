export type IconCategory = 'actions' | 'entities' | 'navigation' | 'status';
export type IconStyle = 'filled' | 'multicolor' | 'outline' | 'rounded';

export type IconManifestEntry = {
  id: string;
  name: string;
  path: string;
  sourceUrl: string;
  originalName: string;
  license: string;
  addedAt: string;
  category: IconCategory;
  style: IconStyle;
};

export const iconManifest: IconManifestEntry[] = [
  {
    "addedAt": "2026-07-17",
    "category": "entities",
    "id": "account-user",
    "license": "CC0 License",
    "name": "account-user",
    "originalName": "User Account Profile",
    "path": "assets/icons/entities/account-user.svg",
    "sourceUrl": "https://www.svgrepo.com/svg/380123/user-account-profile",
    "style": "outline"
  },
  {
    "addedAt": "2026-07-14",
    "category": "navigation",
    "id": "close",
    "license": "CC0 License",
    "name": "close",
    "originalName": "Close SVG Vector",
    "path": "assets/icons/navigation/close.svg",
    "sourceUrl": "https://www.svgrepo.com/svg/522506/close",
    "style": "outline"
  },
  {
    "addedAt": "2026-07-15",
    "category": "navigation",
    "id": "dots-vertical",
    "license": "CC0 License",
    "name": "dots-vertical",
    "originalName": "Dots Vertical",
    "path": "assets/icons/navigation/dots-vertical.svg",
    "sourceUrl": "https://www.svgrepo.com/svg/470807/dots-vertical",
    "style": "outline"
  },
  {
    "addedAt": "2026-07-14",
    "category": "actions",
    "id": "drag-handle",
    "license": "CC0 License",
    "name": "drag-handle",
    "originalName": "Drag Handle SVG Vector",
    "path": "assets/icons/actions/drag-handle.svg",
    "sourceUrl": "https://www.svgrepo.com/svg/501539/drag-handle",
    "style": "outline"
  },
  {
    "addedAt": "2026-07-14",
    "category": "actions",
    "id": "edit-3",
    "license": "CC0 License",
    "name": "edit-3",
    "originalName": "Edit 3 SVG Vector",
    "path": "assets/icons/actions/edit-3.svg",
    "sourceUrl": "https://www.svgrepo.com/svg/522527/edit-3",
    "style": "outline"
  },
  {
    "addedAt": "2026-07-14",
    "category": "navigation",
    "id": "menu",
    "license": "CC0 License",
    "name": "menu",
    "originalName": "Menu SVG Vector",
    "path": "assets/icons/navigation/menu.svg",
    "sourceUrl": "https://www.svgrepo.com/svg/532195/menu",
    "style": "outline"
  },
  {
    "addedAt": "2026-07-14",
    "category": "navigation",
    "id": "menu-vertical",
    "license": "CC0 License",
    "name": "menu-vertical",
    "originalName": "Menu Vertical SVG Vector",
    "path": "assets/icons/navigation/menu-vertical.svg",
    "sourceUrl": "https://www.svgrepo.com/svg/506723/menu-vertical",
    "style": "outline"
  },
  {
    "addedAt": "2026-07-16",
    "category": "status",
    "id": "notification-attention",
    "license": "CC0 License",
    "name": "notification-attention",
    "originalName": "Notification Alarm Bell",
    "path": "assets/icons/status/notification-attention.svg",
    "sourceUrl": "https://www.svgrepo.com/svg/389783/notification-alarm-bell",
    "style": "filled"
  },
  {
    "addedAt": "2026-07-14",
    "category": "actions",
    "id": "plus",
    "license": "CC0 License",
    "name": "plus",
    "originalName": "Plus SVG Vector",
    "path": "assets/icons/actions/plus.svg",
    "sourceUrl": "https://www.svgrepo.com/svg/535579/plus",
    "style": "filled"
  },
  {
    "addedAt": "2026-07-14",
    "category": "entities",
    "id": "project-private",
    "license": "CC0 License",
    "name": "project-private",
    "originalName": "Lock",
    "path": "assets/icons/entities/project-private.svg",
    "sourceUrl": "https://www.svgrepo.com/svg/532320/lock",
    "style": "outline"
  },
  {
    "addedAt": "2026-07-14",
    "category": "entities",
    "id": "project-shared",
    "license": "CC0 License",
    "name": "project-shared",
    "originalName": "Users",
    "path": "assets/icons/entities/project-shared.svg",
    "sourceUrl": "https://www.svgrepo.com/svg/535714/users",
    "style": "outline"
  },
  {
    "addedAt": "2026-07-17",
    "category": "status",
    "id": "status-alert-circle",
    "license": "CC0 License",
    "name": "status-alert-circle",
    "originalName": "Alert Circle Outline",
    "path": "assets/icons/status/status-alert-circle.svg",
    "sourceUrl": "https://www.svgrepo.com/svg/326469/alert-circle-outline",
    "style": "outline"
  },
  {
    "addedAt": "2026-07-17",
    "category": "status",
    "id": "status-check-circle",
    "license": "CC0 License",
    "name": "status-check-circle",
    "originalName": "Checkmark Circle Outline",
    "path": "assets/icons/status/status-check-circle.svg",
    "sourceUrl": "https://www.svgrepo.com/svg/326558/checkmark-circle-outline",
    "style": "outline"
  },
  {
    "addedAt": "2026-07-17",
    "category": "status",
    "id": "status-cloud-off",
    "license": "CC0 License",
    "name": "status-cloud-off",
    "originalName": "Cloud Offline Outline",
    "path": "assets/icons/status/status-cloud-off.svg",
    "sourceUrl": "https://www.svgrepo.com/svg/326576/cloud-offline-outline",
    "style": "outline"
  },
  {
    "addedAt": "2026-07-17",
    "category": "status",
    "id": "status-sync",
    "license": "CC0 License",
    "name": "status-sync",
    "originalName": "Refresh Outline",
    "path": "assets/icons/status/status-sync.svg",
    "sourceUrl": "https://www.svgrepo.com/svg/326778/refresh-outline",
    "style": "outline"
  }
];

export default iconManifest;
