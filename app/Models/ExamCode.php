<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamCode extends Model
{
    protected $table = 'examcode';
    protected $fillable = [
        'ex_code',
        'ex_validity',
    ];
}
