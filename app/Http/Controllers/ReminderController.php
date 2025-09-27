<?php

namespace App\Http\Controllers;

// use App\Models\Enquiry;
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

        $userObj = $request->user();
        
        $schedules = Schedule::with(['user', 'agent'])
        ->whereNotNull('s_remind_date');
        if ($userObj && $userObj->role_id == 2) {
            $schedules->where('s_agent_id', $userObj->id);
        }else{
            if ($agent) $schedules->where('s_agent_id', $agent);
        }

        if ($user) $schedules->where('s_user_id', $user);
        if ($group) $schedules->where('s_group_name', $group);
        if ($examcode) $schedules->where('s_exam_code', $examcode);
        if ($reminddate) $schedules->whereDate('s_remind_date', $reminddate);
        if ($dateStart) $schedules->whereDate('s_date', '>=', $dateStart);
        if ($dateEnd) $schedules->whereDate('s_date', '<=', $dateEnd);
        $merged = $schedules->get();

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
                    return $item->s_group_name ?? '';
                case 'examcode':
                    return $item->s_exam_code ?? '';
                case 'date':
                    return $item->s_date ?? null;
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
        if (!$remindDate) {
            return response()->json(['message' => 'remind_date is required'], 422);
        }
        $schedule->s_remind_date = $remindDate;
        $schedule->save();
        return response()->json(['message' => 'Remind date updated', 'data' => $schedule]);
    }
}
