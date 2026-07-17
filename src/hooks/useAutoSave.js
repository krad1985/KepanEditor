import { useEffect } from 'react';
import { STORAGE_KEYS } from '../constants/settings';

export const useAutoSave = (tree, settings, options = {}) => {
  const treeKey = options.treeKey || STORAGE_KEYS.AUTOSAVE;
  const settingsKey = options.settingsKey || STORAGE_KEYS.SETTINGS;

  useEffect(() => {
    try { localStorage.setItem(treeKey, JSON.stringify(tree)); } catch { /* noop */ }
  }, [tree, treeKey]);

  useEffect(() => {
    try { localStorage.setItem(settingsKey, JSON.stringify(settings)); } catch { /* noop */ }
  }, [settings, settingsKey]);
};
