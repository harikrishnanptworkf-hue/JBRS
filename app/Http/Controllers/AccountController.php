<?php

namespace App\Http\Controllers;

use App\Models\BankAccount;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AccountController extends Controller
{
    /**
     * List bank accounts with optional search, sort, and pagination.
     */
    public function index(Request $request)
    {
        $search        = $request->input('search');
        $sortBy        = $request->input('sortBy', 'id');
        $sortDirection = strtolower($request->input('sortDirection', 'desc')) === 'asc' ? 'asc' : 'desc';
        $pageSizeParam = $request->input('pageSize', 15);

        $query = BankAccount::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('account_name', 'like', "%$search%")
                  ->orWhere('bank_name', 'like', "%$search%")
                  ->orWhere('account_number', 'like', "%$search%");
            });
        }

        $allowedSorts = ['id', 'account_name', 'bank_name', 'account_number', 'account_type', 'created_at'];
        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'id';
        }

        if (strtolower((string)$pageSizeParam) === 'all') {
            $all = $query->orderBy($sortBy, $sortDirection)->get();
            return response()->json(['data' => $all, 'total' => $all->count()]);
        }

        $pageSize = is_numeric($pageSizeParam) ? (int)$pageSizeParam : 15;
        $paginator = $query->orderBy($sortBy, $sortDirection)->paginate($pageSize);
        return response()->json([
            'data'  => $paginator->items(),
            'total' => $paginator->total(),
        ]);
    }

    /**
     * Create a new bank account.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'account_name'   => 'required|string|max:255',
            'bank_name'      => 'required|string|max:255',
            'account_number' => 'required|string|regex:/^[0-9]{6,20}$/|unique:bank_accounts,account_number',
            'account_type'   => 'required|string|max:100',
            'swift_code'     => ['required', 'string', 'regex:/^[A-Za-z0-9]{8}(?:[A-Za-z0-9]{3})?$/'],
            'ifsc_code'      => ['required', 'string', 'regex:/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/'],
        ]);

        // Normalize to uppercase where appropriate
        $validated['swift_code'] = strtoupper($validated['swift_code']);
        $validated['ifsc_code']  = strtoupper($validated['ifsc_code']);

        $account = BankAccount::create($validated);
        return response()->json($account, 201);
    }

    /**
     * Show a single bank account.
     */
    public function show($id)
    {
        $account = BankAccount::findOrFail($id);
        return response()->json($account);
    }

    /**
     * Update an existing bank account.
     */
    public function update(Request $request, $id)
    {
        $account = BankAccount::findOrFail($id);
        $validated = $request->validate([
            'account_name'   => 'sometimes|required|string|max:255',
            'bank_name'      => 'sometimes|required|string|max:255',
            'account_number' => [
                'sometimes','required','string','regex:/^[0-9]{6,20}$/',
                Rule::unique('bank_accounts', 'account_number')->ignore($account->id),
            ],
            'account_type'   => 'sometimes|required|string|max:100',
            'swift_code'     => ['sometimes','required','string','regex:/^[A-Za-z0-9]{8}(?:[A-Za-z0-9]{3})?$/'],
            'ifsc_code'      => ['sometimes','required','string','regex:/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/'],
        ]);

        if (array_key_exists('swift_code', $validated)) {
            $validated['swift_code'] = strtoupper($validated['swift_code']);
        }
        if (array_key_exists('ifsc_code', $validated)) {
            $validated['ifsc_code'] = strtoupper($validated['ifsc_code']);
        }

        $account->update($validated);
        return response()->json($account);
    }

    /**
     * Delete a bank account.
     */
    public function destroy($id)
    {
        $account = BankAccount::findOrFail($id);
        $account->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
