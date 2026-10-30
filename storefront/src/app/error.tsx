'use client'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl-semi">Something went wrong</h1>
      <p className="text-small-regular">The storefront could not load this page.</p>
      <button className="rounded-md bg-black px-4 py-2 text-white" onClick={() => reset()}>
        Try again
      </button>
    </main>
  )
}
