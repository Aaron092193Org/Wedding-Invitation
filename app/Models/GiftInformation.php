<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GiftInformation extends Model
{
    protected $table = 'GiftInformation';
    protected $primaryKey = 'Id';
    public $timestamps = false;

    protected $fillable = [
        'PaymentType',
        'AccountName',
        'AccountNumber',
        'QrCodeUrl',
        'Instructions',
        'DisplayOrder',
        'IsEnabled',
    ];

    protected $casts = [
        'DisplayOrder' => 'integer',
        'IsEnabled' => 'boolean',
    ];
}
