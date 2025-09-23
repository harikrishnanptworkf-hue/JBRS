<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class HolidaySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        $data = [];

        foreach ($days as $day) {
            $data[] = [
                'h_day'      => $day,
                'h_is_active'  => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        DB::table('holiday')->insert($data);
    }
}
