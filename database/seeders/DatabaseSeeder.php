<?php

namespace Database\Seeders;

use App\Models\AdminUser;
use App\Models\EntourageItem;
use App\Models\FaqItem;
use App\Models\GalleryItem;
use App\Models\GiftInformation;
use App\Models\Guest;
use App\Models\Rsvp;
use App\Models\RsvpGuest;
use App\Models\TimelineItem;
use App\Models\User;
use App\Models\WeddingSetting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $adminUsername = (string) config('wedding.admin.username');
        $adminEmail = (string) config('wedding.admin.email');
        $adminName = (string) config('wedding.admin.name');
        $adminNeedsCreating = ! AdminUser::where('Username', $adminUsername)->exists();
        $userNeedsCreating = ! User::where('email', $adminEmail)->exists();

        if ($adminNeedsCreating || $userNeedsCreating) {
            $adminPassword = (string) config('wedding.admin.password');

            if ($adminPassword === '') {
                if (app()->isProduction()) {
                    throw new RuntimeException('ADMIN_PASSWORD must be configured before seeding production.');
                }

                $adminPassword = 'WeddingAdmin2026!';
            }

            $hashedPassword = Hash::make($adminPassword);
        }

        if ($adminNeedsCreating) {
            AdminUser::create([
                'Username' => $adminUsername,
                'Email' => $adminEmail,
                'FullName' => $adminName,
                'PasswordHash' => $hashedPassword,
                'CreatedAt' => now(),
            ]);
        }

        if ($userNeedsCreating) {
            User::create([
                'name' => $adminName,
                'email' => $adminEmail,
                'password' => $hashedPassword,
            ]);
        }

        // 2. Seed Wedding Settings
        if (WeddingSetting::count() === 0) {
            $defaultSettings = [
                ['Key' => 'BrideName', 'Value' => 'Majhorie A. Fernandez', 'Category' => 'Couple', 'Description' => "Bride's full name"],
                ['Key' => 'GroomName', 'Value' => 'Aaron Randell S Avendaño', 'Category' => 'Couple', 'Description' => "Groom's full name"],
                ['Key' => 'WeddingDate', 'Value' => '2027-02-26T15:00:00', 'Category' => 'Schedule', 'Description' => 'Wedding date and start time (ISO format)'],
                ['Key' => 'CeremonyTime', 'Value' => '3:00 PM', 'Category' => 'Schedule', 'Description' => 'Ceremony start time'],
                ['Key' => 'CeremonyVenue', 'Value' => 'Our Lady of La Sallette Quasi Parish', 'Category' => 'Venue', 'Description' => 'Ceremony venue name'],
                ['Key' => 'CeremonyAddress', 'Value' => 'M. Villarica Road Mountain View, Barangay Muzon, City of San Jose del Monte, Bulacan, Philippines', 'Category' => 'Venue', 'Description' => 'Ceremony physical address'],
                ['Key' => 'ReceptionTime', 'Value' => '5:00 PM', 'Category' => 'Schedule', 'Description' => 'Reception start time'],
                ['Key' => 'ReceptionVenue', 'Value' => 'The Grounds Events', 'Category' => 'Venue', 'Description' => 'Reception venue name'],
                ['Key' => 'ReceptionAddress', 'Value' => '9022 Provincial Road, Sitio Gulod, Sapang Palay Proper, City of San Jose del Monte, Bulacan', 'Category' => 'Venue', 'Description' => 'Reception physical address'],
                ['Key' => 'WeddingHashtag', 'Value' => '#MajhMadeForAaron', 'Category' => 'Social', 'Description' => 'Official wedding hashtag'],
                ['Key' => 'DressCode', 'Value' => 'Modern Filipiniana / Barong Tagalog for Gentlemen; Terno, Modern Filipiniana, or Long Gowns in Earthy & Warm Champagne Tones for Ladies', 'Category' => 'Details', 'Description' => 'Guest dress code instructions'],
                ['Key' => 'GoogleMapsUrl', 'Value' => 'https://maps.app.goo.gl/zTNEPZgL3Nvw2beD8', 'Category' => 'Venue', 'Description' => 'Ceremony Google Maps link'],
                ['Key' => 'ReceptionGoogleMapsUrl', 'Value' => 'https://maps.app.goo.gl/1yj3RXyGy8ZQ5sEu8', 'Category' => 'Venue', 'Description' => 'Reception Google Maps link'],
                ['Key' => 'BackgroundMusic', 'Value' => '/audio/palagi-wedding-version.mp3', 'Category' => 'Media', 'Description' => 'Audio file path or URL (Palagi - Wedding Version)'],
                ['Key' => 'WeddingTheme', 'Value' => 'Filipiniana Moderno & Heirloom Gold', 'Category' => 'Theme', 'Description' => 'Wedding aesthetic theme'],
                ['Key' => 'PrimaryColor', 'Value' => '#7B2433', 'Category' => 'Theme', 'Description' => 'Primary color hex (Maharlika Burgundy)'],
                ['Key' => 'SecondaryColor', 'Value' => '#C5A059', 'Category' => 'Theme', 'Description' => 'Secondary color hex (Heirloom Antique Gold)'],
                ['Key' => 'AccentColor', 'Value' => '#FBF8F2', 'Category' => 'Theme', 'Description' => 'Accent/background color hex (Piña Calado Cream)'],
                ['Key' => 'AllowPlusOne', 'Value' => 'true', 'Category' => 'RSVP', 'Description' => 'Allow plus one / companion guests'],
                ['Key' => 'AllowChildren', 'Value' => 'false', 'Category' => 'RSVP', 'Description' => 'Allow children'],
                ['Key' => 'MaxGuestsPerRsvp', 'Value' => '4', 'Category' => 'RSVP', 'Description' => 'Maximum guests per RSVP submission'],
                ['Key' => 'StoryHowWeMet', 'Value' => 'We met on a rainy afternoon at a quaint coffee shop in Bonifacio Global City. A spilled latte led to laughter, shared pastries, and a four-hour conversation that neither of us wanted to end.', 'Category' => 'Story', 'Description' => 'Story: How we met'],
                ['Key' => 'StoryOurJourney', 'Value' => 'Over six wonderful years, we explored breathtaking mountaintops, shared quiet Sunday mornings, cooked countless dinners together, and stood by each other through life\'s triumphs and trials.', 'Category' => 'Story', 'Description' => 'Story: Our journey'],
                ['Key' => 'StoryTheProposal', 'Value' => 'During a sunset stroll along the pristine white sands of Boracay, surrounded by the golden glow of twilight and the whispering waves, Aaron got down on one knee and asked the question that changed forever.', 'Category' => 'Story', 'Description' => 'Story: The proposal'],
                ['Key' => 'HeroPhoto', 'Value' => '/images/hero-bg.jpg', 'Category' => 'Media', 'Description' => 'Hero banner image'],
                ['Key' => 'StoryPhoto1', 'Value' => 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80', 'Category' => 'Media', 'Description' => 'Story photo 1'],
                ['Key' => 'StoryPhoto2', 'Value' => 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80', 'Category' => 'Media', 'Description' => 'Story photo 2'],
                ['Key' => 'StoryPhoto3', 'Value' => 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1200&q=80', 'Category' => 'Media', 'Description' => 'Story photo 3'],
                ['Key' => 'GiftSectionEnabled', 'Value' => 'true', 'Category' => 'Gifts', 'Description' => 'Show/hide gift registry section'],
                ['Key' => 'GiftMessage', 'Value' => 'Your presence and prayers on our wedding day are the greatest gifts of all. If you wish to bless us further as we build our home, a monetary blessing towards our new life together would be warmly appreciated.', 'Category' => 'Gifts', 'Description' => 'Gift message'],
            ];

            foreach ($defaultSettings as $setting) {
                WeddingSetting::create(array_merge($setting, ['UpdatedDate' => now()]));
            }
        }

        // 3. Seed Entourage
        if (EntourageItem::count() === 0) {
            $entourage = [
                ['Category' => 'Parents of the Groom', 'Name' => 'Mr. & Mrs. Avendaño', 'Role' => 'Parents of the Groom', 'DisplayOrder' => 1],
                ['Category' => 'Parents of the Bride', 'Name' => 'Mr. & Mrs. Fernandez', 'Role' => 'Parents of the Bride', 'DisplayOrder' => 2],
                
                ['Category' => 'Principal Sponsors (Ninong)', 'Name' => 'Atty. Fernando Gomez', 'Role' => 'Ninong', 'DisplayOrder' => 3],
                ['Category' => 'Principal Sponsors (Ninang)', 'Name' => 'Hon. Teresa Gomez', 'Role' => 'Ninang', 'DisplayOrder' => 4],
                ['Category' => 'Principal Sponsors (Ninong)', 'Name' => 'Dr. Benjamin Reyes', 'Role' => 'Ninong', 'DisplayOrder' => 5],
                ['Category' => 'Principal Sponsors (Ninang)', 'Name' => 'Dra. Patricia Reyes', 'Role' => 'Ninang', 'DisplayOrder' => 6],
                ['Category' => 'Principal Sponsors (Ninong)', 'Name' => 'Engr. Carlos Mendoza', 'Role' => 'Ninong', 'DisplayOrder' => 7],
                ['Category' => 'Principal Sponsors (Ninang)', 'Name' => 'Mrs. Cynthia Mendoza', 'Role' => 'Ninang', 'DisplayOrder' => 8],
                
                ['Category' => 'Best Man', 'Name' => 'Gabriel Dela Cruz', 'Role' => 'Best Man', 'DisplayOrder' => 9],
                ['Category' => 'Maid of Honor', 'Name' => 'Sofia Santos', 'Role' => 'Maid of Honor', 'DisplayOrder' => 10],
                
                ['Category' => 'Groomsmen', 'Name' => 'Joshua Fernandez', 'Role' => 'Groomsman', 'DisplayOrder' => 11],
                ['Category' => 'Groomsmen', 'Name' => 'Paolo Avendaño', 'Role' => 'Groomsman', 'DisplayOrder' => 12],
                ['Category' => 'Groomsmen', 'Name' => 'Miguel Castro', 'Role' => 'Groomsman', 'DisplayOrder' => 13],
                
                ['Category' => 'Bridesmaids', 'Name' => 'Bea Alonzo-Santos', 'Role' => 'Bridesmaid', 'DisplayOrder' => 14],
                ['Category' => 'Bridesmaids', 'Name' => 'Katrina Cruz', 'Role' => 'Bridesmaid', 'DisplayOrder' => 15],
                ['Category' => 'Bridesmaids', 'Name' => 'Clarisse Reyes', 'Role' => 'Bridesmaid', 'DisplayOrder' => 16],
                
                ['Category' => 'Secondary Sponsors', 'Name' => 'Marco Bautista', 'Role' => 'Candle Sponsor (Groom)', 'DisplayOrder' => 17],
                ['Category' => 'Secondary Sponsors', 'Name' => 'Camille Fernandez', 'Role' => 'Candle Sponsor (Bride)', 'DisplayOrder' => 18],
                ['Category' => 'Secondary Sponsors', 'Name' => 'Daniel Aquino', 'Role' => 'Veil Sponsor (Groom)', 'DisplayOrder' => 19],
                ['Category' => 'Secondary Sponsors', 'Name' => 'Kristine Villanueva', 'Role' => 'Veil Sponsor (Bride)', 'DisplayOrder' => 20],
                ['Category' => 'Secondary Sponsors', 'Name' => 'Christian Lee', 'Role' => 'Cord Sponsor (Groom)', 'DisplayOrder' => 21],
                ['Category' => 'Secondary Sponsors', 'Name' => 'Alyssa Ramos', 'Role' => 'Cord Sponsor (Bride)', 'DisplayOrder' => 22],
                
                ['Category' => 'Ring Bearer', 'Name' => 'Lucas Alexander Santos', 'Role' => 'Ring Bearer', 'DisplayOrder' => 23],
                ['Category' => 'Coin Bearer', 'Name' => 'Mateo Inigo Santos', 'Role' => 'Coin Bearer (Arrhas)', 'DisplayOrder' => 24],
                ['Category' => 'Bible Bearer', 'Name' => 'Ethan James Avendaño', 'Role' => 'Bible Bearer', 'DisplayOrder' => 25],
                
                ['Category' => 'Flower Girls', 'Name' => 'Mia Isabella Santos', 'Role' => 'Flower Girl', 'DisplayOrder' => 26],
                ['Category' => 'Flower Girls', 'Name' => 'Chloe Rose Dela Cruz', 'Role' => 'Flower Girl', 'DisplayOrder' => 27],
            ];

            foreach ($entourage as $item) {
                EntourageItem::create($item);
            }
        }

        // 4. Seed Timeline
        if (TimelineItem::count() === 0) {
            $timeline = [
                ['Time' => '3:30 PM', 'Title' => 'Guest Arrival', 'Description' => 'Welcome drinks & seating of esteemed guests at Our Lady of La Sallette Quasi Parish.', 'Icon' => 'door-open', 'DisplayOrder' => 1],
                ['Time' => '4:00 PM', 'Title' => 'Ceremony', 'Description' => 'Exchange of holy wedding vows and matrimonial blessing.', 'Icon' => 'ring', 'DisplayOrder' => 2],
                ['Time' => '5:00 PM', 'Title' => 'Cocktail Hour & Photos', 'Description' => 'Canapés, artisanal cocktails, and couple & family portraits.', 'Icon' => 'wine-glass', 'DisplayOrder' => 3],
                ['Time' => '6:00 PM', 'Title' => 'Reception Grand Entrance', 'Description' => 'Welcome the newly wedded couple at The Grounds Events.', 'Icon' => 'sparkles', 'DisplayOrder' => 4],
                ['Time' => '7:00 PM', 'Title' => 'Dinner Banquet', 'Description' => 'Sumptuous dinner feast with wine pairings.', 'Icon' => 'utensils', 'DisplayOrder' => 5],
                ['Time' => '8:00 PM', 'Title' => 'Speeches & Program', 'Description' => 'Toasts from the best man and maid of honor, cake cutting & first dance.', 'Icon' => 'microphone', 'DisplayOrder' => 6],
                ['Time' => '9:00 PM', 'Title' => 'Dancing & Celebration', 'Description' => 'Live music, celebratory dancing, and late-night snacks.', 'Icon' => 'music', 'DisplayOrder' => 7],
            ];

            foreach ($timeline as $item) {
                TimelineItem::create($item);
            }
        }

        // 5. Seed Gallery
        if (GalleryItem::count() === 0) {
            $gallery = [
                ['ImageUrl' => 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80', 'Caption' => 'Our golden sunset in Boracay', 'DisplayOrder' => 1, 'IsActive' => true, 'CreatedDate' => now()],
                ['ImageUrl' => 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80', 'Caption' => 'Laughter and quiet moments together', 'DisplayOrder' => 2, 'IsActive' => true, 'CreatedDate' => now()],
                ['ImageUrl' => 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80', 'Caption' => 'A sweet embrace before forever', 'DisplayOrder' => 3, 'IsActive' => true, 'CreatedDate' => now()],
                ['ImageUrl' => 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1200&q=80', 'Caption' => 'The engagement ring & heartfelt promise', 'DisplayOrder' => 4, 'IsActive' => true, 'CreatedDate' => now()],
                ['ImageUrl' => 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80', 'Caption' => 'Walking hand in hand through BGC', 'DisplayOrder' => 5, 'IsActive' => true, 'CreatedDate' => now()],
                ['ImageUrl' => 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80', 'Caption' => 'To love, cherish, and always celebrate life', 'DisplayOrder' => 6, 'IsActive' => true, 'CreatedDate' => now()],
            ];

            foreach ($gallery as $item) {
                GalleryItem::create($item);
            }
        }

        // 6. Seed FAQs
        if (FaqItem::count() === 0) {
            $faqs = [
                ['Question' => 'What time should we arrive?', 'Answer' => 'We recommend arriving between 2:15 PM and 2:30 PM to allow ample time for parking and seating before the ceremony begins promptly at 3:00 PM.', 'DisplayOrder' => 1, 'IsActive' => true],
                ['Question' => 'What is the dress code?', 'Answer' => 'The dress code is Formal: Barong Tagalog for gentlemen and formal long gowns or elegant evening dresses for ladies. Our color palette features rich berry (#7A3B4D), champagne gold (#D4AF37), and warm creams (#F9F6F0). We kindly request guests to avoid wearing white.', 'DisplayOrder' => 2, 'IsActive' => true],
                ['Question' => 'Can I bring a plus one?', 'Answer' => 'Due to venue capacity restrictions, we can only accommodate guests formally named on your invitation. If your invitation specifies a plus one or companion count, you may register them during RSVP.', 'DisplayOrder' => 3, 'IsActive' => true],
                ['Question' => 'Are children invited?', 'Answer' => 'While we love your little ones, this is an adults-only celebration with the exception of children in the wedding entourage. We hope you understand and enjoy a night off to celebrate with us!', 'DisplayOrder' => 4, 'IsActive' => true],
                ['Question' => 'Where can I park?', 'Answer' => 'Designated parking is available at Our Lady of La Sallette Quasi Parish and at The Grounds Events reception venue.', 'DisplayOrder' => 5, 'IsActive' => true],
                ['Question' => 'Is there a reception after the ceremony?', 'Answer' => 'Yes! Dinner, cocktails, heartfelt speeches, and dancing will immediately follow the ceremony at The Grounds Events, Bulacan.', 'DisplayOrder' => 6, 'IsActive' => true],
            ];

            foreach ($faqs as $item) {
                FaqItem::create($item);
            }
        }

        // 7. Seed Gift Information
        if (GiftInformation::count() === 0) {
            $gifts = [
                ['PaymentType' => 'GCash', 'AccountName' => 'Majhorie A. Fernandez', 'AccountNumber' => '0917-123-4567', 'Instructions' => 'Please include a warm note or your name in the transfer message.', 'DisplayOrder' => 1, 'IsEnabled' => true],
                ['PaymentType' => 'Maya', 'AccountName' => 'Aaron Randell S Avendaño', 'AccountNumber' => '0918-987-6543', 'Instructions' => 'Send to Maya wallet. Thank you for your blessing!', 'DisplayOrder' => 2, 'IsEnabled' => true],
                ['PaymentType' => 'Bank Transfer', 'AccountName' => 'Majhorie Fernandez or Aaron Avendaño', 'AccountNumber' => 'BDO Unibank: 0012-3456-7890', 'Instructions' => 'Account Type: Savings Account. SWIFT: BNORPHMM', 'DisplayOrder' => 3, 'IsEnabled' => true],
                ['PaymentType' => 'Gift Registry', 'AccountName' => "Rustan's Department Store", 'AccountNumber' => 'Registry ID: #MA-2027-99', 'Instructions' => 'Visit any Rustan\'s branch or online portal to view curated home selections.', 'DisplayOrder' => 4, 'IsEnabled' => true],
            ];

            foreach ($gifts as $gift) {
                GiftInformation::create($gift);
            }
        }

        // 8. Seed Pre-Registered Guests
        if (config('wedding.seed_demo_data') && Guest::count() === 0) {
            $guests = [
                ['FullName' => 'Atty. Fernando Gomez', 'Email' => 'fgomez@example.com', 'MobileNumber' => '+639171112222', 'AllowedGuests' => 2, 'InvitationCode' => 'WED-8F29K', 'RsvpStatus' => 'Attending', 'Notes' => 'Principal Sponsor', 'CreatedAt' => now()],
                ['FullName' => 'Dr. Benjamin Reyes', 'Email' => 'breyes@example.com', 'MobileNumber' => '+639173334444', 'AllowedGuests' => 2, 'InvitationCode' => 'WED-K93PL', 'RsvpStatus' => 'Attending', 'Notes' => 'Principal Sponsor', 'CreatedAt' => now()],
                ['FullName' => 'Sofia Santos', 'Email' => 'sofia.santos@example.com', 'MobileNumber' => '+639175556666', 'AllowedGuests' => 1, 'InvitationCode' => 'WED-M74XQ', 'RsvpStatus' => 'Attending', 'Notes' => 'Maid of Honor', 'CreatedAt' => now()],
                ['FullName' => 'Gabriel Dela Cruz', 'Email' => 'gabriel.dc@example.com', 'MobileNumber' => '+639177778888', 'AllowedGuests' => 1, 'InvitationCode' => 'WED-B28ZV', 'RsvpStatus' => 'Pending', 'Notes' => 'Best Man', 'CreatedAt' => now()],
                ['FullName' => 'Carlos & Cynthia Mendoza', 'Email' => 'cmendoza@example.com', 'MobileNumber' => '+639179990000', 'AllowedGuests' => 2, 'InvitationCode' => 'WED-P51TY', 'RsvpStatus' => 'Pending', 'Notes' => 'Family Friends', 'CreatedAt' => now()],
                ['FullName' => 'Eduardo Ramirez', 'Email' => 'eramirez@example.com', 'MobileNumber' => '+639172223333', 'AllowedGuests' => 1, 'InvitationCode' => 'WED-L62WD', 'RsvpStatus' => 'Declined', 'Notes' => 'Colleague', 'CreatedAt' => now()],
            ];

            $createdGuests = [];
            foreach ($guests as $guestData) {
                $createdGuests[] = Guest::create($guestData);
            }

            // Seed Initial Sample RSVPs
            $rsvp1 = Rsvp::create([
                'GuestId' => $createdGuests[0]->GuestId,
                'FullName' => 'Atty. Fernando Gomez',
                'Email' => 'fgomez@example.com',
                'MobileNumber' => '+639171112222',
                'AttendanceStatus' => 'Attending',
                'NumberOfGuests' => 2,
                'MealPreference' => 'Beef Tenderloin',
                'DietaryRestrictions' => 'None',
                'Message' => 'Wishing you both a lifetime of happiness, peace, and endless love!',
                'SubmittedDate' => now()->subDays(5),
                'IPAddress' => '127.0.0.1',
            ]);

            RsvpGuest::create([
                'RsvpId' => $rsvp1->RSVPId,
                'GuestName' => 'Hon. Teresa Gomez',
                'MealPreference' => 'Pan-Seared Salmon',
                'DietaryRestrictions' => 'Gluten-Free',
            ]);

            $rsvp2 = Rsvp::create([
                'GuestId' => $createdGuests[1]->GuestId,
                'FullName' => 'Dr. Benjamin Reyes',
                'Email' => 'breyes@example.com',
                'MobileNumber' => '+639173334444',
                'AttendanceStatus' => 'Attending',
                'NumberOfGuests' => 2,
                'MealPreference' => 'Chicken Roulade',
                'DietaryRestrictions' => 'No shellfish',
                'Message' => "Can't wait to celebrate this special day with you Majh and Aaron!",
                'SubmittedDate' => now()->subDays(3),
                'IPAddress' => '127.0.0.1',
            ]);

            RsvpGuest::create([
                'RsvpId' => $rsvp2->RSVPId,
                'GuestName' => 'Dra. Patricia Reyes',
                'MealPreference' => 'Vegetarian Truffle Pasta',
                'DietaryRestrictions' => 'Vegetarian',
            ]);

            Rsvp::create([
                'GuestId' => $createdGuests[5]->GuestId,
                'FullName' => 'Eduardo Ramirez',
                'Email' => 'eramirez@example.com',
                'MobileNumber' => '+639172223333',
                'AttendanceStatus' => 'Declined',
                'NumberOfGuests' => 0,
                'MealPreference' => null,
                'DietaryRestrictions' => null,
                'Message' => 'Sending my warmest congratulations! Sadly I have an overseas conference on that date.',
                'SubmittedDate' => now()->subDays(1),
                'IPAddress' => '127.0.0.1',
            ]);
        }
    }
}
