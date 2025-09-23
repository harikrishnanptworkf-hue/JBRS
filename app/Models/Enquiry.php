<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Enquiry extends Model
{
    use HasFactory;

    protected $table = 'enquiries';
    protected $primaryKey = 'e_id';
    public $incrementing = true;
    protected $keyType = 'int';
    protected $appends = ['formatted_e_date', 'formatted_remind_date', 'formatted_created_at', 'formatted_updated_at'];

    protected $fillable = [
        'e_agent_id',
        'e_user_id',
        'e_group_name',
        'e_exam_code',
        'e_date',
        'e_location',
        'e_support_fee',
        'e_voucher_fee',
        'e_comment',
        'e_email',
        'e_phone',
        'e_remind_date',
        'e_remind_remark',
        'e_area'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'e_user_id');
    }

    public function agent()
    {
        return $this->belongsTo(User::class, 'e_agent_id');
    }

    public function getFormattedEDateAttribute()
    {
        return $this->e_date
            ? Carbon::parse($this->e_date)->setTimezone('Asia/Kolkata')->format('d/m/Y-h:i A')
            : null;
    }

    public function getFormattedRemindDateAttribute()
    {
        return $this->e_remind_date
            ? Carbon::parse($this->e_remind_date)->format('d/m/Y')
            : null;
    }

    public function getFormattedCreatedAtAttribute()
    {
        return $this->created_at
            ? Carbon::parse($this->created_at)->format('d/m/Y-h:i A')
            : null;
    }

    public function getFormattedUpdatedAtAttribute()
    {
        return $this->updated_at
            ? Carbon::parse($this->updated_at)->format('d/m/Y-h:i A')
            : null;
    }
}
