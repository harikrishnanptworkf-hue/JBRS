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

        // Get enquiries with remind date
        $enquiries = Enquiry::with(['user', 'agent'])
            ->whereNotNull('e_remind_date')
            ->get();

        // Get schedules with remind date
        $schedules = Schedule::with(['user', 'agent'])
            ->whereNotNull('s_remind_date')
            ->get();

        // Merge
        $merged = $enquiries->concat($schedules);

        // Filtering
        $agent = $request->input('agent');
        $user = $request->input('user');
        $group = $request->input('group');
        $examcode = $request->input('examcode');
        $date = $request->input('date');
        $reminddate = $request->input('reminddate');

        $enquiries = Enquiry::with(['user', 'agent'])
            ->whereNotNull('e_remind_date');
        if ($agent) $enquiries->where('e_agent_id', $agent);
        if ($user) $enquiries->where('e_user_id', $user);
        if ($group) $enquiries->where('e_group_name', $group);
        if ($examcode) $enquiries->where('e_exam_code', $examcode);
        if ($date) $enquiries->whereDate('e_date', $date);
        if ($reminddate) $enquiries->whereDate('e_remind_date', $reminddate);
        $enquiries = $enquiries->get();

        $schedules = Schedule::with(['user', 'agent'])
            ->whereNotNull('s_remind_date');
        if ($agent) $schedules->where('s_agent_id', $agent);
        if ($user) $schedules->where('s_user_id', $user);
        if ($group) $schedules->where('s_group_name', $group);
        if ($examcode) $schedules->where('s_exam_code', $examcode);
        if ($date) $schedules->whereDate('s_date', $date);
        if ($reminddate) $schedules->whereDate('s_remind_date', $reminddate);
        $schedules = $schedules->get();

        // Merge
        $merged = $enquiries->concat($schedules);

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
                    return $item->e_group_name ?? $item->s_group_name ?? '';
                case 'examcode':
                    return $item->e_exam_code ?? $item->s_exam_code ?? '';
                case 'date':
                    return $item->e_date ?? $item->s_date ?? null;
                case 'reminddate':
                default:
                    return $item->e_remind_date ?? $item->s_remind_date ?? null;
            }
        });
        if ($sortDirection === 'desc') {
            $merged = $merged->reverse()->values();
        } else {
            $merged = $merged->values();
        }

        // Paginate manually
        $page = (int) $request->input('page', 1);
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
        foreach (Enquiry::with('agent')->whereNotNull('e_remind_date')->get() as $e) {
            if ($e->agent) $agents[$e->agent->id] = $e->agent->name;
        }
        foreach (Schedule::with('agent')->whereNotNull('s_remind_date')->get() as $s) {
            if ($s->agent) $agents[$s->agent->id] = $s->agent->name;
        }
        $agents = collect($agents)->map(function($name, $id){ return ['id'=>$id, 'name'=>$name]; })->values();

        // Users
        $users = [];
        foreach (Enquiry::with('user')->whereNotNull('e_remind_date')->get() as $e) {
            if ($e->user) $users[$e->user->id] = $e->user->name;
        }
        foreach (Schedule::with('user')->whereNotNull('s_remind_date')->get() as $s) {
            if ($s->user) $users[$s->user->id] = $s->user->name;
        }
        $users = collect($users)->map(function($name, $id){ return ['id'=>$id, 'name'=>$name]; })->values();

        // Groups
        $groups = [];
        foreach (Enquiry::whereNotNull('e_remind_date')->get() as $e) {
            if ($e->e_group_name) $groups[$e->e_group_name] = $e->e_group_name;
        }
        foreach (Schedule::whereNotNull('s_remind_date')->get() as $s) {
            if ($s->s_group_name) $groups[$s->s_group_name] = $s->s_group_name;
        }
        $groups = collect($groups)->map(function($name){ return ['id'=>$name, 'name'=>$name]; })->values();

        // Exam Codes
        $examcodes = [];
        foreach (Enquiry::whereNotNull('e_remind_date')->get() as $e) {
            if ($e->e_exam_code) $examcodes[$e->e_exam_code] = $e->e_exam_code;
        }
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
}
