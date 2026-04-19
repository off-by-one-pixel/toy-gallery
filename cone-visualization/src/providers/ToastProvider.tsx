'use client';

// Exists solely to cross the server/client boundary: HeroUI is client-only,
// but layout.tsx is a server component and can't import it directly.

import { Toast } from '@heroui/react';

export function ToastProvider() {
  return <Toast.Provider placement="top" />;
}
