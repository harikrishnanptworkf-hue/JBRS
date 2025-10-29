<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Timezone;
use Illuminate\Http\Response;
use Carbon\Carbon;

class TimezoneController extends Controller
{
    // List all timezones with pagination and sorting
    public function index(Request $request)
    {
        $pageSize = $request->input('pageSize', 10);
        $sortBy = $request->input('sortBy', 'id');
        $sortOrder = $request->input('sortOrder', 'desc');

        $timezones = Timezone::orderBy($sortBy, $sortOrder)->paginate($pageSize);
        return response()->json($timezones);
    }

    // Show a single timezone
    public function show($id)
    {
        $timezone = Timezone::findOrFail($id);
        // Format updated_at as 'd/m/Y-h:i A'
        $timezone->formatted_updated_at = $timezone->updated_at ? $timezone->updated_at->format('d/m/Y-h:i A') : null;
        return response()->json($timezone);
    }

    // Store a new timezone
    public function store(Request $request)
    {
        $validated = $request->validate([
            'area' => 'required|string|max:255',
            'offset' => 'required|string|max:10',
        ]);
        $timezone = Timezone::create($validated);
        return response()->json($timezone, Response::HTTP_CREATED);
    }

    // Update an existing timezone
    public function update(Request $request, $id)
    {
        $timezone = Timezone::findOrFail($id);
        $validated = $request->validate([
            'area' => 'sometimes|required|string|max:255',
            'offset' => 'sometimes|required|string|max:10',
        ]);
        $timezone->update($validated);
        return response()->json($timezone);
    }

    // Delete a timezone
    public function destroy($id)
    {
        $timezone = Timezone::findOrFail($id);
        $timezone->delete();
        return response()->json(['message' => 'Timezone deleted successfully']);
    }

    // Get all available timezones for dropdown: combine PHP/Carbon and DB
    public function getTimezone(Request $request)
    {
        $phpTimezones = \DateTimeZone::listIdentifiers();
        $carbonTimezones = array_map(function($tz) {
            $carbon = Carbon::now(new \DateTimeZone($tz));
            // Try to get abbreviation from Carbon
            $abbr = $carbon->format('T');
            return [
                'area' => $tz,
                'offset' => $carbon->format('P'),
                'abbreviation' => $abbr,
                'source' => 'php',
            ];
        }, $phpTimezones);
        return response()->json($carbonTimezones);
    }
}
