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
        $query = ExamCode::query();
        if ($search) {
            $query->where('ex_code', 'like', "%$search%");
        }
        // Only allow sorting by known columns
        $allowedSorts = ['id', 'ex_code', 'ex_validity'];
        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'id';
        }
        $sortDirection = strtolower($sortDirection) === 'asc' ? 'asc' : 'desc';
        $examcodes = $query->orderBy($sortBy, $sortDirection)
            ->paginate($request->input('pageSize', 10));
        // Return only data array for frontend compatibility
        return response()->json(['data' => $examcodes->items(), 'total' => $examcodes->total()]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'exam_code' => 'required|string|max:255',
            'validity' => 'nullable|date', // validity is now optional
        ]);
        $examcode = ExamCode::create([
            'ex_code' => $request->exam_code,
            'ex_validity' => $request->validity, // will be null if not provided
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
            'validity' => 'required|date',
        ]);
        $examcode->update([
            'ex_code' => $request->exam_code,
            'ex_validity' => $request->validity,
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
