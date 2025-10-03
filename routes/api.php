<?php

use App\Http\Controllers\AgentController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\APIController;
use App\Http\Controllers\EnquiryController;
use App\Http\Controllers\ReminderController;
use App\Http\Controllers\TimezoneController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\RevokedController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\ExamCodeController;
use App\Http\Controllers\UserController;



/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::post('/login', [APIController::class, 'login']);
Route::post('/logout', function (Request $request) {
    $request->user()->currentAccessToken()->delete();
    return response()->json(['message' => 'Logged out'], 200);
})->middleware('auth:sanctum');
Route::post('/register', [APIController::class, 'register']);
Route::post('/forget-password', [APIController::class, 'forget_pass']);
Route::post('/reset-password', [APIController::class, 'reset_pass']);

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('enquiries')->name('enquiries.')->group(function () {
        Route::get('/filter-managed-data', [EnquiryController::class, 'filterManagedData']);

        Route::get('/', [EnquiryController::class, 'index'])->name('index');
        Route::post('/', [EnquiryController::class, 'store'])->name('store');
        Route::get('/{enquiry}', [EnquiryController::class, 'show'])->name('show');
        Route::put('/{enquiry}', [EnquiryController::class, 'update'])->name('update');
        Route::delete('/{enquiry}', [EnquiryController::class, 'destroy'])->name('destroy');
    });

    Route::prefix('schedule')->name('schedule.')->group(function () {
        Route::get('/filter-managed-data', [ScheduleController::class, 'filterManagedData']);

        Route::get('/', [ScheduleController::class, 'index'])->name('index');
        Route::post('/', [ScheduleController::class, 'store'])->name('store');
        Route::get('/{schedule}', [ScheduleController::class, 'show'])->name('show');
        Route::put('/{schedule}', [ScheduleController::class, 'update'])->name('update');
        Route::delete('/{schedule}', [ScheduleController::class, 'destroy'])->name('destroy');
        Route::patch('{schedule}/fields', [ScheduleController::class, 'updateFields']);
        Route::post('/check-office-time', [ScheduleController::class, 'checkOfficeTime']);
    });

    Route::prefix('timezone')->name('timezone.')->group(function () {
        Route::get('/get-full-timezones', [TimezoneController::class, 'getTimezone'])->name('getTimezone');
        Route::get('/', [TimezoneController::class, 'index'])->name('index');
        Route::post('/', [TimezoneController::class, 'store'])->name('store');
        Route::get('/{timezone}', [TimezoneController::class, 'show'])->name('show');
        Route::put('/{timezone}', [TimezoneController::class, 'update'])->name('update');
        Route::delete('/{timezone}', [TimezoneController::class, 'destroy'])->name('destroy');
    });

    Route::prefix('reminders')->name('reminders.')->group(function () {
        Route::get('/', [ReminderController::class, 'index'])->name('index');
        Route::get('/filters', [ReminderController::class, 'filters']);
        Route::put('/{reminder}', [ReminderController::class, 'update']);
    });


    Route::prefix('revoked')->name('revoked.')->group(function () {
        Route::get('/', [RevokedController::class, 'index'])->name('index');
    });


    Route::prefix('report')->name('report.')->group(function () {
        Route::get('/', [ReportController::class, 'index'])->name('index');
        // Backend filter API for exam code and status (already handled by index)
        // Example: /report?s_exam_code=CODE&s_status=STATUS
    });

    Route::prefix('settings')->name('settings.')->group(function () {
        Route::get('week-holidays', [SettingsController::class, 'getWeekHolidays']);
        Route::post('week-holidays', [SettingsController::class, 'saveWeekHolidays']);
        Route::get('custom-holidays', [SettingsController::class, 'getCustomHolidays']);
        Route::post('custom-holidays', [SettingsController::class, 'addCustomHoliday']);
        Route::put('custom-holidays/{id}', [SettingsController::class, 'updateCustomHoliday']);
        Route::delete('custom-holidays/{id}', [SettingsController::class, 'deleteCustomHoliday']);
        Route::get('office-time', [SettingsController::class, 'getOfficeTime']);
        Route::post('office-time', [SettingsController::class, 'saveOfficeTime']);
    });

    Route::prefix('examcodes')->name('examcodes.')->group(function () {
        Route::get('/', [ExamCodeController::class, 'index'])->name('index');
        Route::post('/', [ExamCodeController::class, 'store'])->name('store');
        Route::get('/{examcode}', [ExamCodeController::class, 'show'])->name('show');
        Route::put('/{examcode}', [ExamCodeController::class, 'update'])->name('update');
        Route::delete('/{examcode}', [ExamCodeController::class, 'destroy'])->name('destroy');
    });

    Route::prefix('users')->name('users.')->group(function () {
        Route::get('/', [UserController::class, 'index'])->name('index');
        Route::post('/', [UserController::class, 'store'])->name('store');
        Route::put('/{user}', [UserController::class, 'update'])->name('update');
        Route::delete('/{user}', [UserController::class, 'destroy'])->name('destroy');
    });

    Route::prefix('agents')->name('agents.')->group(function () {
        Route::get('/', [AgentController::class, 'index'])->name('index');
        Route::post('/', [AgentController::class, 'store'])->name('store');
        Route::put('/{agent}', [AgentController::class, 'update'])->name('update');
        Route::delete('/{agent}', [AgentController::class, 'destroy'])->name('destroy');
        Route::post('/{agent}/assign-users', [AgentController::class, 'assignUsers']);
        Route::get('/{agent}/users', [AgentController::class, 'getAgentUsers']);
    });
});
