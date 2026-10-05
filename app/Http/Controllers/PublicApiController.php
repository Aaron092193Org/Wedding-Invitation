<?php

namespace App\Http\Controllers;

use App\Models\EntourageItem;
use App\Models\FaqItem;
use App\Models\GalleryItem;
use App\Models\GiftInformation;
use App\Models\Guest;
use App\Models\Rsvp;
use App\Models\RsvpGuest;
use App\Models\TimelineItem;
use App\Models\WeddingSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PublicApiController extends Controller
{
    /**
     * Get wedding configuration and theme details.
     */
    public function getWeddingInfo()
    {
        $settings = WeddingSetting::all()->pluck('Value', 'Key')->toArray();

        // Convert PascalCase keys to camelCase for frontend compatibility
        $camelConfig = [];
        foreach ($settings as $key => $val) {
            $camelKey = lcfirst($key);
            $camelConfig[$camelKey] = $val;
        }

        // Cast boolean and integer values
        $camelConfig['allowPlusOne'] = filter_var($settings['AllowPlusOne'] ?? 'true', FILTER_VALIDATE_BOOLEAN);
        $camelConfig['allowChildren'] = filter_var($settings['AllowChildren'] ?? 'false', FILTER_VALIDATE_BOOLEAN);
        $camelConfig['maxGuestsPerRsvp'] = (int) ($settings['MaxGuestsPerRsvp'] ?? 4);
        $camelConfig['giftSectionEnabled'] = filter_var($settings['GiftSectionEnabled'] ?? 'true', FILTER_VALIDATE_BOOLEAN);

        return response()->json($camelConfig);
    }

    /**
     * Get timeline events.
     */
    public function getTimeline()
    {
        $items = TimelineItem::orderBy('DisplayOrder')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->Id,
                    'time' => $item->Time,
                    'title' => $item->Title,
                    'description' => $item->Description,
                    'icon' => $item->Icon,
                    'displayOrder' => $item->DisplayOrder,
                ];
            });

        return response()->json($items);
    }

    /**
     * Get entourage members.
     */
    public function getEntourage()
    {
        $items = EntourageItem::orderBy('DisplayOrder')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->Id,
                    'category' => $item->Category,
                    'name' => $item->Name,
                    'role' => $item->Role,
                    'displayOrder' => $item->DisplayOrder,
                ];
            });

        $grouped = $items->groupBy('category');

        return response()->json([
            'all' => $items,
            'grouped' => $grouped,
        ]);
    }

    /**
     * Get public gallery items.
     */
    public function getGallery()
    {
        $items = GalleryItem::where('IsActive', true)
            ->orderBy('DisplayOrder')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->Id,
                    'imageUrl' => $item->ImageUrl,
                    'thumbnailUrl' => $item->ThumbnailUrl,
                    'caption' => $item->Caption,
                    'category' => $item->Category,
                    'displayOrder' => $item->DisplayOrder,
                ];
            });

        return response()->json($items);
    }

    /**
     * Get FAQs.
     */
    public function getFaqs()
    {
        $items = FaqItem::where('IsActive', true)
            ->orderBy('DisplayOrder')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->Id,
                    'question' => $item->Question,
                    'answer' => $item->Answer,
                    'displayOrder' => $item->DisplayOrder,
                ];
            });

        return response()->json($items);
    }

    /**
     * Get gift registry details.
     */
    public function getGiftInfo()
    {
        $enabled = filter_var(WeddingSetting::where('Key', 'GiftSectionEnabled')->value('Value') ?? 'true', FILTER_VALIDATE_BOOLEAN);
        $message = WeddingSetting::where('Key', 'GiftMessage')->value('Value') ?? '';

        if (!$enabled) {
            return response()->json([
                'enabled' => false,
                'items' => [],
                'message' => $message,
            ]);
        }

        $items = GiftInformation::where('IsEnabled', true)
            ->orderBy('DisplayOrder')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->Id,
                    'paymentType' => $item->PaymentType,
                    'accountName' => $item->AccountName,
                    'accountNumber' => $item->AccountNumber,
                    'qrCodeUrl' => $item->QrCodeUrl,
                    'instructions' => $item->Instructions,
                    'displayOrder' => $item->DisplayOrder,
                ];
            });

        return response()->json([
            'enabled' => true,
            'items' => $items,
            'message' => $message,
        ]);
    }

    /**
     * Lookup guest by invitation code, email, or mobile.
     */
    public function lookupGuest($code)
    {
        $code = trim($code);
        $upperCode = strtoupper($code);
        $lowerCode = strtolower($code);

        $guest = Guest::whereRaw('UPPER(InvitationCode) = ?', [$upperCode])
            ->orWhereRaw('LOWER(Email) = ?', [$lowerCode])
            ->orWhere('MobileNumber', $code)
            ->first();

        if (!$guest) {
            return response()->json([
                'success' => false,
                'message' => 'Invitation code or guest details not found. Please double-check your code or proceed with general RSVP.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'guest' => [
                'guestId' => $guest->GuestId,
                'fullName' => $guest->FullName,
                'email' => $guest->Email,
                'mobileNumber' => $guest->MobileNumber,
                'allowedGuests' => (int) $guest->AllowedGuests,
                'invitationCode' => $guest->InvitationCode,
                'rsvpStatus' => $guest->RsvpStatus,
                'notes' => $guest->Notes,
            ],
        ]);
    }

    /**
     * Check duplicate RSVP submission by email or mobile, and retrieve allocated guest info if registered.
     */
    public function checkDuplicate(Request $request)
    {
        $email = trim($request->input('email', ''));
        $mobile = trim($request->input('mobileNumber', ''));

        $query = Rsvp::query();

        if (!empty($email) && !empty($mobile)) {
            $query->where(function ($q) use ($email, $mobile) {
                $q->whereRaw('LOWER(Email) = ?', [strtolower($email)])
                  ->orWhere('MobileNumber', $mobile);
            });
        } elseif (!empty($email)) {
            $query->whereRaw('LOWER(Email) = ?', [strtolower($email)]);
        } elseif (!empty($mobile)) {
            $query->where('MobileNumber', $mobile);
        } else {
            return response()->json(['exists' => false, 'guest' => null]);
        }

        $existing = $query->first();

        // Also check if there is an allocated Guest record in the Guests table
        $guestQuery = Guest::query();
        if (!empty($email) && !empty($mobile)) {
            $guestQuery->where(function ($q) use ($email, $mobile) {
                $q->whereRaw('LOWER(Email) = ?', [strtolower($email)])
                  ->orWhere('MobileNumber', $mobile);
            });
        } elseif (!empty($email)) {
            $guestQuery->whereRaw('LOWER(Email) = ?', [strtolower($email)]);
        } elseif (!empty($mobile)) {
            $guestQuery->where('MobileNumber', $mobile);
        }
        $matchedGuest = $guestQuery->first();
        $guestData = null;
        if ($matchedGuest) {
            $guestData = [
                'guestId' => $matchedGuest->GuestId,
                'fullName' => $matchedGuest->FullName,
                'email' => $matchedGuest->Email,
                'mobileNumber' => $matchedGuest->MobileNumber,
                'allowedGuests' => (int) $matchedGuest->AllowedGuests,
                'invitationCode' => $matchedGuest->InvitationCode,
                'rsvpStatus' => $matchedGuest->RsvpStatus,
            ];
        }

        if ($existing) {
            return response()->json([
                'exists' => true,
                'rsvpId' => $existing->RSVPId,
                'fullName' => $existing->FullName,
                'attendanceStatus' => $existing->AttendanceStatus,
                'numberOfGuests' => (int) $existing->NumberOfGuests,
                'submittedDate' => $existing->SubmittedDate ? $existing->SubmittedDate->toIso8601String() : null,
                'guest' => $guestData,
            ]);
        }

        return response()->json([
            'exists' => false,
            'guest' => $guestData,
        ]);
    }

    /**
     * Submit RSVP.
     */
    public function submitRsvp(Request $request)
    {
        $request->validate([
            'fullName' => 'required|string|max:150',
            'email' => 'required|email|max:150',
            'mobileNumber' => 'required|string|max:50',
            'attendanceStatus' => 'required|string|in:Attending,Declined',
            'numberOfGuests' => 'nullable|integer|min:0|max:10',
            'guestCount' => 'nullable|integer|min:0|max:10',
        ]);

        $email = strtolower(trim($request->input('email')));
        $mobile = trim($request->input('mobileNumber'));
        $status = $request->input('attendanceStatus');
        $numberOfGuests = $status === 'Attending' ? (int) ($request->input('numberOfGuests') ?? $request->input('guestCount') ?? 1) : 0;
        $invitationCode = $request->input('invitationCode');
        $guestId = $request->input('guestId');

        // Check duplicate RSVP if not updating
        $existing = Rsvp::where(function ($q) use ($email, $mobile) {
            $q->whereRaw('LOWER(Email) = ?', [$email])
              ->orWhere('MobileNumber', $mobile);
        })->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'An RSVP with this email or mobile number has already been submitted.',
                'rsvpId' => $existing->RSVPId,
            ], 409);
        }

        return DB::transaction(function () use ($request, $email, $mobile, $status, $numberOfGuests, $invitationCode, $guestId) {
            $linkedGuest = null;
            if ($guestId) {
                $linkedGuest = Guest::find($guestId);
            } elseif ($invitationCode) {
                $linkedGuest = Guest::whereRaw('UPPER(InvitationCode) = ?', [strtoupper(trim($invitationCode))])->first();
            } elseif (!empty($email) || !empty($mobile)) {
                $linkedGuest = Guest::where(function ($q) use ($email, $mobile) {
                    if (!empty($email)) $q->whereRaw('LOWER(Email) = ?', [$email]);
                    if (!empty($mobile)) $q->orWhere('MobileNumber', $mobile);
                })->first();
            }

            if ($linkedGuest) {
                $linkedGuest->update([
                    'RsvpStatus' => $status,
                    'UpdatedAt' => now(),
                ]);
            }

            $rsvp = Rsvp::create([
                'GuestId' => $linkedGuest ? $linkedGuest->GuestId : null,
                'FullName' => trim($request->input('fullName')),
                'Email' => $email,
                'MobileNumber' => $mobile,
                'AttendanceStatus' => $status,
                'NumberOfGuests' => $numberOfGuests,
                'MealPreference' => $request->input('mealPreference'),
                'DietaryRestrictions' => $request->input('dietaryRestrictions'),
                'Message' => $request->input('message'),
                'SubmittedDate' => now(),
                'IPAddress' => $request->ip(),
            ]);

            // Save companions if attending
            if ($status === 'Attending' && $request->has('companionGuests') && is_array($request->input('companionGuests'))) {
                foreach ($request->input('companionGuests') as $c) {
                    if (!empty($c['guestName'])) {
                        RsvpGuest::create([
                            'RsvpId' => $rsvp->RSVPId,
                            'GuestName' => trim($c['guestName']),
                            'MealPreference' => $c['mealPreference'] ?? null,
                            'DietaryRestrictions' => $c['dietaryRestrictions'] ?? null,
                        ]);
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Thank you! Your RSVP has been received.',
                'rsvpId' => $rsvp->RSVPId,
            ]);
        });
    }

    /**
     * Update RSVP by ID.
     */
    public function updateRsvp(Request $request, $id)
    {
        $rsvp = Rsvp::find($id);
        if (!$rsvp) {
            return response()->json([
                'success' => false,
                'message' => 'RSVP not found.',
            ], 404);
        }

        $status = $request->input('attendanceStatus', $rsvp->AttendanceStatus);
        $numberOfGuests = $status === 'Attending' ? (int) $request->input('numberOfGuests', 1) : 0;

        return DB::transaction(function () use ($request, $rsvp, $status, $numberOfGuests) {
            $rsvp->update([
                'FullName' => trim($request->input('fullName', $rsvp->FullName)),
                'Email' => strtolower(trim($request->input('email', $rsvp->Email))),
                'MobileNumber' => trim($request->input('mobileNumber', $rsvp->MobileNumber)),
                'AttendanceStatus' => $status,
                'NumberOfGuests' => $numberOfGuests,
                'MealPreference' => $request->input('mealPreference', $rsvp->MealPreference),
                'DietaryRestrictions' => $request->input('dietaryRestrictions', $rsvp->DietaryRestrictions),
                'Message' => $request->input('message', $rsvp->Message),
                'UpdatedDate' => now(),
            ]);

            if ($rsvp->GuestId) {
                Guest::where('GuestId', $rsvp->GuestId)->update([
                    'RsvpStatus' => $status,
                    'UpdatedAt' => now(),
                ]);
            }

            // Sync companions
            RsvpGuest::where('RsvpId', $rsvp->RSVPId)->delete();
            if ($status === 'Attending' && $request->has('companionGuests') && is_array($request->input('companionGuests'))) {
                foreach ($request->input('companionGuests') as $c) {
                    if (!empty($c['guestName'])) {
                        RsvpGuest::create([
                            'RsvpId' => $rsvp->RSVPId,
                            'GuestName' => trim($c['guestName']),
                            'MealPreference' => $c['mealPreference'] ?? null,
                            'DietaryRestrictions' => $c['dietaryRestrictions'] ?? null,
                        ]);
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'RSVP updated successfully.',
                'rsvpId' => $rsvp->RSVPId,
            ]);
        });
    }
}
