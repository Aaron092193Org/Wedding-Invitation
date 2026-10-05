<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TimelineItem extends Model
{
    protected $table = 'Timeline';
    protected $primaryKey = 'Id';
    public $timestamps = false;

    protected $fillable = [
        'Time',
        'Title',
        'Description',
        'Icon',
        'DisplayOrder',
    ];

    protected $casts = [
        'DisplayOrder' => 'integer',
    ];
}
