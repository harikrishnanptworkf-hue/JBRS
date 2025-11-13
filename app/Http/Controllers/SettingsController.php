<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CustomHoliday;
use App\Models\Holiday;
use App\Models\Settings;

class SettingsController extends Controller
{
    // Get week holidays (Holiday table)
    public function getWeekHolidays()
    {
        $holidays = Holiday::pluck('h_is_active', 'h_day');
        $default = [
            'Sunday' => false, 'Monday' => false, 'Tuesday' => false, 'Wednesday' => false, 'Thursday' => false, 'Friday' => false, 'Saturday' => false
        ];
        foreach ($default as $day => $val) {
            $default[$day] = isset($holidays[$day]) ? (bool)$holidays[$day] : false;
        }
        return response()->json($default);
    }

    // Save week holidays (Holiday table)
    public function saveWeekHolidays(Request $request)
    {
        foreach ($request->all() as $day => $h_is_active) {
            Holiday::updateOrCreate(
                ['h_day' => $day],
                ['h_is_active' => (bool)$h_is_active]
            );
        }
        return response()->json(['success' => true]);
    }

    // Get custom holidays (CustomHoliday table) - now paginated
    public function getCustomHolidays(Request $request)
    {
        $pageSize = $request->input('pageSize', 10);
        $sortBy = $request->input('sortBy', 'ch_date');
        $sortOrder = $request->input('sortOrder', 'desc');
        $search = $request->input('search', '');

        $query = CustomHoliday::query();
        if ($search) {
            $query->where('ch_reason', 'like', "%$search%")
                  ->orWhere('ch_date', 'like', "%$search%")
                  ->orWhere('id', $search);
        }
        $holidays = $query->orderBy($sortBy, $sortOrder)
            ->paginate($pageSize);
        $holidays->getCollection()->each->setAppends(['formatted_date']);
        return response()->json([
            'data' => $holidays->items(),
            'total' => $holidays->total(),
            'last_page' => $holidays->lastPage(),
            'current_page' => $holidays->currentPage(),
            'per_page' => $holidays->perPage(),
        ]);
    }

    // Add custom holiday (CustomHoliday table)
    public function addCustomHoliday(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'reason' => 'required|string|max:255',
        ]);
        // Check if date already exists
        if (CustomHoliday::where('ch_date', $request->input('date'))->exists()) {
            return response()->json(['message' => 'A holiday for this date already exists.'], 422);
        }

        CustomHoliday::create([
            'ch_date' => $request->input('date'),
            'ch_reason' => $request->input('reason')
        ]);
        return response()->json(['success' => true]);
    }

    // Update custom holiday (CustomHoliday table)
    public function updateCustomHoliday(Request $request, $id)
    {
        $request->validate([
            'date' => 'required|date',
            'reason' => 'required|string|max:255',
        ]);
        // Check if date already exists for another record
        if (CustomHoliday::where('ch_date', $request->input('date'))->where('id', '!=', $id)->exists()) {
            return response()->json(['message' => 'A holiday for this date already exists.'], 422);
        }
        $holiday = CustomHoliday::findOrFail($id);
        $holiday->ch_date = $request->input('date');
        $holiday->ch_reason = $request->input('reason');
        $holiday->save();
        return response()->json(['success' => true]);
    }

    // Delete custom holiday (CustomHoliday table)
    public function deleteCustomHoliday($id)
    {
        $holiday = CustomHoliday::findOrFail($id);
        $holiday->delete();
        return response()->json(['success' => true]);
    }

    // Get office time from settings table using Settings model
    public function getOfficeTime()
    {
        $from = '09:00';
        $to = '18:00';
        $f_format = 'AM';
        $t_format = 'PM';
        $fromSetting = Settings::where('s_name', 'office_time_from')->value('s_value');
        $toSetting = Settings::where('s_name', 'office_time_to')->value('s_value');
        $fromFormat = Settings::where('s_name', 'f_format')->value('s_value');
        $toFormat = Settings::where('s_name', 't_format')->value('s_value');
        if ($fromSetting) $from = $fromSetting;
        if ($toSetting) $to = $toSetting;
        if ($fromFormat) $f_format = $fromFormat;
        if ($toFormat) $t_format = $toFormat;
        return response()->json(['from' => $from, 'to' => $to, 'f_format' => $f_format, 't_format' => $t_format]);
    }

    // Save office time to settings table using Settings model
    public function saveOfficeTime(Request $request)
    {
        $request->validate([
            'from' => 'required|regex:/^\d{2}:\d{2}$/',
            'to' => 'required|regex:/^\d{2}:\d{2}$/',
            'f_format' => 'required|in:AM,PM',
            't_format' => 'required|in:AM,PM',
        ]);
        $from = $request->input('from'); // e.g., '09:00'
        $to = $request->input('to');     // e.g., '06:00'
        $f_format = $request->input('f_format'); // e.g., 'AM'
        $t_format = $request->input('t_format'); // e.g., 'PM'
        Settings::updateOrCreate(['s_name' => 'office_time_from'], ['s_value' => $from]);
        Settings::updateOrCreate(['s_name' => 'office_time_to'], ['s_value' => $to]);
        Settings::updateOrCreate(['s_name' => 'f_format'], ['s_value' => $f_format]);
        Settings::updateOrCreate(['s_name' => 't_format'], ['s_value' => $t_format]);
        return response()->json(['success' => true]);
    }

    // Get all week holidays (Holiday table, all columns)
    public function getAllWeekHolidays()
    {
        $holidays = Holiday::orderByRaw("FIELD(h_day, 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')")
            ->get(['h_day', 'h_is_active']);
        return response()->json($holidays);
    }

    // Get default account id from settings
    public function getDefaultAccount()
    {
        // Prefer lookup by s_name
        $val = Settings::where('s_name', 'default_account')->value('s_value');
        $accountId = $val !== null && $val !== '' ? (int)$val : null;
        return response()->json(['account_id' => $accountId]);
    }

    // Set default account id into settings (optionally clear by sending null)
    public function setDefaultAccount(Request $request)
    {
        $request->validate([
            'account_id' => 'nullable|integer',
        ]);
        $accountId = $request->input('account_id');
        // Ensure a single row exists for default_account; try to keep id=11 if present
        $settings = Settings::where('s_name', 'default_account')->first();
        if (!$settings) {
            // If row with id=11 exists, reuse it; else create new
            $byId = Settings::find(11);
            if ($byId) {
                $byId->s_name = 'default_account';
                $byId->s_value = $accountId;
                $byId->save();
                return response()->json(['success' => true, 'account_id' => $accountId]);
            }
            $settings = new Settings();
            $settings->s_name = 'default_account';
            $settings->s_value = $accountId;
            // Try to set id=11 if table allows, ignore errors if not
            try {
                $settings->id = 11;
            } catch (\Throwable $e) {}
            $settings->save();
        } else {
            $settings->s_value = $accountId;
            $settings->save();
        }
        return response()->json(['success' => true, 'account_id' => $accountId]);
    }
}
