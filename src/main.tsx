import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { FirebaseProvider } from './contexts/AuthContext';
import './index.css';

interface ErrorBoundaryState {
  error: Error | null;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[AppErrorBoundary]', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F6F3EC] p-6 text-[#1A2421]">
          <div className="w-full max-w-md rounded-lg border border-[#DDD6C7] bg-white p-6 space-y-4">
            <h1 className="font-serif text-lg font-bold text-[#152924]">
              畫面初始化發生異常
            </h1>
            <p className="text-xs leading-relaxed text-[#52605B]">
              系統偵測到未預期的畫面錯誤，可能是舊版快取資料或瀏覽器暫存衝突所導致。
            </p>
            <div className="rounded bg-[#FAF8F3] p-3 font-mono text-[11px] text-[#A63A2B] break-all">
              {this.state.error.message || 'Unknown render error'}
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-md bg-[#152924] px-4 py-2 text-xs font-medium text-[#FAF8F3] hover:bg-[#23433B]"
              >
                重新整理頁面
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    window.localStorage.removeItem('holistic_life_map_clients_v1');
                    window.sessionStorage.clear();
                  } catch {
                    // Ignore storage restrictions
                  }
                  window.location.reload();
                }}
                className="rounded-md border border-[#D4CCB9] bg-[#FAF8F3] px-4 py-2 text-xs font-medium text-[#152924] hover:bg-[#EFEAE0]"
              >
                清除快取並重試
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <FirebaseProvider>
      <App />
    </FirebaseProvider>
  </AppErrorBoundary>
);
