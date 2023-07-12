import { Link as RouterLink, NavLink as RouterNavLink } from '@remix-run/react';
import { Link } from 'react-aria-components';
import LogoImage from '~/assets/logo.svg';
import { useOptionalUser } from '~/utils/user';

const navItems = [
  { label: 'Tabelle', viewSegment: 'tabelle' },
  { label: 'Spieler', viewSegment: 'tipps/spieler' },
  { label: 'Spiele', viewSegment: 'tipps/spiele' },
];

export function Header() {
  const user = useOptionalUser();
  return (
    <header className="h-16 border-b px-1">
      {/* Desktop Nav */}
      <div className="flex h-full items-center gap-x-1">
        <nav className="flex grow items-center justify-between">
          <Link className="flex">
            <RouterLink to="/">
              <div className="flex shrink-0 items-center pr-1">
                <svg className="h-12 w-12 fill-current">
                  <use href={`${LogoImage}#logo`} />
                </svg>
                <span>runde.tips</span>
              </div>
            </RouterLink>
          </Link>
          <div className="flex gap-x-1">
            {navItems.map((item, ix) => (
              <Link key={ix} className="px-1">
                <RouterNavLink to={item.viewSegment}>
                  {item.label}
                </RouterNavLink>
              </Link>
            ))}
            <Link className="px-1">
              {user ? (
                <RouterLink to="/manager">Manager</RouterLink>
              ) : (
                <RouterNavLink to="/login">Log in</RouterNavLink>
              )}
            </Link>
          </div>
        </nav>
        <div>
          {/* Action Buttons: User-Menu(?) Theme-Wechsel, Chat-Icon(?), Turnier-Suche(?) */}
        </div>
      </div>
      {/* Mobile Nav */}
      <div className="flex sm:hidden"></div>
    </header>
  );
}
