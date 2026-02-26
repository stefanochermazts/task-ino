<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ config('app.name', 'task-ino') }}</title>
        @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
            @vite(['resources/css/app.css', 'resources/js/app.js'])
        @endif
    </head>
    <body class="min-h-screen bg-slate-50 text-slate-900">
        <main class="mx-auto w-full max-w-3xl p-4 md:p-6">
            <section
                id="planning-app"
                class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6"
                data-app="planning-inbox"
            >
                <header class="mb-5">
                    <h1 class="text-2xl font-semibold">Today-first planning</h1>
                    <p class="mt-1 text-sm text-slate-600">
                        Capture quickly into Inbox. Planning works online and offline.
                    </p>
                </header>

                <div class="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Connection status</p>
                    <p id="network-status" class="mt-1 text-sm text-slate-700">
                        Checking connectivity...
                    </p>
                    <p class="mt-1 text-xs text-slate-500">sync remains optional and non-blocking</p>
                </div>

                <section aria-labelledby="quick-capture-title" class="mb-6">
                    <h2 id="quick-capture-title" class="mb-2 text-lg font-medium">Quick capture</h2>
                    <form id="quick-capture-form" class="flex flex-col gap-2 sm:flex-row sm:items-start">
                        <label class="sr-only" for="quick-capture-input">Task title</label>
                        <input
                            id="quick-capture-input"
                            name="title"
                            type="text"
                            autocomplete="off"
                            maxlength="200"
                            required
                            placeholder="Add a task to Inbox..."
                            class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-600 focus:ring-2"
                        >
                        <button
                            id="quick-capture-submit"
                            type="submit"
                            class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                            Add
                        </button>
                    </form>
                    <p id="quick-capture-feedback" class="mt-2 min-h-5 text-sm text-slate-600" aria-live="polite"></p>
                </section>

                <section aria-labelledby="inbox-title">
                    <div class="mb-2 flex items-center justify-between">
                        <h2 id="inbox-title" class="text-lg font-medium">Inbox</h2>
                        <span id="inbox-count" class="text-xs text-slate-500">0 tasks</span>
                    </div>
                    <ul id="inbox-list" class="space-y-2" aria-live="polite"></ul>
                    <p id="inbox-empty" class="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                        Inbox is empty. Capture your first task above.
                    </p>
                </section>

                <section aria-labelledby="today-title" class="mt-6">
                    <div class="mb-2 flex items-center justify-between">
                        <h2 id="today-title" class="text-lg font-medium">Today</h2>
                        <div class="flex items-center gap-2">
                            <button
                                type="button"
                                id="review-plan-btn"
                                class="rounded border border-blue-300 bg-white px-3 py-1 text-sm text-blue-800 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                aria-label="Review current plan before execution"
                            >
                                Review Plan
                            </button>
                            <button
                                type="button"
                                id="close-day-btn"
                                class="rounded border border-violet-300 bg-white px-3 py-1 text-sm text-violet-800 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-600"
                                aria-label="Initiate end-of-day closure"
                            >
                                Close Day
                            </button>
                            <span id="today-count" class="text-xs text-slate-500">0/3 selected</span>
                        </div>
                    </div>
                    <div class="mb-2 flex flex-wrap items-center gap-2">
                        <label for="today-cap-input" class="text-xs text-slate-500">Cap</label>
                        <input
                            id="today-cap-input"
                            type="number"
                            min="1"
                            max="99"
                            value="3"
                            aria-describedby="today-cap-value"
                            class="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm outline-none ring-blue-600 focus:ring-2"
                        >
                        <span id="today-cap-value" class="text-xs text-slate-500">Cap 3 · 0 eligible</span>
                        <span id="today-cap-feedback" class="text-xs text-amber-600" aria-live="polite"></span>
                    </div>
                    <ul id="today-list" class="space-y-2" aria-live="polite"></ul>
                    <p id="today-empty" class="rounded-md border border-dashed border-emerald-300 p-3 text-sm text-slate-500">
                        Today is empty. Add inclusion signals to build your plan deterministically.
                    </p>
                    <div
                        id="over-cap-panel"
                        class="mt-4 hidden rounded-lg border border-amber-200 bg-amber-50 p-3"
                        role="dialog"
                        aria-labelledby="over-cap-title"
                        aria-describedby="over-cap-message"
                    >
                        <p id="over-cap-title" class="font-medium text-amber-900">Today is at capacity</p>
                        <p id="over-cap-message" class="mt-1 text-sm text-amber-800">
                            Choose an item to swap, or cancel.
                        </p>
                        <ul id="over-cap-swap-list" class="mt-2 space-y-1"></ul>
                        <button
                            id="over-cap-cancel"
                            type="button"
                            class="mt-2 rounded border border-amber-300 px-2 py-1 text-sm text-amber-900 hover:bg-amber-100"
                        >
                            Cancel
                        </button>
                    </div>
                    <div
                        id="closure-panel"
                        class="mt-4 hidden rounded-md border border-violet-200 bg-violet-50 p-4"
                        role="region"
                        aria-label="Day closure"
                    >
                        <h3 class="mb-2 text-sm font-semibold text-violet-900">Decide where each item goes</h3>
                        <ul id="closure-item-list" class="space-y-2"></ul>
                        <p id="closure-complete-msg" class="mt-3 hidden text-sm font-medium text-violet-900">Day closed. Well done.</p>
                        <p id="closure-error" class="mt-2 hidden text-sm text-red-600" aria-live="polite"></p>
                        <button
                            type="button"
                            id="closure-cancel-btn"
                            class="mt-3 rounded border border-violet-200 bg-white px-3 py-1 text-sm text-violet-700 hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-600"
                        >
                            Cancel
                        </button>
                    </div>
                    <div
                        id="review-panel"
                        class="mt-4 hidden rounded-md border border-blue-200 bg-blue-50 p-4"
                        role="region"
                        aria-label="Plan review"
                    >
                        <h3 class="mb-2 text-sm font-semibold text-blue-900">Your plan for today</h3>
                        <ul id="review-item-list" class="space-y-2"></ul>
                        <p id="review-cap-status" class="mt-2 text-sm text-blue-800"></p>
                        <p id="review-closure-state" class="mt-1 text-sm text-blue-800"></p>
                        <p id="review-error" class="mt-2 hidden text-sm text-red-600" aria-live="polite"></p>
                        <button
                            type="button"
                            id="review-confirm-btn"
                            class="mt-3 rounded border border-blue-200 bg-white px-3 py-1 text-sm text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                            aria-label="Confirm plan readiness"
                        >
                            Ready to execute
                        </button>
                    </div>
                </section>
            </section>
        </main>
    </body>
</html>
