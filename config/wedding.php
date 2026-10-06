<?php

return [
    'admin' => [
        'username' => env('ADMIN_USERNAME', 'admin'),
        'email' => env('ADMIN_EMAIL', 'admin@wedding.local'),
        'name' => env('ADMIN_NAME', 'Wedding Administrator'),
        'password' => env('ADMIN_PASSWORD'),
    ],

    'seed_demo_data' => (bool) env('SEED_DEMO_DATA', false),
];
