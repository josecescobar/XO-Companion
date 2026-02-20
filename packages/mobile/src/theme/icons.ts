import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Centralized icon map — replaces emoji usage throughout the app */
export const icons = {
  // Tab bar
  home: 'home' as IoniconName,
  homeOutline: 'home-outline' as IoniconName,
  projects: 'folder' as IoniconName,
  projectsOutline: 'folder-outline' as IoniconName,
  record: 'mic' as IoniconName,
  recordOutline: 'mic-outline' as IoniconName,
  reviews: 'checkmark-circle' as IoniconName,
  reviewsOutline: 'checkmark-circle-outline' as IoniconName,
  account: 'person' as IoniconName,
  accountOutline: 'person-outline' as IoniconName,

  // Quick actions & features
  newLog: 'document-text' as IoniconName,
  incident: 'shield-checkmark' as IoniconName,
  ai: 'sparkles' as IoniconName,
  search: 'search' as IoniconName,
  camera: 'camera' as IoniconName,
  upload: 'cloud-upload' as IoniconName,
  send: 'send' as IoniconName,
  chat: 'chatbubbles' as IoniconName,

  // Status & state
  empty: 'file-tray-outline' as IoniconName,
  loading: 'hourglass' as IoniconName,
  check: 'checkmark' as IoniconName,
  checkCircle: 'checkmark-circle' as IoniconName,
  close: 'close' as IoniconName,
  warning: 'warning' as IoniconName,
  error: 'alert-circle' as IoniconName,
  info: 'information-circle' as IoniconName,

  // Navigation & actions
  chevronRight: 'chevron-forward' as IoniconName,
  chevronDown: 'chevron-down' as IoniconName,
  chevronBack: 'chevron-back' as IoniconName,
  add: 'add' as IoniconName,
  edit: 'create' as IoniconName,
  trash: 'trash' as IoniconName,
  share: 'share' as IoniconName,
  copy: 'copy' as IoniconName,
  settings: 'settings' as IoniconName,
  logout: 'log-out' as IoniconName,
  moon: 'moon' as IoniconName,
  sunny: 'sunny' as IoniconName,

  // Domain-specific
  construction: 'construct' as IoniconName,
  calendar: 'calendar' as IoniconName,
  time: 'time' as IoniconName,
  people: 'people' as IoniconName,
  document: 'document' as IoniconName,
  analytics: 'bar-chart' as IoniconName,
  location: 'location' as IoniconName,
  mail: 'mail' as IoniconName,
  call: 'call' as IoniconName,
  text: 'chatbubble' as IoniconName,
  refresh: 'refresh' as IoniconName,
  flag: 'flag' as IoniconName,
  eye: 'eye' as IoniconName,
  lock: 'lock-closed' as IoniconName,
  clipboard: 'clipboard' as IoniconName,
} as const;
