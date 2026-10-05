<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Guest extends Model
{
    protected $table = 'Guests';
    protected $primaryKey = 'GuestId';
    public $timestamps = false;

    protected $fillable = [
        'FullName',
        'Email',
        'MobileNumber',
        'AllowedGuests',
        'InvitationCode',
        'RsvpStatus',
        'Notes',
        'CreatedAt',
        'UpdatedAt',
    ];

    protected $casts = [
        'AllowedGuests' => 'integer',
        'CreatedAt' => 'datetime',
        'UpdatedAt' => 'datetime',
    ];

    public function rsvps()
    {
        return $this->hasMany(Rsvp::class, 'GuestId', 'GuestId');
    }
}
