<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rsvp extends Model
{
    protected $table = 'RSVPs';
    protected $primaryKey = 'RSVPId';
    public $timestamps = false;

    protected $fillable = [
        'GuestId',
        'FullName',
        'Email',
        'MobileNumber',
        'AttendanceStatus',
        'NumberOfGuests',
        'MealPreference',
        'DietaryRestrictions',
        'Message',
        'SubmittedDate',
        'UpdatedDate',
        'IPAddress',
    ];

    protected $casts = [
        'GuestId' => 'integer',
        'NumberOfGuests' => 'integer',
        'SubmittedDate' => 'datetime',
        'UpdatedDate' => 'datetime',
    ];

    public function guest()
    {
        return $this->belongsTo(Guest::class, 'GuestId', 'GuestId');
    }

    public function companionGuests()
    {
        return $this->hasMany(RsvpGuest::class, 'RsvpId', 'RSVPId');
    }
}
