<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::where('role_id', 3);
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                  ->orWhere('username', 'like', "%$search%");
            });
        }
        $pageSize = (int) $request->input('pageSize', 10);
        $currentPage = (int) $request->input('page', 1);
        $sortBy = $request->input('sortBy', 'id');
        $sortOrder = $request->input('sortOrder', 'desc');
        if (!in_array($sortBy, ['name', 'username'])) {
            $sortBy = 'id';
        }
        if (!in_array($sortOrder, ['asc', 'desc'])) {
            $sortOrder = 'desc';
        }
        $total = $query->count();
        $users = $query->orderBy($sortBy, $sortOrder)
            ->skip(($currentPage-1)*$pageSize)
            ->take($pageSize)
            ->get();
        return response()->json([
            'data' => $users,
            'total' => $total,
            'current_page' => $currentPage,
            'per_page' => $pageSize,
            'last_page' => ceil($total / $pageSize),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required',
            'username' => 'required',
            'password' => 'required',
            'agent_id' => 'nullable|integer|exists:users,id',
        ]);
        // Check if username already exists
        if (User::where('username', $validated['username'])->exists()) {
            return response()->json(['message' => 'Username already exists'], 422);
        }
        $user = new User();
        $user->name = $validated['name'];
        $user->username = $validated['username'];
        $user->role_id = 3;
        $user->setRawAttributes([
            'password' => $validated['password'],
            'agent_id' => $validated['agent_id'] ?? null,
        ] + $user->getAttributes());
        $user->save();
        return response()->json($user, 201);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'required',
            'username' => 'required',
            'password' => 'required',
            'agent_id' => 'nullable|integer|exists:users,id',
        ]);
        // Check if username already exists for another user
        if (User::where('username', $validated['username'])->where('id', '!=', $user->id)->exists()) {
            return response()->json(['message' => 'Username already exists'], 422);
        }
        $user->name = $validated['name'];
        $user->username = $validated['username'];
        $user->role_id = 3;
        $user->setRawAttributes([
            'password' => $validated['password'],
            'agent_id' => $validated['agent_id'] ?? null,
        ] + $user->getAttributes());
        $user->save();
        return response()->json($user);
    }

    public function destroy(User $user)
    {
        $user->delete();
        return response()->json(['message' => 'User deleted']);
    }
}
