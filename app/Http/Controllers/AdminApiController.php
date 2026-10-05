<?php

namespace App\Http\Controllers;

use App\Models\EntourageItem;
use App\Models\FaqItem;
use App\Models\GalleryItem;
use App\Models\Guest;
use App\Models\Rsvp;
use App\Models\RsvpGuest;
use App\Models\TimelineItem;
use App\Models\WeddingSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class AdminApiController extends Controller
{
    #region Dashboard & Stats
    public function getDashboardStats()
    {
        $totalGuestsInvited = (int) Guest::sum('AllowedGuests');
        $totalAttending = (int) Rsvp::where('AttendanceStatus', 'Attending')->sum('NumberOfGuests');
        $totalDeclined = (int) Rsvp::where('AttendanceStatus', 'Declined')->count();
        $totalPending = (int) Guest::where('RsvpStatus', 'Pending')->count();
        $totalRsvps = (int) Rsvp::count();

        $totalResponses = $totalAttending + $totalDeclined;
        $attendanceRate = $totalResponses > 0
            ? round(($totalAttending / $totalResponses) * 100, 1)
            : 0;

        // Party size distribution
        $attendingRsvps = Rsvp::where('AttendanceStatus', 'Attending')->get();
        $party1 = $attendingRsvps->where('NumberOfGuests', 1)->count();
        $party2 = $attendingRsvps->where('NumberOfGuests', 2)->count();
        $party3 = $attendingRsvps->where('NumberOfGuests', 3)->count();
        $party4Plus = $attendingRsvps->where('NumberOfGuests', '>=', 4)->count();

        // Recent 5 RSVPs
        $recentRsvps = Rsvp::with('companionGuests')
            ->orderBy('SubmittedDate', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($r) {
                return [
                    'rsvpId' => $r->RSVPId,
                    'guestId' => $r->GuestId,
                    'fullName' => $r->FullName,
                    'email' => $r->Email,
                    'mobileNumber' => $r->MobileNumber,
                    'attendanceStatus' => $r->AttendanceStatus,
                    'numberOfGuests' => $r->NumberOfGuests,
                    'mealPreference' => $r->MealPreference,
                    'dietaryRestrictions' => $r->DietaryRestrictions,
                    'message' => $r->Message,
                    'submittedDate' => $r->SubmittedDate ? $r->SubmittedDate->toIso8601String() : null,
                    'companionGuests' => $r->companionGuests->map(function ($c) {
                        return [
                            'guestName' => $c->GuestName,
                            'mealPreference' => $c->MealPreference,
                            'dietaryRestrictions' => $c->DietaryRestrictions,
                        ];
                    }),
                ];
            });

        return response()->json([
            'totalGuestsInvited' => $totalGuestsInvited,
            'totalAttending' => $totalAttending,
            'totalDeclined' => $totalDeclined,
            'totalPending' => $totalPending,
            'totalRsvps' => $totalRsvps,
            'attendanceRate' => $attendanceRate,
            'partySizeDistribution' => [
                'party1' => $party1,
                'party2' => $party2,
                'party3' => $party3,
                'party4Plus' => $party4Plus,
            ],
            'recentRsvps' => $recentRsvps,
        ]);
    }
    #endregion

    #region RSVP Management
    public function getRsvps(Request $request)
    {
        $search = $request->input('search');
        $status = $request->input('status');
        $page = max(1, (int) $request->input('page', 1));
        $pageSize = max(1, min(100, (int) $request->input('pageSize', 10)));
        $sortBy = $request->input('sortBy', 'date_desc');

        $query = Rsvp::with('companionGuests');

        if (!empty($search)) {
            $term = '%' . strtolower(trim($search)) . '%';
            $query->where(function ($q) use ($term) {
                $q->whereRaw('LOWER(FullName) LIKE ?', [$term])
                  ->orWhereRaw('LOWER(Email) LIKE ?', [$term])
                  ->orWhere('MobileNumber', 'LIKE', $term);
            });
        }

        if (!empty($status) && $status !== 'All') {
            $query->where('AttendanceStatus', $status);
        }

        switch ($sortBy) {
            case 'date_asc':
                $query->orderBy('SubmittedDate', 'asc');
                break;
            case 'name_asc':
                $query->orderBy('FullName', 'asc');
                break;
            case 'name_desc':
                $query->orderBy('FullName', 'desc');
                break;
            case 'date_desc':
            default:
                $query->orderBy('SubmittedDate', 'desc');
                break;
        }

        $totalCount = $query->count();
        $totalPages = (int) ceil($totalCount / $pageSize);

        $items = $query->skip(($page - 1) * $pageSize)
            ->take($pageSize)
            ->get()
            ->map(function ($r) {
                return [
                    'rsvpId' => $r->RSVPId,
                    'guestId' => $r->GuestId,
                    'fullName' => $r->FullName,
                    'email' => $r->Email,
                    'mobileNumber' => $r->MobileNumber,
                    'attendanceStatus' => $r->AttendanceStatus,
                    'numberOfGuests' => $r->NumberOfGuests,
                    'mealPreference' => $r->MealPreference,
                    'dietaryRestrictions' => $r->DietaryRestrictions,
                    'message' => $r->Message,
                    'submittedDate' => $r->SubmittedDate ? $r->SubmittedDate->toIso8601String() : null,
                    'companionGuests' => $r->companionGuests->map(function ($c) {
                        return [
                            'guestName' => $c->GuestName,
                            'mealPreference' => $c->MealPreference,
                            'dietaryRestrictions' => $c->DietaryRestrictions,
                        ];
                    }),
                ];
            });

        return response()->json([
            'items' => $items,
            'totalCount' => $totalCount,
            'page' => $page,
            'pageSize' => $pageSize,
            'totalPages' => $totalPages,
        ]);
    }

    public function getRsvpById($id)
    {
        $r = Rsvp::with('companionGuests')->find($id);
        if (!$r) {
            return response()->json(['success' => false, 'message' => 'RSVP not found.'], 404);
        }

        return response()->json([
            'rsvpId' => $r->RSVPId,
            'guestId' => $r->GuestId,
            'fullName' => $r->FullName,
            'email' => $r->Email,
            'mobileNumber' => $r->MobileNumber,
            'attendanceStatus' => $r->AttendanceStatus,
            'numberOfGuests' => $r->NumberOfGuests,
            'mealPreference' => $r->MealPreference,
            'dietaryRestrictions' => $r->DietaryRestrictions,
            'message' => $r->Message,
            'submittedDate' => $r->SubmittedDate ? $r->SubmittedDate->toIso8601String() : null,
            'companionGuests' => $r->companionGuests->map(function ($c) {
                return [
                    'guestName' => $c->GuestName,
                    'mealPreference' => $c->MealPreference,
                    'dietaryRestrictions' => $c->DietaryRestrictions,
                ];
            }),
        ]);
    }

    public function updateRsvp(Request $request, $id)
    {
        $rsvp = Rsvp::find($id);
        if (!$rsvp) {
            return response()->json(['success' => false, 'message' => 'RSVP not found.'], 404);
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

            return response()->json(['success' => true, 'message' => 'RSVP updated successfully.']);
        });
    }

    public function deleteRsvp($id)
    {
        $rsvp = Rsvp::find($id);
        if (!$rsvp) {
            return response()->json(['success' => false, 'message' => 'RSVP not found.'], 404);
        }

        DB::transaction(function () use ($rsvp) {
            if ($rsvp->GuestId) {
                Guest::where('GuestId', $rsvp->GuestId)->update([
                    'RsvpStatus' => 'Pending',
                    'UpdatedAt' => now(),
                ]);
            }
            RsvpGuest::where('RsvpId', $rsvp->RSVPId)->delete();
            $rsvp->delete();
        });

        return response()->json(['success' => true, 'message' => 'RSVP deleted successfully.']);
    }

    public function exportCsv()
    {
        $rsvps = Rsvp::with('companionGuests')->orderBy('SubmittedDate', 'desc')->get();

        $output = "\xEF\xBB\xBF"; // UTF-8 BOM
        $output .= "Guest Name,Email,Mobile,Attendance,Number of Guests,Companion Names,Message,Submitted Date\n";

        foreach ($rsvps as $rsvp) {
            $companions = $rsvp->companionGuests->pluck('GuestName')->join(' | ');
            $fields = [
                $this->escapeCsv($rsvp->FullName),
                $this->escapeCsv($rsvp->Email),
                $this->escapeCsv($rsvp->MobileNumber),
                $this->escapeCsv($rsvp->AttendanceStatus),
                $rsvp->NumberOfGuests,
                $this->escapeCsv($companions),
                $this->escapeCsv($rsvp->Message ?? ''),
                $this->escapeCsv($rsvp->SubmittedDate ? $rsvp->SubmittedDate->format('Y-m-d H:i:s') : ''),
            ];
            $output .= implode(',', $fields) . "\n";
        }

        $filename = 'Wedding_RSVPs_' . date('Ymd_His') . '.csv';
        return response($output, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    public function exportExcel()
    {
        $rsvps = Rsvp::with('companionGuests')->orderBy('SubmittedDate', 'desc')->get();

        $xml = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n";
        $xml .= "<?mso-application progid=\"Excel.Sheet\"?>\n";
        $xml .= "<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\"\n";
        $xml .= " xmlns:o=\"urn:schemas-microsoft-com:office:office\"\n";
        $xml .= " xmlns:x=\"urn:schemas-microsoft-com:office:excel\"\n";
        $xml .= " xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\">\n";
        $xml .= " <Styles>\n";
        $xml .= "  <Style ss:ID=\"Header\"><Font ss:Bold=\"1\" ss:Color=\"#FFFFFF\"/><Interior ss:Color=\"#7A3B4D\" ss:Pattern=\"Solid\"/><Alignment ss:Horizontal=\"Center\" ss:Vertical=\"Center\"/></Style>\n";
        $xml .= "  <Style ss:ID=\"Attending\"><Interior ss:Color=\"#E6F4EA\" ss:Pattern=\"Solid\"/></Style>\n";
        $xml .= "  <Style ss:ID=\"Declined\"><Interior ss:Color=\"#FCE8E6\" ss:Pattern=\"Solid\"/></Style>\n";
        $xml .= " </Styles>\n";
        $xml .= " <Worksheet ss:Name=\"RSVP Responses\">\n";
        $xml .= "  <Table>\n";
        $xml .= "   <Column ss:Width=\"140\"/><Column ss:Width=\"150\"/><Column ss:Width=\"110\"/><Column ss:Width=\"90\"/><Column ss:Width=\"100\"/><Column ss:Width=\"160\"/><Column ss:Width=\"180\"/><Column ss:Width=\"130\"/>\n";
        $xml .= "   <Row ss:StyleID=\"Header\">\n";
        $xml .= "    <Cell><Data ss:Type=\"String\">Guest Name</Data></Cell>\n";
        $xml .= "    <Cell><Data ss:Type=\"String\">Email</Data></Cell>\n";
        $xml .= "    <Cell><Data ss:Type=\"String\">Mobile</Data></Cell>\n";
        $xml .= "    <Cell><Data ss:Type=\"String\">Attendance</Data></Cell>\n";
        $xml .= "    <Cell><Data ss:Type=\"String\">Number of Guests</Data></Cell>\n";
        $xml .= "    <Cell><Data ss:Type=\"String\">Companion Names</Data></Cell>\n";
        $xml .= "    <Cell><Data ss:Type=\"String\">Message</Data></Cell>\n";
        $xml .= "    <Cell><Data ss:Type=\"String\">Submitted Date</Data></Cell>\n";
        $xml .= "   </Row>\n";

        foreach ($rsvps as $rsvp) {
            $companions = htmlspecialchars($rsvp->companionGuests->pluck('GuestName')->join(', '), ENT_XML1);
            $styleAttr = strtolower($rsvp->AttendanceStatus) === 'attending' ? ' ss:StyleID="Attending"' : ' ss:StyleID="Declined"';

            $xml .= "   <Row{$styleAttr}>\n";
            $xml .= "    <Cell><Data ss:Type=\"String\">" . htmlspecialchars($rsvp->FullName, ENT_XML1) . "</Data></Cell>\n";
            $xml .= "    <Cell><Data ss:Type=\"String\">" . htmlspecialchars($rsvp->Email, ENT_XML1) . "</Data></Cell>\n";
            $xml .= "    <Cell><Data ss:Type=\"String\">" . htmlspecialchars($rsvp->MobileNumber, ENT_XML1) . "</Data></Cell>\n";
            $xml .= "    <Cell><Data ss:Type=\"String\">" . htmlspecialchars($rsvp->AttendanceStatus, ENT_XML1) . "</Data></Cell>\n";
            $xml .= "    <Cell><Data ss:Type=\"Number\">{$rsvp->NumberOfGuests}</Data></Cell>\n";
            $xml .= "    <Cell><Data ss:Type=\"String\">{$companions}</Data></Cell>\n";
            $xml .= "    <Cell><Data ss:Type=\"String\">" . htmlspecialchars($rsvp->Message ?? '', ENT_XML1) . "</Data></Cell>\n";
            $xml .= "    <Cell><Data ss:Type=\"String\">" . ($rsvp->SubmittedDate ? $rsvp->SubmittedDate->format('Y-m-d H:i:s') : '') . "</Data></Cell>\n";
            $xml .= "   </Row>\n";
        }

        $xml .= "  </Table>\n";
        $xml .= " </Worksheet>\n";
        $xml .= "</Workbook>";

        $filename = 'Wedding_RSVPs_' . date('Ymd_His') . '.xls';
        return response($xml, 200, [
            'Content-Type' => 'application/vnd.ms-excel',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    private function escapeCsv($str)
    {
        if (str_contains($str, ',') || str_contains($str, '"') || str_contains($str, "\n") || str_contains($str, "\r")) {
            return '"' . str_replace('"', '""', $str) . '"';
        }
        return $str;
    }
    #endregion

    #region Guest Pre-Registration
    public function getGuests()
    {
        $guests = Guest::orderBy('CreatedAt', 'desc')->get()->map(function ($g) {
            return [
                'guestId' => $g->GuestId,
                'fullName' => $g->FullName,
                'email' => $g->Email,
                'mobileNumber' => $g->MobileNumber,
                'allowedGuests' => (int) $g->AllowedGuests,
                'invitationCode' => $g->InvitationCode,
                'rsvpStatus' => $g->RsvpStatus ?? 'Pending',
                'notes' => $g->Notes,
                'createdAt' => $g->CreatedAt,
                // PascalCase aliases for backward compatibility
                'GuestId' => $g->GuestId,
                'FullName' => $g->FullName,
                'Email' => $g->Email,
                'MobileNumber' => $g->MobileNumber,
                'AllowedGuests' => (int) $g->AllowedGuests,
                'InvitationCode' => $g->InvitationCode,
                'RsvpStatus' => $g->RsvpStatus ?? 'Pending',
                'Notes' => $g->Notes,
            ];
        });
        return response()->json($guests);
    }

    public function createGuest(Request $request)
    {
        $request->validate([
            'fullName' => 'required|string|max:150',
            'allowedGuests' => 'required|integer|min:1|max:10',
        ]);

        $code = strtoupper(trim($request->input('invitationCode', '')));
        if (empty($code)) {
            $code = 'WED-' . strtoupper(Str::random(5));
        }

        while (Guest::whereRaw('UPPER(InvitationCode) = ?', [$code])->exists()) {
            $code = 'WED-' . strtoupper(Str::random(5));
        }

        $guest = Guest::create([
            'FullName' => trim($request->input('fullName')),
            'Email' => strtolower(trim($request->input('email', ''))),
            'MobileNumber' => trim($request->input('mobileNumber', '')),
            'AllowedGuests' => (int) $request->input('allowedGuests', 1),
            'InvitationCode' => $code,
            'RsvpStatus' => $request->input('rsvpStatus', 'Pending'),
            'Notes' => $request->input('notes'),
            'CreatedAt' => now(),
        ]);

        $formattedGuest = [
            'guestId' => $guest->GuestId,
            'fullName' => $guest->FullName,
            'email' => $guest->Email,
            'mobileNumber' => $guest->MobileNumber,
            'allowedGuests' => (int) $guest->AllowedGuests,
            'invitationCode' => $guest->InvitationCode,
            'rsvpStatus' => $guest->RsvpStatus,
            'notes' => $guest->Notes,
            'GuestId' => $guest->GuestId,
            'FullName' => $guest->FullName,
            'AllowedGuests' => (int) $guest->AllowedGuests,
            'InvitationCode' => $guest->InvitationCode,
            'RsvpStatus' => $guest->RsvpStatus,
        ];

        return response()->json([
            'success' => true,
            'guest' => $formattedGuest,
            'message' => 'Guest pre-registered successfully.',
        ]);
    }

    public function updateGuest(Request $request, $id)
    {
        $guest = Guest::find($id);
        if (!$guest) {
            return response()->json(['success' => false, 'message' => 'Guest not found.'], 404);
        }

        $code = strtoupper(trim($request->input('invitationCode', $guest->InvitationCode)));
        if ($code !== $guest->InvitationCode && Guest::whereRaw('UPPER(InvitationCode) = ?', [$code])->where('GuestId', '!=', $id)->exists()) {
            return response()->json(['success' => false, 'message' => 'Invitation code already in use.'], 400);
        }

        $guest->update([
            'FullName' => trim($request->input('fullName', $guest->FullName)),
            'Email' => strtolower(trim($request->input('email', $guest->Email))),
            'MobileNumber' => trim($request->input('mobileNumber', $guest->MobileNumber)),
            'AllowedGuests' => (int) $request->input('allowedGuests', $guest->AllowedGuests),
            'InvitationCode' => $code,
            'RsvpStatus' => $request->input('rsvpStatus', $guest->RsvpStatus),
            'Notes' => $request->input('notes', $guest->Notes),
            'UpdatedAt' => now(),
        ]);

        $formattedGuest = [
            'guestId' => $guest->GuestId,
            'fullName' => $guest->FullName,
            'email' => $guest->Email,
            'mobileNumber' => $guest->MobileNumber,
            'allowedGuests' => (int) $guest->AllowedGuests,
            'invitationCode' => $guest->InvitationCode,
            'rsvpStatus' => $guest->RsvpStatus,
            'notes' => $guest->Notes,
            'GuestId' => $guest->GuestId,
            'FullName' => $guest->FullName,
            'AllowedGuests' => (int) $guest->AllowedGuests,
            'InvitationCode' => $guest->InvitationCode,
            'RsvpStatus' => $guest->RsvpStatus,
        ];

        return response()->json([
            'success' => true,
            'guest' => $formattedGuest,
            'message' => 'Guest updated successfully.',
        ]);
    }

    public function deleteGuest($id)
    {
        $guest = Guest::find($id);
        if (!$guest) {
            return response()->json(['success' => false, 'message' => 'Guest not found.'], 404);
        }

        $guest->delete();
        return response()->json(['success' => true, 'message' => 'Guest removed successfully.']);
    }
    #endregion

    #region Settings Management
    public function getSettings()
    {
        $settings = WeddingSetting::all()->pluck('Value', 'Key')->toArray();
        return response()->json($settings);
    }

    public function updateSettings(Request $request)
    {
        $data = $request->all();
        if (empty($data)) {
            return response()->json(['success' => false, 'message' => 'No settings provided.'], 400);
        }

        foreach ($data as $key => $val) {
            WeddingSetting::updateOrCreate(
                ['Key' => $key],
                ['Value' => (string) $val, 'UpdatedDate' => now()]
            );
        }

        return response()->json(['success' => true, 'message' => 'Wedding settings updated successfully.']);
    }
    #endregion

    #region Gallery Management
    public function getGallery()
    {
        $items = GalleryItem::orderBy('DisplayOrder')->get()->map(function ($i) {
            return [
                'id' => $i->Id,
                'imageUrl' => $i->ImageUrl,
                'caption' => $i->Caption,
                'category' => $i->Category,
                'displayOrder' => (int) $i->DisplayOrder,
                'isActive' => (bool) $i->IsActive,
                'createdDate' => $i->CreatedDate,
                'Id' => $i->Id,
                'ImageUrl' => $i->ImageUrl,
                'Caption' => $i->Caption,
                'Category' => $i->Category,
                'DisplayOrder' => (int) $i->DisplayOrder,
                'IsActive' => (bool) $i->IsActive,
            ];
        });
        return response()->json($items);
    }

    public function addGalleryItem(Request $request)
    {
        $imageUrl = trim($request->input('imageUrl', ''));
        if (empty($imageUrl)) {
            return response()->json(['success' => false, 'message' => 'Image URL is required.'], 400);
        }

        $maxOrder = GalleryItem::max('DisplayOrder') ?? 0;
        $item = GalleryItem::create([
            'ImageUrl' => $imageUrl,
            'ThumbnailUrl' => $request->input('thumbnailUrl'),
            'Caption' => $request->input('caption', 'Wedding moment'),
            'Category' => $request->input('category', 'General'),
            'DisplayOrder' => $maxOrder + 1,
            'IsActive' => filter_var($request->input('isActive', true), FILTER_VALIDATE_BOOLEAN),
            'CreatedDate' => now(),
        ]);

        return response()->json(['success' => true, 'item' => $item]);
    }

    public function uploadGalleryImage(Request $request)
    {
        if (!$request->hasFile('file') || !$request->file('file')->isValid()) {
            return response()->json(['success' => false, 'message' => 'No valid file uploaded.'], 400);
        }

        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension());
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'])) {
            return response()->json(['success' => false, 'message' => 'Invalid file type. Only JPG, PNG, WebP, GIF are allowed.'], 400);
        }

        $targetDir = public_path('images/gallery');
        if (!File::exists($targetDir)) {
            File::makeDirectory($targetDir, 0755, true);
        }

        $fileName = 'gallery_' . Str::random(16) . '.' . $ext;
        $file->move($targetDir, $fileName);

        $relativeUrl = '/images/gallery/' . $fileName;
        $maxOrder = GalleryItem::max('DisplayOrder') ?? 0;

        $item = GalleryItem::create([
            'ImageUrl' => $relativeUrl,
            'Caption' => trim($request->input('caption', 'Wedding moment')),
            'DisplayOrder' => $maxOrder + 1,
            'IsActive' => true,
            'CreatedDate' => now(),
        ]);

        return response()->json(['success' => true, 'item' => $item]);
    }

    public function updateGalleryItem(Request $request, $id)
    {
        $item = GalleryItem::find($id);
        if (!$item) {
            return response()->json(['success' => false, 'message' => 'Gallery item not found.'], 404);
        }

        $item->update([
            'Caption' => $request->input('caption', $item->Caption),
            'DisplayOrder' => (int) $request->input('displayOrder', $item->DisplayOrder),
            'IsActive' => filter_var($request->input('isActive', $item->IsActive), FILTER_VALIDATE_BOOLEAN),
            'ImageUrl' => $request->input('imageUrl', $item->ImageUrl),
        ]);

        return response()->json(['success' => true, 'item' => $item]);
    }

    public function deleteGalleryItem($id)
    {
        $item = GalleryItem::find($id);
        if (!$item) {
            return response()->json(['success' => false, 'message' => 'Gallery item not found.'], 404);
        }

        $item->delete();
        return response()->json(['success' => true, 'message' => 'Gallery item deleted.']);
    }

    public function uploadGenericImage(Request $request)
    {
        if (!$request->hasFile('file') || !$request->file('file')->isValid()) {
            return response()->json(['success' => false, 'message' => 'No file uploaded.'], 400);
        }

        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension());
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'])) {
            return response()->json(['success' => false, 'message' => 'Invalid file type. Only JPG, PNG, WebP, GIF are allowed.'], 400);
        }

        $folder = strtolower(trim($request->input('folder', 'story')));
        $subfolder = $folder === 'story' ? 'story' : 'uploads';

        $targetDir = public_path('images/' . $subfolder);
        if (!File::exists($targetDir)) {
            File::makeDirectory($targetDir, 0755, true);
        }

        $fileName = $subfolder . '_' . Str::random(16) . '.' . $ext;
        $file->move($targetDir, $fileName);

        $relativeUrl = '/images/' . $subfolder . '/' . $fileName;
        return response()->json(['success' => true, 'url' => $relativeUrl]);
    }
    #endregion

    #region Timeline Management
    public function getTimeline()
    {
        $items = TimelineItem::orderBy('DisplayOrder')->get()->map(function ($t) {
            return [
                'id' => $t->Id,
                'time' => $t->Time,
                'title' => $t->Title,
                'description' => $t->Description,
                'icon' => $t->Icon,
                'displayOrder' => (int) $t->DisplayOrder,
                'Id' => $t->Id,
                'Time' => $t->Time,
                'Title' => $t->Title,
                'Description' => $t->Description,
                'Icon' => $t->Icon,
                'DisplayOrder' => (int) $t->DisplayOrder,
            ];
        });
        return response()->json($items);
    }

    public function createTimelineItem(Request $request)
    {
        $request->validate([
            'time' => 'required|string',
            'title' => 'required|string',
        ]);

        $item = TimelineItem::create([
            'Time' => trim($request->input('time')),
            'Title' => trim($request->input('title')),
            'Description' => $request->input('description'),
            'Icon' => $request->input('icon', 'heart'),
            'DisplayOrder' => (int) $request->input('displayOrder', 0),
        ]);

        return response()->json(['message' => 'Timeline event added successfully.', 'item' => $item]);
    }

    public function updateTimelineItem(Request $request, $id)
    {
        $item = TimelineItem::find($id);
        if (!$item) {
            return response()->json(['message' => 'Timeline event not found.'], 404);
        }

        $item->update([
            'Time' => trim($request->input('time', $item->Time)),
            'Title' => trim($request->input('title', $item->Title)),
            'Description' => $request->input('description', $item->Description),
            'Icon' => $request->input('icon', $item->Icon),
            'DisplayOrder' => (int) $request->input('displayOrder', $item->DisplayOrder),
        ]);

        return response()->json(['message' => 'Timeline event updated successfully.', 'item' => $item]);
    }

    public function deleteTimelineItem($id)
    {
        $item = TimelineItem::find($id);
        if (!$item) {
            return response()->json(['message' => 'Timeline event not found.'], 404);
        }

        $item->delete();
        return response()->json(['message' => 'Timeline event deleted successfully.']);
    }
    #endregion

    #region Entourage Management
    public function getEntourage()
    {
        $items = EntourageItem::orderBy('DisplayOrder')->get()->map(function ($e) {
            return [
                'id' => $e->Id,
                'category' => $e->Category,
                'name' => $e->Name,
                'role' => $e->Role,
                'displayOrder' => (int) $e->DisplayOrder,
                'Id' => $e->Id,
                'Category' => $e->Category,
                'Name' => $e->Name,
                'Role' => $e->Role,
                'DisplayOrder' => (int) $e->DisplayOrder,
            ];
        });
        return response()->json($items);
    }

    public function createEntourageItem(Request $request)
    {
        $request->validate([
            'category' => 'required|string',
            'name' => 'required|string',
        ]);

        $item = EntourageItem::create([
            'Category' => trim($request->input('category')),
            'Name' => trim($request->input('name')),
            'Role' => $request->input('role'),
            'DisplayOrder' => (int) $request->input('displayOrder', 0),
        ]);

        return response()->json(['message' => 'Entourage member added successfully.', 'item' => $item]);
    }

    public function updateEntourageItem(Request $request, $id)
    {
        $item = EntourageItem::find($id);
        if (!$item) {
            return response()->json(['message' => 'Entourage member not found.'], 404);
        }

        $item->update([
            'Category' => trim($request->input('category', $item->Category)),
            'Name' => trim($request->input('name', $item->Name)),
            'Role' => $request->input('role', $item->Role),
            'DisplayOrder' => (int) $request->input('displayOrder', $item->DisplayOrder),
        ]);

        return response()->json(['message' => 'Entourage member updated successfully.', 'item' => $item]);
    }

    public function deleteEntourageItem($id)
    {
        $item = EntourageItem::find($id);
        if (!$item) {
            return response()->json(['message' => 'Entourage member not found.'], 404);
        }

        $item->delete();
        return response()->json(['message' => 'Entourage member deleted successfully.']);
    }
    #endregion

    #region FAQ Management
    public function getFaqs()
    {
        $items = FaqItem::orderBy('DisplayOrder')->get()->map(function ($f) {
            return [
                'id' => $f->Id,
                'question' => $f->Question,
                'answer' => $f->Answer,
                'displayOrder' => (int) $f->DisplayOrder,
                'isActive' => (bool) $f->IsActive,
                'Id' => $f->Id,
                'Question' => $f->Question,
                'Answer' => $f->Answer,
                'DisplayOrder' => (int) $f->DisplayOrder,
                'IsActive' => (bool) $f->IsActive,
            ];
        });
        return response()->json($items);
    }

    public function createFaqItem(Request $request)
    {
        $request->validate([
            'question' => 'required|string',
            'answer' => 'required|string',
        ]);

        $item = FaqItem::create([
            'Question' => trim($request->input('question')),
            'Answer' => trim($request->input('answer')),
            'DisplayOrder' => (int) $request->input('displayOrder', 0),
            'IsActive' => filter_var($request->input('isActive', true), FILTER_VALIDATE_BOOLEAN),
        ]);

        return response()->json(['message' => 'FAQ added successfully.', 'item' => $item]);
    }

    public function updateFaqItem(Request $request, $id)
    {
        $item = FaqItem::find($id);
        if (!$item) {
            return response()->json(['message' => 'FAQ not found.'], 404);
        }

        $item->update([
            'Question' => trim($request->input('question', $item->Question)),
            'Answer' => trim($request->input('answer', $item->Answer)),
            'DisplayOrder' => (int) $request->input('displayOrder', $item->DisplayOrder),
            'IsActive' => filter_var($request->input('isActive', $item->IsActive), FILTER_VALIDATE_BOOLEAN),
        ]);

        return response()->json(['message' => 'FAQ updated successfully.', 'item' => $item]);
    }

    public function deleteFaqItem($id)
    {
        $item = FaqItem::find($id);
        if (!$item) {
            return response()->json(['message' => 'FAQ not found.'], 404);
        }

        $item->delete();
        return response()->json(['message' => 'FAQ deleted successfully.']);
    }
    #endregion

    #region Database Explorer
    public function getDatabaseOverview()
    {
        $connection = DB::connection();
        $driver = $connection->getDriverName();
        $database = $connection->getDatabaseName();

        $tables = [];

        if ($driver === 'sqlite') {
            $tableRecords = DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
            foreach ($tableRecords as $row) {
                $tblName = $row->name;
                $count = DB::table($tblName)->count();
                $tables[] = [
                    'tableName' => $tblName,
                    'rowCount' => $count,
                ];
            }
        } else {
            $tableRecords = DB::select("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME;");
            foreach ($tableRecords as $row) {
                $tblName = $row->TABLE_NAME ?? $row->table_name;
                $count = DB::table($tblName)->count();
                $tables[] = [
                    'tableName' => $tblName,
                    'rowCount' => $count,
                ];
            }
        }

        return response()->json([
            'provider' => ucfirst($driver),
            'database' => $database,
            'dataSource' => $database,
            'tables' => $tables,
        ]);
    }

    public function getTableData(Request $request, $tableName)
    {
        if (preg_match('/[^a-zA-Z0-9_]/', $tableName)) {
            return response()->json(['message' => 'Invalid table name.'], 400);
        }

        $limit = max(1, min(200, (int) $request->input('limit', 100)));

        $rows = DB::table($tableName)->limit($limit)->get();
        $columns = [];

        if ($rows->isNotEmpty()) {
            $first = (array) $rows->first();
            $columns = array_keys($first);
        } else {
            // Retrieve column schema
            if (DB::getDriverName() === 'sqlite') {
                $cols = DB::select("PRAGMA table_info('{$tableName}');");
                $columns = array_map(fn($c) => $c->name, $cols);
            }
        }

        return response()->json([
            'tableName' => $tableName,
            'columns' => $columns,
            'rows' => $rows,
        ]);
    }

    public function executeQuery(Request $request)
    {
        $query = trim($request->input('query', ''));
        if (empty($query)) {
            return response()->json(['message' => 'Query cannot be empty.'], 400);
        }

        if (!str_starts_with(strtoupper($query), 'SELECT')) {
            return response()->json(['message' => 'Only read-only SELECT queries are permitted in the Database Explorer.'], 400);
        }

        try {
            $results = DB::select($query);
            $rows = array_slice($results, 0, 200);
            $columns = [];

            if (!empty($rows)) {
                $first = (array) $rows[0];
                $columns = array_keys($first);
            }

            return response()->json([
                'columns' => $columns,
                'rows' => $rows,
                'rowCount' => count($rows),
            ]);
        } catch (\Exception $ex) {
            return response()->json(['message' => $ex->getMessage()], 400);
        }
    }
    #endregion
}
