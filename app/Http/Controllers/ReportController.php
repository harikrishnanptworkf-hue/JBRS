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

        $user = $request->user();
        $query = Schedule::with(['user', 'agent'])
            ->whereNotNull('s_status');

        // If logged-in user is role_id 2, only show schedules where agent_id = user id
        if ($user && $user->role_id == 2) {
            $query->where('s_agent_id', $user->id);
        }

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
        // Backend filter for group
        if ($request->filled('s_group_name')) {
            $query->where('s_group_name', $request->input('s_group_name'));
        }
        // Backend filter for exam code (support id or code)
        if ($request->filled('s_exam_code')) {
            $query->where(function($q) use ($request) {
                $q->where('s_exam_code', $request->input('s_exam_code'));
            });
        }
        // Backend filter for status
        if ($request->filled('s_status')) {
            $query->where('s_status', 'like', '%' . $request->input('s_status') . '%');
        }


        // Sorting
        $sortBy = $request->input('sortBy', 's_id');
        $sortOrder = $request->input('sortOrder', 'desc');
        // Allow only certain columns to be sorted for security
        $allowedSorts = [
            's_id', 'agent', 'user', 'group_name', 'exam_code', 'indian_time', 's_status',
            'system_name', 'access_code', 'done_by', 's_date', 's_exam_code', 's_group_name', 's_area', 'formatted_s_date',
        ];
        // Map frontend keys to DB columns if needed
        $sortMap = [
            'agent' => 's_agent_id',
            'user' => 's_user_id',
            'group_name' => 's_group_name',
            'exam_code' => 's_exam_code',
            'indian_time' => 's_date',
            'status' => 's_status',
            'done_by' => 's_done_by',
        ];
        $sortColumn = $sortMap[$sortBy] ?? $sortBy;
        if (!in_array($sortColumn, $allowedSorts)) {
            $sortColumn = 's_id';
        }
        $sortOrder = strtolower($sortOrder) === 'asc' ? 'asc' : 'desc';

        $total = $query->count();
        $schedules = $query->orderBy($sortColumn, $sortOrder)
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
