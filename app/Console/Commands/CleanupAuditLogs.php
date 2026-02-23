<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanupAuditLogs extends Command
{
    protected $signature = 'logs:cleanup';
    protected $description = 'Delete audit logs older than 6 months';

    public function handle()
    {
        $cutoff = now()->subMonths(6);
        $chunkSize = 1000;

        $tables = [
            'examcode_log',
            'schedule_log',
            'enquiries_log',
        ];

        foreach ($tables as $table) {
            do {
                $ids = DB::table($table)
                    ->where('action_time', '<', $cutoff)
                    ->limit($chunkSize)
                    ->pluck('id');

                if ($ids->isEmpty()) {
                    break;
                }

                DB::table($table)->whereIn('id', $ids)->delete();
            } while (true);
        }

        $this->info('Old audit logs cleaned successfully.');
    }
}