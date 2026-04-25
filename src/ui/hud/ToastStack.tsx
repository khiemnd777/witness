import { useEffect } from "react";

type ToastStackProps = {
  messages: string[];
  onDismiss: (message: string) => void;
};

export function ToastStack({ messages, onDismiss }: ToastStackProps) {
  useEffect(() => {
    if (messages.length === 0) return;
    const timers = messages.map((message) =>
      window.setTimeout(() => onDismiss(message), 2600)
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [messages, onDismiss]);

  if (messages.length === 0) return null;

  return (
    <section className="toast-stack" aria-live="polite" aria-label="Game updates">
      {messages.map((message, index) => (
        <div className="toast" key={`${message}-${index}`}>
          {message}
        </div>
      ))}
    </section>
  );
}
