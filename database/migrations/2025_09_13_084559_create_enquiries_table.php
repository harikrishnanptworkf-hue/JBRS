<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enquiries', function (Blueprint $table) {
            $table->id('e_id'); // Auto-increment primary key
            $table->unsignedBigInteger('e_agent_id');
            $table->unsignedBigInteger('e_user_id')->nullable();
            $table->string('e_group_name', 45)->nullable();
            $table->string('e_exam_code', 45)->nullable()->default(null);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enquiries');
    }
};
