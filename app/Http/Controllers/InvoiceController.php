<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Schedule;
use App\Models\BankAccount;
use App\Models\Settings;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class InvoiceController extends Controller
{
    private function generateInvoiceNumber(): string
    {
        $nowIst = Carbon::now('Asia/Kolkata');
        $prefix = 'JBRS' . $nowIst->format('Ymd') . '-';
        // Find latest increment for today from schedules
        $last = Schedule::whereNotNull('s_invoice_number')
            ->where('s_invoice_number', 'like', $prefix . '%')
            ->orderBy('s_invoice_number', 'desc')
            ->first();

        $increment = 1;
        if ($last && preg_match('/-(\d+)$/', $last->s_invoice_number, $m)) {
            $increment = ((int)$m[1]) + 1;
        }
        return $prefix . $increment;
    }
  public function index(Request $request, $type = null)
    {
        // Determine listing type: 'completed' (has invoice) or 'pending' (no invoice)
        $type = $type ?: $request->route('type') ?: 'pending';
        $pageSize = (int) $request->input('pageSize', 10);
        $page = (int) $request->input('page', 1);
        $isAll = (strtolower($pageSize) === 'all' || (int)$pageSize === 0);
        $pageSize = $isAll ? null : (int)$pageSize;
        $user = $request->user();
        $query = Schedule::with(['user', 'agent', 'examcode'])
            ->whereNotNull('s_status')
            ->whereIn('s_status', ['REVOKE', 'DONE'])
            ;

        // Apply invoice presence filter by tab type
        if (strtolower((string)$type) === 'completed') {
            $query->whereNotNull('s_invoice_number');
        } else {
            // Pending tab: show those not yet invoiced
            $query->whereNull('s_invoice_number');
        }

        // If logged-in user is role_id 2, only show schedules where agent_id = user id
        if ($user && $user->role_id == 2) {
            $query->where('s_agent_id', $user->id);
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
            's_invoice_number', 's_amount',
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

    public function generatePdf(Request $request)
    {
        // New contract: generate from Schedule, not from raw request fields
        $validated = $request->validate([
            'schedule_id' => 'required|integer',
        ]);

        $schedule = Schedule::with(['examcode'])
            ->where('s_id', $validated['schedule_id'])
            ->firstOrFail();

        // Require Exam Name for invoice generation
        if (empty($schedule->s_exam_name)) {
            return response()->json(['message' => 'Exam name is required for invoice generation.'], 422);
        }
        // Require Bill To for invoice generation (s_bill_to)
        if (empty($schedule->s_bill_to)) {
            return response()->json(['message' => 'Bill to is required for invoice generation.'], 422);
        }

        // Resolve bank account from schedule.s_account_holder (may store id or name)
        $bankAccount = null;
        if (!empty($schedule->s_account_holder)) {
            // Try as ID
            if (ctype_digit((string)$schedule->s_account_holder)) {
                $bankAccount = BankAccount::find((int)$schedule->s_account_holder);
            }
            // Fallback by account_name
            if (!$bankAccount) {
                $bankAccount = BankAccount::where('account_name', $schedule->s_account_holder)->first();
            }
        }
        // Fallback to default account from settings if still not resolved
        if (!$bankAccount) {
            $defaultId = Settings::where('s_name', 'default_account')->value('s_value');
            if (!empty($defaultId)) {
                $bankAccount = BankAccount::find((int)$defaultId);
            }
        }

        // Require an account (selected or default) to proceed
        if (!$bankAccount) {
            return response()->json(['message' => 'Account is required for invoice generation. Please select an account or configure a default account.'], 422);
        }

        $nowIst = Carbon::now('Asia/Kolkata');
        $invoiceDate = $nowIst->format('M d, Y');
        // If schedule already has an invoice number, reuse it; else generate and persist
        if (!empty($schedule->s_invoice_number)) {
            $invoiceNumber = $schedule->s_invoice_number;
        } else {
            $invoiceNumber = $this->generateInvoiceNumber();
            $schedule->s_invoice_number = $invoiceNumber;
            $schedule->save();
        }

        // Try to embed logo as base64 to ensure DomPDF loads it
        $logoBase64 = null;
        $logoPath = public_path('images/company-logo.png');
        if (file_exists($logoPath)) {
            $logoBase64 = 'data:image/png;base64,' . base64_encode(file_get_contents($logoPath));
        }

        $amount = (float)($schedule->s_amount ?? 0);
        if ($amount <= 0) {
            return response()->json(['message' => 'Amount must be greater than 0 for invoice generation.'], 422);
        }
        $amountPaid = $amount; // assuming fully paid at generation time; adjust if business rules differ
        $balanceDue = max($amount - $amountPaid, 0);

        // Prepare blade variables
        $viewData = [
            'amount' => $amount,
            'amount_paid' => $amountPaid,
            'balance_due' => $balanceDue,
            'account_number' => $bankAccount->account_number ?? str_repeat('*', 11),
            'exam_code' => optional($schedule->examcode)->ex_code ?: $schedule->s_exam_code,
            'exam_name' => $schedule->s_exam_name ?? null,
            'bill_to' => $schedule->s_bill_to ?? ($schedule->s_group_name ?? 'Customer'),
            'generated_at' => $nowIst->format('d/m/Y h:i A'),
            'invoice_date' => $invoiceDate,
            'invoice_number' => $invoiceNumber,
            'logo_base64' => $logoBase64,
            // Bank account details for blade
            'bank' => [
                'account_name' => $bankAccount->account_name ?? null,
                'bank_name' => $bankAccount->bank_name ?? null,
                'account_type' => $bankAccount->account_type ?? null,
                'account_number' => $bankAccount->account_number ?? null,
                'swift_code' => $bankAccount->swift_code ?? null,
                'ifsc_code' => $bankAccount->ifsc_code ?? null,
            ],
        ];

        $pdf = Pdf::loadView('invoices.invoice', $viewData)->setPaper('A4', 'portrait');

        // Persist a copy to storage/app/invoices/{s_id}/INV-XXXX.pdf
        $dir = 'invoices/' . $schedule->s_id;
    $filename = $invoiceNumber . '.pdf';
        $fullPath = $dir . '/' . $filename;
        if (!Storage::disk('local')->exists($dir)) {
            Storage::disk('local')->makeDirectory($dir, 0755, true);
        }
        Storage::disk('local')->put($fullPath, $pdf->output());

        // Return metadata instead of streaming; client can fetch via dedicated download route
        return response()->json([
            'success' => true,
            'schedule_id' => $schedule->s_id,
            'invoice_number' => $invoiceNumber,
            'filename' => $filename,
            'storage_path' => $fullPath,
        ]);
    }

    public function generatePdfPreview(Request $request)
    {
        $data = $request->validate([
            'amount' => 'required|numeric',
            'account_number' => 'nullable|string|max:191',
            'exam_code' => 'required|string|max:191',
            'bill_to' => 'nullable|string|max:191',
            'amount_paid' => 'nullable|numeric',
            'exam_name' => 'nullable|string|max:191',
        ]);

        $accountNumber = isset($data['account_number']) && trim($data['account_number']) !== ''
            ? $data['account_number']
            : str_repeat('*', 11);

        $nowIst = Carbon::now('Asia/Kolkata');
        $invoiceNumber = 'JBRS' . $nowIst->format('Ymd') . '-1';
        $invoiceDate = $nowIst->format('M d, Y');

        $logoBase64 = null;
        $logoPath = public_path('images/company-logo.png');
        if (file_exists($logoPath)) {
            $logoBase64 = 'data:image/png;base64,' . base64_encode(file_get_contents($logoPath));
        }

        $amountPaid = array_key_exists('amount_paid', $data) ? (float)$data['amount_paid'] : (float)$data['amount'];
        $balanceDue = max(((float)$data['amount']) - $amountPaid, 0);

        $pdf = Pdf::loadView('invoices.invoice', [
            'amount' => $data['amount'],
            'amount_paid' => $amountPaid,
            'balance_due' => $balanceDue,
            'account_number' => $accountNumber,
            'exam_code' => $data['exam_code'],
            'exam_name' => $data['exam_name'] ?? null,
            'bill_to' => $data['bill_to'] ?? 'Customer',
            'generated_at' => $nowIst->format('d/m/Y h:i A'),
            'invoice_date' => $invoiceDate,
            'invoice_number' => $invoiceNumber,
            'logo_base64' => $logoBase64,
        ])->setPaper('A4', 'portrait');

        return $pdf->stream('invoice.pdf');
    }

    // Download a previously generated invoice PDF for a schedule
    public function download($scheduleId)
    {
        $schedule = Schedule::where('s_id', $scheduleId)->firstOrFail();
        if (empty($schedule->s_invoice_number)) {
            return response()->json(['message' => 'Invoice not found for this schedule'], 404);
        }
        $filename = $schedule->s_invoice_number . '.pdf';
        $relativePath = 'invoices/' . $schedule->s_id . '/' . $filename;
        if (!Storage::disk('local')->exists($relativePath)) {
            return response()->json(['message' => 'Invoice file is missing'], 404);
        }
        $absolutePath = Storage::disk('local')->path($relativePath);
        return response()->download($absolutePath, $filename);
    }
}
