<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ExamCode;

class ExamCodeController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $sortBy = $request->input('sortBy', 'id');
        $sortDirection = $request->input('sortDirection', 'desc');
        $pageSizeParam = $request->input('pageSize', 10);
        $query = ExamCode::query();
        if ($search) {
            $query->where('ex_code', 'like', "%$search%");
        }
        // Only allow sorting by known columns
        $allowedSorts = ['id', 'ex_code', 'ex_validity', 'ex_remind_year', 'ex_remind_month'];
        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'id';
        }
        $sortDirection = strtolower($sortDirection) === 'asc' ? 'asc' : 'desc';
        // If pageSize is 'All' (case-insensitive), return all records without pagination
        if (strtolower((string)$pageSizeParam) === 'all') {
            $all = $query->orderBy($sortBy, $sortDirection)->get();
            return response()->json(['data' => $all, 'total' => $all->count()]);
        }

        // Fallback to numeric pagination
        $pageSize = is_numeric($pageSizeParam) ? (int)$pageSizeParam : 10;
        $examcodes = $query->orderBy($sortBy, $sortDirection)->paginate($pageSize);
        // Return only data array for frontend compatibility
        return response()->json(['data' => $examcodes->items(), 'total' => $examcodes->total()]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'exam_code' => 'required|string|max:255',
            'validity' => 'nullable|numeric', // validity is now a number
            'ex_remind_year' => 'nullable|numeric',
            'ex_remind_month' => 'nullable|numeric',
        ]);
        $examcode = ExamCode::create([
            'ex_code' => $request->exam_code,
            'ex_validity' => $request->validity,
            'ex_remind_year' => $request->ex_remind_year,
            'ex_remind_month' => $request->ex_remind_month,
        ]);
        return response()->json($examcode, 201);
    }

    public function show($id)
    {
        $examcode = ExamCode::findOrFail($id);
        return response()->json($examcode);
    }

    public function update(Request $request, $id)
    {
        $examcode = ExamCode::findOrFail($id);
        $request->validate([
            'exam_code' => 'required|string|max:255',
            'validity' => 'nullable|numeric',
            'ex_remind_year' => 'nullable|numeric',
            'ex_remind_month' => 'nullable|numeric',
        ]);
        $examcode->update([
            'ex_code' => $request->exam_code,
            'ex_validity' => $request->validity,
            'ex_remind_year' => $request->ex_remind_year,
            'ex_remind_month' => $request->ex_remind_month,
        ]);
        return response()->json($examcode);
    }

    public function destroy($id)
    {
        $examcode = ExamCode::findOrFail($id);
        $examcode->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
