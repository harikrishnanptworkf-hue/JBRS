<?php

namespace Database\Factories;

use App\Models\Enquiry;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class EnquiryFactory extends Factory
{
    protected $model = Enquiry::class;

    public function definition()
    {
        // pick random agent (role_id = 2)
        $agent = User::where('role_id', 2)->inRandomOrder()->first();

        // pick random user (role_id = 3)
        $user = User::where('role_id', 3)->inRandomOrder()->first();

        return [
            'e_agent_id'   => $agent ? $agent->id : null,
            'e_user_id'    => $user ? $user->id : null,
            'e_group_name' => $this->faker->company,
            'e_exam_code'  => strtoupper($this->faker->bothify('EX###')),
            'e_date'       => $this->faker->dateTimeBetween('-1 year', 'now'),
        ];
    }
}
