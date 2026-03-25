'use client';

export default function JoinAdventureButton({
  className,
}: {
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        const next =
          typeof window !== 'undefined'
            ? `${window.location.pathname}${window.location.search}`
            : '/';
        window.dispatchEvent(
          new CustomEvent('open-register', {
            detail: { next },
          })
        );
      }}
    >
      Join Adventure
    </button>
  );
}

