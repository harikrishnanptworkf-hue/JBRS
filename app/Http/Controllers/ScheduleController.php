<?php

namespace App\Http\Controllers;

use App\Models\Schedule;
use App\Models\CustomHoliday;
use App\Models\Holiday;
use App\Models\Settings;
use App\Models\User;
use App\Models\Enquiry;
use App\Models\ExamCode;    
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use App\Events\StatusUpdated;
use App\Events\ClientCreated;
use App\Events\ClientUpdated;
use App\Events\ClientDeleted;
use Illuminate\Support\Facades\Log;

use Carbon\Carbon;

class ScheduleController extends Controller
{
    public function index(Request $request)
    {
    $sessionUser = session('user');
    $roleId = $sessionUser['role_id'] ?? null;
    $pageSizeInput = $request->input('pageSize', 10);
    $sortBy = $request->input('sortBy', 's_id');
    $sortOrder = $request->input('sortOrder', 'desc');

    // Map frontend sort keys to backend columns
    $sortByMap = [
        'formatted_s_date' => 's_date',
        'indian_time' => 's_date',
        // add other mappings as needed
    ];
    if (isset($sortByMap[$sortBy])) {
        $sortBy = $sortByMap[$sortBy];
    }

    // Support 'all' as a value for pageSize to return all records
    $isAll = (strtolower($pageSizeInput) === 'all' || (int)$pageSizeInput === 0);
    $pageSize = $isAll ? null : (int)$pageSizeInput;

    $query = Schedule::with(['user', 'agent', 'examcode']);

        // Join related tables for sorting by user, agent, examcode text fields
        if (in_array($sortBy, ['user', 'agent', 'examcode'])) {
            if ($sortBy === 'user') {
                $query->leftJoin('users as u', 'schedule.s_user_id', '=', 'u.id');
                $sortBy = 'u.name';
                $query->select('schedule.*', 'u.name as user_name');
            } elseif ($sortBy === 'agent') {
                $query->leftJoin('users as a', 'schedule.s_agent_id', '=', 'a.id');
                $sortBy = 'a.name';
                $query->select('schedule.*', 'a.name as agent_name');
            } elseif ($sortBy === 'examcode') {
                $query->leftJoin('examcode as ec', 'schedule.s_exam_code', '=', 'ec.id');
                $sortBy = 'ec.ex_code';
                $query->select('schedule.*', 'ec.ex_code as examcode_text');
            }
        }
        // Exclude schedules with status 'done' from listing
        $query->where(function ($q) {
            $q->whereNotIn('s_status', ['DONE', 'REVOKE'])
            ->orWhereNull('s_status');
        });

        if ($roleId && $roleId == 3) {
            $query->where('s_user_id', $sessionUser['id']);
        } else if($roleId && $roleId == 2){
            $query->where('s_agent_id', $sessionUser['id']);
        }
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
            $fromDate = Carbon::parse($request->input('startdate'))->setTimezone('UTC')->format('Y-m-d');
            $query->whereDate('s_date', '>=', $fromDate);
        }
        if ($request->filled('enddate')) {
            $toDate = Carbon::parse($request->input('enddate'))->setTimezone('UTC')->format('Y-m-d');
            $query->whereDate('s_date', '<=', $toDate);
        }

        if ($request->filled('date')) {
            $timezone = 'Asia/Kolkata'; 
            $selectedDate = Carbon::parse($request->input('date'), $timezone);

            $startUtc = $selectedDate->copy()->startOfDay()->setTimezone('UTC');
            $endUtc = $selectedDate->copy()->endOfDay()->setTimezone('UTC');

            $query->whereBetween('s_date', [
                $startUtc->toDateTimeString(),
                $endUtc->toDateTimeString(),
            ]);
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
                         ;
                  })
                  ->orWhereHas('agent', function($aq) use ($search) {
                      $aq->where('name', 'like', "%$search%")
                         ;
                  })
                  ->orWhereHas('examcode', function($eq) use ($search) {
                   $eq->where('ex_code', 'like', "%$search%")
                         ;
                  });
            });
        }


        // $allowedSorts = [
        //     's_id', 's_group_name', 's_exam_code', 's_date', 's_agent_id', 's_user_id', 's_status',
        //     'group_name', 'exam_code', 'date', 'agent', 'user', 'status', 'indian_time', 'system_name', 'access_code', 'done_by'
        // ];
        // $sortByMap = [
        //     'group_name' => 's_group_name',
        //     'exam_code' => 's_exam_code',
        //     'date' => 's_date',
        //     'agent' => 's_agent_id',
        //     'user' => 's_user_id',
        //     'status' => 's_status',
        //     'indian_time' => 's_date',
        //     'system_name' => 's_system_name',
        //     'access_code' => 's_access_code',
        //     'done_by' => 's_done_by',
        // ];
        // if (isset($sortByMap[$sortBy])) {
        //     $sortBy = $sortByMap[$sortBy];
        // }
        // if (!in_array($sortBy, $allowedSorts)) {
        //     $sortBy = 's_id';
        // }
        $sortOrder = strtolower($sortOrder) === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortOrder);

        if ($isAll) {
            $schedules = $query->get();
            $count = $schedules->count();
            // Format s_date to Indian time for each schedule
            $schedules = $schedules->map(function($item) {
                $item['formatted_s_date'] = $item['s_date'] ? Carbon::parse($item['s_date'], 'UTC')->setTimezone('Asia/Kolkata')->format('d/m/Y-h:i A') : null;
                return $item;
            });
            $response = [
                'data' => $schedules,
                'total' => $count,
                'per_page' => $count,
                'current_page' => 1,
                'last_page' => 1,
                'from' => $count > 0 ? 1 : 0,
                'to' => $count,
            ];
        } else {
            $schedules = $query->paginate($pageSize > 0 ? $pageSize : 10);
            $response = json_decode(json_encode($schedules), true);
            // Format s_date to Indian time for each schedule in paginated data array
            if (isset($response['data']) && is_array($response['data'])) {
                foreach ($response['data'] as &$item) {
                    $item['formatted_s_date'] = isset($item['s_date']) && $item['s_date'] ? Carbon::parse($item['s_date'], 'UTC')->setTimezone('Asia/Kolkata')->format('d/m/Y-h:i A') : null;
                }
                unset($item);
            }
        }

        // Add current server time in UTC and IST
        $nowUtc = Carbon::now('UTC');
        $nowIst = $nowUtc->copy()->setTimezone('Asia/Kolkata');

        $response['server_time_utc'] = $nowUtc->format('Y-m-d H:i:s');
        $response['server_time_ist'] = $nowIst->format('Y-m-d H:i:s');

        return response()->json($response);
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
            'exam_code_id'    => 'nullable|integer',
            'exam_code'       => 'nullable|string|max:45',
            'date'            => ['nullable', 'date_format:Y-m-d H:i:s'],
            'location'        => 'nullable|string|max:191',
            'support_fee'     => 'nullable|numeric',
            'voucher_fee'     => 'nullable|numeric',
            'comment'         => 'nullable|string',
            'email'           => 'nullable|string|max:191',
            'phone'           => 'nullable|string|max:20',
            'remind_date'     => 'nullable|date',
            'remind_remark'   => 'nullable|string',
        ]);

        // Parse and keep full datetime (Y-m-d H:i:s)
        if (!empty($validated['date'])) {
            if ($request->input('timezone')) {
                $validated['date'] = Carbon::createFromFormat('Y-m-d H:i:s', $validated['date'], $request->input('timezone'))->setTimezone('UTC')->format('Y-m-d H:i:s');
            } else {
                $validated['date'] = Carbon::createFromFormat('Y-m-d H:i:s', $validated['date'])->setTimezone('UTC')->format('Y-m-d H:i:s');
            }
        }
        if (!empty($validated['remind_date'])) {
            $validated['remind_date'] = Carbon::parse($validated['remind_date'])->format('Y-m-d');
        }

        $scheduleData = [
            's_agent_id'      => $validated['agent'],
            's_user_id'       => $validated['user'] ?? null,
            's_group_name'    => $validated['group_name'] ?? null,
            's_exam_code'     => $validated['exam_code_id'] ?? null,
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

        broadcast(new ClientCreated($schedule));

        return response()->json([
            'message' => 'Schedule created successfully',
            'data'    => $schedule,
        ], Response::HTTP_CREATED);
    }

    // Update an existing schedule
    public function update(Request $request, Schedule $schedule)
    {
        $scheduleData = [];
        $validated = $request->validate([
            'agent'           => 'sometimes|required|integer',
            'user'            => 'nullable|integer',
            'group_name'      => 'nullable|string|max:45',
            'exam_code'       => 'nullable|string|max:45',
            'date'            => ['nullable', 'date_format:Y-m-d H:i:s'],
            'location'        => 'nullable|string|max:191',
            'support_fee'     => 'nullable|numeric',
            'voucher_fee'     => 'nullable|numeric',
            'comment'         => 'nullable|string',
            'email'           => 'nullable|string|max:191',
            'phone'           => 'nullable|string|max:20',
            'remind_date'     => 'nullable|date',
            'remind_remark'   => 'nullable|string',
        ]);
        // Parse and keep full datetime (Y-m-d H:i:s)
        if (!empty($validated['date'])) {
            if ($request->input('timezone')) {
                $validated['date'] = Carbon::createFromFormat('Y-m-d H:i:s', $validated['date'], $request->input('timezone'))->setTimezone('UTC')->format('Y-m-d H:i:s');
            } else {
                $validated['date'] = Carbon::createFromFormat('Y-m-d H:i:s', $validated['date'])->setTimezone('UTC')->format('Y-m-d H:i:s');
            }
        }
        if (!empty($validated['remind_date'])) {
            $validated['remind_date'] = Carbon::parse($validated['remind_date'])->format('Y-m-d');
        }
        // Always save exam code as ID (integer)
        $examCodeId = $request->input('exam_code_id');
        if (!$examCodeId && !empty($validated['exam_code'])) {
            // Try to find the exam code by string if only code is provided
            $examCode = \App\Models\ExamCode::where('ex_code', $validated['exam_code'])->first();
            $examCodeId = $examCode ? $examCode->id : null;
        }
        $scheduleData = [
            's_agent_id'      => $validated['agent'] ?? $schedule->s_agent_id,
            's_user_id'       => $validated['user'] ?? $schedule->s_user_id,
            's_group_name'    => $validated['group_name'] ?? $schedule->s_group_name,
            's_exam_code'     => $examCodeId ?? $schedule->s_exam_code,
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

        if ($schedule->s_status == "RESCHEDULE" && !empty($validated['date'])) {
            $oldDate = $schedule->s_date ? Carbon::parse($schedule->s_date) : null;
            $newDate = Carbon::parse($validated['date']);
            if ($oldDate && !$oldDate->equalTo($newDate)) {
                $scheduleData['s_status'] = null;
            }
        }

        $schedule->update($scheduleData);
        broadcast(new ClientUpdated($schedule));

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
        // Log::info('StatusUpdated event fired');
        // event(new StatusUpdated(
        //     $schedule->id,
        //     $schedule->s_status,
        //     $schedule->s_system_name,
        //     $schedule->s_access_code,
        //     $schedule->s_done_by
        // ));

        broadcast(new StatusUpdated( $schedule->s_id,
            $schedule->s_status,
            $schedule->s_system_name,
            $schedule->s_access_code,
            $schedule->s_done_by));

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
        broadcast(new ClientDeleted());
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


    public function filterManagedData(Request $request)
    {
        $sessionUser = session('user');
        $roleId = $sessionUser['role_id'] ?? null;
        if ($roleId && $roleId == 3) {
            $agents = User::select('id', 'name')->where('role_id', 2)->where('id', $sessionUser['agent_id'])->get();

            $users = User::select('id', 'name')->where('role_id', 3)->where('id', $sessionUser['id'])->get();
        }else if ($roleId && $roleId == 2) {
            $agents = User::select('id', 'name')->where('role_id', 2)->where('id', $sessionUser['id'])->get();

            $users = User::select('id', 'name')->where('role_id', 3)->where('agent_id', $sessionUser['id'])->get();
        }else {
            $agents = User::select('id', 'name')->where('role_id', 2)->get();
            $users = User::select('id', 'name')->where('role_id', 3)->get();
        }

        $groups = collect();
        $examcodes = collect();
        if ($request->has('enq')) {
            $groups = Enquiry::select('e_group_name as id', 'e_group_name as name')
                ->whereNotNull('e_group_name')
                ->where('e_group_name', '!=', '')
                ->when($roleId && $roleId == 3, function ($query) use ($sessionUser) {
                    $query->where('e_user_id', $sessionUser['id']);
                })
                ->distinct()
                ->get();
        } else {
            $groups = Schedule::select('s_group_name as id', 's_group_name as name')
                ->whereNotNull('s_group_name')
                ->where('s_group_name', '!=', '')
                ->when($roleId && $roleId == 3, function ($query) use ($sessionUser) {
                    $query->where('s_user_id', $sessionUser['id']);
                })
                ->distinct()
                ->get();
                
            }
        $examcodes = ExamCode::select('id', 'ex_code')->get();
        return response()->json([
            'users' => $users,
            'agents' => $agents,
            'groups' => $groups,
            'examcodes' => $examcodes,
        ]);
    }
    // Optionally, add a filterManagedData method if needed

    public function updateRevokeReason(Request $request, $id)
    {
  

        $schedule = Schedule::findOrFail($id);
        $schedule->s_revoke_reason = $request->input('s_revoke_reason');
        $schedule->save();

        return response()->json(['message' => 'Revoke reason updated successfully.']);
    }
}
