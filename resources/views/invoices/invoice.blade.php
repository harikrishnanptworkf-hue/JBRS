<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #222; font-size: 12px; }
        .wrap { padding: 24px; }
        @page { margin: 24px; }

        /* Avoid breaking important blocks across pages */
        table { page-break-inside: auto; width: 100%; }
        tr    { page-break-inside: avoid; page-break-after: auto; }
        .totals, .account-info, .meta-row, .header { page-break-inside: avoid; }
        .billto-name, .company { word-wrap: break-word; }
        /* Base */
        .header { width: 100%; }
        body { font-family: DejaVu Sans, sans-serif; color: #222; font-size: 12px; }
        .wrap { padding: 24px; }
    .logo { height: 42px; }

        /* Header */
        .header { width: 100%; }
        .header td { vertical-align: top; }
        .logo-block { width: 60%; }
    .logo { height: 42px; }
        .company { font-size: 12px; margin-top: 10px; line-height: 1.4; }
        .invoice-block { text-align: right; }
        .invoice-title { font-size: 28px; letter-spacing: 1px; font-weight: 700; }
        .invoice-no { margin-top: 6px; font-size: 12px; color: #444; }

        /* Meta row */
        .meta-row { margin-top: 16px; width: 100%; }
        .meta-row td { padding: 0; }
        .meta-left { width: 60%; }
        .billto-label { color: #777; font-weight: 600; }
        .billto-name { font-weight: 700; margin-top: 6px; }
        .meta-right { text-align: right; }
        .date { margin-bottom: 6px; }
        .balance { background: #f3f3f3; display: inline-block; padding: 8px 12px; border-radius: 4px; font-weight: 700; }

        /* Items table */
    .items { width: 100%; border-collapse: collapse; margin-top: 24px; table-layout: fixed; }
        .items thead th { background: #3a3a3a; color: #fff; padding: 8px; font-weight: 600; text-align: left; }
        .items tbody td { padding: 10px 8px; border-bottom: 1px solid #e8e8e8; }
        .text-right { text-align: right; }
    .w-15 { width: 15%; }

    /* Totals */
    .totals { width: 40%; margin-left: 60%; margin-top: 8px; }
    .totals .row { display: flex; justify-content: flex-end; align-items: center; gap: 10px; padding: 6px 0; }
    .totals .label { color: #777; text-align: right; min-width: 120px; }
    .totals .value { font-weight: 700; text-align: right; min-width: 90px; }

        /* Account info */
        .section-title { margin-top: 20px; font-weight: 700; color: #666; }
        .account-info { margin-top: 6px; line-height: 1.6; }

        /* Terms */
        .terms { margin-top: 16px; line-height: 1.5; font-size: 11px; color: #555; }
    </style>
    @php
        function rup($n){ return '₹' . number_format((float)$n, 2); }
    @endphp
</head>
<body>
    <div class="wrap">
        <table class="header">
            <tr>
                <td class="logo-block">
                    @if(!empty($logo_base64))
                        <img class="logo" src="{{ $logo_base64 }}" alt="Logo"/>
                    @else
                        <strong>JBRS Global Solutions LLP</strong>
                    @endif
                    <div class="company muted">
                        JBRS Global Solutions LLP<br/>
                        # 414, 9th Main, HRBR Layout<br/>
                        Bengaluru 560043<br/>
                        Email: info@jbrsglobal.com<br/>
                        Phone: 0495-4602492
                    </div>
                </td>
                <td class="invoice-block">
                    <div class="invoice-title">INVOICE</div>
                    <div class="invoice-no"># {{ $invoice_number }}</div>
                </td>
            </tr>
        </table>

        <table class="meta-row">
            <tr>
                <td class="meta-left">
                    <div class="billto-label">Bill To:</div>
                    <div class="billto-name">{{ $bill_to }}</div>
                </td>
                <td class="meta-right">
                    <div class="date">Date: {{ $invoice_date }}</div>
                    <div class="balance">Balance Due: {{ rup($balance_due ?? 0) }}</div>
                </td>
            </tr>
        </table>

        <table class="items">
            <thead>
                <tr>
                    <th>Item</th>
                    <th class="w-15">Quantity</th>
                    <th class="w-15">Rate</th>
                    <th class="w-15">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        {{ $exam_code }}@if(!empty($exam_name)) : {{ $exam_name }}@endif
                    </td>
                    <td class="text-right">1</td>
                    <td class="text-right">{{ rup($amount) }}</td>
                    <td class="text-right">{{ rup($amount) }}</td>
                </tr>
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="3" class="text-right"><strong>Subtotal:</strong></td>
                    <td class="text-right">{{ rup($amount) }}</td>
                </tr>
                <tr>
                    <td colspan="3" class="text-right"><strong>Tax (%):</strong></td>
                    <td class="text-right">{{ rup(0) }}</td>
                </tr>
                <tr>
                    <td colspan="3" class="text-right"><strong>Total:</strong></td>
                    <td class="text-right">{{ rup($amount) }}</td>
                </tr>
                <tr>
                    <td colspan="3" class="text-right"><strong>Amount Paid:</strong></td>
                    <td class="text-right">{{ rup($amount_paid ?? 0) }}</td>
                </tr>
            </tfoot>
        </table>

        <div class="section-title">Account Info:</div>
        <div class="account-info">
            @if(!empty($bank['bank_name']))
                Bank: {{ $bank['bank_name'] }}<br/>
            @endif
            @if(!empty($bank['account_name']))
                Account Name: {{ $bank['account_name'] }}<br/>
            @endif
            @if(!empty($bank['account_type']))
                Account Type: {{ $bank['account_type'] }}<br/>
            @endif
            @if(!empty($bank['account_number']))
                Account No: {{ $bank['account_number'] }}<br/>
            @endif
            @if(!empty($bank['swift_code']))
                SWIFT Code: {{ $bank['swift_code'] }}<br/>
            @endif
            @if(!empty($bank['ifsc_code']))
                IFSC: {{ $bank['ifsc_code'] }}
            @endif
        </div>

        <div class="terms">
            <strong>Terms:</strong><br/>
            • This service comes with a limited support period of 10 days. Please retain this invoice for your records.<br/>
            • Payments are non-refundable once the exam has been scheduled.
        </div>
    </div>
</body>
</html>
