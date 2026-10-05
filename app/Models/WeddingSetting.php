<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WeddingSetting extends Model
{
    protected $table = 'WeddingSettings';
    protected $primaryKey = 'Id';
    public $timestamps = false;

    protected $fillable = [
        'Key',
        'Value',
        'Category',
        'Description',
        'UpdatedDate',
    ];

    protected $casts = [
        'UpdatedDate' => 'datetime',
    ];
}
