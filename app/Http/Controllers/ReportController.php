<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Schedule;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $pageSize = (int) $request->input('pageSize', 10);
        $page = (int) $request->input('page', 1);

        $query = Schedule::with(['user', 'agent'])
            ->where('s_status', 'DONE');

        // Filter by user_id
        if ($request->filled('user_id') && $request->input('user_id') !== 'all') {
            $query->where('s_user_id', $request->input('user_id'));
        }
        // Filter by agent_id
        if ($request->filled('agent_id') && $request->input('agent_id') !== 'all') {
            $query->where('s_agent_id', $request->input('agent_id'));
        }
        // Filter by start_date
        if ($request->filled('start_date')) {
            $query->whereDate('s_date', '>=', $request->input('start_date'));
        }
        // Filter by end_date
        if ($request->filled('end_date')) {
            $query->whereDate('s_date', '<=', $request->input('end_date'));
        }
        // Backend filter for exam code
        if ($request->filled('s_exam_code')) {
            $query->where('s_exam_code', 'like', '%' . $request->input('s_exam_code') . '%');
        }
        // Backend filter for status
        if ($request->filled('s_status')) {
            $query->where('s_status', 'like', '%' . $request->input('s_status') . '%');
        }

        $total = $query->count();
        $schedules = $query->orderByDesc('s_id')
            ->skip(($page - 1) * $pageSize)
            ->take($pageSize)
            ->get();

        return response()->json([
            'data' => $schedules,
            'total' => $total,
            'page' => $page,
            'pageSize' => $pageSize,
        ]);
    }
}
