import { useEffect, useRef } from 'react';

interface AboutDialogProps {
  contentParagraphs: string[];
  open: boolean;
  title: string;
  onClose: () => void;
}

const AboutDialog = ({ contentParagraphs, open, title, onClose }: AboutDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    const dialog = dialogRef.current;
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog) return undefined;

    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };

    dialog.addEventListener('cancel', handleCancel);
    if (!dialog.open) dialog.showModal();

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      if (dialog.open) dialog.close();
      previouslyFocusedElement?.focus({ preventScroll: true });
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-0 h-dvh max-h-none w-dvw max-w-none border-0 bg-transparent p-0 text-black"
      aria-labelledby="about-dialog-title"
      aria-describedby="about-dialog-description"
      aria-modal="true"
    >
      <div className="flex h-full min-h-dvh items-stretch bg-black/50 sm:items-center sm:justify-center">
        <button
          className="absolute inset-0 hidden cursor-default sm:block"
          type="button"
          aria-label="Close about dialog backdrop"
          onClick={onClose}
        />
        <section className="relative h-dvh max-h-dvh w-full overflow-y-auto bg-white p-4 shadow-2xl sm:h-auto sm:max-h-[90dvh] sm:w-150 sm:rounded-[20px] sm:p-8">
          <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex items-start justify-between gap-4 bg-white px-4 pt-4 pb-2 sm:static sm:mx-0 sm:mt-0 sm:p-0">
            <h2 id="about-dialog-title" className="m-0 text-[1.75rem] font-semibold sm:text-[2rem]">
              {title}
            </h2>
            <button
              className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950"
              type="button"
              aria-label="Close dialog"
              onClick={onClose}
            >
              <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                />
              </svg>
            </button>
          </div>
          <article
            id="about-dialog-description"
            className="space-y-4 text-justify text-base leading-7 sm:text-lg"
          >
            {contentParagraphs.map((paragraph) => (
              <p key={paragraph} className="m-0 hyphens-auto">
                {paragraph}
              </p>
            ))}
          </article>
        </section>
      </div>
    </dialog>
  );
};

export default AboutDialog;
