<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FaqItem extends Model
{
    protected $table = 'FAQs';
    protected $primaryKey = 'Id';
    public $timestamps = false;

    protected $fillable = [
        'Question',
        'Answer',
        'DisplayOrder',
        'IsActive',
    ];

    protected $casts = [
        'DisplayOrder' => 'integer',
        'IsActive' => 'boolean',
    ];
}
