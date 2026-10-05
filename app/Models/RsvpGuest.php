<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RsvpGuest extends Model
{
    protected $table = 'RSVPGuests';
    protected $primaryKey = 'Id';
    public $timestamps = false;

    protected $fillable = [
        'RsvpId',
        'GuestName',
        'MealPreference',
        'DietaryRestrictions',
    ];

    public function rsvp()
    {
        return $this->belongsTo(Rsvp::class, 'RsvpId', 'RSVPId');
    }
}
