'use client';

import { usePasswordModalNav } from '../hooks/nav/usePasswordModalNav';
import ChangePasswordModal from './ChangePasswordModal';

/** Modals that live above any page in the (app) route group. Wrapped in
 *  Suspense by the layout so the search-param read doesn't fail static
 *  prerender. */
export default function GlobalModals() {
  const password = usePasswordModalNav();
  return password.isOpen ? <ChangePasswordModal onClose={password.close} /> : null;
}
