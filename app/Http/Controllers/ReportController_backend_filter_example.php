// In your ReportController.php (or the controller handling /report)
public function index(Request $request)
{
    $pageSize = $request->query('pageSize', 10);
    $query = Report::query(); // Or your base query/model

    // Backend filtering for Exam Code and Status
    $s_exam_code = $request->query('s_exam_code');
    $s_status = $request->query('s_status');

    if ($s_exam_code) {
        $query->where('s_exam_code', 'like', '%' . $s_exam_code . '%');
    }
    if ($s_status) {
        $query->where('s_status', 'like', '%' . $s_status . '%');
    }

    // ...existing code for other filters, sorting, etc...
    $reports = $query->paginate($pageSize);

    // ...existing code for formatting response...
    return response()->json($reports);
}
