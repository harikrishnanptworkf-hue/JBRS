<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomHoliday extends Model
{
    //
    protected $table = 'custom_holiday';
    protected $fillable = [
        'ch_date',
        'ch_reason',
    ];

    // Add this accessor to format ch_date as d/m/Y
    public function getFormattedDateAttribute()
    {
        return $this->ch_date ? date('d/m/Y', strtotime($this->ch_date)) : null;
    }
}
