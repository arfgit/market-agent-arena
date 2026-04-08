import { motion } from 'framer-motion'
import Dashboard from '@/components/Dashboard/Dashboard'
import ScrollToTop from '@/components/ui/ScrollToTop'

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border/40 bg-bg-secondary/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-sm font-semibold tracking-tight">Market Agent Arena</span>
          </div>
          <span className="text-[10px] text-text-muted">Anthony Feliz</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">
            Strategy Competition
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-2xl leading-relaxed">
            Five approaches compete on real JPM stock data (2008-2011): a hand-crafted rule-based
            strategy, a decision tree, a random forest, a Q-learner, and a passive
            buy-and-hold benchmark. Trained in-sample, tested out-of-sample.
            {' '}
            <a href="https://anthonyfeliz.com/blog/ml4t" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              Read about the course that inspired this project
            </a>
          </p>
        </motion.div>

        <Dashboard />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <p className="text-[10px] text-text-muted">&copy; {new Date().getFullYear()} Anthony Feliz</p>
          <div className="flex items-center gap-3">
            <a href="https://anthonyfeliz.com" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-accent" aria-label="Portfolio">
              <GlobeIcon />
            </a>
            <a href="https://github.com/arfgit" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-accent" aria-label="GitHub">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z"/></svg>
            </a>
            <a href="https://linkedin.com/in/anthonyfeliz" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-accent" aria-label="LinkedIn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065Zm1.782 13.019H3.555V9h3.564v11.452ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003Z"/></svg>
            </a>
          </div>
        </div>
      </footer>

      <ScrollToTop />
    </div>
  )
}
