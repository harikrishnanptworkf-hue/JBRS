<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            ['s_name' => 'from_time', 's_value' => null, 'created_at' => now(), 'updated_at' => now()],
            ['s_name' => 'to_time',   's_value' => null, 'created_at' => now(), 'updated_at' => now()],
            ['s_name' => 'f_format',  's_value' => null, 'created_at' => now(), 'updated_at' => now()],
            ['s_name' => 't_format',  's_value' => null, 'created_at' => now(), 'updated_at' => now()],
        ];

        DB::table('settings')->insert($settings);
    }
}
