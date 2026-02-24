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
        <main class="mx-auto max-w-2xl p-6">
            <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h1 class="text-2xl font-semibold">task-ino</h1>
                <p class="mt-2 text-sm text-slate-600">
                    Welcome page placeholder. The active planning UI is served by the `/` route through `planning.blade.php`.
                </p>
            </section>
        </main>
    </body>
</html>
