<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Enquiry;
use Carbon\Carbon;

class UpdateEnquiryEDateSeeder extends Seeder
{
    public function run(): void
    {
        Enquiry::all()->each(function ($enquiry) {
            $enquiry->update([
                'e_date' => Carbon::now()->subDays(rand(0, 30))->setTime(rand(8, 18), rand(0, 59)),
            ]);
        });
    }
}
