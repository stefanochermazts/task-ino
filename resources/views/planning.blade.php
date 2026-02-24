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
            </section>
        </main>
    </body>
</html>
