<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EntourageItem extends Model
{
    protected $table = 'Entourage';
    protected $primaryKey = 'Id';
    public $timestamps = false;

    protected $fillable = [
        'Category',
        'Name',
        'Role',
        'DisplayOrder',
    ];

    protected $casts = [
        'DisplayOrder' => 'integer',
    ];
}
