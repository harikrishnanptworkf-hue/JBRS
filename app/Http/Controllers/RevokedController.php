<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Schedule;

class RevokedController extends Controller
{
    public function index(Request $request)
    {
        $pageSize = (int) $request->input('pageSize', 10);
        $page = (int) $request->input('page', 1);

        $query = Schedule::with(['user', 'agent'])
            ->where('s_status', 'REVOKE');

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
