export interface AppIconItem {
  id: string;
  name: string;
  imageUrl: string;
  iosIconName: string | null;
}

export const DEFAULT_ICON_ID = 'add-horse';

export const APP_ICON_CONFIG: AppIconItem[] = [
  {
    id: 'add-horse',
    name: 'Add Horse',
    imageUrl: 'https://i.ibb.co/cShJjFXX/add-horse-fab.png',
    iosIconName: 'HorseIcon',
  },
  {
    id: 'plus-circle',
    name: 'Plus Circle',
    imageUrl: 'https://i.ibb.co/rCCrjRF/plus-circle.png',
    iosIconName: 'PlusIcon',
  },
];
