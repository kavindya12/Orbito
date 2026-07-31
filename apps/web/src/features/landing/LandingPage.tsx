import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Kanban, Sparkles, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrbitoLogo } from '@/components/layout/Logo';

const features = [
  { icon: Kanban, title: 'Kanban Boards', desc: 'Drag-and-drop task management with real-time sync' },
  { icon: Sparkles, title: 'AI Assistant', desc: 'Break down tasks, prioritize work, and assess project health' },
  { icon: Users, title: 'Team Collaboration', desc: 'Invite members, assign tasks, and track progress together' },
  { icon: Zap, title: 'Smart Insights', desc: 'Dashboard analytics and productivity trends at a glance' },
];

export function LandingPage() {
  return (
    <div className="h-dvh overflow-y-auto bg-[var(--background)] text-[var(--text)]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <OrbitoLogo size={32} />
            <span className="text-xl font-bold">Orbito</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link to="/register">
              <Button variant="gradient">Start Free</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-20 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute right-0 top-40 h-[300px] w-[300px] rounded-full bg-secondary/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-[250px] w-[250px] rounded-full bg-accent/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-8 flex justify-center"
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border border-dashed border-primary/30"
                style={{ width: 120, height: 120, top: -20, left: -20 }}
              />
              <OrbitoLogo size={80} />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl"
          >
            Project management that{' '}
            <span className="ai-gradient-text">orbits around you</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-[var(--muted)]"
          >
            Orbito brings together kanban boards, calendar views, team collaboration, and AI-powered
            insights - all in one beautiful workspace.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Link to="/register">
              <Button size="lg" variant="gradient" className="gap-2">
                Start Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
                View Demo
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="glass rounded-[16px] p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[12px] bg-primary/15">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--border)] py-8 text-center text-sm text-[var(--muted)]">
        © {new Date().getFullYear()} Orbito. Built for teams that move fast.
      </footer>
    </div>
  );
}
