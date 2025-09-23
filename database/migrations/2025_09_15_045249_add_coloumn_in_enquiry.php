<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('enquiries', function (Blueprint $table) {

            $table->string('location')->nullable()->after('e_date');
            $table->decimal('support_fee', 10, 2)->nullable()->after('location');
            $table->decimal('voucher_fee', 10, 2)->nullable()->after('support_fee');
            $table->text('comment')->nullable()->after('voucher_fee');
            $table->string('email')->nullable()->after('comment');
            $table->string('phone', 20)->nullable()->after('email');
            $table->date('remind_date')->nullable()->after('phone');
            $table->text('remind_remark')->nullable()->after('remind_date');
        });
    }

    public function down(): void
    {
        Schema::table('enquiries', function (Blueprint $table) {

            $table->dropColumn([
                'location',
                'support_fee',
                'voucher_fee',
                'comment',
                'email',
                'phone',
                'remind_date',
                'remind_remark'
            ]);
        });
    }
};
