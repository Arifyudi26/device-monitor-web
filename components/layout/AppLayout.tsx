import AppHeader from "./AppHeader";
import type { LayoutProps } from "@/lib/types/components";

const AppLayout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <AppHeader />
      <main className="flex-1 p-4 mx-auto w-full max-w-screen-2xl sm:p-6">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
