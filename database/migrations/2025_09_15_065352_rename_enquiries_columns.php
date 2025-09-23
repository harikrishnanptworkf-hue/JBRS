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
        Schema::table('enquiries', function (Blueprint $table) {
            $table->renameColumn('location', 'e_location');
            $table->renameColumn('support_fee', 'e_support_fee');
            $table->renameColumn('voucher_fee', 'e_voucher_fee');
            $table->renameColumn('comment', 'e_comment');
            $table->renameColumn('email', 'e_email');
            $table->renameColumn('phone', 'e_phone');
            $table->renameColumn('remind_date', 'e_remind_date');
            $table->renameColumn('remind_remark', 'e_remind_remark');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('enquiries', function (Blueprint $table) {
            $table->renameColumn('e_location', 'location');
            $table->renameColumn('e_support_fee', 'support_fee');
            $table->renameColumn('e_voucher_fee', 'voucher_fee');
            $table->renameColumn('e_comment', 'comment');
            $table->renameColumn('e_email', 'email');
            $table->renameColumn('e_phone', 'phone');
            $table->renameColumn('e_remind_date', 'remind_date');
            $table->renameColumn('e_remind_remark', 'remind_remark');
        });
    }
};
