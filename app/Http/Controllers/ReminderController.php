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

        // Merge and sort by remind date descending
        $merged = $enquiries->concat($schedules)->sortByDesc(function ($item) {
            return $item->e_remind_date ?? $item->s_remind_date;
        })->values();

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

 
}
