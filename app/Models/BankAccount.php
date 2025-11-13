<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BankAccount extends Model
{
    use HasFactory;

    protected $table = 'bank_accounts';

    protected $primaryKey = 'id';

    protected $fillable = [
        'account_name',
        'bank_name',
        'account_number',
        'account_type',
        'swift_code',
        'ifsc_code',
    ];

    public $timestamps = true;

    const CREATED_AT = 'created_at';
    const UPDATED_AT = 'updated_at';
}
