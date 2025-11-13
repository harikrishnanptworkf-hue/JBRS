<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    use HasFactory;

    protected $table = 'schedule';
    protected $primaryKey = 's_id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        's_agent_id',
        's_user_id',
        's_group_name',
        's_bill_to',
        's_exam_code',
        's_date',
        's_location',
        's_support_fee',
        's_voucher_fee',
        's_amount',
        's_account_holder',
        's_comment',
        's_email',
        's_phone',
        's_remind_date',
        's_remind_remark',
        's_created_at',
        's_updated_at',
        's_area',
        's_status',
        's_system_name',
        's_access_code',
        's_done_by',
        's_exam_name',
        's_invoice_number'
    ];

    protected $appends = ['formatted_created_at', 'formatted_updated_at', 'formatted_s_date','formatted_s_date_original'];

    public $timestamps = false;

    // Optionally, add relationships for user/agent if needed
    public function user()
    {
        return $this->belongsTo(User::class, 's_user_id');
    }

    public function examcode()
    {
        return $this->belongsTo(ExamCode::class, 's_exam_code');
    }


    public function agent()
    {
        return $this->belongsTo(User::class, 's_agent_id');
    }

    public function getFormattedCreatedAtAttribute()
    {
        return $this->s_created_at
            ? \Carbon\Carbon::parse($this->s_created_at)->format('d/m/Y-h:i A')
            : null;
    }

    public function getFormattedUpdatedAtAttribute()
    {
        return $this->s_updated_at
            ? \Carbon\Carbon::parse($this->s_updated_at)->format('d/m/Y-h:i A')
            : null;
    }
    
    public function getFormattedSDateAttribute()
    {
        return $this->s_date
            ? \Carbon\Carbon::parse($this->s_date)->setTimezone('Asia/Kolkata')->format('d/m/Y-h:i A')
            : null;
    }

    public function getFormattedSDateOriginalAttribute()
    {
        return $this->s_date
            ? \Carbon\Carbon::parse($this->s_date)->format('d/m/Y-h:i A')
            : null;
    }
}
