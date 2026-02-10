<?php

namespace App\Http\Controllers;

use App\Models\Enquiry;
use App\Models\Schedule;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Carbon\Carbon;

class ReminderController extends Controller
{

    public function index(Request $request)
    {

        $pageSize = (int) $request->input('pageSize', 10);

        // Filtering
        $agent = $request->input('agent');
        $user = $request->input('user');
        $group = $request->input('group');
        $examcode = $request->input('examcode');
        $date = $request->input('date');
        $reminddate = $request->input('reminddate');
        $dateStart = $request->input('date_start');
        $dateEnd = $request->input('date_end');
        $search = $request->input('search');
        $sessionUser = session('user');
        $roleId = $sessionUser['role_id'] ?? null;
        $schedules = Schedule::with(['user', 'agent', 'examcode']);
        $enquiries = Enquiry::with(['user', 'agent', 'examcode'])->whereNull('removed_at');
        
        if ($roleId && $roleId == 3) {
            $schedules = $schedules->where('s_user_id', $sessionUser['id']);
            $enquiries = $enquiries->where('e_user_id', $sessionUser['id']);
        } else if($roleId && $roleId == 2){
            $schedules = $schedules->where('s_agent_id', $sessionUser['id']);
            $enquiries = $enquiries->where('e_agent_id', $sessionUser['id']);
        }
        if ($agent) { $schedules = $schedules->where('s_agent_id', $agent); $enquiries = $enquiries->where('e_agent_id', $agent); }

        if ($user) { $schedules->where('s_user_id', $user); $enquiries->where('e_user_id', $user); }
        if ($group) { $schedules->where('s_group_name', $group); $enquiries->where('e_group_name', $group); }
        if ($examcode) { $schedules->where('s_exam_code', $examcode); $enquiries->where('e_exam_code', $examcode); }
        if ($reminddate) { $schedules->whereDate('s_remind_date', $reminddate); /* enquiries remind calculated below */ }
        if ($dateStart) { $schedules->whereDate('s_date', '>=', $dateStart); $enquiries->whereDate('e_date', '>=', $dateStart); }
        if ($dateEnd) { $schedules->whereDate('s_date', '<=', $dateEnd); $enquiries->whereDate('e_date', '<=', $dateEnd); }



        // Search filter (case-insensitive, partial match)
        if ($search) {
            $schedules = $schedules->where(function($query) use ($search) {
                $query->where('s_group_name', 'like', "%$search%")
                    ->orWhereHas('user', function($q) use ($search) { $q->where('name', 'like', "%$search%"); })
                    ->orWhereHas('agent', function($q) use ($search) { $q->where('name', 'like', "%$search%"); })
                    ->orWhereHas('examcode', function($q) use ($search) { $q->where('ex_code', 'like', "%$search%"); });
            });
            $enquiries = $enquiries->where(function($query) use ($search) {
                $query->where('e_group_name', 'like', "%$search%")
                    ->orWhereHas('user', function($q) use ($search) { $q->where('name', 'like', "%$search%"); })
                    ->orWhereHas('agent', function($q) use ($search) { $q->where('name', 'like', "%$search%"); })
                    ->orWhereHas('examcode', function($q) use ($search) { $q->where('ex_code', 'like', "%$search%"); });
            });
        }


        $merged = $schedules->get();
        $enqList = $enquiries->get();
        $nowUtc = Carbon::now('UTC')->startOfDay();
        // Calculate s_remind_date for schedules:
        // - If s_remind_date exists, use it
        // - Else if examcode has ex_remind_year & ex_remind_month, compute s_date + offsets
        // - Else set empty strings to avoid defaulting to current date
        $merged = $merged->filter(function($item) use ($nowUtc) {
            if ($item->s_date && $item->examcode) {
                $sDate = Carbon::parse($item->s_date, 'UTC');
                $remindYear = (int)($item->examcode->ex_remind_year ?? 0);
                $remindMonth = (int)($item->examcode->ex_remind_month ?? 0);

                $remindDate = null;
                if (!empty($item->s_remind_date)) {
                    try {
                        $remindDate = Carbon::parse($item->s_remind_date, 'UTC');
                    } catch (\Exception $e) {
                        $remindDate = null;
                    }
                } elseif ($remindYear || $remindMonth) {
                    $remindDate = $sDate->copy()->addYears($remindYear)->addMonths($remindMonth);
                }

                if ($remindDate) {
                    $item->s_remind_date = $remindDate->toDateTimeString();
                    $item->s_remind_date_ist = $remindDate->copy()->setTimezone('Asia/Kolkata')->format('Y-m-d H:i:s');
                } else {
                    // Explicitly set empty strings when no reminder offsets are present
                    $item->s_remind_date = '';
                    $item->s_remind_date_ist = '';
                }
                // Always include
                return true;
            } else {
                $item->s_remind_date = '';
                $item->s_remind_date_ist = '';
                return false;
            }
        })->values();
        // Enquiry reminders: use e_enq_remind_date ONLY; do not fallback so clears remain cleared
        $enqReminders = $enqList->filter(function($item) use ($nowUtc, $reminddate) {
            if ($item->e_date) {
                $eDate = Carbon::parse($item->e_date, 'UTC');
                // Prefer explicitly set enquiry reminder date when available; if missing, keep null
                $remindDate = null;
                if (!empty($item->e_enq_remind_date)) {
                    try {
                        $remindDate = Carbon::parse($item->e_enq_remind_date, 'UTC');
                    } catch (\Exception $e) {
                        $remindDate = null;
                    }
                }
                // Normalize fields to resemble schedule structure for frontend reuse
                $item->s_remind_date = $remindDate ? $remindDate->toDateTimeString() : null;
                $item->s_remind_date_ist = $remindDate ? $remindDate->copy()->setTimezone('Asia/Kolkata')->format('Y-m-d H:i:s') : null;
                $item->s_group_name = $item->e_group_name;
                $item->s_exam_code = $item->e_exam_code;
                $item->s_user_id = $item->e_user_id;
                $item->s_agent_id = $item->e_agent_id;
                $item->s_remind_remark = $item->e_remind_remark;
                $item->s_id = $item->e_id; // use id for action handling
                // If a reminddate filter is applied, include only matching enquiries
                if ($reminddate) {
                    return $remindDate && $remindDate->isSameDay(Carbon::parse($reminddate));
                }
                return true;
            }
            return false;
        })->values();
        // Merge schedules and enquiries
        $merged = $merged->merge($enqReminders)->values();

        // Sorting
        $sortBy = $request->input('sortBy', 'reminddate');
        $sortDirection = $request->input('sortDirection', 'desc');
        $merged = $merged->sortBy(function ($item) use ($sortBy) {
            switch ($sortBy) {
                case 'agent':
                    return $item->agent->name ?? '';
                case 'user':
                    return $item->user->name ?? '';
                case 'groupname':
                    return $item->s_group_name ?? $item->e_group_name ?? '';
                case 'examcode':
                    return $item->examcode->ex_code ?? '';
                case 'date':
                    return $item->s_date ?? $item->e_date ?? null;
                case 'reminddate':
                default:
                    return $item->s_remind_date ?? null;
            }
        });
        if ($sortDirection === 'desc') {
            $merged = $merged->reverse()->values();
        } else {
            $merged = $merged->values();
        }

        // Paginate manually
        $page = (int) $request->input('page', 1);
        // echo $schedules->toSql();die;
        $paginated = $merged->slice(($page - 1) * $pageSize, $pageSize)->values();
        $total = $merged->count();
        return response()->json([
            'data' => $paginated,
            'total' => $total,
            'page' => $page,
            'pageSize' => $pageSize,
        ]);
    }

    public function filters(Request $request)
    {
        // Agents
        $agents = [];
        foreach (Schedule::with('agent')->whereNotNull('s_remind_date')->get() as $s) {
            if ($s->agent) $agents[$s->agent->id] = $s->agent->name;
        }
        $agents = collect($agents)->map(function($name, $id){ return ['id'=>$id, 'name'=>$name]; })->values();

        // Users
        $users = [];
        foreach (Schedule::with('user')->whereNotNull('s_remind_date')->get() as $s) {
            if ($s->user) $users[$s->user->id] = $s->user->name;
        }
        $users = collect($users)->map(function($name, $id){ return ['id'=>$id, 'name'=>$name]; })->values();

        // Groups
        $groups = [];
        foreach (Schedule::whereNotNull('s_remind_date')->get() as $s) {
            if ($s->s_group_name) $groups[$s->s_group_name] = $s->s_group_name;
        }
        $groups = collect($groups)->map(function($name){ return ['id'=>$name, 'name'=>$name]; })->values();

        // Exam Codes
        $examcodes = [];
        foreach (Schedule::whereNotNull('s_remind_date')->get() as $s) {
            if ($s->s_exam_code) $examcodes[$s->s_exam_code] = $s->s_exam_code;
        }
        $examcodes = collect($examcodes)->map(function($code){ return ['id'=>$code, 'code'=>$code]; })->values();

        return response()->json([
            'agents' => $agents,
            'users' => $users,
            'groups' => $groups,
            'examcodes' => $examcodes,
        ]);
    }

    public function update(Request $request, $id)
    {
        $schedule = Schedule::findOrFail($id);
        $remindDate = $request->input('remind_date');
        // Allow clearing remind date when empty/null; otherwise set to provided value
        if ($remindDate === null || $remindDate === '' ) {
            $schedule->s_remind_date = null;
        } else {
            $schedule->s_remind_date = $remindDate;
        }
        $schedule->save();
        return response()->json(['message' => 'Remind date updated', 'data' => $schedule]);
    }
}
