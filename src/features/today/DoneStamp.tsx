import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

/** Neo-brutalist "Done!" stamp shown on a checked row (docs/04 check-off path). */
export function DoneStamp() {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none rounded-sm border-thick border-success bg-paper px-2 py-0.5 text-sm font-bold uppercase tracking-wide text-success"
      initial={reduceMotion ? { opacity: 0, rotate: -12 } : { opacity: 0, scale: 2.2, rotate: -28 }}
      animate={reduceMotion ? { opacity: 1, rotate: -12 } : { opacity: 1, scale: 1, rotate: -12 }}
      exit={{ opacity: 0 }}
      transition={
        reduceMotion
          ? { duration: 0.15 }
          : { type: 'spring', stiffness: 520, damping: 22, mass: 0.7 }
      }
    >
      {t('today.doneStamp')}
    </motion.span>
  )
}
