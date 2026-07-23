import { motion } from "framer-motion";
import { spring } from "../lib/motion";
import type { DockerContext } from "../types/docker";
import { ContextCard } from "./ContextCard";

interface ContextListProps {
  contexts: DockerContext[];
  loading: boolean;
  switching: string | null;
  onUse: (name: string) => void;
}

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: spring },
};

export function ContextList({ contexts, loading, switching, onUse }: ContextListProps) {
  if (loading && contexts.length === 0) {
    return (
      <div className="flex flex-col gap-3" aria-busy>
        {[0, 1, 2].map((i) => (
          <div key={i} className="glass h-[76px] animate-pulse rounded-2xl opacity-60" />
        ))}
      </div>
    );
  }

  if (contexts.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-sm text-white/40">
        No Docker contexts found. Add a remote SSH endpoint to get started.
      </div>
    );
  }

  return (
    <motion.ul
      variants={listVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-3"
    >
      {contexts.map((context) => (
        <motion.li key={context.name} variants={itemVariants} layout>
          <ContextCard
            context={context}
            isSwitching={switching === context.name}
            onUse={onUse}
          />
        </motion.li>
      ))}
    </motion.ul>
  );
}
