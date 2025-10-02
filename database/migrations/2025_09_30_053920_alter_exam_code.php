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
        Schema::table('examcode', function (Blueprint $table) {
            $table->integer('ex_remind_year')->nullable()->after('updated_at');
            $table->integer('ex_remind_month')->nullable()->after('ex_remind_year');
            $table->integer('ex_validity')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('examcode', function (Blueprint $table) {
            $table->dropColumn(['ex_remind_year', 'ex_remind_month']);
            // If you know the old datatype of ex_validity, restore it here.
            // Example: if it was string
            // $table->string('ex_validity')->nullable(false)->change();
        });
    }
};
