<?php

namespace App\Http\Controllers;

use App\Models\Enquiry;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use App\Models\ExamCode;
use App\Models\Schedule;
use Carbon\Carbon;

class EnquiryController extends Controller
{
    /**
     * Display a listing of enquiries.
     */
    public function index(Request $request)
    {
        $pageSize = (int) $request->input('pageSize', 10);
        $sortBy = $request->input('sortBy', 'e_id');
        $sortOrder = $request->input('sortOrder', 'desc');

        $query = Enquiry::with(['user', 'agent']);

        // Filtering
        if ($request->filled('agent_id')) {
            $query->where('e_agent_id', $request->input('agent_id'));
        }
        if ($request->filled('user_id')) {
            $query->where('e_user_id', $request->input('user_id'));
        }
        if ($request->filled('group_id')) {
            $query->where('e_group_name', $request->input('group_id'));
        }
        if ($request->filled('examcode_id')) {
            $query->where('e_exam_code', $request->input('examcode_id'));
        }
        if ($request->filled('startdate')) {
            $query->whereDate('e_date', '>=', $request->input('startdate'));
        }
        if ($request->filled('enddate')) {
            $query->whereDate('e_date', '<=', $request->input('enddate'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('e_group_name', 'like', "%$search%")
                  ->orWhere('e_exam_code', 'like', "%$search%")
                  ->orWhere('e_location', 'like', "%$search%")
                  ->orWhere('e_email', 'like', "%$search%")
                  ->orWhere('e_phone', 'like', "%$search%")
                  ->orWhere('e_comment', 'like', "%$search%")
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
            'e_id', 'e_group_name', 'e_exam_code', 'e_date', 'e_agent_id', 'e_user_id',
            'groupname', 'examcode', 'date', 'agent', 'user'
        ];
        $sortByMap = [
            'groupname' => 'e_group_name',
            'examcode' => 'e_exam_code',
            'date' => 'e_date',
            'agent' => 'e_agent_id',
            'user' => 'e_user_id',
        ];
        if (isset($sortByMap[$sortBy])) {
            $sortBy = $sortByMap[$sortBy];
        }
        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'e_id';
        }
        $sortOrder = strtolower($sortOrder) === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortOrder);

        $enquiries = $query->paginate($pageSize);

        return response()->json($enquiries);
    }

    /**
     * Store a newly created enquiry.
     */
    public function store(Request $request)
    {   
        $validated = $request->validate([
            'agent'           => 'required|integer',
            'user'            => 'nullable|integer',
            'group_name'      => 'nullable|string|max:45',
            'exam_code'       => 'nullable|string|max:45',
            'date'            => 'nullable|date',
            'location'        => 'nullable|string|max:255',
            'support_fee'     => 'nullable|numeric',
            'voucher_fee'     => 'nullable|numeric',
            'comment'         => 'nullable|string',
            'email'           => 'nullable|email|max:255',
            'phone'           => 'nullable|string|max:20',
            'remind_date'     => 'nullable|date',
            'remind_remark'   => 'nullable|string|max:255',
        ]);

        // Convert date to UTC using selected timezone
        if (!empty($validated['date']) && $request->input('timezone')) {
            $validated['date'] = Carbon::parse($validated['date'], $request->input('timezone'))->setTimezone('UTC')->format('Y-m-d H:i:s');
        } elseif (!empty($validated['date'])) {
            $validated['date'] = Carbon::parse($validated['date'])->setTimezone('UTC')->format('Y-m-d H:i:s');
        }
        if (!empty($validated['remind_date'])) {
            $validated['remind_date'] = Carbon::parse($validated['remind_date'])->format('Y-m-d');
        }
        // Map client field names to DB column names
        $enquiryData = [
            'e_agent_id'      => $validated['agent'],
            'e_user_id'       => $validated['user'] ?? null,
            'e_group_name'    => $validated['group_name'] ?? null,
            'e_exam_code'     => $validated['exam_code'] ?? null,
            'e_area'          => $request->input('timezone') ?? null,
            'e_date'          => $validated['date'] ?? null,
            'e_location'      => $validated['location'] ?? null,
            'e_support_fee'   => $validated['support_fee'] ?? null,
            'e_voucher_fee'   => $validated['voucher_fee'] ?? null,
            'e_comment'       => $validated['comment'] ?? null,
            'e_email'         => $validated['email'] ?? null,
            'e_phone'         => $validated['phone'] ?? null,
            'e_remind_date'   => $validated['remind_date'] ?? null,
            'e_remind_remark' => $validated['remind_remark'] ?? null,
        ];

        $enquiry = Enquiry::create($enquiryData);

        return response()->json([
            'message' => 'Enquiry created successfully',
            'data'    => $enquiry,
        ], Response::HTTP_CREATED);
    }

    /**
     * Display the specified enquiry.
     */
    public function show(Enquiry $enquiry)
    {
        return response()->json($enquiry, Response::HTTP_OK);
    }

    /**
     * Update the specified enquiry.
     */
    public function update(Request $request, Enquiry $enquiry)
    {
        $validated = $request->validate([
            'agent'           => 'sometimes|required|integer',
            'user'            => 'nullable|integer',
            'group_name'      => 'nullable|string|max:45',
            'exam_code'       => 'nullable|string|max:45',
            'date'            => 'nullable|date',
            'location'        => 'nullable|string|max:255',
            'support_fee'     => 'nullable|numeric',
            'voucher_fee'     => 'nullable|numeric',
            'comment'         => 'nullable|string',
            'email'           => 'nullable|email|max:255',
            'phone'           => 'nullable|string|max:20',
            'remind_date'     => 'nullable|date',
            'remind_remark'   => 'nullable|string|max:255',
        ]);

        // Convert date to UTC using selected timezone
        if (!empty($validated['date']) && $request->input('timezone')) {
            $validated['date'] = Carbon::parse($validated['date'], $request->input('timezone'))->setTimezone('UTC')->format('Y-m-d H:i:s');
        } elseif (!empty($validated['date'])) {
            $validated['date'] = Carbon::parse($validated['date'])->setTimezone('UTC')->format('Y-m-d H:i:s');
        }
        if (!empty($validated['remind_date'])) {
            $validated['remind_date'] = Carbon::parse($validated['remind_date'])->format('Y-m-d');
        }

        $enquiryData = [
            'e_agent_id'      => $validated['agent'] ?? $enquiry->e_agent_id,
            'e_user_id'       => $validated['user'] ?? $enquiry->e_user_id,
            'e_group_name'    => $validated['group_name'] ?? $enquiry->e_group_name,
            'e_exam_code'     => $validated['exam_code'] ?? $enquiry->e_exam_code,
            'e_area'          => $request->input('timezone') ?? $enquiry->e_area,
            'e_date'          => $validated['date'] ?? $enquiry->e_date,
            'e_location'      => $validated['location'] ?? $enquiry->e_location,
            'e_support_fee'   => $validated['support_fee'] ?? $enquiry->e_support_fee,
            'e_voucher_fee'   => $validated['voucher_fee'] ?? $enquiry->e_voucher_fee,
            'e_comment'       => $validated['comment'] ?? $enquiry->e_comment,
            'e_email'         => $validated['email'] ?? $enquiry->e_email,
            'e_phone'         => $validated['phone'] ?? $enquiry->e_phone,
            'e_remind_date'   => $validated['remind_date'] ?? $enquiry->e_remind_date,
            'e_remind_remark' => $validated['remind_remark'] ?? $enquiry->e_remind_remark,
        ];

        $enquiry->update($enquiryData);

        return response()->json([
            'message' => 'Enquiry updated successfully',
            'data'    => $enquiry,
        ], Response::HTTP_OK);
    }

    /**
     * Remove the specified enquiry.
     */
    public function destroy(Enquiry $enquiry)
    {
        $enquiry->delete();

        return response()->json([
            'message' => 'Enquiry deleted successfully',
        ], Response::HTTP_OK);
    }


    public function filterManagedData(Request $request)
    {
        $users  = User::select('id', 'name')->where('role_id', 3)->get();
        $agents = User::select('id', 'name')->where('role_id', 2)->get();
        $groups = collect();
        $examcodes = collect();
        if ($request->has('enq')) {
            $groups = Enquiry::select('e_group_name as id', 'e_group_name as name')
                ->whereNotNull('e_group_name')
                ->where('e_group_name', '!=', '')
                ->distinct()
                ->get();
            $examcodes = ExamCode::select('id', 'ex_code')->get();
        } else {
            $groups = Schedule::select('s_group_name as id', 's_group_name as name')
                ->whereNotNull('s_group_name')
                ->where('s_group_name', '!=', '')
                ->distinct()
                ->get();
            $examcodes = Schedule::select('s_exam_code as ex_code')->whereNotNull('s_exam_code')->where('s_exam_code', '!=', '')->distinct()->get();
        }
        return response()->json([
            'users' => $users,
            'agents' => $agents,
            'groups' => $groups,
            'examcodes' => $examcodes,
        ]);
    }
}
