/** The WhoopNess wordmark as one robust unit (colored half is inline-block so it can't reflow). */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      Whoop<span className="inline-block text-primary-400">Ness</span>
    </span>
  );
}
