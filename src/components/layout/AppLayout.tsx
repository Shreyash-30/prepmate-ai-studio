import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background selection:bg-primary/20">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <AppHeader />
        <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/20 scroll-smooth">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="p-6 md:p-8 max-w-7xl mx-auto w-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
