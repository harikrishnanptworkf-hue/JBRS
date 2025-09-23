<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Enquiry;

class EnquirySeeder extends Seeder
{
    public function run()
    {
        // Seed 50 enquiries
        Enquiry::factory()->count(50)->create();
    }
}
