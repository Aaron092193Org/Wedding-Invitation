<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\Guest;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_seeded_admin_uses_configured_credentials_and_demo_guests_are_created(): void
    {
        config()->set('wedding.admin', [
            'username' => 'forge-admin',
            'email' => 'admin@example.com',
            'name' => 'Forge Administrator',
            'password' => 'a-test-only-password',
        ]);
        config()->set('wedding.seed_demo_data', true);

        (new DatabaseSeeder)->run();

        $admin = AdminUser::where('Username', 'forge-admin')->firstOrFail();
        $user = User::where('email', 'admin@example.com')->firstOrFail();

        $this->assertSame('Forge Administrator', $admin->FullName);
        $this->assertTrue(Hash::check('a-test-only-password', $admin->PasswordHash));
        $this->assertTrue(Hash::check('a-test-only-password', $user->password));
        $this->assertSame(6, Guest::count());
        $this->assertSame('Atty. Fernando Gomez', Guest::where('InvitationCode', 'WED-8F29K')->value('FullName'));
    }

    public function test_production_seeding_requires_an_admin_password(): void
    {
        app()->detectEnvironment(fn (): string => 'production');
        config()->set('wedding.admin', [
            'username' => 'production-admin',
            'email' => 'production-admin@example.com',
            'name' => 'Production Administrator',
            'password' => null,
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('ADMIN_PASSWORD must be configured before seeding production.');

        (new DatabaseSeeder)->run();
    }
}
