export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          new-project
        </h1>
        <p className="text-lg leading-7 text-zinc-600 dark:text-zinc-400">
          A fresh Next.js + TypeScript + Tailwind starter. Edit{" "}
          <code className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-sm dark:bg-zinc-800">
            src/app/page.tsx
          </code>{" "}
          to get started.
        </p>
      </div>
    </main>
  );
}
