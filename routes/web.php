<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    $indexPath = public_path('index.html');
    if (File::exists($indexPath)) {
        return Response::file($indexPath);
    }
    return view('welcome');
});

Route::get('/rsvp/{code}', function ($code) {
    $indexPath = public_path('index.html');
    if (File::exists($indexPath)) {
        return Response::file($indexPath);
    }
    return redirect('/');
});

Route::get('/admin', function () {
    return redirect('/admin/index.html');
});

Route::get('/admin/login', function () {
    return redirect('/admin/login.html');
});
