<?php

namespace App\Http\Controllers;

use App\Models\Schedule;
use App\Models\CustomHoliday;
use App\Models\Holiday;
use App\Models\Settings;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Carbon\Carbon;

class ScheduleController extends Controller
{
    // List all schedules (with optional pagination)
    public function index(Request $request)
    {
        $pageSize = (int) $request->input('pageSize', 10);
        $sortBy = $request->input('sortBy', 's_id');
        $sortOrder = $request->input('sortOrder', 'desc');

    $query = Schedule::with(['user', 'agent']);
    // Exclude schedules with status 'done' from listing
    $query->where('s_status', '!=', 'done');

        // Filtering
        if ($request->filled('agent_id')) {
            $query->where('s_agent_id', $request->input('agent_id'));
        }
        if ($request->filled('user_id')) {
            $query->where('s_user_id', $request->input('user_id'));
        }
        if ($request->filled('group_id')) {
            $query->where('s_group_name', $request->input('group_id'));
        }
        if ($request->filled('examcode_id')) {
            $query->where('s_exam_code', $request->input('examcode_id'));
        }
        if ($request->filled('status')) {
            $query->where('s_status', $request->input('status'));
        }
        if ($request->filled('startdate')) {
            $query->whereDate('s_date', '>=', $request->input('startdate'));
        }
        if ($request->filled('enddate')) {
            $query->whereDate('s_date', '<=', $request->input('enddate'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('s_group_name', 'like', "%$search%")
                  ->orWhere('s_exam_code', 'like', "%$search%")
                  ->orWhere('s_location', 'like', "%$search%")
                  ->orWhere('s_email', 'like', "%$search%")
                  ->orWhere('s_phone', 'like', "%$search%")
                  ->orWhere('s_comment', 'like', "%$search%")
                  ->orWhereHas('user', function($uq) use ($search) {
                      $uq->where('name', 'like', "%$search%")
                         ->orWhere('email', 'like', "%$search%")
                         ->orWhere('phone', 'like', "%$search%")
                         ;
                  })
                  ->orWhereHas('agent', function($aq) use ($search) {
                      $aq->where('name', 'like', "%$search%")
                         ->orWhere('email', 'like', "%$search%")
                         ->orWhere('phone', 'like', "%$search%")
                         ;
                  });
            });
        }

        // Only allow sorting by known columns or relationships
        $allowedSorts = [
            's_id', 's_group_name', 's_exam_code', 's_date', 's_agent_id', 's_user_id', 's_status',
            'group_name', 'exam_code', 'date', 'agent', 'user', 'status', 'indian_time', 'system_name', 'access_code', 'done_by'
        ];
        $sortByMap = [
            'group_name' => 's_group_name',
            'exam_code' => 's_exam_code',
            'date' => 's_date',
            'agent' => 's_agent_id',
            'user' => 's_user_id',
            'status' => 's_status',
            'indian_time' => 's_date',
            'system_name' => 's_system_name',
            'access_code' => 's_access_code',
            'done_by' => 's_done_by',
        ];
        if (isset($sortByMap[$sortBy])) {
            $sortBy = $sortByMap[$sortBy];
        }
        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 's_id';
        }
        $sortOrder = strtolower($sortOrder) === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortOrder);

        $schedules = $query->paginate($pageSize);

        return response()->json($schedules);
    }

    // Show a single schedule
    public function show(Schedule $schedule)
    {
        return response()->json($schedule, Response::HTTP_OK);
    }

    // Store a new schedule
    public function store(Request $request)
    {
        $validated = $request->validate([
            'agent'           => 'required|integer',
            'user'            => 'nullable|integer',
            'group_name'      => 'nullable|string|max:45',
            'exam_code'       => 'nullable|string|max:45',
            'date'            => 'nullable|date',
            'location'        => 'nullable|string|max:191',
            'support_fee'     => 'nullable|numeric',
            'voucher_fee'     => 'nullable|numeric',
            'comment'         => 'nullable|string',
            'email'           => 'nullable|string|max:191',
            'phone'           => 'nullable|string|max:20',
            'remind_date'     => 'nullable|date',
            'remind_remark'   => 'nullable|string',
        ]);

        // Convert ISO 8601 date strings to Y-m-d or Y-m-d H:i:s
        if (!empty($validated['date'])) {
            $validated['date'] = Carbon::parse($validated['date'])->format('Y-m-d');
        }
        if (!empty($validated['remind_date'])) {
            $validated['remind_date'] = Carbon::parse($validated['remind_date'])->format('Y-m-d');
        }

        // Convert date to UTC using selected timezone
        if (!empty($validated['date']) && $request->input('timezone')) {
            $validated['date'] = Carbon::parse($validated['date'], $request->input('timezone'))->setTimezone('UTC')->format('Y-m-d H:i:s');
        } elseif (!empty($validated['date'])) {
            $validated['date'] = Carbon::parse($validated['date'])->setTimezone('UTC')->format('Y-m-d H:i:s');
        }

        $scheduleData = [
            's_agent_id'      => $validated['agent'],
            's_user_id'       => $validated['user'] ?? null,
            's_group_name'    => $validated['group_name'] ?? null,
            's_exam_code'     => $validated['exam_code'] ?? null,
            's_area'          => $request->input('timezone') ?? null,
            's_date'          => $validated['date'] ?? null,
            's_location'      => $validated['location'] ?? null,
            's_support_fee'   => $validated['support_fee'] ?? null,
            's_voucher_fee'   => $validated['voucher_fee'] ?? null,
            's_comment'       => $validated['comment'] ?? null,
            's_email'         => $validated['email'] ?? null,
            's_phone'         => $validated['phone'] ?? null,
            's_remind_date'   => $validated['remind_date'] ?? null,
            's_remind_remark' => $validated['remind_remark'] ?? null,
        ];

        $schedule = Schedule::create($scheduleData);

        return response()->json([
            'message' => 'Schedule created successfully',
            'data'    => $schedule,
        ], Response::HTTP_CREATED);
    }

    // Update an existing schedule
    public function update(Request $request, Schedule $schedule)
    {
        $validated = $request->validate([
            'agent'           => 'sometimes|required|integer',
            'user'            => 'nullable|integer',
            'group_name'      => 'nullable|string|max:45',
            'exam_code'       => 'nullable|string|max:45',
            'date'            => 'nullable|date',
            'location'        => 'nullable|string|max:191',
            'support_fee'     => 'nullable|numeric',
            'voucher_fee'     => 'nullable|numeric',
            'comment'         => 'nullable|string',
            'email'           => 'nullable|string|max:191',
            'phone'           => 'nullable|string|max:20',
            'remind_date'     => 'nullable|date',
            'remind_remark'   => 'nullable|string',
        ]);
        if (!empty($validated['date'])) {
            $validated['date'] = Carbon::parse($validated['date'])->format('Y-m-d');
        }
        if (!empty($validated['remind_date'])) {
            $validated['remind_date'] = Carbon::parse($validated['remind_date'])->format('Y-m-d');
        }
        // Convert date to UTC using selected timezone
        if (!empty($validated['date']) && $request->input('timezone')) {
            $validated['date'] = Carbon::parse($validated['date'], $request->input('timezone'))->setTimezone('UTC')->format('Y-m-d H:i:s');
        } elseif (!empty($validated['date'])) {
            $validated['date'] = Carbon::parse($validated['date'])->setTimezone('UTC')->format('Y-m-d H:i:s');
        }
        $scheduleData = [
            's_agent_id'      => $validated['agent'] ?? $schedule->s_agent_id,
            's_user_id'       => $validated['user'] ?? $schedule->s_user_id,
            's_group_name'    => $validated['group_name'] ?? $schedule->s_group_name,
            's_exam_code'     => $validated['exam_code'] ?? $schedule->s_exam_code,
            's_date'          => $validated['date'] ?? $schedule->s_date,
            's_location'      => $validated['location'] ?? $schedule->s_location,
            's_support_fee'   => $validated['support_fee'] ?? $schedule->s_support_fee,
            's_voucher_fee'   => $validated['voucher_fee'] ?? $schedule->s_voucher_fee,
            's_comment'       => $validated['comment'] ?? $schedule->s_comment,
            's_email'         => $validated['email'] ?? $schedule->s_email,
            's_phone'         => $validated['phone'] ?? $schedule->s_phone,
            's_remind_date'   => $validated['remind_date'] ?? $schedule->s_remind_date,
            's_remind_remark' => $validated['remind_remark'] ?? $schedule->s_remind_remark,
        ];

        $schedule->update($scheduleData);

        return response()->json([
            'message' => 'Schedule updated successfully',
            'data'    => $schedule,
        ], Response::HTTP_OK);
    }

    // Update specific fields (status, system_name, access_code, done_by) only when status is changed
    public function updateFields(Request $request, Schedule $schedule)
    {
        $fields = $request->only(['status', 'system_name', 'access_code', 'done_by']);

        $updateData = [];
        if (array_key_exists('status', $fields)) {
            $updateData['s_status'] = $fields['status'];
        }
        if (array_key_exists('system_name', $fields)) {
            $updateData['s_system_name'] = $fields['system_name'];
        }
        if (array_key_exists('access_code', $fields)) {
            $updateData['s_access_code'] = $fields['access_code'];
        }
        if (array_key_exists('done_by', $fields)) {
            $updateData['s_done_by'] = $fields['done_by'];
        }
        if (empty($updateData)) {
            return response()->json(['message' => 'No valid fields provided for update'], Response::HTTP_BAD_REQUEST);
        }
        $schedule->update($updateData);
        // Return updated fields using frontend keys
        return response()->json([
            'message' => 'Fields updated successfully',
            'data' => [
                'status' => $schedule->s_status,
                'system_name' => $schedule->s_system_name,
                'access_code' => $schedule->s_access_code,
                'done_by' => $schedule->s_done_by,
            ]
        ], Response::HTTP_OK);
    }

    // Delete a schedule
    public function destroy(Schedule $schedule)
    {
        $schedule->delete();
        return response()->json(['message' => 'Schedule deleted successfully'], Response::HTTP_OK);
    }

    // Check if a given date/time (in a timezone) is outside office hours or on a holiday
    public function checkOfficeTime(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'timezone' => 'required|string',
        ]);
        $date = $request->input('date');
        $timezone = $request->input('timezone');

        // Convert input date to Carbon in selected timezone
        $dt = \Carbon\Carbon::parse($date, $timezone);
        $dayName = $dt->format('l'); // e.g., Monday
        $dateYmd = $dt->format('Y-m-d');

        // 1. Check if the day is a week holiday
        $weekHoliday = Holiday::where('h_day', $dayName)->where('h_is_active', true)->exists();
        $dtIST = $dt->copy()->setTimezone('Asia/Kolkata');
        $istDisplay = $dtIST->format('d/m/Y h:i A');
        if ($weekHoliday) {
            return response()->json([
                'warning' => "The selected date ($dateYmd) is a weekly holiday ($dayName).",
                'ist' => $istDisplay
            ], 200);
        }

        // 2. Check if the date is a custom holiday
        $customHoliday = CustomHoliday::where('ch_date', $dateYmd)->first();
        if ($customHoliday) {
            return response()->json([
                'warning' => "The selected date ($dateYmd) is a custom holiday.",
                'reason' => $customHoliday->ch_reason,
                'ist' => $istDisplay
            ], 200);
        }

        // 3. Check if the time is outside office hours (convert to UTC, then to IST for check)
        // Get office time settings
        $from = Settings::where('s_name', 'office_time_from')->value('s_value') ?: '09:00';
        $to = Settings::where('s_name', 'office_time_to')->value('s_value') ?: '18:00';
        $f_format = Settings::where('s_name', 'f_format')->value('s_value') ?: 'AM';
        $t_format = Settings::where('s_name', 't_format')->value('s_value') ?: 'PM';

        // Convert office times to 24h
        $from24 = $this->to24Hour($from, $f_format);
        $to24 = $this->to24Hour($to, $t_format);

        // Convert input time to IST (Asia/Kolkata)
        $inputTime = $dtIST->format('H:i');

        if ($inputTime < $from24 || $inputTime > $to24) {
            return response()->json([
                'warning' => "The selected time ($inputTime IST) is outside office hours ($from24 - $to24 IST).",
                'ist' => $istDisplay
            ], 200);
        }

        // All checks passed
        return response()->json(['ok' => true], 200);
    }

    // Helper: convert 12h time + AM/PM to 24h string (e.g. 09:00 AM => 09:00, 06:00 PM => 18:00)
    private function to24Hour($time, $ampm)
    {
        $parts = explode(':', $time);
        $hour = (int)$parts[0];
        $minute = isset($parts[1]) ? (int)$parts[1] : 0;
        if (strtoupper($ampm) === 'PM' && $hour < 12) {
            $hour += 12;
        }
        if (strtoupper($ampm) === 'AM' && $hour === 12) {
            $hour = 0;
        }
        return sprintf('%02d:%02d', $hour, $minute);
    }

    // Optionally, add a filterManagedData method if needed
}
