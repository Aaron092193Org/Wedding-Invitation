<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class AdminUser extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'AdminUsers';
    protected $primaryKey = 'Id';
    public $timestamps = false;

    protected $fillable = [
        'Username',
        'Email',
        'PasswordHash',
        'FullName',
        'CreatedAt',
        'LastLogin',
    ];

    protected $hidden = [
        'PasswordHash',
    ];

    protected $casts = [
        'CreatedAt' => 'datetime',
        'LastLogin' => 'datetime',
    ];

    public function getAuthPassword()
    {
        return $this->PasswordHash;
    }
}
