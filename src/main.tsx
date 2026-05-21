import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { getCurrentWindow } from '@tauri-apps/api/window';
import App from './App.tsx';
import SettingsWindow from './SettingsWindow.tsx';
import './index.css';

document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

const resolveWindowLabel = () => {
  const urlLabel = new URLSearchParams(window.location.search).get('window');
  if (urlLabel === 'settings') {
    return 'settings';
  }

  try {
    return getCurrentWindow().label;
  } catch {
    return 'main';
  }
};

const RootComponent = resolveWindowLabel() === 'settings' ? SettingsWindow : App;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootComponent />
  </StrictMode>,
);
