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
        Schema::create('schedule', function (Blueprint $table) {
            $table->id('s_id'); // bigint unsigned primary key, auto-increment
            $table->unsignedBigInteger('s_agent_id');
            $table->unsignedBigInteger('s_user_id')->nullable();
            $table->string('s_group_name', 45)->nullable();
            $table->string('s_exam_code', 45)->nullable();
            $table->dateTime('s_date')->nullable();
            $table->string('s_location', 191)->nullable();
            $table->decimal('s_support_fee', 10, 2)->nullable();
            $table->decimal('s_voucher_fee', 10, 2)->nullable();
            $table->text('s_comment')->nullable();
            $table->string('s_email', 191)->nullable();
            $table->string('s_phone', 20)->nullable();
            $table->date('s_remind_date')->nullable();
            $table->text('s_remind_remark')->nullable();
            $table->timestamp('s_created_at')->nullable();
            $table->timestamp('s_updated_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedule');
    }
};
