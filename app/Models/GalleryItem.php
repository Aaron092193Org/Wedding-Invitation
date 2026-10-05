<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GalleryItem extends Model
{
    protected $table = 'Gallery';
    protected $primaryKey = 'Id';
    public $timestamps = false;

    protected $fillable = [
        'ImageUrl',
        'ThumbnailUrl',
        'Caption',
        'Category',
        'DisplayOrder',
        'IsActive',
        'CreatedDate',
    ];

    protected $casts = [
        'DisplayOrder' => 'integer',
        'IsActive' => 'boolean',
        'CreatedDate' => 'datetime',
    ];
}
