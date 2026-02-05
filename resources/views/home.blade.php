<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name', 'JBRS') }}</title>
    <!-- CSRF Token -->
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <!-- App favicon -->

    <!-- Scripts -->
    @viteReactRefresh
    @vite(['resources/scss/theme.scss', 'resources/js/app.js'])

</head>

<body>
    <div id="react-app"></div>
</body>

</html>
