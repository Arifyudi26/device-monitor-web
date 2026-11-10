/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import NotificationDropdown from "@components/header/NotificationDropdown";
import UserDropdown from "@components/header/UserDropdown";

const AppHeader: React.FC = () => {
  return (
    <header className="sticky top-0 flex w-full bg-white border-b border-gray-200 z-50 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between w-full px-4 py-3 lg:px-6">
        {/* Logo */}
        <Link href="/">
          <img
            className="dark:hidden"
            src="/images/logo/logo.svg"
            alt="Logo"
            width={150}
            height={40}
          />
          <img
            className="hidden dark:block"
            src="/images/logo/logo-dark.svg"
            alt="Logo"
            width={150}
            height={40}
          />
        </Link>

        {/* Right side: notifications + user */}
        <div className="flex items-center gap-3">
          <NotificationDropdown />
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
