<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('schedule', function (Blueprint $table) {
            $table->text('s_status')->nullable();
            $table->text('s_system_name')->nullable();
            $table->text('s_access_code')->nullable();
            $table->text('s_done_by')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schedule', function (Blueprint $table) {
            $table->dropColumn(['s_status', 's_system_name', 's_access_code', 's_done_by']);
        });
    }
};
