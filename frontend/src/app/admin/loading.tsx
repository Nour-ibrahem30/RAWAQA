'use client';

/**
 * Non-blocking indicator for admin route transitions.
 * Keeps the admin workspace responsive and fast when switching between tabs.
 */
export default function AdminLoading() {
  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none"
      style={{ height: '3px' }}
    >
      <div
        className="w-full h-full"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(210,181,106,0.2) 50%, transparent 100%)',
        }}
      />
      <div
        className="absolute top-0 h-full rounded-full"
        style={{
          background: 'linear-gradient(90deg, transparent, #D2B56A, #FFF5D6, #D2B56A, transparent)',
          boxShadow: '0 0 10px rgba(210,181,106,0.8), 0 0 20px rgba(210,181,106,0.4)',
          width: '50%',
          animation: 'adminLaser 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        }}
      />
      <style jsx>{`
        @keyframes adminLaser {
          0% {
            left: -50%;
          }
          100% {
            left: 100%;
          }
        }
      `}</style>
    </div>
  );
}
