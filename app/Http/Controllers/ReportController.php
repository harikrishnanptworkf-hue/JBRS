<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Schedule;
use Symfony\Component\HttpFoundation\StreamedResponse;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use Carbon\Carbon;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $pageSize = (int) $request->input('pageSize', 10);
        $page = (int) $request->input('page', 1);
        $isAll = (strtolower($pageSize) === 'all' || (int)$pageSize === 0);
        $pageSize = $isAll ? null : (int)$pageSize;
        $user = $request->user();
        $query = Schedule::with(['user', 'agent', 'examcode'])
            ->whereNotNull('s_status')
            ->where('s_status', '!=', 'SELECT');

        // Scope by role: agents (role_id=2) see their agent rows; users (role_id=3) see their own rows
        if ($user) {
            if ((int)$user->role_id === 2) {
                $query->where('s_agent_id', $user->id);
            } elseif ((int)$user->role_id === 3) {
                $query->where('s_user_id', $user->id);
            }
        }

        // Filter by user_id
        if ($request->filled('user_id') && $request->input('user_id') !== 'all') {
            $query->where('s_user_id', $request->input('user_id'));
        }
        // Filter by agent_id
        if ($request->filled('agent_id') && $request->input('agent_id') !== 'all') {
            $query->where('s_agent_id', $request->input('agent_id'));
        }
        // Filter by start_date (treat supplied date as India time, convert to UTC range)
        if ($request->filled('start_date')) {
            try {
                $start = Carbon::createFromFormat('Y-m-d', $request->input('start_date'), 'Asia/Kolkata')
                    ->startOfDay()
                    ->setTimezone('UTC');
                $query->where('s_date', '>=', $start->toDateTimeString());
            } catch (\Exception $e) {
                // ignore invalid date formats
            }
        }
        // Filter by end_date (treat supplied date as India time end of day, convert to UTC)
        if ($request->filled('end_date')) {
            try {
                $end = Carbon::createFromFormat('Y-m-d', $request->input('end_date'), 'Asia/Kolkata')
                    ->endOfDay()
                    ->setTimezone('UTC');
                $query->where('s_date', '<=', $end->toDateTimeString());
            } catch (\Exception $e) {
                // ignore invalid date formats
            }
        }
        // Backend filter for group
        if ($request->filled('s_group_name')) {
            $query->where('s_group_name', $request->input('s_group_name'));
        }
        // Backend filter for exam code (support id or code)
        if ($request->filled('s_exam_code')) {
            $val = $request->input('s_exam_code');
            $query->where(function($q) use ($val) {
                $q->where('s_exam_code', $val)
                  ->orWhereHas('examcode', function($q2) use ($val) {
                      $q2->where('ex_code', $val)->orWhere('id', $val);
                  });
            });
        }
        // Backend filter for status
        if ($request->filled('s_status')) {
            $query->where('s_status', 'like', '%' . $request->input('s_status') . '%');
        }


        // Sorting
        $sortBy = $request->input('sortBy', 'indian_time');
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
        $query->orderBy($sortColumn, $sortOrder);

        if($pageSize){
            $query->skip(($page - 1) * $pageSize)
            ->take($pageSize);
        }

        $schedules =  $query->get();

        return response()->json([
            'data' => $schedules,
            'total' => $total,
            'page' => $page,
            'pageSize' => $pageSize,
        ]);
    }

    public function export(Request $request)
    {
        // Build same base query as index
        $pageSize = $request->input('pageSize', null);
        $page = (int) $request->input('page', 1);

        $user = $request->user();
        $query = Schedule::with(['user', 'agent', 'examcode'])
            ->whereNotNull('s_status')
            ->where('s_status', '!=', 'SELECT');

        if ($user) {
            if ((int)$user->role_id === 2) {
                $query->where('s_agent_id', $user->id);
            } elseif ((int)$user->role_id === 3) {
                $query->where('s_user_id', $user->id);
            }
        }

        if ($request->filled('user_id') && $request->input('user_id') !== 'all') {
            $query->where('s_user_id', $request->input('user_id'));
        }
        if ($request->filled('agent_id') && $request->input('agent_id') !== 'all') {
            $query->where('s_agent_id', $request->input('agent_id'));
        }
        if ($request->filled('start_date')) {
            $query->whereDate('s_date', '>=', $request->input('start_date'));
        }
        if ($request->filled('end_date')) {
            $query->whereDate('s_date', '<=', $request->input('end_date'));
        }
        if ($request->filled('s_group_name')) {
            $query->where('s_group_name', $request->input('s_group_name'));
        }
        if ($request->filled('s_exam_code')) {
            $query->where(function($q) use ($request) {
                $q->where('s_exam_code', $request->input('s_exam_code'));
            });
        }
        if ($request->filled('s_status')) {
            $query->where('s_status', 'like', '%' . $request->input('s_status') . '%');
        }

        // Sorting
        $sortBy = $request->input('sortBy', 's_id');
        $sortOrder = $request->input('sortOrder', 'desc');
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
        $sortOrder = strtolower($sortOrder) === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortColumn, $sortOrder);

        $total = $query->count();

        // If pageSize is 'all' or >= total, fetch all
        if ($pageSize === 'All' || $pageSize === 'all' || is_null($pageSize) || (int)$pageSize >= $total) {
            $items = $query->get();
        } else {
            $per = (int)$pageSize ?: 10;
            $items = $query->skip(($page - 1) * $per)->take($per)->get();
        }

        // Prepare rows and header (SNo starts from 1)
        $rows = [];
        $sno = 1;
        foreach ($items as $s) {
            $rows[] = [
                'SNo' => $sno++,
                'User' => $s->user->name ?? ($s->s_user_id ?? ''),
                'Agent' => $s->agent->name ?? ($s->s_agent_id ?? ''),
                'Group Name' => $s->s_group_name ?? '',
                'Exam Code' => $s->examcode->ex_code ?? $s->s_exam_code ?? '',
                'Date' => $s->formatted_s_date_original ?? $s->s_date ?? '',
                'Indian Time' => $s->formatted_s_date ?? '',
                'Done By' => $s->s_done_by ?? '',
                'Status' => $s->s_status ?? '',
                'System Name' => $s->s_system_name ?? $s->system_name ?? '',
                'Access Code' => $s->s_access_code ?? $s->access_code ?? '',
                'Comment' => $s->s_revoke_reason ?? '',
            ];
        }

        // Stream XLSX using PhpSpreadsheet if available
        try {
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();

            // Header row
            $headers = array_keys($rows[0] ?? [
                'SNo','User','Agent','Group Name','Exam Code','Date','Indian Time','Done By','Status','System Name','Access Code','Comment'
            ]);
            $col = 1;
            foreach ($headers as $h) {
                $sheet->setCellValueByColumnAndRow($col, 1, $h);
                $col++;
            }

            // Apply header style (user requested rgb(2,113,185) -> hex #0271B9)
            $headerRange = 'A1:' . $sheet->getCellByColumnAndRow(count($headers), 1)->getCoordinate();
            $sheet->getStyle($headerRange)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF0271B9');
            $sheet->getStyle($headerRange)->getFont()->getColor()->setARGB('FFFFFFFF');
            $sheet->getStyle($headerRange)->getFont()->setBold(true)->setSize(14);
            // Increase header row height
            $sheet->getRowDimension(1)->setRowHeight(26);

            // Increase default font size and default column width
            $spreadsheet->getDefaultStyle()->getFont()->setName('Calibri')->setSize(12);
            $sheet->getDefaultColumnDimension()->setWidth(18);
            $sheet->getDefaultRowDimension()->setRowHeight(20);

            // Data rows
            $rowNum = 2;
            foreach ($rows as $r) {
                $col = 1;
                foreach ($headers as $h) {
                    $sheet->setCellValueByColumnAndRow($col, $rowNum, $r[$h] ?? '');
                    $col++;
                }
                $rowNum++;
            }

            // Auto size columns (keeps default width as minimum)
            for ($i = 1; $i <= count($headers); $i++) {
                $sheet->getColumnDimensionByColumn($i)->setAutoSize(true);
            }

            // Prepare writer and streamed response
            $writer = new Xlsx($spreadsheet);
            $filename = 'report_' . date('Y-m-d_His') . '.xlsx';

            $response = new StreamedResponse(function() use ($writer) {
                $writer->save('php://output');
            });
            $disposition = $response->headers->makeDisposition('attachment', $filename);
            $response->headers->set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            $response->headers->set('Content-Disposition', $disposition);
            return $response;

        } catch (\Error $e) {
            // Fallback to CSV if PhpSpreadsheet isn't available or an error occurs
            $callback = function() use ($rows) {
                $out = fopen('php://output', 'w');
                if (empty($rows)) {
                    fputcsv($out, ['No data']);
                } else {
                    $headers = array_keys($rows[0]);
                    fputcsv($out, $headers);
                    foreach ($rows as $r) {
                        fputcsv($out, array_values($r));
                    }
                }
                fclose($out);
            };
            $filename = 'report_' . date('Y-m-d_His') . '.csv';
            return response()->stream($callback, 200, [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ]);
        }
    }
}
