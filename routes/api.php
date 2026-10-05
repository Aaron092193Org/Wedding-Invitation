<?php

use App\Http\Controllers\AdminApiController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PublicApiController;
use App\Http\Middleware\AdminAuthenticate;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public API Routes
|--------------------------------------------------------------------------
*/
Route::prefix('public')->group(function () {
    Route::get('wedding-info', [PublicApiController::class, 'getWeddingInfo']);
    Route::get('timeline', [PublicApiController::class, 'getTimeline']);
    Route::get('entourage', [PublicApiController::class, 'getEntourage']);
    Route::get('gallery', [PublicApiController::class, 'getGallery']);
    Route::get('faq', [PublicApiController::class, 'getFaqs']);
    Route::get('faqs', [PublicApiController::class, 'getFaqs']);
    Route::get('gift-info', [PublicApiController::class, 'getGiftInfo']);
    Route::get('guest/{code}', [PublicApiController::class, 'lookupGuest']);
    Route::post('rsvp/check-duplicate', [PublicApiController::class, 'checkDuplicate']);
    Route::post('rsvp', [PublicApiController::class, 'submitRsvp']);
    Route::put('rsvp/{id}', [PublicApiController::class, 'updateRsvp']);
});

/*
|--------------------------------------------------------------------------
| Authentication API Routes
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me'])->middleware(AdminAuthenticate::class);
});
Route::post('admin/auth/login', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| Protected Admin API Routes
|--------------------------------------------------------------------------
*/
Route::prefix('admin')->middleware(AdminAuthenticate::class)->group(function () {
    // Dashboard Stats
    Route::get('dashboard/stats', [AdminApiController::class, 'getDashboardStats']);

    // RSVPs Management & Export
    Route::get('rsvps', [AdminApiController::class, 'getRsvps']);
    Route::get('rsvps/{id}', [AdminApiController::class, 'getRsvpById']);
    Route::put('rsvps/{id}', [AdminApiController::class, 'updateRsvp']);
    Route::delete('rsvps/{id}', [AdminApiController::class, 'deleteRsvp']);
    Route::get('rsvps/export/csv', [AdminApiController::class, 'exportCsv']);
    Route::get('rsvps/export/excel', [AdminApiController::class, 'exportExcel']);

    // Guest Pre-Registration
    Route::get('guests', [AdminApiController::class, 'getGuests']);
    Route::post('guests', [AdminApiController::class, 'createGuest']);
    Route::put('guests/{id}', [AdminApiController::class, 'updateGuest']);
    Route::delete('guests/{id}', [AdminApiController::class, 'deleteGuest']);

    // Settings
    Route::get('settings', [AdminApiController::class, 'getSettings']);
    Route::put('settings', [AdminApiController::class, 'updateSettings']);

    // Gallery Management & Image Upload
    Route::get('gallery', [AdminApiController::class, 'getGallery']);
    Route::post('gallery', [AdminApiController::class, 'addGalleryItem']);
    Route::post('gallery/upload', [AdminApiController::class, 'uploadGalleryImage']);
    Route::put('gallery/{id}', [AdminApiController::class, 'updateGalleryItem']);
    Route::delete('gallery/{id}', [AdminApiController::class, 'deleteGalleryItem']);
    Route::post('upload-image', [AdminApiController::class, 'uploadGenericImage']);

    // Timeline Management
    Route::get('timeline', [AdminApiController::class, 'getTimeline']);
    Route::post('timeline', [AdminApiController::class, 'createTimelineItem']);
    Route::put('timeline/{id}', [AdminApiController::class, 'updateTimelineItem']);
    Route::delete('timeline/{id}', [AdminApiController::class, 'deleteTimelineItem']);

    // Entourage Management
    Route::get('entourage', [AdminApiController::class, 'getEntourage']);
    Route::post('entourage', [AdminApiController::class, 'createEntourageItem']);
    Route::put('entourage/{id}', [AdminApiController::class, 'updateEntourageItem']);
    Route::delete('entourage/{id}', [AdminApiController::class, 'deleteEntourageItem']);

    // FAQs Management
    Route::get('faqs', [AdminApiController::class, 'getFaqs']);
    Route::post('faqs', [AdminApiController::class, 'createFaqItem']);
    Route::put('faqs/{id}', [AdminApiController::class, 'updateFaqItem']);
    Route::delete('faqs/{id}', [AdminApiController::class, 'deleteFaqItem']);

    // Database Explorer
    Route::get('database/overview', [AdminApiController::class, 'getDatabaseOverview']);
    Route::get('database/table/{tableName}', [AdminApiController::class, 'getTableData']);
    Route::post('database/query', [AdminApiController::class, 'executeQuery']);
});
